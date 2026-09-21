export type QueuedReport = {
  client_id: string;
  type: string;
  description: string;
  location_source: "gps" | "typed" | "none" | "map_selection";
  lat?: number;
  lng?: number;
  location_text?: string;
  attachment_paths: string[];
  status: "pending" | "failed" | "sent";
  retryCount: number;
  created_at: string;
  error_message?: string;
  incident_id?: string;
};

const DB_NAME = "SajiloResQ_OfflineDB";
const DB_VERSION = 1;
const STORE_NAME = "queued_reports";
const MY_REPORTS_STORE = "my_reports";

let fallbackQueue: QueuedReport[] = [];
let fallbackMyReports: { client_id: string; incident_id: string; created_at: string }[] = [];
let isFallback = false;

// Open DB
function openDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      isFallback = true;
      return resolve(null);
    }
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "client_id" });
        }
        if (!db.objectStoreNames.contains(MY_REPORTS_STORE)) {
          db.createObjectStore(MY_REPORTS_STORE, { keyPath: "client_id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        isFallback = true;
        resolve(null);
      };
    } catch {
      isFallback = true;
      resolve(null);
    }
  });
}

export function isOfflineFallbackActive() {
  return isFallback;
}

// Queue API
export async function enqueueReport(report: QueuedReport): Promise<void> {
  const db = await openDB();
  if (isFallback || !db) {
    fallbackQueue.push(report);
    console.warn("IndexedDB unavailable. Report saved in memory and will be lost if tab closes.");
    return;
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(report);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getQueue(): Promise<QueuedReport[]> {
  const db = await openDB();
  if (isFallback || !db) return fallbackQueue;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getOfflineQueueCount(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

export async function removeFromQueue(client_id: string): Promise<void> {
  const db = await openDB();
  if (isFallback || !db) {
    fallbackQueue = fallbackQueue.filter((r) => r.client_id !== client_id);
    return;
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(client_id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function updateReportStatus(client_id: string, updates: Partial<QueuedReport>): Promise<void> {
  const db = await openDB();
  if (isFallback || !db) {
    const idx = fallbackQueue.findIndex(r => r.client_id === client_id);
    if (idx !== -1) {
      fallbackQueue[idx] = { ...fallbackQueue[idx], ...updates };
    }
    return;
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(client_id);
    req.onsuccess = () => {
      if (req.result) {
        store.put({ ...req.result, ...updates });
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// My Reports Store API
export async function saveMyReport(report: { client_id: string; incident_id: string; created_at: string }): Promise<void> {
  const db = await openDB();
  if (isFallback || !db) {
    fallbackMyReports.push(report);
    return;
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MY_REPORTS_STORE, "readwrite");
    const store = tx.objectStore(MY_REPORTS_STORE);
    store.put(report);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getMyReport(client_id: string): Promise<{ client_id: string; incident_id: string; created_at: string } | undefined> {
  const db = await openDB();
  if (isFallback || !db) {
    return fallbackMyReports.find((r) => r.client_id === client_id);
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MY_REPORTS_STORE, "readonly");
    const store = tx.objectStore(MY_REPORTS_STORE);
    const req = store.get(client_id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Sync Logic
let isSyncing = false;

export async function trySyncQueue(): Promise<void> {
  if (typeof window === "undefined" || !navigator.onLine || isSyncing) return;

  // Use Web Locks API if available
  if (navigator.locks) {
    return navigator.locks.request("sajiloresq_sync", { ifAvailable: true }, async (lock) => {
      if (!lock) return; // Another tab is syncing
      await performSync();
    });
  } else {
    await performSync();
  }
}

async function performSync() {
  isSyncing = true;
  try {
    const queue = await getQueue();
    for (const report of queue) {
      // Allow previously 'failed' reports to retry since we fixed the payload schema bug
      if (report.retryCount >= 5) continue; // Max retries hit
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout
      
      try {
        const res = await fetch("/api/incidents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: report.client_id,
            incident_type: report.type,
            raw_text: report.description,
            location_source: report.location_source,
            latitude: report.lat,
            longitude: report.lng,
            location_text: report.location_text,
            attachment_paths: report.attachment_paths,
            offline_created: true
          }),
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          // Success or duplicate -> mark sent and remove from queue
          await saveMyReport({
            client_id: report.client_id,
            incident_id: data.incident_id || data.id,
            created_at: new Date().toISOString()
          });
          await removeFromQueue(report.client_id);
        } else if (res.status === 400) {
          // Validation error (non-retryable)
          const data = await res.json().catch(() => ({}));
          await updateReportStatus(report.client_id, { status: "failed", error_message: data.error || "Validation error" });
        } else {
          // 5xx, 429, etc.
          await updateReportStatus(report.client_id, { retryCount: report.retryCount + 1 });
        }
      } catch {
        clearTimeout(timeout);
        // Network error or timeout
        await updateReportStatus(report.client_id, { retryCount: report.retryCount + 1 });
      }
    }
  } finally {
    isSyncing = false;
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("online", trySyncQueue);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      trySyncQueue();
    }
  });
  // Initial sync attempt
  setTimeout(trySyncQueue, 1000);
}

export async function clearMyReports(): Promise<void> {
  const db = await openDB();
  if (isFallback || !db) {
    fallbackMyReports = [];
    fallbackQueue = [];
    localStorage.removeItem("sajiloresq_draft");
    return;
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction([MY_REPORTS_STORE, STORE_NAME], "readwrite");
    tx.objectStore(MY_REPORTS_STORE).clear();
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => {
      localStorage.removeItem("sajiloresq_draft");
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "fake-indexeddb/auto";
import { enqueueReport, getQueue, trySyncQueue, updateReportStatus, isOfflineFallbackActive } from "./queue";

// Mock global fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

// Mock navigator online
Object.defineProperty(navigator, "onLine", {
  writable: true,
  value: true,
});

describe("Offline Queue", () => {
  beforeEach(async () => {
    fetchMock.mockReset();
    
    // Clear DB
    await getQueue(); // this initializes the DB
    const db = await new Promise<IDBDatabase>((resolve) => {
      const req = indexedDB.open("SajiloResQ_OfflineDB", 1);
      req.onsuccess = () => resolve(req.result);
    });
    await new Promise((resolve) => {
      const tx = db.transaction(["queued_reports", "my_reports"], "readwrite");
      tx.objectStore("queued_reports").clear();
      tx.objectStore("my_reports").clear();
      tx.oncomplete = resolve;
    });
  });

  const sampleReport = {
    client_id: "123e4567-e89b-12d3-a456-426614174000",
    type: "fire",
    description: "Huge fire",
    location_source: "none" as const,
    attachment_paths: [],
    status: "pending" as const,
    retryCount: 0,
    created_at: new Date().toISOString(),
  };

  it("offline enqueue then online sync sends exactly once", async () => {
    // Enqueue
    await enqueueReport(sampleReport);
    let q = await getQueue();
    expect(q.length).toBe(1);

    // Mock fetch success
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ incident_id: "inc-1" }),
    });

    // Sync
    await trySyncQueue();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    
    q = await getQueue();
    expect(q.length).toBe(0); // Should be removed from queue
  });

  it("a duplicate:true replay counts as sent", async () => {
    await enqueueReport(sampleReport);

    fetchMock.mockResolvedValueOnce({
      ok: true, // server returns 200 for duplicates
      json: async () => ({ incident_id: "inc-1", duplicate: true }),
    });

    await trySyncQueue();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const q = await getQueue();
    expect(q.length).toBe(0);
  });

  it("a 400 is not retried", async () => {
    await enqueueReport(sampleReport);

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: "Validation failed" }),
    });

    await trySyncQueue();
    
    const q = await getQueue();
    expect(q.length).toBe(1);
    expect(q[0].status).toBe("failed");
    expect(q[0].error_message).toBe("Validation failed");

    // Second sync attempt should not fetch
    fetchMock.mockClear();
    await trySyncQueue();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("a network failure increments retryCount and stops at 5", async () => {
    await enqueueReport(sampleReport);

    for (let i = 0; i < 5; i++) {
      fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
      await trySyncQueue();
    }

    const q = await getQueue();
    expect(q.length).toBe(1);
    expect(q[0].retryCount).toBe(5);

    // 6th sync attempt should not fetch
    fetchMock.mockClear();
    await trySyncQueue();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("two concurrent trySyncQueue calls send once", async () => {
    await enqueueReport(sampleReport);
    
    // Make fetch take 100ms
    fetchMock.mockImplementation(() => new Promise(resolve => {
      setTimeout(() => {
        resolve({
          ok: true,
          json: async () => ({ incident_id: "inc-1" }),
        });
      }, 100);
    }));

    // Call concurrently
    await Promise.all([trySyncQueue(), trySyncQueue()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const q = await getQueue();
    expect(q.length).toBe(0);
  });

  it("IndexedDB-unavailable fallback keeps queue in memory", async () => {
    // Force a failure in indexedDB.open by using a mock
    const originalOpen = indexedDB.open;
    indexedDB.open = () => {
      throw new Error("Private Mode / IndexedDB Disabled");
    };

    // Since we cleared DB in beforeEach, the module might still have active connection.
    // Wait, getQueue already initialized it. Let's just mock the internal `getDB` or test `enqueueReport` behavior.
    // Actually, queue.ts has `isOfflineFallbackActive()`. Let's test the fallback directly.
    try {
      await enqueueReport({ ...sampleReport, client_id: "mem-1" });
      const q = await getQueue();
      // It should be saved in the memory fallback
      expect(q.some(r => r.client_id === "mem-1")).toBe(true);
      expect(isOfflineFallbackActive()).toBe(true);
    } finally {
      // restore
      indexedDB.open = originalOpen;
    }
  });
});

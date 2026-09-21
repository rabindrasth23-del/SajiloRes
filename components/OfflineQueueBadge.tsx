"use client";

import { useEffect, useState } from "react";
import { getQueue, trySyncQueue, QueuedReport, isOfflineFallbackActive } from "@/lib/offline/queue";
import { useLanguage } from "@/lib/i18n";
import { CloudOff, RefreshCw } from "lucide-react";

export function OfflineQueueBadge() {
  const { t } = useLanguage();
  const [queue, setQueue] = useState<QueuedReport[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    const checkQueue = async () => {
      try {
        const q = await getQueue();
        if (mounted) setQueue(q);
      } catch (err) {
        // ignore
      }
    };

    checkQueue();
    const interval = setInterval(checkQueue, 2000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (queue.length === 0) return null;

  const handleRetry = async () => {
    setIsSyncing(true);
    await trySyncQueue();
    const q = await getQueue();
    setQueue(q);
    setIsSyncing(false);
  };

  const isFallback = isOfflineFallbackActive();

  return (
    <div className="fixed bottom-24 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-navy text-white rounded-xl shadow-lg border border-white/10 p-4 z-40 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-white/10 rounded-lg shrink-0">
          <CloudOff className="w-5 h-5 text-yellow-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">
            {queue.length} {queue.length === 1 ? "report" : "reports"} offline
          </p>
          <p className="text-xs text-white/70 line-clamp-2 mt-0.5">
            {t("report.queue_badge")}
          </p>
          {isFallback && (
            <p className="text-xs text-red-400 mt-1 font-medium">
              Private mode detected. Reports will be lost if you close this tab.
            </p>
          )}
        </div>
      </div>
      <button
        onClick={handleRetry}
        disabled={isSyncing}
        className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
        {t("report.retry")}
      </button>
    </div>
  );
}

"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { getOfflineQueueCount } from "@/lib/offline/queue";

interface MetricsRowProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  incidents: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  events: any[];
}

export function MetricsRow({ incidents, events }: MetricsRowProps) {
  const [offlineCount, setOfflineCount] = useState(0);

  // Compute immediate count
  const immediateCount = incidents.filter(i => i.triage === "immediate").length;
  
  // Compute awaiting acknowledgement
  const awaitingCount = incidents.filter(i => 
    i.triage === "immediate" && i.status === "new"
  ).length;

  // Compute average triage time during render
  const avgTriageTimeStr = useMemo(() => {
    const pairs: Record<string, { received?: Date; triaged?: Date }> = {};
    events.forEach(ev => {
      if (!pairs[ev.incident_id]) pairs[ev.incident_id] = {};
      if (ev.event_type === "report_received") {
        pairs[ev.incident_id].received = new Date(ev.created_at);
      } else if (ev.event_type === "triage_recommended" || ev.event_type === "facts_extracted") {
        pairs[ev.incident_id].triaged = new Date(ev.created_at);
      }
    });

    let totalMs = 0;
    let count = 0;
    
    // Sort keys by latest received and take last 20
    const processedPairs = Object.values(pairs)
      .filter(p => p.received && p.triaged)
      .sort((a, b) => b.received!.getTime() - a.received!.getTime())
      .slice(0, 20);

    processedPairs.forEach(p => {
      totalMs += (p.triaged!.getTime() - p.received!.getTime());
      count++;
    });

    if (count > 0) {
      const avgSeconds = Math.round(totalMs / count / 1000);
      if (avgSeconds < 60) return `${avgSeconds} sec`;
      else return `${Math.round(avgSeconds/60)} min`;
    }
    return "—";
  }, [events]);

  useEffect(() => {
    let mounted = true;
    async function fetchQueue() {
      try {
        const count = await getOfflineQueueCount();
        if (mounted) setOfflineCount(count);
      } catch (e) {
        console.error(e);
      }
    }
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const immediateRef = useRef<HTMLDivElement>(null);
  const awaitingRef = useRef<HTMLDivElement>(null);
  const offlineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (immediateRef.current) {
      immediateRef.current.classList.remove("flash-highlight");
      void immediateRef.current.offsetWidth;
      immediateRef.current.classList.add("flash-highlight");
    }
  }, [immediateCount]);

  useEffect(() => {
    if (awaitingRef.current) {
      awaitingRef.current.classList.remove("flash-highlight");
      void awaitingRef.current.offsetWidth;
      awaitingRef.current.classList.add("flash-highlight");
    }
  }, [awaitingCount]);

  useEffect(() => {
    if (offlineRef.current) {
      offlineRef.current.classList.remove("flash-highlight");
      void offlineRef.current.offsetWidth;
      offlineRef.current.classList.add("flash-highlight");
    }
  }, [offlineCount]);

  return (
    <>
      <style>{`
        .flash-highlight {
          animation: highlight 1s ease-out;
        }
        @keyframes highlight {
          0% { transform: scale(1.1); opacity: 0.7; color: var(--teal); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 p-4 border-b border-mist bg-cloud/50 flex-none shrink-0">
        <div ref={immediateRef} className="bg-white p-3 md:p-4 rounded-xl border border-mist shadow-sm flex flex-col justify-center transition-shadow hover:shadow-md">
          <span className="text-xs font-medium text-minor uppercase tracking-wider mb-1">Immediate</span>
          <span className="text-2xl md:text-3xl font-heading font-bold text-immediate">{immediateCount}</span>
        </div>
        
        <div ref={awaitingRef} className="bg-white p-3 md:p-4 rounded-xl border border-mist shadow-sm flex flex-col justify-center transition-shadow hover:shadow-md">
          <span className="text-xs font-medium text-minor uppercase tracking-wider mb-1">Unacknowledged</span>
          <span className="text-2xl md:text-3xl font-heading font-bold text-ink">{awaitingCount}</span>
        </div>

        <div ref={offlineRef} className="bg-white p-3 md:p-4 rounded-xl border border-mist shadow-sm flex flex-col justify-center transition-shadow hover:shadow-md">
          <span className="text-xs font-medium text-minor uppercase tracking-wider mb-1">Offline queue</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-heading font-bold text-ink">{offlineCount}</span>
            <span className="text-[10px] text-minor/80 bg-mist/30 px-1.5 py-0.5 rounded">This device</span>
          </div>
        </div>

        <div className="bg-white p-3 md:p-4 rounded-xl border border-mist shadow-sm flex flex-col justify-center transition-shadow hover:shadow-md">
          <span className="text-xs font-medium text-minor uppercase tracking-wider mb-1">Avg triage time</span>
          <span className="text-2xl md:text-3xl font-heading font-bold text-teal">{avgTriageTimeStr}</span>
        </div>
      </div>
    </>
  );
}

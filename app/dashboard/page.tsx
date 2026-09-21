"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useDashboardContext } from "./DashboardContext";
import { IncidentQueue } from "@/components/dashboard/IncidentQueue";
import { MapLayer } from "@/components/dashboard/MapLayer";
import { AgentPanel } from "@/components/dashboard/AgentPanel";
import { MetricsRow } from "@/components/dashboard/MetricsRow";

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const { incidents, events, duplicates, responders, loading } = useDashboardContext();
  
  const selectedIncidentId = searchParams.get("selected");
  const currentTab = searchParams.get("tab") || "queue"; // Mobile tab
  
  const selectedIncident = incidents.find(i => i.id === selectedIncidentId) || null;

  const handleSelect = (id: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set("selected", id);
      if (window.innerWidth < 768) {
        params.set("tab", "agent");
      }
    } else {
      params.delete("selected");
    }
    router.replace(`/dashboard?${params.toString()}`, { scroll: false });
  };

  if (loading) {
     return <div className="p-8 text-minor text-center font-medium">Loading incidents...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      <MetricsRow incidents={incidents} events={events} />

      {/* Mobile Tabs */}
      <div className="md:hidden absolute bottom-0 left-0 right-0 h-[calc(3.5rem+env(safe-area-inset-bottom))] bg-white border-t border-mist z-[100] flex shadow-[0_-4px_12px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]">
        <button 
          onClick={() => router.replace(`/dashboard?tab=queue${selectedIncidentId ? '&selected='+selectedIncidentId : ''}`, { scroll: false })}
          className={`flex-1 flex items-center justify-center font-medium text-sm transition-colors ${currentTab === "queue" ? "text-navy bg-cloud" : "text-minor hover:bg-cloud"}`}
        >
          Queue
        </button>
        <button 
          onClick={() => router.replace(`/dashboard?tab=map${selectedIncidentId ? '&selected='+selectedIncidentId : ''}`, { scroll: false })}
          className={`flex-1 flex items-center justify-center font-medium text-sm transition-colors ${currentTab === "map" ? "text-navy bg-cloud" : "text-minor hover:bg-cloud"}`}
        >
          Map
        </button>
        <button 
          onClick={() => router.replace(`/dashboard?tab=agent${selectedIncidentId ? '&selected='+selectedIncidentId : ''}`, { scroll: false })}
          className={`flex-1 flex items-center justify-center font-medium text-sm transition-colors ${currentTab === "agent" ? "text-navy bg-cloud" : "text-minor hover:bg-cloud"} ${!selectedIncidentId ? 'opacity-40 pointer-events-none' : ''}`}
        >
          Panel
        </button>
      </div>

      {/* Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Queue Column: Mobile tab "queue" or Desktop always visible */}
        <div className={`${currentTab === "queue" ? "block" : "hidden"} md:block w-full md:w-[28%] border-r border-mist flex-shrink-0 h-[calc(100%-3.5rem-env(safe-area-inset-bottom))] md:h-full bg-cloud overflow-hidden`}>
          <IncidentQueue 
            incidents={incidents} 
            selectedId={selectedIncidentId} 
            onSelect={handleSelect} 
          />
        </div>

        {/* Map Column: Mobile tab "map" or Desktop always visible */}
        <div className={`${currentTab === "map" ? "block" : "hidden"} md:block w-full md:w-[44%] border-r border-mist flex-shrink-0 h-[calc(100%-3.5rem-env(safe-area-inset-bottom))] md:h-full relative overflow-hidden bg-mist`}>
          <MapLayer incidents={incidents} selectedId={selectedIncidentId} />
        </div>
        
        {/* Agent Panel Column: Mobile tab "agent" or Desktop always visible */}
        <div className={`${currentTab === "agent" ? "block" : "hidden"} md:block w-full md:w-[28%] flex-shrink-0 h-[calc(100%-3.5rem-env(safe-area-inset-bottom))] md:h-full overflow-hidden bg-white relative`}>
          {selectedIncident ? (
            <AgentPanel 
              incident={selectedIncident} 
              duplicates={duplicates}
              onClose={() => handleSelect(null)} 
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-minor p-8 text-center border border-mist bg-cloud/50 rounded-xl m-4">
              <span className="text-4xl mb-4 opacity-50">📋</span>
              <p>Select an incident from the queue or map to view AI recommendations and actions.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-minor text-center font-medium">Loading workspace...</div>}>
      <DashboardContent />
    </Suspense>
  );
}

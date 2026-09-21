import { useEffect, useState } from "react";
import { SortableIncident, sortIncidents } from "@/lib/incidents/sort";
import { IncidentCard } from "./IncidentCard";

interface IncidentQueueProps {
  incidents: SortableIncident[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function IncidentQueue({ incidents, selectedId, onSelect }: IncidentQueueProps) {
  const [latestImmediateId, setLatestImmediateId] = useState<string | null>(null);

  const activeIncidents = incidents.filter(i => 
    !["false_report"].includes(i.status)
  );

  const sortedIncidents = sortIncidents(activeIncidents);

  // aria-live logic for new immediate incidents
  useEffect(() => {
    const immediates = incidents.filter(i => i.triage === "immediate");
    if (immediates.length > 0) {
      // Sort by latest created
      const latest = [...immediates].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0];
      if (latest && latest.id !== latestImmediateId) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLatestImmediateId(latest.id);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidents]);

  return (
    <div className="h-full flex flex-col bg-cloud overflow-hidden relative">
      {/* Invisible live region for screen readers */}
      <div role="region" aria-live="polite" className="sr-only">
        {latestImmediateId ? `New immediate incident received: ID ${latestImmediateId.slice(0, 8)}` : ""}
      </div>

      <div className="flex-none p-4 border-b border-mist bg-white">
        <h2 className="font-heading font-semibold text-lg text-ink">Incident Queue</h2>
        <p className="text-sm text-minor">{sortedIncidents.length} active incidents</p>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {sortedIncidents.length === 0 ? (
          <div className="p-8 text-center text-minor">
            No incidents in queue.
          </div>
        ) : (
          <div className="flex flex-col pb-8">
            {sortedIncidents.map((incident) => (
              <IncidentCard 
                key={incident.id} 
                incident={incident} 
                isSelected={incident.id === selectedId} 
                onClick={() => onSelect(incident.id)} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

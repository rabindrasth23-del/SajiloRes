"use client";

import { useEffect, useState, useCallback } from "react";
import { Map, AdvancedMarker, useMap, InfoWindow } from "@vis.gl/react-google-maps";
import Link from "next/link";
import { isUnacknowledgedImmediate } from "@/lib/incidents/sort";

const colors = {
  immediate: "#DC2626",
  delayed: "#D97706",
  minor: "#15803D",
  unknown: "#7C3AED",
  dispatched: "#0F766E"
};

function LegendControl() {
  return (
    <div className="absolute bottom-6 right-2 z-[0] bg-white p-2 rounded text-[11px] font-sans shadow shadow-black/20 pointer-events-none">
      <div className="mb-1 flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-[#DC2626]" /> Immediate</div>
      <div className="mb-1 flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-[#D97706]" /> Delayed</div>
      <div className="mb-1 flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-[#15803D]" /> Minor</div>
      <div className="mb-1 flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-[#7C3AED]" /> Unknown</div>
      <div className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-[#0F766E]" /> Dispatched</div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RecenterControl({ incidents }: { incidents: any[] }) {
  const map = useMap();
  
  const handleRecenter = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!map || !window.google) return;
    
    const bounds = new window.google.maps.LatLngBounds();
    let hasUrgent = false;
    
    incidents.forEach(i => {
      if (i.triage === "immediate" && i.latitude && i.longitude) {
        bounds.extend({ lat: i.latitude, lng: i.longitude });
        hasUrgent = true;
      }
    });
    
    if (hasUrgent && !bounds.isEmpty()) {
      map.fitBounds(bounds, 50);
    } else {
      let hasAny = false;
      incidents.forEach(i => {
        if (i.latitude && i.longitude) {
          bounds.extend({ lat: i.latitude, lng: i.longitude });
          hasAny = true;
        }
      });
      if (hasAny && !bounds.isEmpty()) {
        map.fitBounds(bounds, 50);
      } else {
        map.setCenter({ lat: 27.7172, lng: 85.3240 });
        map.setZoom(12);
      }
    }
  }, [map, incidents]);

  return (
    <div className="absolute top-[60px] right-2.5 z-[0]">
      <button 
        onClick={handleRecenter}
        title="Center on urgent incidents"
        className="flex items-center justify-center w-10 h-10 bg-white text-slate-800 rounded-sm shadow hover:bg-slate-50 transition-colors text-lg"
      >
        ⌖
      </button>
    </div>
  );
}

function MapTypeControl({ mapTypeId, onChange }: { mapTypeId: string, onChange: (id: string) => void }) {
  return (
    <div className="absolute top-2.5 left-2.5 z-[0] flex bg-white shadow rounded-sm overflow-hidden text-[13px] font-medium font-sans">
      <button 
        onClick={() => onChange("roadmap")}
        className={`px-3 py-2 ${mapTypeId === "roadmap" ? "bg-slate-200 text-black font-bold" : "hover:bg-slate-100"}`}
      >
        Standard
      </button>
      <button 
        onClick={() => onChange("hybrid")}
        className={`px-3 py-2 ${mapTypeId === "hybrid" ? "bg-slate-200 text-black font-bold" : "hover:bg-slate-100"}`}
      >
        Satellite
      </button>
    </div>
  );
}

interface GoogleMapProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  incidents: any[];
  selectedId: string | null;
  onSelect?: (id: string | null) => void;
}

export default function GoogleMap({ incidents, selectedId, onSelect }: GoogleMapProps) {
  const [mapTypeId, setMapTypeId] = useState<string>("roadmap");
  const defaultCenter = { lat: 27.7172, lng: 85.3240 };
  const noLocationCount = incidents.filter(i => !i.latitude || !i.longitude).length;
  
  const [activePopupId, setActivePopupId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedId) {
      setActivePopupId(selectedId);
    }
  }, [selectedId]);

  const map = useMap();
  useEffect(() => {
    if (selectedId && map && window.google) {
      const incident = incidents.find(i => i.id === selectedId);
      if (incident && incident.latitude && incident.longitude) {
        map.panTo({ lat: incident.latitude, lng: incident.longitude });
        map.setZoom(15);
      }
    }
  }, [selectedId, incidents, map]);

  return (
    <div className="w-full h-full relative z-0">
      <Map
        defaultZoom={12}
        defaultCenter={defaultCenter}
        mapTypeId={mapTypeId}
        disableDefaultUI={true}
        zoomControl={true}
        mapId="DEMO_MAP_ID"
        style={{ width: "100%", height: "100%" }}
      >
        <MapTypeControl mapTypeId={mapTypeId} onChange={setMapTypeId} />
        <RecenterControl incidents={incidents} />
        <LegendControl />

        {incidents.map(i => {
          if (!i.latitude || !i.longitude || i.status === "false_report" || i.status === "rejected") return null;

          let color = colors.unknown;
          if (i.status === "dispatched") color = colors.dispatched;
          else if (i.triage === "immediate") color = colors.immediate;
          else if (i.triage === "delayed") color = colors.delayed;
          else if (i.triage === "minor") color = colors.minor;

          const isSelected = i.id === activePopupId;
          const isPulse = isUnacknowledgedImmediate(i.triage, i.status);
          
          return (
            <AdvancedMarker 
              key={`inc-${i.id}`}
              position={{ lat: i.latitude, lng: i.longitude }}
              onClick={() => setActivePopupId(i.id)}
              zIndex={isSelected ? 100 : i.triage === 'immediate' ? 50 : 1}
            >
              <div 
                className={`rounded-full border-white shadow-md ${isSelected ? 'border-[3px]' : 'border-[2px]'}`}
                style={{ 
                  backgroundColor: color, 
                  width: isSelected ? '18px' : '14px', 
                  height: isSelected ? '18px' : '14px',
                  animation: isPulse ? 'pulse 2s infinite' : 'none' 
                }}
              />
              
              {isSelected && (
                <InfoWindow 
                  position={{ lat: i.latitude, lng: i.longitude }} 
                  onCloseClick={() => setActivePopupId(null)}
                  headerDisabled={true}
                  pixelOffset={[0, -10]}
                >
                  <div className="p-1 min-w-[200px]">
                    <div className="font-heading font-semibold text-sm mb-1 break-all">ID: {i.id.slice(0,8)}</div>
                    <div className="text-xs text-ink mb-1">{i.incident_type || "Unknown type"}</div>
                    <div className="text-xs text-minor max-w-[200px] line-clamp-3 mb-2">{i.summary || i.raw_text}</div>
                    <div className="text-xs font-semibold capitalize px-2 py-0.5 bg-mist text-ink rounded inline-block mb-3">
                      {i.status.replace("_", " ")}
                    </div>
                    <div className="border-t border-mist pt-2">
                       <button onClick={(e) => { e.preventDefault(); setActivePopupId(null); onSelect?.(i.id); }} className="w-full text-teal text-xs font-medium hover:underline block text-center">
                         Open details
                       </button>
                    </div>
                  </div>
                </InfoWindow>
              )}
            </AdvancedMarker>
          );
        })}
      </Map>

      {noLocationCount > 0 && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-[0] bg-white border border-mist shadow-lg px-4 py-2 rounded-full text-sm font-medium text-ink flex items-center gap-2 pointer-events-none">
           <span className="w-2 h-2 rounded-full bg-warning-dark block"></span>
           {noLocationCount} incident{noLocationCount !== 1 && 's'} have no location
        </div>
      )}
      
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(220, 38, 38, 0); }
          100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
        }
      `}</style>
    </div>
  );
}

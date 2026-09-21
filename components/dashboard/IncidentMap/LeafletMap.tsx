"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { isUnacknowledgedImmediate } from "@/lib/incidents/sort";

// Fix default icon issue with Leaflet in Next.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom Icons mapped to tokens
const createIcon = (color: string) => {
  return L.divIcon({
    className: "custom-div-icon",
    html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
};

const icons = {
  immediate: createIcon("#DC2626"), // --immediate red
  delayed: createIcon("#D97706"),   // --delayed amber
  minor: createIcon("#15803D"),     // --minor green
  unknown: createIcon("#7C3AED"),   // --review purple
  dispatched: createIcon("#0F766E") // --teal
};

function LegendControl() {
  const map = useMap();
  useEffect(() => {
    const control = new L.Control({ position: 'bottomright' });
    control.onAdd = () => {
      const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
      div.innerHTML = `
        <div style="background: white; padding: 8px; border-radius: 4px; font-size: 12px; font-family: sans-serif; box-shadow: 0 1px 3px rgba(0,0,0,0.2);">
          <div style="margin-bottom: 4px; display: flex; items-center; gap: 4px;"><span style="display:inline-block; width:10px; height:10px; background:#DC2626; border-radius:50%;"></span> Immediate</div>
          <div style="margin-bottom: 4px; display: flex; items-center; gap: 4px;"><span style="display:inline-block; width:10px; height:10px; background:#D97706; border-radius:50%;"></span> Delayed</div>
          <div style="margin-bottom: 4px; display: flex; items-center; gap: 4px;"><span style="display:inline-block; width:10px; height:10px; background:#15803D; border-radius:50%;"></span> Minor</div>
          <div style="margin-bottom: 4px; display: flex; items-center; gap: 4px;"><span style="display:inline-block; width:10px; height:10px; background:#7C3AED; border-radius:50%;"></span> Unknown</div>
          <div style="display: flex; items-center; gap: 4px;"><span style="display:inline-block; width:10px; height:10px; background:#0F766E; border-radius:50%;"></span> Dispatched</div>
        </div>
      `;
      return div;
    };
    control.addTo(map);
    return () => {
      control.remove();
    };
  }, [map]);
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RecenterControl({ incidents }: { incidents: any[] }) {
  const map = useMap();
  
  useEffect(() => {
    const control = new L.Control({ position: 'topright' });
    control.onAdd = () => {
      const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
      div.innerHTML = `<a href="#" title="Center on urgent incidents" role="button" aria-label="Center on urgent incidents" style="display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; background-color: white; color: #1e293b; text-decoration: none;">⌖</a>`;
      div.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const bounds = L.latLngBounds([]);
        incidents.forEach(i => {
          // Only center on urgent (immediate) incidents
          if (i.triage === "immediate" && i.latitude && i.longitude) {
            bounds.extend([i.latitude, i.longitude]);
          }
        });
        
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50] });
        } else {
          // fallback to all incidents
          incidents.forEach(i => {
             if (i.latitude && i.longitude) bounds.extend([i.latitude, i.longitude]);
          });
          if (bounds.isValid()) {
             map.fitBounds(bounds, { padding: [50, 50] });
          } else {
            map.setView([27.7172, 85.3240], 12);
          }
        }
      };
      return div;
    };
    control.addTo(map);
    return () => {
      control.remove();
    };
  }, [map, incidents]);
  return null;
}

interface MapComponentProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  incidents: any[];
  selectedId: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SelectionFlyTo({ incidents, selectedId }: { incidents: any[], selectedId: string | null }) {
  const map = useMap();
  useEffect(() => {
    if (selectedId) {
      const incident = incidents.find(i => i.id === selectedId);
      if (incident && incident.latitude && incident.longitude) {
        map.flyTo([incident.latitude, incident.longitude], 15, { duration: 1.5 });
      }
    }
  }, [selectedId, incidents, map]);
  return null;
}

export default function LeafletMap({ incidents, selectedId }: MapComponentProps) {
  const defaultCenter: [number, number] = [27.7172, 85.3240];
  const noLocationCount = incidents.filter(i => !i.latitude || !i.longitude).length;

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer 
        center={defaultCenter} 
        zoom={12} 
        style={{ height: "100%", width: "100%", zIndex: 0 }}
        zoomControl={true}
      >
        <SelectionFlyTo incidents={incidents} selectedId={selectedId} />
        <LayersControl position="topleft">
          <LayersControl.BaseLayer checked name="Standard">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>
        </LayersControl>
        
        <RecenterControl incidents={incidents} />
        <LegendControl />

        {/* Incidents */}
        {incidents.map(i => {
          if (!i.latitude || !i.longitude || i.status === "false_report" || i.status === "rejected") return null;
          
          let iconType = icons.unknown;
          if (i.status === "dispatched") iconType = icons.dispatched;
          else if (i.triage === "immediate") iconType = icons.immediate;
          else if (i.triage === "delayed") iconType = icons.delayed;
          else if (i.triage === "minor") iconType = icons.minor;

          const isSelected = i.id === selectedId;
          const isPulse = isUnacknowledgedImmediate(i.triage, i.status);
          const icon = isSelected ? L.divIcon({
            className: "custom-div-icon",
            html: `<div style="background-color: ${(iconType.options.html as string)?.match(/background-color: (.*?);/)?.[1]}; width: 18px; height: 18px; border-radius: 50%; border: 3px solid #1e293b; box-shadow: 0 0 8px rgba(0,0,0,0.6); ${isPulse ? 'animation: pulse 2s infinite;' : ''}"></div>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9]
          }) : L.divIcon({
            className: "custom-div-icon",
            html: `<div style="background-color: ${(iconType.options.html as string)?.match(/background-color: (.*?);/)?.[1]}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4); ${isPulse ? 'animation: pulse 2s infinite;' : ''}"></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7]
          });

          return (
            <Marker key={`inc-${i.id}`} position={[i.latitude, i.longitude]} icon={icon}>
              <Popup>
                <div className="font-heading font-semibold text-sm mb-1 break-all">ID: {i.id.slice(0,8)}</div>
                <div className="text-xs text-ink mb-1">{i.incident_type || "Unknown type"}</div>
                <div className="text-xs text-minor max-w-[200px] line-clamp-3 mb-2">{i.summary || i.raw_text}</div>
                <div className="text-xs font-semibold capitalize px-2 py-0.5 bg-mist text-ink rounded inline-block mb-3">
                  {i.status.replace("_", " ")}
                </div>
                <div className="border-t border-mist pt-2">
                   <Link href={`/dashboard?selected=${i.id}&tab=agent`} className="text-teal text-xs font-medium hover:underline block text-center">
                     Open details
                   </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* No Location Chip */}
      {noLocationCount > 0 && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-[400] bg-white border border-mist shadow-lg px-4 py-2 rounded-full text-sm font-medium text-ink flex items-center gap-2">
           <span className="w-2 h-2 rounded-full bg-warning-dark block"></span>
           {noLocationCount} incident{noLocationCount !== 1 && 's'} have no location
        </div>
      )}
    </div>
  );
}

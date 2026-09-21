import React, { useState, useCallback, useEffect } from "react";
import { Map, AdvancedMarker, Pin, MapMouseEvent } from "@vis.gl/react-google-maps";

interface Props {
  lat?: number;
  lng?: number;
  onChange: (lat: number, lng: number) => void;
}

const DEFAULT_CENTER = { lat: 27.7172, lng: 85.3240 }; // Kathmandu

export default function GoogleLocationMap({ lat, lng, onChange }: Props) {
  const [center, setCenter] = useState(DEFAULT_CENTER);

  // Initialize center to provided lat/lng if available
  useEffect(() => {
    if (lat !== undefined && lng !== undefined) {
      setCenter({ lat, lng });
    }
  }, [lat, lng]);

  const handleMapClick = useCallback((e: MapMouseEvent) => {
    if (e.detail.latLng) {
      onChange(e.detail.latLng.lat, e.detail.latLng.lng);
    }
  }, [onChange]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMarkerDragEnd = useCallback((e: any) => {
    if (e.latLng) {
      onChange(e.latLng.lat(), e.latLng.lng());
    }
  }, [onChange]);

  return (
    <Map
      defaultZoom={13}
      center={center}
      onCenterChanged={(ev) => setCenter(ev.detail.center)}
      onClick={handleMapClick}
      mapId="DEMO_MAP_ID"
      disableDefaultUI={true}
      zoomControl={true}
      gestureHandling="greedy"
    >
      {lat !== undefined && lng !== undefined && (
        <AdvancedMarker
          position={{ lat, lng }}
          draggable={true}
          onDragEnd={handleMarkerDragEnd}
        >
          <Pin background={"#0F766E"} borderColor={"#042F2E"} glyphColor={"white"} scale={1.2} />
        </AdvancedMarker>
      )}
    </Map>
  );
}

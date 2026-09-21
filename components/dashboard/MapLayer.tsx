"use client";

import React from "react";
import dynamic from "next/dynamic";
import { AlertTriangle } from "lucide-react";

const MapComponent = dynamic(() => import("./MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-mist text-minor">
      Loading map...
    </div>
  )
});

interface MapLayerProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  incidents: any[];
  selectedId: string | null;
}

class MapErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  componentDidCatch(error: any, errorInfo: any) {
    console.error("Map rendering error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-cloud text-minor p-8 text-center border-l border-mist">
          <AlertTriangle className="w-8 h-8 mb-4 text-warning" />
          <p className="font-medium">Map unavailable. Incident list and text location remain available.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export function MapLayer(props: MapLayerProps) {
  return (
    <MapErrorBoundary>
      <MapComponent {...props} />
    </MapErrorBoundary>
  );
}

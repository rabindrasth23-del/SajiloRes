"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { AlertTriangle } from "lucide-react";
import { APIProvider } from "@vis.gl/react-google-maps";

const LeafletLocationMap = dynamic(() => import("./LeafletLocationMap"), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center bg-mist text-minor min-h-[200px]">Loading map...</div>
});

const GoogleLocationMap = dynamic(() => import("./GoogleLocationMap"), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center bg-mist text-minor min-h-[200px]">Loading Google Map...</div>
});

interface LocationMapPickerProps {
  lat?: number;
  lng?: number;
  onChange: (lat: number, lng: number) => void;
}

class MapErrorBoundary extends React.Component<{ children: React.ReactNode, onFallback?: () => void }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode, onFallback?: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  componentDidCatch(error: any, errorInfo: any) {
    console.error("Map rendering error:", error, errorInfo);
    if (this.props.onFallback) {
      this.props.onFallback();
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError && !this.props.onFallback) {
      return (
        <div className="w-full h-[200px] flex flex-col items-center justify-center bg-cloud text-minor p-4 text-center border border-mist rounded-xl">
          <AlertTriangle className="w-6 h-6 mb-2 text-warning" />
          <p className="font-medium text-sm">Map unavailable. Please use text search or GPS.</p>
        </div>
      );
    }
    if (this.state.hasError && this.props.onFallback) {
      return null;
    }
    return this.props.children;
  }
}

export function LocationMapPicker(props: LocationMapPickerProps) {
  const [provider, setProvider] = useState<"google" | "leaflet">("leaflet");
  const [googleKey] = useState(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "");
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_MAP_PROVIDER === "google" && googleKey) {
      setProvider("google");
    } else {
      setProvider("leaflet");
    }
  }, [googleKey]);

  const handleGoogleError = () => {
    console.warn("LocationMapPicker: Google Maps failed to load or authenticate. Falling back to Leaflet.");
    setUseFallback(true);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Handle authentication failures globally
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const currentHandler = (window as any).gm_authFailure;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).gm_authFailure = () => {
        if (currentHandler) currentHandler();
        handleGoogleError();
      };
    }
  }, []);

  if (provider === "google" && googleKey && !useFallback) {
    return (
      <div className="w-full h-[300px] rounded-xl overflow-hidden border border-mist shadow-sm relative">
        <MapErrorBoundary onFallback={handleGoogleError}>
          <APIProvider 
            apiKey={googleKey} 
            onError={handleGoogleError}
          >
            <GoogleLocationMap {...props} />
          </APIProvider>
        </MapErrorBoundary>
      </div>
    );
  }

  return (
    <div className="w-full h-[300px] rounded-xl overflow-hidden border border-mist shadow-sm relative">
      <MapErrorBoundary>
        <LeafletLocationMap {...props} />
      </MapErrorBoundary>
    </div>
  );
}

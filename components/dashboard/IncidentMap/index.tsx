"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { AlertTriangle } from "lucide-react";
import { APIProvider } from "@vis.gl/react-google-maps";

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center bg-mist text-minor">Loading map...</div>
});

const GoogleMap = dynamic(() => import("./GoogleMap"), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center bg-mist text-minor">Loading Google Map...</div>
});

interface IncidentMapProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  incidents: any[];
  selectedId: string | null;
  onSelect?: (id: string | null) => void;
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
      // Only reset the error state if we successfully called the fallback
      // In the next render, it should switch to Leaflet, but we delay resetting here
      // However, to allow the tree to render, we can just clear it.
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError && !this.props.onFallback) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-cloud text-minor p-8 text-center border-l border-mist">
          <AlertTriangle className="w-8 h-8 mb-4 text-warning" />
          <p className="font-medium">Map unavailable. Incident list and text location remain available.</p>
        </div>
      );
    }
    // If it has an error but there's a fallback, it will unmount during next render anyway
    if (this.state.hasError && this.props.onFallback) {
      return null;
    }
    return this.props.children;
  }
}

export function IncidentMap(props: IncidentMapProps) {
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
    console.error("Google Maps failed to load or authenticate. Falling back to Leaflet.");
    setUseFallback(true);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Google Maps JS API calls this global function on auth failure (quota, billing, invalid key)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).gm_authFailure = handleGoogleError;
    }
  }, []);

  if (provider === "google" && googleKey && !useFallback) {
    return (
      <MapErrorBoundary onFallback={handleGoogleError}>
        <APIProvider 
          apiKey={googleKey} 
          onError={handleGoogleError}
        >
          <GoogleMap {...props} />
        </APIProvider>
      </MapErrorBoundary>
    );
  }

  return (
    <MapErrorBoundary>
      <LeafletMap {...props} />
    </MapErrorBoundary>
  );
}

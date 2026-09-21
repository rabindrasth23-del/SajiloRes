"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { MapPin, Navigation, AlertCircle } from "lucide-react";
import clsx from "clsx";
import { LocationMapPicker } from "./LocationMapPicker";

export type LocationData = {
  source: "gps" | "typed" | "none" | "map_selection";
  lat?: number;
  lng?: number;
  text?: string;
};

type Props = {
  value: LocationData;
  onChange: (val: LocationData) => void;
};

export function LocationPicker({ value, onChange }: Props) {
  const { t } = useLanguage();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const [showMap, setShowMap] = useState(false);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setStatus("error");
      setErrorMsg("Geolocation not supported");
      return;
    }

    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStatus("success");
        setShowMap(false);
        onChange({
          source: "gps",
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          text: value.text, // keep text if they typed something
        });
      },
      (error) => {
        setStatus("error");
        setErrorMsg(error.message || "Failed to get location");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000, // 10s timeout
        maximumAge: 0,
      }
    );
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    onChange({
      ...value,
      source: value.source === "gps" || value.source === "map_selection" ? value.source : text.trim() ? "typed" : "none",
      text,
    });
  };

  const handleMapChange = (lat: number, lng: number) => {
    setStatus("success");
    onChange({
      ...value,
      source: "map_selection",
      lat,
      lng,
    });
  };

  const isMapOrGpsSet = value.source === "gps" || value.source === "map_selection";

  return (
    <div className="flex flex-col gap-4">
      {!isMapOrGpsSet ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleGetLocation}
            disabled={status === "loading"}
            className={clsx(
              "flex items-center justify-center gap-2 w-full py-4 rounded-xl border-2 font-semibold transition-colors focus-ring",
              status === "loading"
                ? "bg-cloud border-mist text-ink/50 cursor-not-allowed"
                : status === "error"
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-white border-mist text-navy hover:border-teal/50"
            )}
          >
            <Navigation className={clsx("w-5 h-5", status === "loading" && "animate-pulse")} />
            {status === "loading"
              ? t("form.location_getting")
              : "Use GPS"}
          </button>
          
          <button
            type="button"
            onClick={() => setShowMap(!showMap)}
            className={clsx(
              "flex items-center justify-center gap-2 w-full py-4 rounded-xl border-2 font-semibold transition-colors focus-ring",
              showMap ? "bg-teal/10 border-teal text-teal" : "bg-white border-mist text-navy hover:border-teal/50"
            )}
          >
            <MapPin className="w-5 h-5" />
            Choose on Map
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 p-4 bg-teal/10 border-2 border-teal rounded-xl text-teal font-semibold">
            <MapPin className="w-5 h-5" />
            {value.source === "map_selection" ? "Map pin set" : t("form.location_success")}
            <div className="ml-auto text-xs opacity-70">
              {value.lat?.toFixed(4)}, {value.lng?.toFixed(4)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
               setStatus("idle");
               setShowMap(false);
               onChange({ ...value, source: value.text ? "typed" : "none", lat: undefined, lng: undefined });
            }}
            className="text-xs text-navy font-semibold underline underline-offset-2 self-end hover:text-teal"
          >
            Reset Location
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="text-red-600 text-sm flex items-center gap-1.5 px-1">
          <AlertCircle className="w-4 h-4" />
          {errorMsg}
        </div>
      )}

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <MapPin className="w-5 h-5 text-ink/40" />
        </div>
        <input
          type="text"
          value={value.text || ""}
          onChange={handleTextChange}
          placeholder={t("form.location_fallback")}
          className="w-full pl-11 pr-4 py-4 bg-white border-2 border-mist rounded-xl text-ink placeholder:text-ink/40 focus:border-teal focus:outline-none focus:ring-4 focus:ring-teal/20 transition-all text-[16px]"
        />
      </div>

      {showMap && (
        <div className="w-full mt-2 animate-in fade-in slide-in-from-top-4 duration-300 ease-out">
          {/* Default to Kathmandu, or previously set GPS/typed location if valid coordinates were somehow resolved */}
          {/* Note: since text input doesn't resolve to lat/lng, we pass lat/lng if we have them */}
          {/* In the implementation plan, user asked to center on last known text... but text to lat/lng geocoding isn't implemented here yet. We'll pass current lat/lng or default to Kathmandu inside the MapPicker */}
          <LocationMapPicker 
            lat={value.lat} 
            lng={value.lng} 
            onChange={handleMapChange} 
          />
        </div>
      )}
    </div>
  );
}

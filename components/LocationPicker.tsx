"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { MapPin, Navigation, AlertCircle } from "lucide-react";
import clsx from "clsx";

export type LocationData = {
  source: "gps" | "typed" | "none";
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
      source: value.source === "gps" ? "gps" : text.trim() ? "typed" : "none",
      text,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {status !== "success" ? (
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
            : t("form.use_location")}
        </button>
      ) : (
        <div className="flex items-center gap-3 p-4 bg-teal/10 border-2 border-teal rounded-xl text-teal font-semibold">
          <MapPin className="w-5 h-5" />
          {t("form.location_success")}
          <div className="ml-auto text-xs opacity-70">
            {value.lat?.toFixed(4)}, {value.lng?.toFixed(4)}
          </div>
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
    </div>
  );
}

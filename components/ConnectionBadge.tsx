"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";
import clsx from "clsx";

interface ConnectionBadgeProps {
  className?: string;
  state?: "online" | "offline" | "syncing" | "synced" | "error";
  syncCount?: number;
}

export function ConnectionBadge({ className, state, syncCount }: ConnectionBadgeProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const currentState = state || (isOnline ? "online" : "offline");

  if (!mounted && !state) {
    return (
      <div className={clsx("flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border bg-cloud text-teal border-mist", className)}>
        <div className="w-1.5 h-1.5 rounded-full bg-cyan" aria-hidden="true" />
        <span>Online</span>
      </div>
    );
  }


  return (
    <div
      className={clsx(
        "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border",
        currentState === "online" && "bg-cloud text-teal border-mist",
        (currentState === "offline" || currentState === "error") && "bg-navy text-white border-navy",
        currentState === "syncing" && "bg-cloud text-teal border-mist",
        currentState === "synced" && "bg-cloud text-minor border-minor/20",
        className
      )}
    >
      {currentState === "online" && (
        <>
          <div className="w-1.5 h-1.5 rounded-full bg-cyan" aria-hidden="true" />
          <span>Online</span>
        </>
      )}
      {(currentState === "offline" || currentState === "error") && (
        <>
          <WifiOff className="w-3.5 h-3.5 text-mist" />
          <span>{currentState === "error" ? "Connection error" : "Offline — saving locally"}</span>
        </>
      )}
      {currentState === "syncing" && (
        <>
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Syncing {syncCount !== undefined && syncCount > 0 ? `${syncCount} ` : ""}reports</span>
        </>
      )}
      {currentState === "synced" && (
        <>
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>All reports synchronized</span>
        </>
      )}
    </div>
  );
}

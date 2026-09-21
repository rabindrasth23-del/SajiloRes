"use client";

import { useLanguage, TranslationKey } from "@/lib/i18n";
import { INCIDENT_TYPES } from "@/lib/validation/schemas";
import clsx from "clsx";
import { Flame, Waves, HeartPulse, ShieldAlert, Zap, Stethoscope, MountainSnow, Building } from "lucide-react";

export type IncidentType = typeof INCIDENT_TYPES[number];

type Props = {
  value: IncidentType | undefined;
  onChange: (value: IncidentType) => void;
};

export function IncidentTypeSelector({ value, onChange }: Props) {
  const { t } = useLanguage();

  const options: { id: IncidentType; icon: React.ElementType; labelKey: TranslationKey }[] = [
    { id: "building_collapse", icon: Building, labelKey: "incident.earthquake" },
    { id: "flood_landslide", icon: Waves, labelKey: "incident.flood" },
    { id: "fire", icon: Flame, labelKey: "incident.fire" },
    { id: "medical", icon: HeartPulse, labelKey: "incident.medical" },
    { id: "road_blockage", icon: ShieldAlert, labelKey: "incident.road_blockage" },
    { id: "other", icon: Zap, labelKey: "incident.other" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {options.map((opt) => {
        const isSelected = value === opt.id;
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={clsx(
              "group flex flex-col items-center justify-center p-6 rounded-2xl border transition-all duration-300 focus-ring text-center shadow-sm hover:shadow-md hover:-translate-y-1 active:scale-95",
              isSelected
                ? "border-teal bg-teal/5 text-navy ring-1 ring-teal"
                : "border-mist bg-white text-ink/80 hover:border-teal/30 hover:bg-cloud"
            )}
            aria-pressed={isSelected}
          >
            <div className={clsx(
              "p-3 rounded-xl mb-3 transition-colors duration-300",
              isSelected ? "bg-teal text-white" : "bg-mist/30 text-navy/50 group-hover:bg-teal/10 group-hover:text-teal"
            )}>
              <Icon className="w-8 h-8" />
            </div>
            <span className="font-semibold text-sm leading-tight">
              {t(opt.labelKey)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

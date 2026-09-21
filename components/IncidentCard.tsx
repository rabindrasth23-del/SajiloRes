import { Card, CardContent } from "@/components/ui/card";
import { TriageBadge } from "@/components/TriageBadge";
import { MapPin, Clock, AlertCircle } from "lucide-react";
import clsx from "clsx";

export interface IncidentCardProps {
  id: string;
  title: string;
  location: string;
  timeAgo: string;
  triageLevel: "immediate" | "delayed" | "minor" | "unknown";
  active?: boolean;
  selected?: boolean;
  onClick?: (id: string) => void;
}

export function IncidentCard({
  id,
  title,
  location,
  timeAgo,
  triageLevel,
  active = false,
  selected = false,
  onClick
}: IncidentCardProps) {
  return (
    <Card 
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.(id);
        }
      }}
      className={clsx(
        "cursor-pointer transition-colors focus-ring hover:border-teal text-left w-full",
        selected ? "border-teal bg-teal/5" : "border-mist bg-white"
      )}
    >
      <CardContent className="p-4 flex flex-col gap-3">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-semibold text-ink leading-tight text-sm line-clamp-2 flex-1">
            {title}
          </h3>
          <TriageBadge level={triageLevel} active={active} className="shrink-0" />
        </div>
        
        <div className="flex flex-col gap-1.5 text-xs text-ink/70">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-ink/50" aria-hidden="true" />
            <span className="truncate">{location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 shrink-0 text-ink/50" aria-hidden="true" />
            <span>{timeAgo}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

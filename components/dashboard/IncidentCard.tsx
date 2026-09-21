import { SortableIncident, isUnacknowledgedImmediate } from "@/lib/incidents/sort";
import { formatDistanceToNow } from "date-fns";
import clsx from "clsx";
import { AlertTriangle, Clock, MapPin, Activity, CheckCircle, XCircle } from "lucide-react";

interface IncidentCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  incident: any;
  isSelected: boolean;
  onClick: () => void;
}

export function IncidentCard({ incident, isSelected, onClick }: IncidentCardProps) {
  const timeAgo = incident.created_at ? formatDistanceToNow(new Date(incident.created_at), { addSuffix: true }) : "Unknown time";
  
  // Minimalist triage colors
  const triageColors = {
    immediate: "bg-urgent/10 text-urgent border-urgent/20",
    delayed: "bg-warning/10 text-warning-dark border-warning/20",
    minor: "bg-minor/10 text-minor border-minor/20",
    unknown: "bg-mist/50 text-ink border-mist",
  };
  
  const triageColor = incident.triage ? triageColors[incident.triage as keyof typeof triageColors] : triageColors.unknown;

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'new':
      case 'ai_pending':
        return <Activity className="w-3.5 h-3.5" />;
      case 'resolved':
        return <CheckCircle className="w-3.5 h-3.5" />;
      case 'rejected':
      case 'false_report':
        return <XCircle className="w-3.5 h-3.5" />;
      default:
        return <Clock className="w-3.5 h-3.5" />;
    }
  };

  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full text-left p-4 border-b transition-colors focus:outline-none focus:bg-mist",
        isSelected 
          ? "bg-white border-l-4 border-l-navy border-b-mist" 
          : "bg-white hover:bg-cloud border-l-4 border-l-transparent border-b-mist"
      )}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-medium text-minor bg-cloud px-1.5 py-0.5 rounded">
            {incident.id.slice(0, 8)}
          </span>
          <span className="text-xs text-minor flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {timeAgo}
          </span>
        </div>
        {incident.triage && (
          <span className={clsx(
            "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border", 
            triageColor,
            isUnacknowledgedImmediate(incident.triage, incident.status) && "animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.6)]"
          )}>
            {incident.triage}
          </span>
        )}
      </div>

      <h3 className="font-heading font-semibold text-ink text-sm mb-1 truncate">
        {incident.incident_type || "Unknown type"}
      </h3>
      
      <p className="text-sm text-minor line-clamp-2 leading-relaxed mb-3">
        {incident.summary || incident.raw_text}
      </p>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-xs font-medium text-navy bg-mist/50 px-2 py-1 rounded">
          {getStatusIcon(incident.status)}
          <span className="capitalize">{incident.status.replace("_", " ")}</span>
        </div>
        
        {incident.confidence !== undefined && incident.confidence !== null && (
          <div className="flex items-center gap-1 text-xs text-minor">
            <AlertTriangle className="w-3.5 h-3.5" />
            {Math.round(incident.confidence * 100)}% conf.
          </div>
        )}

        {incident.location_text && (
          <div className="flex items-center gap-1 text-xs text-minor ml-auto max-w-[40%] truncate">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{incident.location_text}</span>
          </div>
        )}
      </div>
    </button>
  );
}

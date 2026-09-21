import clsx from "clsx";
import { AlertCircle, AlertTriangle, CheckCircle, HelpCircle } from "lucide-react";

type TriageLevel = "immediate" | "delayed" | "minor" | "unknown";

interface TriageBadgeProps {
  level: TriageLevel;
  active?: boolean;
  className?: string;
}

const config = {
  immediate: {
    label: "Immediate",
    icon: AlertCircle,
    styles: "bg-immediate/10 text-immediate border-immediate/20",
  },
  delayed: {
    label: "Delayed",
    icon: AlertTriangle,
    styles: "bg-delayed/10 text-delayed border-delayed/20",
  },
  minor: {
    label: "Minor",
    icon: CheckCircle,
    styles: "bg-minor/10 text-minor border-minor/20",
  },
  unknown: {
    label: "Unknown",
    icon: HelpCircle,
    styles: "bg-review/10 text-review border-review/20",
  }
};

export function TriageBadge({ level, active = false, className }: TriageBadgeProps) {
  const { label, icon: Icon, styles } = config[level] || config.unknown;
  
  // Pulse animation ONLY for active unacknowledged Immediate incidents per spec
  const showPulse = level === "immediate" && active;

  return (
    <div className={clsx(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
      styles,
      showPulse && "animate-[pulse-immediate_2s_cubic-bezier(0.4,0,0.6,1)_infinite]",
      className
    )}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </div>
  );
}

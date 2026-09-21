import clsx from "clsx";

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  reviewed: "Reviewed",
  assigned: "Assigned",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
  duplicate: "Duplicate",
  false_report: "False Report",
  escalated: "Escalated",
  info_needed: "Needs Info",
  rejected: "Rejected",
  archived: "Archived",
  // ai_pending exists in enum but is unused as per DECISIONS.md
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-cyan/10 text-cyan border-cyan/20",
  reviewed: "bg-teal/10 text-teal border-teal/20",
  assigned: "bg-navy/10 text-navy border-navy/20",
  in_progress: "bg-delayed/10 text-delayed border-delayed/20",
  resolved: "bg-minor/10 text-minor border-minor/20",
  closed: "bg-cloud text-ink border-mist",
  duplicate: "bg-cloud text-ink border-mist",
  false_report: "bg-review/10 text-review border-review/20",
  escalated: "bg-immediate/10 text-immediate border-immediate/20",
  info_needed: "bg-delayed/10 text-delayed border-delayed/20",
  rejected: "bg-cloud text-ink border-mist",
  archived: "bg-cloud text-ink border-mist",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const label = STATUS_LABELS[status] || status;
  const styles = STATUS_COLORS[status] || "bg-cloud text-ink border-mist";

  return (
    <div className={clsx(
      "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border uppercase tracking-wider",
      styles,
      className
    )}>
      {label}
    </div>
  );
}

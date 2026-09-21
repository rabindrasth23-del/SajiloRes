import clsx from "clsx";
import { FolderOpen } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, className }: EmptyStateProps) {
  return (
    <div className={clsx("flex flex-col items-center justify-center p-8 text-center rounded-xl border border-mist bg-cloud/50", className)}>
      <div className="text-mist mb-3">
        {icon || <FolderOpen className="w-10 h-10" />}
      </div>
      <h3 className="text-base font-semibold text-ink mb-1">{title}</h3>
      <p className="text-sm text-ink/70 max-w-sm">{description}</p>
    </div>
  );
}

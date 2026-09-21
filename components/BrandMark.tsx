import { ShieldAlert } from "lucide-react";
import clsx from "clsx";

interface BrandMarkProps {
  className?: string;
  tone?: "light" | "dark";
}

export function BrandMark({ className, tone = "light" }: BrandMarkProps) {
  return (
    <div className={clsx("flex items-center gap-2", className)}>
      <div className="bg-teal p-1.5 rounded-md">
        <ShieldAlert className="w-5 h-5 text-white" />
      </div>
      <span className={clsx(
        "font-heading font-bold text-lg tracking-tight",
        tone === "light" ? "text-ink" : "text-white"
      )}>
        SajiloResQ
      </span>
    </div>
  );
}

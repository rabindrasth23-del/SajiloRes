import clsx from "clsx";
import { Beaker } from "lucide-react";

interface DemoModeBannerProps {
  className?: string;
  label?: string;
}

export function DemoModeBanner({ className, label = "Demo simulation" }: DemoModeBannerProps) {
  return (
    <div className={clsx(
      "inline-flex items-center gap-1.5 px-2 py-1 bg-review/10 text-review border border-review/20 rounded-md text-xs font-semibold tracking-wide uppercase",
      className
    )}>
      <Beaker className="w-3.5 h-3.5" />
      {label}
    </div>
  );
}

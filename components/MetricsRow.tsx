import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Clock, WifiOff, Activity } from "lucide-react";
import clsx from "clsx";

interface Metric {
  title: string;
  value: string;
  icon: React.ElementType;
}

export function MetricsRow() {
  const metrics: Metric[] = [
    {
      title: "Immediate incidents",
      value: "5",
      icon: AlertCircle,
    },
    {
      title: "Awaiting acknowledgement",
      value: "12",
      icon: Clock,
    },
    {
      title: "Offline queue",
      value: "3",
      icon: WifiOff,
    },
    {
      title: "Average triage time",
      value: "42s",
      icon: Activity,
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {metrics.map((metric, i) => (
        <Card key={i} className="border-mist shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 bg-mist/50 text-ink/60 text-[10px] font-bold px-2 py-0.5 rounded-bl-md z-10">
            Demo simulation
          </div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-ink/70">
              {metric.title}
            </CardTitle>
            <metric.icon className="w-4 h-4 text-ink/50" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-ink">{metric.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

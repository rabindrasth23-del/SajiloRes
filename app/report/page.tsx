import { EmergencyReportForm } from "@/components/EmergencyReportForm";
import { OfflineQueueBadge } from "@/components/OfflineQueueBadge";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import { BrandMark } from "@/components/BrandMark";
import { DemoModeBanner } from "@/components/DemoModeBanner";

export default function ReportPage() {
  return (
    <div className="min-h-screen bg-cloud flex flex-col selection:bg-teal/30 relative">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-mist px-4 py-3 flex items-center justify-between shadow-sm">
        <BrandMark className="text-navy" />
        <div className="flex items-center gap-2">
          <DemoModeBanner className="hidden md:inline-flex" />
          <ConnectionBadge />
        </div>
      </header>

      <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full bg-white md:border-x border-mist md:shadow-sm">
        <EmergencyReportForm />
      </main>

      <OfflineQueueBadge />
    </div>
  );
}

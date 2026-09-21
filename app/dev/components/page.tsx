import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import { TriageBadge } from "@/components/TriageBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { DemoModeBanner } from "@/components/DemoModeBanner";

export default function DevComponentsPage() {
  if (process.env.NODE_ENV === "production") {
    return (
      <div className="min-h-screen bg-cloud flex items-center justify-center p-6">
        <h1 className="text-4xl font-bold text-ink">404 - Not Found</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cloud text-ink p-8">
      <header className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Component Playground</h1>
        <p className="text-ink/70">A showcase of all shared components in various states.</p>
        <Link href="/" className="text-cyan hover:underline text-sm mt-4 inline-block">
          &larr; Back to Home
        </Link>
      </header>

      <div className="space-y-12 max-w-4xl">
        
        {/* BrandMark */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-mist">
          <h2 className="text-xl font-semibold mb-6 pb-2 border-b border-mist">BrandMark</h2>
          <div className="flex gap-8 items-center bg-navy p-4 rounded-lg">
            <BrandMark />
            <BrandMark className="text-white" />
          </div>
        </section>

        {/* ConnectionBadge */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-mist">
          <h2 className="text-xl font-semibold mb-6 pb-2 border-b border-mist">ConnectionBadge</h2>
          <div className="flex gap-4 items-center">
            <ConnectionBadge />
            <p className="text-sm text-ink/50 italic">(Simulate offline via dev tools to see Offline state)</p>
          </div>
        </section>

        {/* TriageBadge */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-mist">
          <h2 className="text-xl font-semibold mb-6 pb-2 border-b border-mist">TriageBadge</h2>
          <div className="flex flex-wrap gap-4 mb-6">
            <TriageBadge level="immediate" />
            <TriageBadge level="delayed" />
            <TriageBadge level="minor" />
            <TriageBadge level="unknown" />
          </div>
          <h3 className="text-sm font-semibold mb-3">Active (Pulse for Immediate only)</h3>
          <div className="flex flex-wrap gap-4">
            <TriageBadge level="immediate" active />
            <TriageBadge level="delayed" active />
          </div>
        </section>

        {/* StatusBadge */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-mist">
          <h2 className="text-xl font-semibold mb-6 pb-2 border-b border-mist">StatusBadge</h2>
          <div className="flex flex-wrap gap-4">
            <StatusBadge status="new" />
            <StatusBadge status="reviewed" />
            <StatusBadge status="assigned" />
            <StatusBadge status="in_progress" />
            <StatusBadge status="resolved" />
            <StatusBadge status="closed" />
            <StatusBadge status="duplicate" />
            <StatusBadge status="false_report" />
            <StatusBadge status="escalated" />
            <StatusBadge status="info_needed" />
            <StatusBadge status="rejected" />
            <StatusBadge status="archived" />
          </div>
        </section>

        {/* EmptyState */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-mist">
          <h2 className="text-xl font-semibold mb-6 pb-2 border-b border-mist">EmptyState</h2>
          <EmptyState 
            title="No Incidents Found"
            description="There are currently no incidents matching your filter criteria. Try adjusting the filters or clearing them."
          />
        </section>

        {/* SkeletonLoader */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-mist">
          <h2 className="text-xl font-semibold mb-6 pb-2 border-b border-mist">SkeletonLoader</h2>
          <div className="space-y-4 max-w-md">
            <div className="flex gap-4">
              <SkeletonLoader className="w-12 h-12 rounded-full" />
              <div className="space-y-2 flex-1 py-1">
                <SkeletonLoader className="h-4 w-3/4" />
                <SkeletonLoader className="h-4 w-1/2" />
              </div>
            </div>
            <SkeletonLoader className="h-24 w-full" />
          </div>
        </section>

        {/* DemoModeBanner */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-mist">
          <h2 className="text-xl font-semibold mb-6 pb-2 border-b border-mist">DemoModeBanner</h2>
          <DemoModeBanner />
        </section>

      </div>
    </div>
  );
}

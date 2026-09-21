"use client";

import { use, useEffect, useState, useRef } from "react";
import { getMyReport, getQueue } from "@/lib/offline/queue";
import { useLanguage } from "@/lib/i18n";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import { BrandMark } from "@/components/BrandMark";
import Link from "next/link";
import { ArrowLeft, Clock, CheckCircle2, ShieldAlert, CheckSquare, Loader2, XCircle } from "lucide-react";
import clsx from "clsx";

function getCitizenStatusLabel(backendStatus: string) {
  switch (backendStatus) {
    case "approved":
    case "assigned":
      return "status_label.approved"; // or "Reviewed by a responder"
    case "acknowledged":
      return "status_label.acknowledged";
    case "dispatched":
      return "status_label.dispatched";
    case "resolved":
      return "status_label.resolved";
    case "rejected":
    case "false_report":
      return "status_label.rejected";
    case "new":
    case "reviewed":
    case "duplicate_review":
    case "location_missing":
    default:
      return "status_label.new";
  }
}

// Map backend statuses to a linear timeline step (1-5)
function getStatusStep(status: string) {
  if (status === "rejected" || status === "false_report") return -1;
  if (status === "resolved") return 5;
  if (status === "dispatched") return 4;
  if (status === "acknowledged") return 3;
  if (status === "approved" || status === "assigned") return 2;
  return 1; // new, reviewed (AI), location_missing, etc.
}

export default function StatusPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params);
  const { t } = useLanguage();
  
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<"queued" | "failed" | "not_found" | "remote">("queued");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [remoteData, setRemoteData] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const poll = async (incidentId: string, backoff = 10000) => {
      if (document.visibilityState !== "visible") {
        timeoutId = setTimeout(() => poll(incidentId, backoff), 2000);
        return;
      }

      try {
        const res = await fetch(`/api/incidents/${incidentId}?client_id=${clientId}`);
        if (res.ok) {
          const data = await res.json();
          if (mounted) setRemoteData(data);
          // Reset backoff on success
          timeoutId = setTimeout(() => poll(incidentId, 10000), 10000);
        } else {
          // Increase backoff on error up to 60s
          timeoutId = setTimeout(() => poll(incidentId, Math.min(backoff * 1.5, 60000)), backoff);
        }
      } catch (err) {
        timeoutId = setTimeout(() => poll(incidentId, Math.min(backoff * 1.5, 60000)), backoff);
      }
    };

    const init = async () => {
      // 1. Check local "my reports" (sent)
      const sentReport = await getMyReport(clientId);
      if (sentReport) {
        if (mounted) setState("remote");
        poll(sentReport.incident_id);
        if (mounted) setLoading(false);
        return;
      }

      // 2. Check offline queue
      const queue = await getQueue();
      const queuedReport = queue.find(r => r.client_id === clientId);
      if (queuedReport) {
        if (mounted) {
          setState(queuedReport.status === "failed" ? "failed" : "queued");
          setLoading(false);
        }
        return;
      }

      // 3. Not found
      if (mounted) {
        setState("not_found");
        setLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [clientId]);

  // GSAP animations for timeline and content entrance
  useEffect(() => {
    if (loading || state === "not_found") return;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ctx: any;
    import("gsap").then((gsapPkg) => {
      const gsap = gsapPkg.default;
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReducedMotion) return;
      
      ctx = gsap.context(() => {
        // Timeline node animations
        gsap.fromTo(
          ".timeline-node",
          { opacity: 0, scale: 0.5 },
          { opacity: 1, scale: 1, duration: 0.4, stagger: 0.1, ease: "back.out(1.5)" }
        );
        
        // Timeline connector animations
        gsap.fromTo(
          ".timeline-line",
          { scaleX: 0, transformOrigin: "left center" },
          { scaleX: 1, duration: 0.5, stagger: 0.1, ease: "power2.out", delay: 0.2 }
        );

        // Content entrance
        gsap.fromTo(
          ".status-content",
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.5, ease: "power2.out", delay: 0.1 }
        );
      }, containerRef);
    });

    return () => {
      if (ctx) ctx.revert();
    };
  }, [loading, state, remoteData?.status]); // Re-run when status updates

  const currentStep = remoteData ? getStatusStep(remoteData.status) : (state === "queued" ? 0 : -1);

  const steps = [
    { num: 1, label: "Received", icon: CheckSquare },
    { num: 2, label: "Reviewed by a responder", icon: CheckCircle2 },
    { num: 3, label: "Acknowledged", icon: ShieldAlert },
    { num: 4, label: "Dispatched", icon: ShieldAlert },
    { num: 5, label: "Resolved", icon: CheckCircle2 },
  ];

  return (
    <div className="min-h-screen bg-cloud flex flex-col selection:bg-teal/30" ref={containerRef}>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-mist px-4 py-3 flex items-center justify-between shadow-sm">
        <Link href="/" className="flex items-center gap-2 focus-ring rounded-lg transition-transform hover:scale-105 active:scale-95">
          <div className="text-navy [&_span]:text-navy"><BrandMark /></div>
        </Link>
        <ConnectionBadge />
      </header>

      <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full p-6 pt-10">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-ink/70 hover:text-navy transition-colors mb-8 focus-ring rounded-md w-fit">
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <h1 className="text-4xl font-heading font-extrabold text-navy mb-4 tracking-tight">
          {t("status_page.title")}
        </h1>

        <div className="flex items-start gap-3 p-4 bg-review/5 text-review border border-review/10 rounded-2xl text-sm font-medium mb-10 shadow-sm">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{t("demo_honesty")}</span>
        </div>

        {loading ? (
          <div className="animate-pulse flex flex-col gap-6">
            <div className="h-32 bg-mist/50 rounded-2xl border border-mist"></div>
            <div className="h-48 bg-mist/30 rounded-2xl border border-mist"></div>
          </div>
        ) : state === "not_found" ? (
          <div className="bg-white p-8 rounded-2xl border border-mist text-center shadow-sm">
            <p className="text-ink/70 font-medium text-lg">{t("status_page.not_found")}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Timeline Visualization */}
            <div className="bg-white p-6 rounded-2xl border border-mist shadow-sm flex flex-col pt-8">
              <div className="relative flex justify-between items-center px-2">
                {steps.map((step, idx) => {
                  const isCompleted = currentStep >= step.num;
                  const isActive = currentStep === step.num;
                  const isRejected = currentStep === -1;
                  const StepIcon = step.icon;
                  
                  return (
                    <div key={step.num} className="relative z-10 flex flex-col items-center">
                      <div className={clsx(
                        "timeline-node w-12 h-12 rounded-full flex items-center justify-center border-4 transition-colors duration-500",
                        isRejected ? "bg-cloud border-mist text-ink/30" :
                        isCompleted ? "bg-teal text-white border-teal shadow-md" :
                        isActive ? "bg-teal/10 text-teal border-teal border-dashed" :
                        "bg-white border-mist text-mist"
                      )}>
                        {isActive && !isRejected && <div className="absolute inset-0 bg-teal/20 rounded-full animate-ping" />}
                        {isRejected ? <XCircle className="w-5 h-5" /> : <StepIcon className="w-5 h-5 relative z-10" />}
                      </div>
                      <span className={clsx(
                        "absolute -bottom-8 text-[10px] font-bold tracking-wide whitespace-nowrap transition-colors duration-500",
                        isCompleted ? "text-navy" : isActive ? "text-teal" : "text-ink/40"
                      )}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}

                {/* Connectors */}
                <div className="absolute top-1/2 left-8 right-8 h-1 -translate-y-1/2 -z-0 flex">
                  {[1, 2, 3, 4].map((num) => (
                    <div key={num} className="flex-1 h-full bg-mist relative">
                      <div className={clsx(
                        "timeline-line absolute inset-0 h-full bg-teal transition-transform duration-500 origin-left",
                        currentStep > num ? "scale-x-100" : "scale-x-0"
                      )} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="h-10" /> {/* Spacing for labels */}
            </div>

            {/* Status Details */}
            <div className="status-content bg-white p-8 rounded-2xl border border-mist shadow-sm">
              <div className="flex items-start gap-5">
                <div className={clsx(
                  "p-4 rounded-2xl border shadow-inner",
                  currentStep === -1 ? "bg-red-50 text-red-600 border-red-100" :
                  state === "queued" ? "bg-cloud text-ink/60 border-mist" :
                  currentStep === 4 ? "bg-teal/10 text-teal border-teal/20" :
                  "bg-navy text-white border-navy"
                )}>
                  {currentStep === -1 ? <XCircle className="w-8 h-8" /> :
                   state === "queued" ? <Clock className="w-8 h-8" /> :
                   remoteData?.status === "dispatched" ? <ShieldAlert className="w-8 h-8 animate-pulse" /> :
                   remoteData?.status === "resolved" ? <CheckCircle2 className="w-8 h-8" /> :
                   <Loader2 className="w-8 h-8 animate-spin" />}
                </div>
                
                <div className="flex-1 pt-1">
                  <h2 className="text-2xl font-bold text-navy mb-2 tracking-tight">
                    {currentStep === -1 ? t("status_label.rejected") :
                     state === "queued" ? t("status.offline") : 
                     state === "failed" ? t("status.failed") :
                     remoteData ? t(getCitizenStatusLabel(remoteData.status)) :
                     "Loading..."}
                  </h2>
                  <p className="text-ink/70 text-base leading-relaxed max-w-md">
                    {currentStep === -1 ? "Your report was reviewed and marked as a false alarm or duplicate." :
                     state === "queued" ? t("report.queue_badge") :
                     state === "failed" ? "Submission failed validation." :
                     "Your report is being processed by our coordination team."}
                  </p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-mist grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-ink/50 font-bold uppercase tracking-wider mb-1">Reference Code</p>
                  <p className="font-mono text-xl text-navy font-medium tracking-widest">{clientId.split("-")[0].toUpperCase()}</p>
                </div>
                {remoteData && (
                  <div>
                    <p className="text-xs text-ink/50 font-bold uppercase tracking-wider mb-1">Last Updated</p>
                    <p className="text-navy font-medium">
                      {new Date(remoteData.updated_at || remoteData.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-12 p-5 bg-red-50 border border-red-100 rounded-2xl shadow-sm text-center">
          <p className="text-sm text-red-700 font-semibold tracking-wide uppercase mb-1">Emergency Notice</p>
          <p className="text-base text-red-800">
            {t("status.call_emergency")}
          </p>
        </div>

        <div className="mt-12 text-center pb-10">
          <button 
            onClick={async () => {
              const { clearMyReports } = await import("@/lib/offline/queue");
              await clearMyReports();
              window.location.href = "/";
            }}
            className="text-sm font-medium text-ink/50 hover:text-red-600 transition-colors focus-ring p-3 rounded-xl hover:bg-red-50"
          >
            Clear my reports from this device
          </button>
        </div>
      </main>
    </div>
  );
}

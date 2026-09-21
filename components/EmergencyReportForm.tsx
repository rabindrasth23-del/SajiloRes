"use client";

import { useEffect, useState, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { useLanguage } from "@/lib/i18n";
import { IncidentTypeSelector, IncidentType } from "./IncidentTypeSelector";
import { LocationPicker, LocationData } from "./LocationPicker";
import { enqueueReport, trySyncQueue } from "@/lib/offline/queue";
import { Mic, MicOff, Camera, X, Check, Loader2, ShieldAlert } from "lucide-react";
import clsx from "clsx";
import Link from "next/link";

type DraftState = {
  client_id: string;
  step: number;
  type?: IncidentType;
  description: string;
  location: LocationData;
  photoDataUrl?: string; // local preview
  photoFile?: File; // actual file if selected in this session
};

const DEFAULT_DRAFT: DraftState = {
  client_id: "",
  step: 1,
  description: "",
  location: { source: "none" },
};

export function EmergencyReportForm() {
  const { t, lang } = useLanguage();
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    status: "sent" | "offline" | "failed";
    client_id: string;
  } | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const stepContainerRef = useRef<HTMLDivElement>(null);
  const submitStateRef = useRef<HTMLDivElement>(null);

  const updateDraft = (updates: Partial<DraftState>) => {
    setDraft((prev) => prev ? { ...prev, ...updates } : prev);
  };

  // Initialize draft
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const saved = localStorage.getItem("sajiloresq_draft");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.client_id) {
          setDraft(parsed);
          return;
        }
      } catch {}
    }
    const newDraft = { ...DEFAULT_DRAFT, client_id: uuidv4() };
    setDraft(newDraft);
    localStorage.setItem("sajiloresq_draft", JSON.stringify(newDraft));
  }, []);

  // Save draft on change
  useEffect(() => {
    if (draft) {
      const { photoFile, ...savable } = draft;
      localStorage.setItem("sajiloresq_draft", JSON.stringify(savable));
    }
  }, [draft]);

  // GSAP Step Transition
  useEffect(() => {
    if (!mounted || !draft || submissionResult) return;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ctx: any;
    import("gsap").then((gsapPkg) => {
      const gsap = gsapPkg.default;
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      
      if (prefersReducedMotion) return;
      
      if (stepContainerRef.current) {
        gsap.fromTo(
          stepContainerRef.current,
          { opacity: 0, y: 15, scale: 0.98 },
          { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "power2.out" }
        );
      }
    });
    
    return () => {
      if (ctx) ctx.revert();
    };
  }, [draft?.step, mounted, submissionResult]);

  // GSAP Submission State Transition
  useEffect(() => {
    if (!submissionResult || !submitStateRef.current) return;
    
    import("gsap").then((gsapPkg) => {
      const gsap = gsapPkg.default;
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReducedMotion) return;
      
      if (submissionResult.status === "sent") {
        gsap.fromTo(
          submitStateRef.current,
          { opacity: 0, scale: 0.9, y: 20 },
          { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: "back.out(1.2)" }
        );
      } else if (submissionResult.status === "offline") {
        gsap.fromTo(
          submitStateRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 1, ease: "power2.out" }
        );
      } else {
        gsap.set(submitStateRef.current, { opacity: 1, scale: 1, y: 0 });
      }
    });
  }, [submissionResult]);

  // Speech recognition setup
  useEffect(() => {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSpeechSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = lang === "ne" ? "ne-NP" : "en-US";
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          let transcript = "";
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          if (draft) {
            updateDraft({ description: transcript.slice(0, 2000) });
          }
        };

        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognitionRef.current = recognition;
      }
    }
  }, [lang, draft]); 

  // Loading skeleton for hydration
  if (!mounted || !draft) {
    return (
      <div className="flex flex-col flex-1 pb-24 p-4 animate-pulse">
        <div className="h-10 bg-mist/50 rounded-lg w-1/3 mb-6" />
        <div className="h-2 bg-mist/50 rounded-full w-full mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-32 bg-mist/30 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const nextStep = () => {
    if (draft.step === 1 && !draft.type) return;
    if (draft.step === 2 && !draft.description.trim()) return;
    updateDraft({ step: draft.step + 1 });
  };

  const prevStep = () => updateDraft({ step: draft.step - 1 });

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_DIM = 1600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (!blob) return;
          const downscaledFile = new File([blob], file.name, { type: "image/jpeg" });
          updateDraft({ 
            photoDataUrl: canvas.toDataURL("image/jpeg", 0.8),
            photoFile: downscaledFile 
          });
        }, "image/jpeg", 0.8);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const attachmentPaths: string[] = [];

    if (navigator.onLine && draft.photoFile) {
      try {
        const signRes = await fetch("/api/uploads/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: draft.client_id,
            mime_type: draft.photoFile.type,
            size_bytes: draft.photoFile.size,
          }),
        });
        if (signRes.ok) {
          const { storage_path, signed_url } = await signRes.json();
          const uploadRes = await fetch(signed_url, {
            method: "PUT",
            headers: { "Content-Type": draft.photoFile.type },
            body: draft.photoFile,
          });
          if (uploadRes.ok) {
            attachmentPaths.push(storage_path);
          }
        }
      } catch {
        console.warn("Photo upload failed, continuing without it.");
      }
    }

    const report = {
      client_id: draft.client_id,
      type: draft.type || "other",
      description: draft.description,
      location_source: draft.location.source,
      lat: draft.location.lat,
      lng: draft.location.lng,
      location_text: draft.location.text,
      attachment_paths: attachmentPaths,
      status: "pending" as const,
      retryCount: 0,
      created_at: new Date().toISOString(),
    };

    await enqueueReport(report);

    if (navigator.onLine) {
      await trySyncQueue();
    }

    const q = await import("@/lib/offline/queue").then(m => m.getQueue());
    const isStillPending = q.some(r => r.client_id === draft.client_id);

    setSubmissionResult({
      status: isStillPending ? "offline" : "sent",
      client_id: draft.client_id,
    });
    
    localStorage.removeItem("sajiloresq_draft");
    setIsSubmitting(false);
  };

  // Render Confirmation (Step 5)
  if (submissionResult) {
    const isOffline = submissionResult.status === "offline";
    return (
      <div ref={submitStateRef} className="flex flex-col items-center justify-center py-16 px-4 text-center" aria-live="polite">
        <div className={clsx(
          "w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-sm border-4",
          isOffline ? "bg-navy text-white border-mist" : "bg-teal/10 text-teal border-teal/20"
        )}>
          {isOffline ? (
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
          ) : (
            <Check className="w-10 h-10" />
          )}
        </div>
        
        <h2 className="text-3xl font-heading font-bold text-navy mb-3 tracking-tight">
          {isOffline ? t("status.offline") : t("status.sent")}
        </h2>
        
        <p className="text-ink/70 mb-8 max-w-sm leading-relaxed">
          {isOffline ? t("report.queue_badge") : "Report received. Our system is preparing it for responder review."}
        </p>
        
        <div className="bg-cloud p-5 rounded-2xl border border-mist mb-8 w-full max-w-sm shadow-sm">
          <p className="text-xs text-ink/50 font-bold uppercase tracking-wider mb-1">Reference Code</p>
          <p className="font-mono text-xl font-medium text-navy tracking-widest">{submissionResult.client_id.split("-")[0].toUpperCase()}</p>
        </div>

        <Link 
          href={`/status/${submissionResult.client_id}`}
          className="w-full max-w-sm py-4 bg-navy text-white font-semibold rounded-xl focus-ring mb-8 shadow-md hover:bg-navy/90 hover:shadow-lg transition-all active:scale-95 flex justify-center items-center gap-2"
        >
          {t("status.link")}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
        </Link>

        <p className="text-sm text-red-600 font-semibold max-w-sm bg-red-50 p-3 rounded-lg border border-red-100">
          {t("status.call_emergency")}
        </p>
      </div>
    );
  }

  const isNextDisabled = (draft.step === 1 && !draft.type) || (draft.step === 2 && !draft.description.trim());

  return (
    <div className="flex flex-col flex-1 pb-32 relative">
      {/* Step Header */}
      <div 
        className="pt-8 pb-6 px-6"
        tabIndex={-1} 
        ref={(el) => {
          // Auto-focus the header on mount/step change so SR reads it
          // But only if we aren't initializing
          if (el && mounted && draft.step > 1) {
             el.focus();
          }
        }}
      >
        <h1 className="text-3xl font-heading font-bold text-navy tracking-tight" aria-live="polite">
          {draft.step === 1 && t("report.step1")}
          {draft.step === 2 && t("report.step2")}
          {draft.step === 3 && t("report.step3")}
          {draft.step === 4 && t("report.step4")}
        </h1>
        <div className="mt-6 flex gap-3">
          {[1,2,3,4].map((s) => (
            <div 
              key={s} 
              className={clsx(
                "h-2 flex-1 rounded-full transition-all duration-500 relative overflow-hidden",
                s <= draft.step ? "shadow-[0_0_10px_rgba(15,118,110,0.5)] bg-mist/50" : "bg-mist"
              )} 
            >
              <div 
                className="absolute top-0 left-0 bottom-0 bg-teal rounded-full transition-all duration-500 ease-out"
                style={{ width: s < draft.step ? "100%" : s === draft.step ? "50%" : "0%" }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 flex-1 outline-none" ref={stepContainerRef}>
        {/* Step 1: Type */}
        {draft.step === 1 && (
          <div className="flex flex-col gap-6">
            <div className="flex items-start gap-3 p-4 bg-review/5 text-review border border-review/10 rounded-2xl text-sm font-medium shadow-sm">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              {t("demo_honesty")}
            </div>
            <IncidentTypeSelector 
              value={draft.type} 
              onChange={(val) => updateDraft({ type: val })} 
            />
          </div>
        )}

        {/* Step 2: Description */}
        {draft.step === 2 && (
          <div className="flex flex-col h-full gap-4">
            <div className="relative flex-1 min-h-[240px]">
              <textarea
                value={draft.description}
                onChange={(e) => updateDraft({ description: e.target.value.slice(0, 2000) })}
                placeholder={t("form.description_placeholder")}
                className="w-full h-full p-5 rounded-2xl border border-mist bg-white text-ink text-[16px] resize-none focus:border-teal focus:ring-4 focus:ring-teal/10 outline-none shadow-sm transition-all placeholder:text-ink/30"
              />
              <div className="absolute bottom-4 right-4 text-xs text-ink/40 font-medium bg-white/80 backdrop-blur px-2 py-1 rounded-md">
                {2000 - draft.description.length} {t("form.chars_left")}
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={toggleListen}
                disabled={!speechSupported || (!navigator.onLine && speechSupported)}
                className={clsx(
                  "flex items-center justify-center gap-2 w-full py-4 rounded-xl border font-semibold transition-all duration-300 focus-ring shadow-sm",
                  isListening 
                    ? "bg-red-50 border-red-200 text-red-600 scale-[0.98] shadow-inner" 
                    : "bg-white border-mist text-navy hover:border-teal/30 hover:bg-cloud hover:-translate-y-0.5"
                )}
              >
                {isListening ? <MicOff className="w-5 h-5 animate-pulse" /> : <Mic className="w-5 h-5" />}
                {isListening ? t("form.voice_listening") : t("form.voice_button")}
              </button>
              {(!speechSupported || !navigator.onLine) && (
                <p className="text-center text-xs text-ink/50 mt-2 font-medium">
                  {!speechSupported ? t("form.voice_unsupported") : t("form.voice_offline")}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Location & Photo */}
        {draft.step === 3 && (
          <div className="flex flex-col gap-8">
            <div className="bg-white p-6 rounded-2xl border border-mist shadow-sm">
              <h3 className="font-bold text-navy mb-4 text-lg">{t("form.location")}</h3>
              <LocationPicker 
                value={draft.location}
                onChange={(loc) => updateDraft({ location: loc })}
              />
            </div>

            <div className="bg-white p-6 rounded-2xl border border-mist shadow-sm">
              <h3 className="font-bold text-navy mb-4 text-lg">{t("form.photo")}</h3>
              {!navigator.onLine ? (
                <div className="p-6 bg-cloud rounded-xl text-center text-sm font-medium text-ink/60 border-2 border-dashed border-mist">
                  {t("form.photo_offline")}
                </div>
              ) : (
                <div className="relative group">
                  {draft.photoDataUrl ? (
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/5 border border-mist shadow-inner">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={draft.photoDataUrl} alt="Preview" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      <button
                        onClick={() => updateDraft({ photoDataUrl: undefined, photoFile: undefined })}
                        className="absolute top-3 right-3 p-2 bg-black/50 backdrop-blur text-white rounded-full hover:bg-black/80 transition-colors shadow-sm"
                        aria-label="Remove photo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full aspect-video rounded-xl border-2 border-dashed border-mist bg-cloud/50 hover:bg-mist/20 hover:border-teal/30 cursor-pointer transition-all duration-300 focus-within:ring-4 focus-within:ring-teal/20 group-hover:shadow-sm">
                      <div className="p-4 bg-white rounded-full shadow-sm mb-3 text-navy/40 group-hover:text-teal group-hover:scale-110 transition-all duration-300">
                        <Camera className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-semibold text-navy/70 group-hover:text-navy transition-colors">Tap to select photo</span>
                      <input 
                        type="file" 
                        accept="image/jpeg,image/png,image/webp" 
                        className="sr-only"
                        onChange={handlePhotoUpload}
                      />
                    </label>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {draft.step === 4 && (
          <div className="flex flex-col gap-6 bg-white p-8 rounded-2xl border border-mist shadow-sm">
            <div className="border-b border-mist pb-4">
              <p className="text-xs text-ink/50 font-bold uppercase tracking-wider mb-2">Emergency Type</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-immediate" />
                <p className="font-semibold text-navy text-lg">{draft.type}</p>
              </div>
            </div>
            
            <div className="border-b border-mist pb-4">
              <p className="text-xs text-ink/50 font-bold uppercase tracking-wider mb-2">Description</p>
              <p className="font-medium text-navy whitespace-pre-wrap leading-relaxed">{draft.description}</p>
            </div>
            
            <div className={clsx("pb-4", draft.photoDataUrl ? "border-b border-mist" : "")}>
              <p className="text-xs text-ink/50 font-bold uppercase tracking-wider mb-2">Location</p>
              <p className="font-medium text-navy">
                {draft.location.source === "gps" 
                  ? `GPS: ${draft.location.lat?.toFixed(4)}, ${draft.location.lng?.toFixed(4)}` 
                  : draft.location.text || "None provided"}
              </p>
            </div>
            
            {draft.photoDataUrl && (
              <div>
                <p className="text-xs text-ink/50 font-bold uppercase tracking-wider mb-3">Photo Attached</p>
                <div className="w-32 h-32 rounded-xl overflow-hidden border border-mist shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={draft.photoDataUrl} alt="Attached evidence" className="w-full h-full object-cover" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky Bottom Nav - Constrained to Form Width */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none">
        <div className="w-full max-w-2xl bg-white/95 backdrop-blur-md border-t border-mist/50 p-4 pb-safe flex flex-col gap-2 shadow-[0_-10px_40px_rgba(0,0,0,0.06)] md:rounded-t-3xl md:border-x md:mb-0 pointer-events-auto">
          
          <div className="flex gap-3">
            {draft.step > 1 && (
              <button
                onClick={prevStep}
                disabled={isSubmitting}
                className="px-6 py-4 rounded-xl font-semibold text-navy bg-cloud border border-mist hover:bg-mist/50 transition-all focus-ring active:scale-95 shadow-sm"
              >
                {t("report.back")}
              </button>
            )}
            
            {draft.step < 4 ? (
              <button
                onClick={nextStep}
                disabled={isNextDisabled}
                className="flex-1 py-4 rounded-xl font-semibold text-white bg-navy disabled:opacity-50 disabled:active:scale-100 transition-all focus-ring shadow-md hover:bg-navy/90 hover:shadow-lg active:scale-95 group relative overflow-hidden"
              >
                <span className="relative z-10">{t("report.next")}</span>
                {!isNextDisabled && (
                   <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out rounded-xl" />
                )}
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 py-4 rounded-xl font-bold text-white bg-immediate disabled:opacity-80 transition-all focus-ring shadow-lg hover:shadow-immediate/30 hover:bg-immediate/90 active:scale-95 relative overflow-hidden"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </span>
                ) : (
                  t("report.submit")
                )}
              </button>
            )}
          </div>
          
          {/* Helper Text for Disabled Next Button */}
          {draft.step === 1 && isNextDisabled && (
            <p className="text-center text-xs font-medium text-ink/50 animate-in fade-in duration-300">
              Choose the type of emergency to continue
            </p>
          )}
          {draft.step === 2 && isNextDisabled && (
            <p className="text-center text-xs font-medium text-ink/50 animate-in fade-in duration-300">
              Describe the situation to continue
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

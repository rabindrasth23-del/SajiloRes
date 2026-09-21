"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { DemoModeBanner } from "@/components/DemoModeBanner";
import { ShieldAlert, Zap, Globe, Map } from "lucide-react";
import clsx from "clsx";

export function AnimatedLanding() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ctx: any;
    
    // Dynamic import to keep GSAP out of initial bundle for other routes
    Promise.all([
      import("gsap"),
      import("gsap/ScrollTrigger"),
      import("@gsap/react")
    ]).then(([gsapPkg, ScrollTriggerPkg, reactGsapPkg]) => {
      const gsap = gsapPkg.default;
      const ScrollTrigger = ScrollTriggerPkg.default;
      
      gsap.registerPlugin(ScrollTrigger);
      
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      
      if (prefersReducedMotion) {
        // Just reveal everything instantly
        gsap.set(".animate-hero, .animate-card, .animate-trust", { opacity: 1, y: 0, scale: 1 });
        return;
      }
      
      ctx = gsap.context(() => {
        // Hero Timeline
        const tl = gsap.timeline();
        
        // Background grid animation (slow pan)
        const gridAnim = gsap.to(".bg-grid-pan", {
          backgroundPosition: "40px 40px",
          duration: 4,
          repeat: -1,
          ease: "linear"
        });

        // Pause animation when tab is hidden to save CPU
        const handleVisibilityChange = () => {
          if (document.hidden) {
            gridAnim.pause();
          } else {
            gridAnim.play();
          }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
        
        // Staged Hero Entrance
        tl.fromTo(".animate-hero", 
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.8, stagger: 0.15, ease: "power3.out" }
        );

        // Demo Cards floating in
        tl.fromTo(".demo-card",
          { opacity: 0, scale: 0.9, y: 20 },
          { opacity: 1, scale: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "back.out(1.5)" },
          "-=0.4"
        );

        // Count up simulation (visual only, for the demo cards)
        const counters = document.querySelectorAll('.demo-count');
        counters.forEach(counter => {
          const target = parseInt(counter.getAttribute('data-target') || '0', 10);
          gsap.to(counter, {
            innerHTML: target,
            duration: 1.5,
            snap: { innerHTML: 1 },
            ease: "power2.out",
            delay: 0.8
          });
        });

        // Scroll Reveal for Trust Cards
        gsap.fromTo(".trust-card",
          { opacity: 0, y: 40 },
          { 
            opacity: 1, 
            y: 0, 
            duration: 0.6, 
            stagger: 0.1, 
            ease: "power2.out",
            scrollTrigger: {
              trigger: ".trust-section",
              start: "top 80%",
            }
          }
        );

        return () => {
          document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
      }, containerRef);
    });

    return () => {
      if (ctx) ctx.revert();
    };
  }, []);

  // Avoid hydration mismatch by waiting for mount if needed, or rendering static state first.
  // We'll render with opacity 0 classes and let GSAP or the mount effect handle them.
  const opacityClass = mounted ? "" : "opacity-0";

  return (
    <div ref={containerRef} className="min-h-screen bg-navy text-white selection:bg-cyan/30 flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-navy/95 border-b border-white/10 backdrop-blur-sm">
        <div>
          <BrandMark tone="dark" />
        </div>
        <Link 
          href="/login"
          className="text-sm font-semibold text-white/90 hover:text-white transition-colors focus-ring px-3 py-1.5 rounded-sm"
        >
          Responder Login
        </Link>
      </header>

      <main className="flex-1 pt-20">
        {/* Hero Section */}
        <section className="relative flex flex-col items-center justify-center overflow-hidden py-32 px-6 min-h-[85vh]">
          <div className="bg-grid-pan absolute inset-0 z-0 bg-[url('/grid.svg')] opacity-10" />

          <div className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto">
            <div className={clsx("animate-hero", opacityClass)}>
              <DemoModeBanner className="mb-8" />
            </div>
            
            <h1 className={clsx("animate-hero text-4xl md:text-6xl lg:text-7xl font-heading font-extrabold tracking-tight mb-6 text-white text-balance", opacityClass)}>
              When disaster happens, every second and every report matters.
            </h1>
            
            <p className={clsx("animate-hero text-lg md:text-xl text-white/80 mb-10 max-w-2xl text-balance", opacityClass)}>
              SajiloResQ turns citizen reports into explainable, coordinated response actions—even when the network is unreliable.
            </p>

            <div className={clsx("animate-hero flex flex-col sm:flex-row gap-4 w-full sm:w-auto", opacityClass)}>
              <Link 
                href="/report"
                className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-teal hover:bg-teal/90 rounded-xl transition-transform hover:scale-105 active:scale-95 focus-ring"
              >
                Report an emergency
              </Link>
              <Link 
                href="/dashboard"
                className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white border-2 border-white/20 hover:bg-white/10 rounded-xl transition-transform hover:scale-105 active:scale-95 focus-ring"
              >
                Open responder dashboard
              </Link>
            </div>
          </div>
          
          <div className="mt-20 flex flex-wrap justify-center gap-4 relative z-20 w-full max-w-4xl">
            <div className={clsx("demo-card px-5 py-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-lg text-sm font-medium", opacityClass)}>
              Demo: <span className="demo-count text-cyan font-bold text-lg" aria-hidden="true" data-target="2">0</span><span className="sr-only">2</span> reports processed
            </div>
            <div className={clsx("demo-card px-5 py-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-lg text-sm font-medium", opacityClass)}>
              Demo: <span className="demo-count text-teal font-bold text-lg" aria-hidden="true" data-target="1">0</span><span className="sr-only">1</span> responder notified
            </div>
            <div className={clsx("demo-card px-5 py-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-lg text-sm font-medium hidden md:block", opacityClass)}>
              Demo: Offline queue synchronized
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <section className="trust-section py-32 px-6 bg-cloud text-ink relative z-30 shadow-[0_-20px_40px_rgba(0,0,0,0.1)]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-3xl md:text-5xl font-heading font-bold mb-4 tracking-tight">
                Built for resilience.
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <TrustCard 
                icon={Globe}
                title="Offline-first"
                description="Works without internet. Syncs automatically when connection returns."
                className={clsx("trust-card", opacityClass)}
              />
              <TrustCard 
                icon={Zap}
                title="Explainable AI"
                description="Triage decisions are transparent, reviewable, and fast."
                className={clsx("trust-card", opacityClass)}
              />
              <TrustCard 
                icon={ShieldAlert}
                title="Human-approved alerts"
                description="Agents recommend, but humans confirm before dispatch."
                className={clsx("trust-card", opacityClass)}
              />
              <TrustCard 
                icon={Map}
                title="Map-based coordination"
                description="See incidents and responders visually for faster dispatch."
                className={clsx("trust-card", opacityClass)}
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-navy py-12 px-6 border-t border-white/10 text-center relative z-30">
        <p className="text-white/70 max-w-2xl mx-auto mb-4 text-sm leading-relaxed">
          SajiloResQ is an advisory tool for disaster coordination. It is not a replacement for official emergency services. 
          If you are in immediate danger, contact local authorities directly if possible.
        </p>
        <Link href="/safety" className="text-cyan hover:text-cyan/80 hover:underline text-sm font-medium focus-ring rounded-sm inline-block transition-colors">
          Read full safety limitations
        </Link>
      </footer>
    </div>
  );
}

function TrustCard({ icon: Icon, title, description, className }: { icon: React.ElementType, title: string, description: string, className?: string }) {
  return (
    <div className={clsx("group flex flex-col items-start p-8 bg-white rounded-2xl border border-mist shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2", className)}>
      <div className="p-3 bg-teal/10 rounded-xl mb-6 text-teal group-hover:scale-110 group-hover:bg-teal group-hover:text-white transition-all duration-300">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-xl font-bold mb-3 text-ink tracking-tight">{title}</h3>
      <p className="text-ink/70 text-base leading-relaxed">{description}</p>
    </div>
  );
}

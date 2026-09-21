"use client";

import React, { useEffect, useRef } from "react";

export default function AnimatedStory() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mql.matches) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ctx: any;
    
    // Dynamically import GSAP
    import("gsap").then((gsapModule) => {
      const gsap = gsapModule.default;
      import("gsap/ScrollTrigger").then((ScrollTriggerModule) => {
        const ScrollTrigger = ScrollTriggerModule.default;
        gsap.registerPlugin(ScrollTrigger);

        if (!containerRef.current) return;

        ctx = gsap.context(() => {
          const steps = gsap.utils.toArray(".story-step");
          
          steps.forEach((step: unknown) => {
            const el = step as HTMLElement;
            gsap.fromTo(el, 
              { opacity: 0, y: 30 },
              {
                opacity: 1, 
                y: 0,
                duration: 0.8,
                scrollTrigger: {
                  trigger: el,
                  start: "top 85%",
                  toggleActions: "play none none reverse"
                }
              }
            );
          });
        }, containerRef);
      });
    });

    return () => {
      if (ctx) ctx.revert();
    };
  }, []);

  return (
    <div ref={containerRef} style={{ margin: "3rem 0", padding: "2rem", background: "rgba(255,255,255,0.03)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: "1.25rem" }}>The Process</h2>
        <span style={{ fontSize: "0.8rem", padding: "4px 8px", background: "rgba(255,200,100,0.2)", color: "#ffc864", borderRadius: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Demo Simulation</span>
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem", position: "relative" }}>
        {/* Decorative line connecting steps */}
        <div style={{ position: "absolute", left: "24px", top: "24px", bottom: "24px", width: "2px", background: "rgba(255,255,255,0.1)", zIndex: 0 }} className="story-line"></div>
        
        {[
          { title: "SOS Fast Path", desc: "One tap starts a 5-second countdown with Cancel option. No login needed. Automatically sends a text to the nearest station; a responder reviews it." },
          { title: "1. Report", desc: "Citizens send a detailed report (works offline). Includes text, photo, voice, and GPS coordinates." },
          { title: "2. Understand", desc: "The AI structures the facts, assesses urgency, highlights missing info, and runs a duplicate check against recent incidents." },
          { title: "3. A Human Decides", desc: "A human dispatcher reviews the structured data to approve, modify, or reject the report before any action is taken." },
          { title: "4. Alert and Track", desc: "Alerts are sent to verified responders who must acknowledge receipt, ensuring clear assignment." },
          { title: "5. Escalate and Resolve", desc: "If nobody acknowledges, the system recommends escalation. Every action leaves a full audit trail." },
        ].map((step, idx) => (
          <div key={idx} className="story-step" style={{ display: "flex", gap: "1.5rem", position: "relative", zIndex: 1 }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#02060f", border: "2px solid var(--chev)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", color: "var(--nav)", flexShrink: 0 }}>
              {idx === 0 ? "!" : idx}
            </div>
            <div style={{ paddingTop: "10px" }}>
              <h4 style={{ margin: "0 0 0.5rem", fontSize: "1.1rem", fontVariationSettings: "'wght' 500" }}>{step.title}</h4>
              <p style={{ margin: 0, color: "var(--sub)", fontSize: "0.95rem" }}>{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

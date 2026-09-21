"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ContentLayout({ children, title }: { children: React.ReactNode, title?: string }) {
  const pathname = usePathname();
  const isAbout = pathname === "/about";
  const isHowItWorks = pathname === "/how-it-works";
  const isSafety = pathname === "/safety";
  const isPrivacy = pathname === "/privacy";

  // Reduced motion
  const [reducedMotion, setReducedMotion] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    setTimeout(() => {
      if (mql.matches) {
        setReducedMotion(true);
      }
    }, 0);
    if (mql.addEventListener) mql.addEventListener("change", onChange);
    else mql.addListener?.(onChange);
    
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", onChange);
      else mql.removeListener?.(onChange);
    };
  }, []);

  // Close nav on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="marketing-content">
      <div className="art-static" />
      <div className="veil-darker" />

      {/* Simplified, flow-based header for content pages */}
      <header className="bar" style={{ position: 'relative', zIndex: 10, padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/" className="brand" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg viewBox="0 0 23 17" aria-hidden="true" style={{ width: '24px', fill: 'var(--ink)' }}>
            <path d="M8.15 0.9 L4.55 0.9 L0.5 9.3 L4.1 9.3 Z" />
            <path d="M17.0 0 L13.4 0 L6.15 16.4 L9.75 16.4 Z" />
            <path d="M22.9 0 L19.3 0 L15.0 7.6 L18.6 7.6 Z" />
            <path d="M22.6 6.9 L19.0 6.9 L14.05 16.4 L17.65 16.4 Z" />
          </svg>
          <span style={{ fontVariationSettings: "'wght' 531", fontSize: '1.25rem', letterSpacing: '0.05em' }}>SajiloResQ</span>
        </Link>

        {/* Scrim closes nav on click */}
        <a href="#nav" className={`scrim ${navOpen ? "open" : ""}`} aria-hidden="true" onClick={(e) => { e.preventDefault(); setNavOpen(false); document.getElementById("burger-btn2")?.focus(); }} style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
          backgroundColor: 'rgba(0,0,0,0)', zIndex: 10, 
          visibility: navOpen ? 'visible' : 'hidden',
          transition: 'visibility 0s 0.4s',
          pointerEvents: navOpen ? 'auto' : 'none'
        }}></a>

        <a id="burger-btn2" href="#nav" className={`burger ${navOpen ? "open" : ""}`} aria-expanded={navOpen} aria-label="Menu" onClick={(e) => { e.preventDefault(); setNavOpen(!navOpen); }} style={{ position: 'relative', zIndex: 11 }}>
          <span style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', border: 0 }}>Menu</span>
          <svg viewBox="0 0 22 14" style={{ width: '22px', stroke: 'var(--nav)', strokeWidth: 1.5 }}>
            <path className="b1" d="M1 1 H21" style={navOpen ? { transform: 'translateY(6px) rotate(45deg)', transformOrigin: 'center' } : {}} />
            <path className="b2" d="M1 7 H21" style={navOpen ? { opacity: 0 } : {}} />
            <path className="b3" d="M1 13 H21" style={navOpen ? { transform: 'translateY(-6px) rotate(-45deg)', transformOrigin: 'center' } : {}} />
          </svg>
        </a>
        
        <div className={`navpanel ${navOpen ? "open" : ""}`} id="nav" style={{
          visibility: navOpen ? 'visible' : 'hidden',
          opacity: navOpen ? 1 : 0,
          transition: navOpen ? 'visibility 0s, opacity 0.4s ease' : 'visibility 0s 0.4s, opacity 0.4s ease'
        }}>
          <nav className="menu">
            <Link href="/about" style={{ opacity: isAbout ? 1 : 0.7 }}>About</Link>
            <Link href="/how-it-works" style={{ opacity: isHowItWorks ? 1 : 0.7 }}>How it works</Link>
            <Link href="/safety" style={{ opacity: isSafety ? 1 : 0.7 }}>Safety</Link>
          </nav>
          <Link className="login" href="/login">
            Log in / Request access
            <svg className="navarrow" viewBox="0 0 10 9" aria-hidden="true" style={{ width: '12px', stroke: 'var(--nav)', strokeWidth: 1.2 }}>
              <path d="M0 4.5 H9.1 M5.4 0.9 L9.2 4.5 L5.4 8.1" />
            </svg>
          </Link>
          <Link className="pill cta-small" href="/report" style={{ border: '1px solid rgba(255,255,255,0.2)', padding: '0.5rem 1rem', borderRadius: '999px', fontSize: '0.9rem' }}>
            Emergency SOS
          </Link>
        </div>
      </header>

      <main style={{ position: 'relative', zIndex: 1, padding: '2rem 1.5rem 6rem', maxWidth: '860px', margin: '0 auto' }}>
        {title && <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem', fontVariationSettings: "'wght' 500" }}>{title}</h1>}
        {children}
      </main>

      <footer style={{ position: 'relative', zIndex: 1, padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--sub)', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '4rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
          <Link href="/about">About</Link>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/safety">Safety</Link>
          <Link href="/login">Responder login</Link>
        </div>
        <p style={{ marginBottom: '0.5rem' }}>A demo prototype — alerts go to test phones, not to real emergency services.</p>
        <p style={{ opacity: 0.7, fontSize: '0.9em' }}>Built for the Yantra Business Cup, SOFTBOTS AI Hackathon 2026.</p>
      </footer>
    </div>
  );
}

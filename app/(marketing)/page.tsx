"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function HeroLandingPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isEntered, setIsEntered] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

  useEffect(() => {
    // Entrance Sequence Timeout Fallback
    const timer = setTimeout(() => setIsEntered(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  // Data saver & viewport detection
  useEffect(() => {
    const w = window.innerWidth;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conn = (navigator as any).connection;
    const saveData = conn?.saveData === true;
    const effectiveType = conn?.effectiveType;
    const isSlow = effectiveType === "slow-2g" || effectiveType === "2g" || effectiveType === "3g";
    const reducedData = window.matchMedia("(prefers-reduced-data: reduce)").matches;

    if (w >= 600 && !saveData && !isSlow && !reducedData) {
      setTimeout(() => {
        setVideoSrc("https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260912_104303_0c6d60b2-9353-408e-9449-585108a22fb5.mp4");
      }, 0);
    }
  }, []);

  // Reduced motion and visibility API hook
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      if (!videoRef.current) return;
      if (mql.matches || document.hidden) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    if (mql.addEventListener) {
      mql.addEventListener("change", sync);
    } else {
      mql.addListener?.(sync);
    }
    return () => {
      document.removeEventListener("visibilitychange", sync);
      if (mql.removeEventListener) {
        mql.removeEventListener("change", sync);
      } else {
        mql.removeListener?.(sync);
      }
    };
  }, []);

  // Close nav on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setNavOpen(false);
        document.getElementById("burger-btn")?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className={`marketing-hero ${isEntered ? "is-entered" : ""}`}>
      <div 
        className="art-poster" 
        style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          backgroundImage: 'url(https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/130837c4-0244-4f37-9c61-8d801d93fd29.jpg)',
          backgroundSize: 'cover', backgroundPosition: 'center', zIndex: -2
        }} 
      />
      <video
        ref={videoRef}
        className="art"
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        aria-hidden="true"
      >
        {videoSrc && <source src={videoSrc} type="video/mp4" />}
      </video>
      <div className="veil" />

      <header className="bar">
        <Link prefetch={false} href="/" className="brand">
          <svg viewBox="0 0 23 17" aria-hidden="true">
            <path d="M8.15 0.9 L4.55 0.9 L0.5 9.3 L4.1 9.3 Z" />
            <path d="M17.0 0 L13.4 0 L6.15 16.4 L9.75 16.4 Z" />
            <path d="M22.9 0 L19.3 0 L15.0 7.6 L18.6 7.6 Z" />
            <path d="M22.6 6.9 L19.0 6.9 L14.05 16.4 L17.65 16.4 Z" />
          </svg>
          <span id="word">SajiloResQ</span>
        </Link>
        
        {/* Scrim closes nav on click */}
        <a href="#nav" className={`scrim ${navOpen ? "open" : ""}`} aria-hidden="true" onClick={(e) => { e.preventDefault(); setNavOpen(false); document.getElementById("burger-btn")?.focus(); }}></a>
        
        <a id="burger-btn" href="#nav" className={`burger ${navOpen ? "open" : ""}`} aria-expanded={navOpen} aria-label="Menu" onClick={(e) => { e.preventDefault(); setNavOpen(!navOpen); }}>
          <span style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', border: 0 }}>Menu</span>
          <svg viewBox="0 0 22 14">
            <path className="b1" d="M1 1 H21" />
            <path className="b2" d="M1 7 H21" />
            <path className="b3" d="M1 13 H21" />
          </svg>
        </a>
        
        <div className={`navpanel ${navOpen ? "open" : ""}`} id="nav">
          <nav className="menu">
            <Link prefetch={false} href="/about"><span id="about">About</span></Link>
            <Link prefetch={false} href="/how-it-works"><span id="product">How it works</span></Link>
            <Link prefetch={false} href="/safety"><span id="solutions">Safety</span></Link>
          </nav>
          <Link prefetch={false} className="login" href="/login">
            <span id="login">Log in / Request access</span>
            <svg className="navarrow" viewBox="0 0 10 9" aria-hidden="true">
              <path d="M0 4.5 H9.1 M5.4 0.9 L9.2 4.5 L5.4 8.1" />
            </svg>
          </Link>
          <Link prefetch={false} className="pill" href="/report"><span id="contact">Emergency SOS</span></Link>
        </div>
      </header>

      <main className="hero">
        <h1 className="title">
          <span id="h1a">Every report. Faster response.</span>
          <span id="h1b">No report lost.</span>
        </h1>
        <p className="sub">
          <span id="sub1">Intelligent dispatch & field coordination</span>
          <span id="sub2">for emergency responder networks.</span>
        </p>
        <Link prefetch={false} className="cta" href="/report">
          <span id="cta">One-tap SOS</span>
          <svg className="arrow" viewBox="0 0 16 11" aria-hidden="true">
            <path d="M0 5.5 H14.6 M10.3 1.2 L14.9 5.5 L10.3 9.8" />
          </svg>
        </Link>
        <ul className="feats">
          <li>
            <svg className="chev" viewBox="0 0 11 20"><path d="M1.15 1.15 L9.6 10 L1.15 18.85" /></svg>
            <span id="f1">One-tap SOS</span>
          </li>
          <li>
            <svg className="chev" viewBox="0 0 11 20"><path d="M1.15 1.15 L9.6 10 L1.15 18.85" /></svg>
            <span id="f2">Works offline</span>
          </li>
          <li>
            <svg className="chev" viewBox="0 0 11 20"><path d="M1.15 1.15 L9.6 10 L1.15 18.85" /></svg>
            <span id="f3">Explainable AI triage</span>
          </li>
          <li>
            <svg className="chev" viewBox="0 0 11 20"><path d="M1.15 1.15 L9.6 10 L1.15 18.85" /></svg>
            <span id="f4">Full audit trail</span>
          </li>
        </ul>
        <span className="rule" aria-hidden="true"></span>
      </main>

      <footer className="foot">
        <span 
          id="foot1" 
          onAnimationEnd={() => setIsEntered(true)}
        >
          A demo prototype — alerts go to test phones, not to real emergency services.
        </span>
        <span id="foot2">Built for the Yantra Business Cup, SOFTBOTS AI Hackathon 2026.</span>
      </footer>
    </div>
  );
}

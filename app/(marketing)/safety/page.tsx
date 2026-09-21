import React from "react";
import ContentLayout from "../ContentLayout";
import RevealOnScroll from "../RevealOnScroll";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Safety and Limitations — SajiloResQ",
  description: "Important safety information and limitations of the SajiloResQ platform.",
};

export default function SafetyPage() {
  return (
    <ContentLayout title="Safety and Limitations">
      <RevealOnScroll>
        <p style={{ fontSize: "1.1rem", marginBottom: "3rem", color: "var(--ink)" }}>
          SajiloResQ is an advisory tool designed to help coordinate disaster response efforts. 
          It is <strong>not</strong> a replacement for official emergency services.
        </p>
      </RevealOnScroll>

      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        <RevealOnScroll>
          <section style={{ background: "rgba(255,255,255,0.03)", padding: "1.5rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 style={{ fontSize: "1.25rem", marginTop: 0, marginBottom: "1rem" }}>1. Do not rely solely on this platform</h2>
            <p style={{ margin: 0, color: "var(--sub)" }}>
              If you or someone else is in immediate, life-threatening danger, always attempt to contact 
              official national emergency services (e.g., Police 100, Ambulance 102, Fire 101) directly 
              by phone if a network connection is available.
            </p>
          </section>
        </RevealOnScroll>

        <RevealOnScroll>
          <section style={{ background: "rgba(255,255,255,0.03)", padding: "1.5rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 style={{ fontSize: "1.25rem", marginTop: 0, marginBottom: "1rem" }}>2. Response is not guaranteed</h2>
            <p style={{ margin: 0, color: "var(--sub)" }}>
              Submitting a report through SajiloResQ does not guarantee an immediate rescue. Response times 
              depend on the availability of local responders, geographic constraints, and active hazard conditions.
            </p>
          </section>
        </RevealOnScroll>

        <RevealOnScroll>
          <section style={{ background: "rgba(255,255,255,0.03)", padding: "1.5rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 style={{ fontSize: "1.25rem", marginTop: 0, marginBottom: "1rem" }}>3. AI processing is advisory</h2>
            <p style={{ margin: 0, color: "var(--sub)" }}>
              Our automated systems help categorize and route incidents quickly. However, all AI-generated triage 
              recommendations are subject to human review. The system may occasionally misinterpret text or images.
            </p>
          </section>
        </RevealOnScroll>

        <RevealOnScroll>
          <section style={{ background: "rgba(255,255,255,0.03)", padding: "1.5rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 style={{ fontSize: "1.25rem", marginTop: 0, marginBottom: "1rem" }}>4. Offline functionality limits</h2>
            <p style={{ margin: 0, color: "var(--sub)" }}>
              If you submit a report while offline, it is saved locally on your device. It will <strong>only</strong> be 
              transmitted to responders once your device regains an internet connection. You must open the application 
              again or ensure background sync is active when connection returns.
            </p>
          </section>
        </RevealOnScroll>
      </div>
    </ContentLayout>
  );
}

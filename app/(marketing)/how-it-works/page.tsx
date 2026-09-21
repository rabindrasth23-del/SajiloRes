import React from "react";
import ContentLayout from "../ContentLayout";
import RevealOnScroll from "../RevealOnScroll";
import AnimatedStory from "./AnimatedStory";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "How it works — SajiloResQ",
  description: "Learn how SajiloResQ captures, structures, and triages emergency reports.",
};

export default function HowItWorksPage() {
  return (
    <ContentLayout title="How it works">
      <RevealOnScroll>
        <AnimatedStory />
      </RevealOnScroll>

      <RevealOnScroll>
        <h2>When Things Go Wrong</h2>
        <p>Technology fails. Here is what happens when it does:</p>
        <div style={{ overflowX: 'auto', marginBottom: '2rem' }} tabIndex={0}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '1rem 0' }}>Situation</th>
                <th style={{ padding: '1rem 0' }}>What happens</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '1rem 0', paddingRight: '1rem' }}>No network</td>
                <td style={{ padding: '1rem 0', color: 'var(--sub)' }}>Report is saved securely on the device and sent automatically later.</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '1rem 0', paddingRight: '1rem' }}>AI unavailable</td>
                <td style={{ padding: '1rem 0', color: 'var(--sub)' }}>The report is still saved, and a human dispatcher reads the original raw text.</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '1rem 0', paddingRight: '1rem' }}>Duplicate suspected</td>
                <td style={{ padding: '1rem 0', color: 'var(--sub)' }}>It is flagged for a human to review. We never automatically merge reports.</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '1rem 0', paddingRight: '1rem' }}>No responder nearby</td>
                <td style={{ padding: '1rem 0', color: 'var(--sub)' }}>The report is routed directly to a central coordinator queue.</td>
              </tr>
              <tr>
                <td style={{ padding: '1rem 0', paddingRight: '1rem' }}>Nobody acknowledges</td>
                <td style={{ padding: '1rem 0', color: 'var(--sub)' }}>System recommends escalation to secondary contacts.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </RevealOnScroll>

      <RevealOnScroll>
        <h2>An AI You Can Question</h2>
        <p>Our triage AI is designed to support, not replace, human judgment.</p>
        <ul style={{ listStyleType: "disc", paddingLeft: "1.5rem", color: "var(--sub)", lineHeight: 1.7, marginBottom: "1.5rem" }}>
          <li><strong>What it shows:</strong> Priority level, confidence score, reasoning for its decision, and clearly marked missing information.</li>
          <li><strong>What it can NEVER do:</strong> Dispatch a responder, invent a location that was not provided, or claim an alert was sent before the network confirms it.</li>
        </ul>
      </RevealOnScroll>

      <RevealOnScroll>
        <h3>Frequently Asked Questions</h3>
        <div className="faq-accordion" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[
            { q: "Is this real?", a: "This is a demo prototype. Alerts go to test phones, not to real emergency services." },
            { q: "Does it call emergency services?", a: "No. The system is strictly advisory and relies on human dispatchers to contact real authorities." },
            { q: "What if I have no internet?", a: "You can use the SOS Fast Path via SMS, or submit a detailed report which saves on your device and sends when you reconnect." },
            { q: "Do I need an account?", a: "No login is required to send an SOS or submit a report." },
            { q: "What happens to my photo?", a: "Photos are resized on your device before upload to save data, and stored securely where only authorized staff can see them." },
            { q: "Can the AI be wrong?", a: "Yes, which is why a human dispatcher always reviews the raw report alongside the AI's suggestions." },
            { q: "Who can see my report?", a: "Only authorized, role-based staff (responders, coordinators, admins). Citizens cannot view each other's reports." },
            { q: "How do I remove my data from my device?", a: "You can click 'Clear my reports from this device' on the status page to remove local drafts and tracking IDs." },
          ].map((faq, i) => (
            <details key={i} style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', cursor: 'pointer' }}>
              <summary style={{ fontVariationSettings: "'wght' 500", outline: 'none' }}>{faq.q}</summary>
              <p style={{ marginTop: '1rem', color: 'var(--sub)', fontSize: '0.95rem', lineHeight: 1.6 }}>{faq.a}</p>
            </details>
          ))}
        </div>
      </RevealOnScroll>
    </ContentLayout>
  );
}

import React from "react";
import ContentLayout from "../ContentLayout";
import RevealOnScroll from "../RevealOnScroll";
import { team } from "@/content/team";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — SajiloResQ",
  description: "Learn about SajiloResQ, an intelligent dispatch and field coordination system for emergency responder networks.",
};

export default function AboutPage() {
  return (
    <ContentLayout title="About">
      <RevealOnScroll>
        <h2>Every report. Faster response. No report lost.</h2>
      </RevealOnScroll>
      
      <RevealOnScroll>
        <h3>The Problem</h3>
        <p>
          During emergencies, information is chaotic. Reports coming in are often incomplete, 
          duplicated across multiple callers, delayed due to poor network conditions, or lost 
          in the noise. For control rooms, this makes it incredibly hard to prioritize which 
          incident needs immediate attention and which resources to dispatch first.
        </p>
      </RevealOnScroll>

      <RevealOnScroll>
        <h3>What SajiloResQ Does</h3>
        <p>
          SajiloResQ acts as a smart filter and coordination layer between citizens in distress 
          and emergency responders. It captures reports (even offline), structures the data, and 
          uses an AI triage system to recommend urgency and highlight missing facts. It is strictly 
          advisory and human-supervised—SajiloResQ never autonomously contacts emergency services 
          or dispatches units without a human responder reviewing and approving the action.
        </p>
      </RevealOnScroll>

      <RevealOnScroll>
        <h3>Our Principles</h3>
        <ul style={{ listStyleType: "disc", paddingLeft: "1.5rem", color: "var(--sub)", lineHeight: 1.7, marginBottom: "1.5rem" }}>
          <li><strong>Works offline:</strong> You shouldn&apos;t need a strong data connection to ask for help.</li>
          <li><strong>Humans approve:</strong> AI recommends, humans decide.</li>
          <li><strong>Explainable:</strong> Triage decisions are transparent, showing exactly why a priority was suggested.</li>
          <li><strong>Simple for citizens:</strong> No complex forms during a crisis.</li>
          <li><strong>Honest:</strong> We never claim a message was sent until the network confirms it.</li>
          <li><strong>Safe by default:</strong> Information is scoped strictly to authorized personnel.</li>
          <li><strong>No invented facts:</strong> The AI is constrained to only use the facts provided in the report.</li>
        </ul>
      </RevealOnScroll>

      <RevealOnScroll>
        <h3>Who It Is For</h3>
        <ul style={{ listStyleType: "disc", paddingLeft: "1.5rem", color: "var(--sub)", lineHeight: 1.7, marginBottom: "1.5rem" }}>
          <li><strong>Citizens:</strong> People in distress who need to report an incident quickly and reliably.</li>
          <li><strong>Responders:</strong> Field units and dispatchers who need clear, deduplicated, and prioritized information.</li>
          <li><strong>Admins:</strong> System administrators who manage responder access and oversee system health.</li>
        </ul>
      </RevealOnScroll>

      <RevealOnScroll>
        <h3>About This Project</h3>
        <p>
          This prototype was built for the Yantra Business Cup, SOFTBOTS AI Hackathon 2026, 
          under the theme of Disaster Response.
        </p>
      </RevealOnScroll>

      {team && team.length > 0 && (
        <RevealOnScroll>
          <h3>Our Team</h3>
          <ul style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {team.map((member: { name: string }, i: number) => (
              <li key={i} style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                {member.name}
              </li>
            ))}
          </ul>
        </RevealOnScroll>
      )}
    </ContentLayout>
  );
}

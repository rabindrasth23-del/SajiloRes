import React from "react";
import ContentLayout from "../ContentLayout";
import RevealOnScroll from "../RevealOnScroll";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy — SajiloResQ",
  description: "Learn how SajiloResQ handles your data.",
};

export default function PrivacyPage() {
  const lastUpdated = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <ContentLayout title="Privacy">
      <RevealOnScroll>
        <p style={{ fontStyle: "italic", marginBottom: "2rem" }}>
          This describes how the SajiloResQ demo prototype handles data.
        </p>
      </RevealOnScroll>

      <RevealOnScroll>
        <h2>At a Glance</h2>
        <ul style={{ listStyleType: "disc", paddingLeft: "1.5rem", color: "var(--sub)", lineHeight: 1.7, marginBottom: "2rem" }}>
          <li>Citizens have no mandatory accounts. You can report without signing in.</li>
          <li>Your exact location is only collected if you tap &quot;Use my location&quot;.</li>
          <li>AI systems analyze reports but do not make final dispatch decisions.</li>
          <li>In this prototype, SOS messages go only to test phones (demo mode).</li>
          <li>No advertising trackers and no analytics.</li>
        </ul>
      </RevealOnScroll>

      <RevealOnScroll>
        <h2>What We Collect</h2>
        <p>
          A report contains the description text, the type of incident, an optional location 
          (GPS coordinates or typed text), optional photos, and the time. Anything you type 
          in the description is stored, so you should not enter details you do not want shared.
        </p>
        <p>
          Name and phone number are optional. If you provide them, they are stored with the report 
          and included in the SOS text sent to nearby station contacts. They are marked &quot;unverified&quot; 
          unless you choose the optional sign-up process (verified by a one-time code), in which case 
          we store the name and number you provided during sign-up.
        </p>
        <p>
          We also use your network address to limit abuse.
        </p>
      </RevealOnScroll>

      <RevealOnScroll>
        <h2>What We Do Not Collect</h2>
        <p>
          We do not ask for your email address. We do not run advertising trackers, cookies for marketing, 
          or third-party analytics scripts.
        </p>
      </RevealOnScroll>

      <RevealOnScroll>
        <h3>What Stays on Your Device</h3>
        <p>
          Each report gets a random reference stored on your device so you can check its status. 
          Drafts and reports waiting to be sent (when you are offline) are stored in the browser 
          until the network reconnects. A random device ID is stored on the device and used to limit abuse.
        </p>
      </RevealOnScroll>

      <RevealOnScroll>
        <h3>How Reports Are Used</h3>
        <p>
          The report text is processed by a third-party AI service to extract facts and suggest a priority. 
          The AI only recommends; a person decides. After a responder approves, a short alert may be emailed 
          to a responder contact.
        </p>
        <p>
          SOS text (name, phone, coordinates, time, reference code) is sent by SMS: through an SMS provider 
          from our server, or through your own carrier when you send it from your phone. SMS is not end-to-end encrypted.
        </p>
      </RevealOnScroll>

      <RevealOnScroll>
        <h3>Who Can See Reports</h3>
        <p>
          Reports and photos are stored in a database and a private file store; photos are not public. 
          Only signed-in, role-based staff (responder, coordinator, admin) can view them. The police station 
          contacts who receive an SOS text can also see the SOS details. Citizens cannot list other people&apos;s reports.
          Staff actions are recorded in an audit trail.
        </p>
      </RevealOnScroll>

      <RevealOnScroll>
        <h3>Service Providers</h3>
        <p>
          We use a third-party AI provider for triage and a third-party SMS provider to dispatch texts. 
          In this prototype, the responder directory is demo data, and SOS messages only go to test phones.
        </p>
      </RevealOnScroll>

      <RevealOnScroll>
        <h3>How Long We Keep Data</h3>
        <p>
          This prototype has no automatic deletion schedule yet; data is kept until the team removes it.
        </p>
      </RevealOnScroll>

      <RevealOnScroll>
        <h3>Your Choices</h3>
        <p>
          Photos are reduced in size on the device before upload to save data. You can click 
          &quot;Clear my reports from this device&quot; on the status page to remove local drafts and tracking IDs.
        </p>
      </RevealOnScroll>

      <RevealOnScroll>
        <h3>Security</h3>
        <p>
          Staff sign in with an account; a session is kept in the browser. Access is strictly role-based.
        </p>
      </RevealOnScroll>

      <RevealOnScroll>
        <h3>Children</h3>
        <p>
          The service is built for general emergency reporting. If a minor submits an emergency report, 
          the data is treated with the same confidentiality as all reports.
        </p>
      </RevealOnScroll>

      <RevealOnScroll>
        <h3>Changes</h3>
        <p>
          We may update this notice as the prototype evolves. Nothing here states legal compliance with 
          any law.
        </p>
      </RevealOnScroll>

      {process.env.NEXT_PUBLIC_CONTACT_EMAIL && (
        <RevealOnScroll>
          <h3>Contact</h3>
          <p>
            For questions about this notice, please contact {process.env.NEXT_PUBLIC_CONTACT_EMAIL}.
          </p>
        </RevealOnScroll>
      )}

      <RevealOnScroll>
        <p style={{ marginTop: "3rem", fontSize: "0.9em", color: "var(--sub)" }}>
          Last updated: {lastUpdated}
        </p>
      </RevealOnScroll>
    </ContentLayout>
  );
}

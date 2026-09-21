"use client";

import { useState } from "react";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { IncidentCard } from "@/components/IncidentCard";
import { AgentRecommendation } from "@/components/AgentRecommendation";
import { MetricsRow } from "@/components/MetricsRow";
import { TriageBadge } from "@/components/TriageBadge";
import { Button } from "@/components/ui/button";

export default function DevComponentsPage() {
  const [isAgentOpen, setIsAgentOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<string | undefined>("inc-2");

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-12">
      <div>
        <h1 className="text-3xl font-bold mb-8">Component Testing</h1>
        
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Metrics Row</h2>
          <MetricsRow />
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Triage Badges</h2>
          <div className="flex gap-4">
            <TriageBadge level="immediate" active />
            <TriageBadge level="delayed" />
            <TriageBadge level="minor" />
            <TriageBadge level="unknown" />
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Incident Cards</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <IncidentCard 
              id="inc-1"
              title="Building Collapse at Durbar Square" 
              location="Kathmandu, Ward 12"
              timeAgo="2m ago"
              triageLevel="immediate"
              active={true}
              selected={selectedIncident === "inc-1"}
              onClick={setSelectedIncident}
            />
            <IncidentCard 
              id="inc-2"
              title="Bridge structural damage reported" 
              location="Patan, Ward 3"
              timeAgo="15m ago"
              triageLevel="delayed"
              selected={selectedIncident === "inc-2"}
              onClick={setSelectedIncident}
            />
            <IncidentCard 
              id="inc-3"
              title="Minor flooding in residential area" 
              location="Bhaktapur, Ward 5"
              timeAgo="1h ago"
              triageLevel="minor"
              selected={selectedIncident === "inc-3"}
              onClick={setSelectedIncident}
            />
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Skeleton Loader</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <SkeletonLoader />
            <SkeletonLoader />
            <SkeletonLoader />
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Agent Recommendation</h2>
          <Button onClick={() => setIsAgentOpen(true)} className="mb-4">
            Toggle Agent Panel
          </Button>
          <div className="w-full lg:w-1/3">
            <AgentRecommendation 
              isOpen={isAgentOpen} 
              onOpenChange={setIsAgentOpen}
              recommendation="Based on standard operating procedures, dispatch nearest medical unit to coordinate with SAR team."
            />
          </div>
        </section>
      </div>
    </div>
  );
}

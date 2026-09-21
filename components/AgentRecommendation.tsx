"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Bot, Check, X, ShieldAlert, Info, Copy, XCircle } from "lucide-react";
import { SkeletonLoader } from "./SkeletonLoader";

export interface AgentRecommendationProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AgentRecommendation({ isOpen, onOpenChange }: AgentRecommendationProps) {
  const device = useMobile();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const content = (
    <div className="space-y-4">
      <div className="bg-teal/5 p-4 rounded-md border border-teal/20 text-sm text-ink leading-relaxed space-y-3">
        <p><strong>Priority:</strong> Immediate</p>
        <p><strong>Confidence:</strong> 86%</p>
        <div>
          <strong>Why:</strong><br />
          Possible trapped people, heavy bleeding,<br />
          and a blocked access road.
        </div>
        <div>
          <strong>Missing information:</strong><br />
          Exact number of trapped people.
        </div>
        <div>
          <strong>Recommended action:</strong><br />
          Notify rescue and ambulance; request police<br />
          support for road control.
        </div>
        <p><strong>Approval:</strong> Pending responder confirmation.</p>
      </div>
      
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button className="flex-1 min-w-[140px] gap-2 bg-teal hover:bg-teal/90 text-white">
          <Check className="w-4 h-4" /> Approve alert
        </Button>
        <Button variant="outline" className="flex-1 min-w-[140px] gap-2 text-ink">
          <ShieldAlert className="w-4 h-4" /> Modify decision
        </Button>
        <Button variant="outline" className="flex-1 min-w-[140px] gap-2 text-ink">
          <Info className="w-4 h-4" /> Request information
        </Button>
        <Button variant="outline" className="flex-1 min-w-[140px] gap-2 text-ink">
          <Copy className="w-4 h-4" /> Mark duplicate
        </Button>
        <Button variant="outline" className="flex-1 min-w-[140px] gap-2 text-immediate border-immediate/20 hover:bg-immediate/10 hover:text-immediate">
          <XCircle className="w-4 h-4" /> Reject / mark false
        </Button>
      </div>
    </div>
  );

  // Avoid hydration mismatch by waiting for mount
  if (!mounted) {
    return <SkeletonLoader className="h-[400px]" />;
  }

  if (device === 'mobile' || device === 'tablet') {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="sm:max-w-md sm:side-right sm:bottom-0 overflow-y-auto animate-in fade-in duration-200">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-teal" aria-hidden="true" />
              Sajilo Agent recommendation
            </SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop view
  return (
    <Card className="w-full border-mist shadow-sm animate-in fade-in duration-200">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bot className="w-5 h-5 text-teal" aria-hidden="true" />
          Sajilo Agent recommendation
        </CardTitle>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger 
              type="button" 
              aria-label="Dismiss recommendation" 
              onClick={() => onOpenChange(false)}
              className="p-1.5 rounded-sm opacity-70 hover:opacity-100 hover:bg-mist/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
            >
              <X className="w-4 h-4 text-ink" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Dismiss recommendation</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}

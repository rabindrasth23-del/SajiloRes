"use client";

import { useState, useRef, useEffect } from "react";
import { getActionAvailability } from "@/lib/incidents/availability";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Check, XCircle, Edit, Copy, Info, AlertTriangle, RefreshCw, X, FileText } from "lucide-react";
import clsx from "clsx";

interface AgentPanelProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  incident: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  duplicates: any[];
  onClose: () => void;
}

export function AgentPanel({ incident, duplicates, onClose }: AgentPanelProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Dialog states
  const [showModifyDialog, setShowModifyDialog] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  
  // Focus trap for dialogs
  useEffect(() => {
    if (showModifyDialog || showDuplicateDialog || showRejectDialog) {
      const focusableElements = dialogRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements && focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
      }
    }
  }, [showModifyDialog, showDuplicateDialog, showRejectDialog]);

  // Unified action bar logic
  const state = {
    status: incident.status,
    ai_status: incident.ai_status,
    hasUnresolvedDuplicate: false,
  };

  const flags = {
    approve: false, 
    "request-more-information": false
  };

  const approveStatus = getActionAvailability("approve", state, null, flags);
  const rejectStatus = getActionAvailability("reject", state, null, flags);
  const modifyStatus = getActionAvailability("modify", state, null, flags);
  const infoStatus = getActionAvailability("request_info", state, null, flags);

  // Duplicates logic
  const unresolvedDuplicates = duplicates.filter(
    (d) => !d.resolution && (d.incident_id === incident.id || d.possible_duplicate_of === incident.id)
  );

  const duplicateIncidentIds = unresolvedDuplicates.map((d) => 
    d.incident_id === incident.id ? d.possible_duplicate_of : d.incident_id
  );

  const markDupStatus = getActionAvailability("duplicate", state, null, flags);

  // Action Handlers
  const handleModifySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const reason = new FormData(e.currentTarget).get("reason") as string;
    await doAction("Modify", `/api/incidents/${incident.id}/modify`, { reason });
    setShowModifyDialog(false);
  };

  const handleDuplicateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const action = new FormData(e.currentTarget).get("action") as string;
    // Assuming duplicates array has only 1 for now, or just send the first ID
    const duplicateId = duplicateIncidentIds[0] || "unknown"; 
    await doAction("Mark Duplicate", `/api/incidents/${incident.id}/duplicate`, { action, duplicateId });
    setShowDuplicateDialog(false);
  };

  const handleRejectSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const reason = new FormData(e.currentTarget).get("reason") as string;
    const outcome = new FormData(e.currentTarget).get("outcome") as string; // 'rejected' | 'false_report'
    await doAction("Reject", `/api/incidents/${incident.id}/status`, { status: outcome, reason });
    setShowRejectDialog(false);
  };

  const handleRetryAi = async () => {
    await doAction("Retry AI", `/api/incidents/${incident.id}/process`, {});
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doAction = async (actionName: string, url: string, body: any) => {
    setLoadingAction(actionName);
    setErrorMsg(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(body)
      });
      
      if (!res.ok) {
        if (res.status === 409) setErrorMsg("Conflict: This incident state was modified by someone else.");
        else if (res.status === 403) setErrorMsg("Forbidden: You do not have permission for this action.");
        else if (res.status === 429) setErrorMsg("Rate limited: Too many requests.");
        else setErrorMsg(`Failed to ${actionName}. Network or server error.`);
      }
    } catch (e) {
      setErrorMsg("Network error occurred.");
    } finally {
      setLoadingAction(null);
    }
  };

  const renderAiState = () => {
    if (incident.ai_status === "processing") {
      return (
        <div className="flex flex-col gap-3">
          <p className="text-minor">The agent is extracting incident details…</p>
          <div className="animate-pulse space-y-2">
             <div className="h-4 bg-mist rounded w-3/4"></div>
             <div className="h-4 bg-mist rounded w-1/2"></div>
          </div>
        </div>
      );
    }
    
    if (incident.ai_status === "pending" || incident.ai_status === "failed") {
      return (
        <div className="flex flex-col gap-3">
           <p className="text-minor">Report saved. AI processing is {incident.ai_status}. A responder can review the original message.</p>
           <button 
             onClick={handleRetryAi}
             disabled={loadingAction === "Retry AI"}
             className="flex items-center gap-2 self-start px-3 py-1.5 bg-mist text-ink rounded hover:bg-mist/80 font-medium text-sm transition-colors"
           >
             <RefreshCw className={clsx("w-4 h-4", loadingAction === "Retry AI" && "animate-spin")} />
             Retry AI processing
           </button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <span className="text-xs text-minor font-medium uppercase">Priority</span>
            <div className="font-heading font-semibold text-lg">{incident.triage || "Unknown"}</div>
          </div>
          <div className="flex-1">
            <span className="text-xs text-minor font-medium uppercase">Confidence</span>
            <div className="font-heading font-semibold text-lg">
              {incident.confidence ? `${Math.round(incident.confidence * 100)}%` : "N/A"}
            </div>
          </div>
        </div>

        <div>
          <span className="text-xs text-minor font-medium uppercase mb-1 block">Why:</span>
          <p className="text-sm bg-cloud p-2 rounded border border-mist whitespace-pre-wrap">
            {incident.evidence?.length > 0 ? incident.evidence.join("\n") : incident.summary || incident.raw_text}
          </p>
        </div>

        <div>
          <span className="text-xs text-minor font-medium uppercase mb-1 block">Missing Information:</span>
          <ul className="list-disc pl-5 text-sm text-minor">
            {incident.missing_information?.length > 0 ? (
              incident.missing_information.map((m: string, i: number) => <li key={i}>{m}</li>)
            ) : (
              <li>None identified</li>
            )}
          </ul>
        </div>

        <div>
          <span className="text-xs text-minor font-medium uppercase mb-1 block">Recommended Action:</span>
          <p className="text-sm text-ink bg-teal/10 p-2 rounded border border-teal/20 font-medium">
            {incident.recommended_action || "Awaiting recommendation..."}
          </p>
        </div>

        <div>
          <span className="text-xs text-minor font-medium uppercase mb-1 block">Approval:</span>
          <p className="text-sm text-warning-dark flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" /> Pending responder confirmation.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="flex items-center justify-between p-4 border-b border-mist bg-cloud/50 flex-none">
        <div>
          <h2 className="font-heading font-semibold text-ink">Sajilo Agent recommendation</h2>
        </div>
        <button onClick={onClose} className="p-2 text-minor hover:text-ink hover:bg-mist rounded-md transition-colors md:hidden">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 relative">
        {duplicateIncidentIds.length > 0 && (
          <div className="mb-4 bg-warning/10 text-warning-dark p-3 rounded-md border border-warning/20 flex items-center gap-2 text-sm font-medium">
            <Copy className="w-4 h-4 flex-shrink-0" />
            Possible duplicate of Incident #{duplicateIncidentIds[0].slice(0, 8)}
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 bg-urgent/10 text-urgent p-3 rounded-md border border-urgent/20 text-sm">
            {errorMsg}
          </div>
        )}

        {renderAiState()}
      </div>

      {/* Action Bar */}
      <div className="p-3 border-t border-mist bg-white flex-none">
        <div className="flex flex-wrap gap-2">
          <button 
            disabled={!approveStatus.enabled}
            title={approveStatus.reason}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-teal/10 text-teal hover:bg-teal/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Check className="w-3.5 h-3.5" /> Approve
          </button>
          
          <button 
            disabled={!modifyStatus.enabled}
            title={modifyStatus.reason}
            onClick={() => setShowModifyDialog(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-mist text-ink hover:bg-mist/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Edit className="w-3.5 h-3.5" /> Modify
          </button>

          <button 
            disabled={!infoStatus.enabled}
            title={infoStatus.reason}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-mist text-ink hover:bg-mist/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Info className="w-3.5 h-3.5" /> Request Info
          </button>

          <button 
            disabled={!markDupStatus.enabled}
            title={markDupStatus.reason}
            onClick={() => setShowDuplicateDialog(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-mist text-ink hover:bg-mist/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Copy className="w-3.5 h-3.5" /> Mark duplicate
          </button>

          <button 
            disabled={!rejectStatus.enabled}
            title={rejectStatus.reason}
            onClick={() => setShowRejectDialog(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-urgent/10 text-urgent hover:bg-urgent/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <XCircle className="w-3.5 h-3.5" /> Reject
          </button>
        </div>
      </div>

      {/* Dialogs */}
      {(showModifyDialog || showDuplicateDialog || showRejectDialog) && (
        <div className="absolute inset-0 z-50 bg-navy/50 flex items-center justify-center p-4">
          <div ref={dialogRef} className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
            
            {showModifyDialog && (
              <form onSubmit={handleModifySubmit} className="flex flex-col h-full">
                <div className="p-4 border-b border-mist">
                  <h3 className="font-heading font-semibold">Modify decision</h3>
                </div>
                <div className="p-4 flex-1">
                  <label className="block text-sm font-medium mb-1">Reason for modification</label>
                  <textarea name="reason" required className="w-full border border-mist rounded p-2 text-sm" rows={3}></textarea>
                </div>
                <div className="p-4 bg-cloud flex gap-2 justify-end">
                  <button type="button" onClick={() => setShowModifyDialog(false)} className="px-4 py-2 text-sm">Cancel</button>
                  <button type="submit" disabled={loadingAction === "Modify"} className="px-4 py-2 bg-navy text-white text-sm rounded">Save</button>
                </div>
              </form>
            )}

            {showRejectDialog && (
              <form onSubmit={handleRejectSubmit} className="flex flex-col h-full">
                <div className="p-4 border-b border-mist">
                  <h3 className="font-heading font-semibold text-urgent flex items-center gap-2">
                     <AlertTriangle className="w-4 h-4" />
                     Reject or Mark False
                  </h3>
                </div>
                <div className="p-4 flex-1 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Outcome</label>
                    <select name="outcome" required className="w-full border border-mist rounded p-2 text-sm">
                      <option value="rejected">Reject (No action needed)</option>
                      <option value="false_report">Mark as False Report</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Reason</label>
                    <textarea name="reason" required className="w-full border border-mist rounded p-2 text-sm" rows={3}></textarea>
                  </div>
                </div>
                <div className="p-4 bg-cloud flex gap-2 justify-end">
                  <button type="button" onClick={() => setShowRejectDialog(false)} className="px-4 py-2 text-sm">Cancel</button>
                  <button type="submit" disabled={loadingAction === "Reject"} className="px-4 py-2 bg-urgent text-white text-sm rounded">Confirm</button>
                </div>
              </form>
            )}

            {showDuplicateDialog && (
              <form onSubmit={handleDuplicateSubmit} className="flex flex-col h-full">
                <div className="p-4 border-b border-mist">
                  <h3 className="font-heading font-semibold">Resolve Duplicate</h3>
                </div>
                <div className="p-4 flex-1 space-y-4">
                  <p className="text-sm text-minor">Choose how to handle the possible duplicate flag with Incident #{duplicateIncidentIds[0]?.slice(0,8)}.</p>
                  <div>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="radio" name="action" value="merge" required defaultChecked /> Merge with original
                    </label>
                    <label className="flex items-center gap-2 text-sm mt-2">
                      <input type="radio" name="action" value="keep_separate" required /> Keep separate
                    </label>
                  </div>
                </div>
                <div className="p-4 bg-cloud flex gap-2 justify-end">
                  <button type="button" onClick={() => setShowDuplicateDialog(false)} className="px-4 py-2 text-sm">Cancel</button>
                  <button type="submit" disabled={loadingAction === "Mark Duplicate"} className="px-4 py-2 bg-navy text-white text-sm rounded">Save</button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

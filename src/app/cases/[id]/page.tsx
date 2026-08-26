"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ShieldCheck, ShieldAlert, ArrowLeft, RefreshCw, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

export default function CaseDetailPage() {
  const params = useParams();
  const caseId = params.id as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/cases/${caseId}`);
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error("Error fetching case details:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReconcile = async () => {
    try {
      setReconciling(true);
      await fetch(`/api/cases/${caseId}/reconcile`, { method: "POST" });
      await fetchDetails();
    } catch (err) {
      console.error("Reconciliation error:", err);
    } finally {
      setReconciling(false);
    }
  };

  useEffect(() => {
    if (caseId) fetchDetails();
  }, [caseId]);

  if (loading) {
    return <div className="text-center py-20 text-slate-400">Loading audit trail...</div>;
  }

  if (!data || data.error) {
    return <div className="text-center py-20 text-rose-400">Case not found.</div>;
  }

  const { case: c, events, investigation, policyCheck, recoveryAction, auditTrail } = data;

  const PIPELINE_STEPS = [
    { number: 1, name: "Detect", actor: "WEBHOOK" },
    { number: 2, name: "Investigate", actor: "AI_ENGINE" },
    { number: 3, name: "Decide", actor: "AI_ENGINE" },
    { number: 4, name: "Policy Check", actor: "POLICY_ENGINE" },
    { number: 5, name: "Act or Escalate", actor: "EXECUTOR" },
    { number: 6, name: "Reconcile", actor: "RECONCILE_ENGINE" },
    { number: 7, name: "Measure", actor: "SYSTEM" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/cases" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200">
          <ArrowLeft className="w-4 h-4" /> Back to Cases
        </Link>
        <button
          onClick={handleReconcile}
          disabled={reconciling}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${reconciling ? "animate-spin" : ""}`} /> Trigger Reconciliation API
        </button>
      </div>

      {/* Reconciliation Alert Banner if Awaiting Reconciliation */}
      {c.safety_state === "AWAITING_RECONCILIATION" && (
        <div className="bg-blue-950/80 border border-blue-700/80 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-blue-400" />
            <div>
              <div className="text-sm font-bold text-blue-200">Autonomous Recovery Paused — Awaiting Reconciliation</div>
              <div className="text-xs text-blue-300">Stale event payload detected. Click "Trigger Reconciliation API" to fetch authoritative state from Razorpay API.</div>
            </div>
          </div>
          <button
            onClick={handleReconcile}
            disabled={reconciling}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reconciling ? "animate-spin" : ""}`} /> Reconcile Now
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-bold font-mono text-white">{c.razorpay_payment_id}</h2>
              <span className={`px-2.5 py-1 rounded text-xs font-bold ${
                c.safety_state === "ACTIVE" ? "bg-emerald-950 text-emerald-400 border border-emerald-800" :
                c.safety_state === "AWAITING_RECONCILIATION" ? "bg-blue-950 text-blue-400 border border-blue-800" :
                "bg-rose-950 text-rose-400 border border-rose-800"
              }`}>
                SAFETY STATE: {c.safety_state}
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">Amount: {c.currency} {c.amount.toFixed(2)} | Error Code: {c.error_code || "N/A"}</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400">Integrity Taxonomy</span>
            <div className="font-mono text-sm font-bold text-slate-200 mt-0.5">{c.integrity_state}</div>
          </div>
        </div>

        {/* 7-Step Pipeline Progress Bar */}
        <div className="grid grid-cols-7 gap-2 pt-4 border-t border-slate-700">
          {PIPELINE_STEPS.map((step) => {
            const stepLog = auditTrail?.find((a: any) => a.step_number === step.number);
            const hasLog = Boolean(stepLog);
            let style = "bg-slate-900/40 border-slate-800 text-slate-600";

            if (hasLog) {
              if (c.safety_state === "ESCALATED" || c.safety_state === "BLOCKED") {
                style = "bg-rose-950/40 border-rose-500/50 text-rose-300";
              } else if (step.number === 6 && c.integrity_state === "TRUSTED") {
                style = "bg-emerald-950/40 border-emerald-500/50 text-emerald-300";
              } else {
                style = "bg-slate-900 border-blue-500/50 text-blue-400";
              }
            }

            return (
              <div key={step.number} className={`p-3 rounded-lg border text-center text-xs font-semibold ${style}`}>
                <div className="text-[10px] text-slate-500 uppercase">Step {step.number}</div>
                <div className="truncate mt-0.5">{step.name}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: AI & Policy Decision Details */}
        <div className="space-y-6">
          <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">AI Evidence Synthesis & Decision</h3>
            {investigation ? (
              <div className="space-y-2 text-sm text-slate-300">
                <div>
                  <span className="text-slate-400">Proposed Action:</span>{" "}
                  <strong className={`font-mono ${
                    investigation.proposed_decision === "RETRY_NOW" || investigation.proposed_decision === "RETRY_LATER" ? "text-emerald-400" :
                    investigation.proposed_decision === "ESCALATE" ? "text-rose-400" : "text-amber-400"
                  }`}>
                    {investigation.proposed_decision}
                  </strong>
                </div>
                <div><span className="text-slate-400">Reasoning:</span> {investigation.reasoning}</div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">No AI investigation logged.</p>
            )}
          </div>

          <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Deterministic Policy Engine Check</h3>
            {policyCheck ? (
              <div className="space-y-2 text-sm text-slate-300">
                <div><span className="text-slate-400">Policy Verdict:</span> <strong className={`font-mono ${policyCheck.status === "APPROVED" ? "text-emerald-400" : "text-rose-400"}`}>{policyCheck.status}</strong></div>
                <div><span className="text-slate-400">Reason:</span> {policyCheck.deterministic_reason}</div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">No policy check evaluated.</p>
            )}
          </div>

          <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Executed Recovery Action</h3>
            {recoveryAction ? (
              <div className="space-y-2 text-sm text-slate-300">
                <div><span className="text-slate-400">Action Type:</span> <strong className="font-mono text-slate-200">{recoveryAction.action_type}</strong></div>
                <div><span className="text-slate-400">Status:</span> <strong className={`font-mono ${recoveryAction.status === "SUCCESS" ? "text-emerald-400" : "text-rose-400"}`}>{recoveryAction.status}</strong></div>
                {recoveryAction.razorpay_entity_id && (
                  <div><span className="text-slate-400">Razorpay Link ID:</span> <span className="font-mono text-slate-200">{recoveryAction.razorpay_entity_id}</span></div>
                )}
                {recoveryAction.api_response_payload?.short_url && (
                  <div>
                    <span className="text-slate-400">Payment Link:</span>{" "}
                    <a
                      href={recoveryAction.api_response_payload.short_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 underline hover:text-blue-300 font-mono text-xs"
                    >
                      {recoveryAction.api_response_payload.short_url}
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 font-mono bg-slate-950 p-2.5 rounded border border-slate-700/60">
                🚫 No recovery action executed. Autonomous recovery suppressed by safety engine.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Complete Audit Trail Timeline */}
        <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Complete 7-Step Audit Trail Log</h3>
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {auditTrail?.map((log: any) => (
              <div key={log.id} className="bg-slate-900 border border-slate-700/60 p-3.5 rounded-lg space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-blue-400">Step {log.step_number}: {log.step_name}</span>
                  <span className="text-slate-500 font-mono">{log.actor}</span>
                </div>
                <pre className="text-[11px] font-mono bg-slate-950 p-2 rounded text-slate-300 overflow-x-auto">
                  {JSON.stringify(log.payload, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

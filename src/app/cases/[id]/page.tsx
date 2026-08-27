"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, RefreshCw, CheckCircle2, XCircle, AlertTriangle, ExternalLink } from "lucide-react";

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
    return (
      <div className="flex items-center justify-center py-24 font-mono text-xs text-slate-500">
        <RefreshCw className="w-4 h-4 animate-spin mr-2 text-blue-600" />
        Loading recovery case audit history...
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="text-center py-20 font-mono text-xs text-rose-600">
        Case ID [{caseId}] not found in recovery database.
      </div>
    );
  }

  const { case: c, events, investigation, policyCheck, recoveryAction, auditTrail } = data;

  const PIPELINE_STEPS = [
    { number: 1, name: "Detect", actor: "WEBHOOK" },
    { number: 2, name: "Investigate", actor: "AI_ENGINE" },
    { number: 3, name: "Decide", actor: "AI_ENGINE" },
    { number: 4, name: "Policy Check", actor: "POLICY_ENGINE" },
    { number: 5, name: "Act / Escalate", actor: "EXECUTOR" },
    { number: 6, name: "Reconcile", actor: "RECONCILE_ENGINE" },
    { number: 7, name: "Measure", actor: "SYSTEM" },
  ];

  const getStorySummary = () => {
    const formattedAmount = `₹${(c.amount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

    if (c.safety_state === "ESCALATED" || c.integrity_state === "CONTRADICTORY" || c.safety_state === "BLOCKED") {
      return {
        title: `${formattedAmount} — Recovery blocked`,
        description: "Payment status conflict detected. Automatic retry was prevented to avoid a possible duplicate charge.",
        style: "bg-rose-50 border-rose-200 text-rose-900",
        badge: "text-rose-700 font-semibold border-rose-300 bg-rose-100"
      };
    }

    if (c.safety_state === "AWAITING_RECONCILIATION" || c.integrity_state === "STALE") {
      return {
        title: `${formattedAmount} — Checking payment status`,
        description: "Payment information is outdated. RazorRecover is waiting for the latest payment state before taking action.",
        style: "bg-blue-50 border-blue-200 text-blue-900",
        badge: "text-blue-700 font-semibold border-blue-300 bg-blue-100"
      };
    }

    return {
      title: `${formattedAmount} — Recovery in progress`,
      description: "Temporary payment failure detected. Safety checks passed and recovery has been initiated.",
      style: "bg-emerald-50 border-emerald-200 text-emerald-900",
      badge: "text-emerald-700 font-semibold border-emerald-300 bg-emerald-100"
    };
  };

  const story = getStorySummary();

  return (
    <div className="space-y-5">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <Link href="/cases" className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-600 hover:text-slate-900 transition">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Recovery Cases
        </Link>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleReconcile}
            disabled={reconciling}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-sm text-xs font-mono transition disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reconciling ? "animate-spin" : ""}`} /> Trigger Reconciliation API
          </button>
        </div>
      </div>

      {/* Primary Story Summary Callout Banner */}
      <div className={`p-4 rounded-sm border ${story.style} shadow-sm space-y-1`}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold font-mono tracking-tight">{story.title}</h2>
          <span className={`px-2 py-0.5 rounded-sm text-[10px] font-mono border uppercase tracking-wider ${story.badge}`}>
            {c.safety_state}
          </span>
        </div>
        <p className="text-xs font-sans leading-relaxed text-slate-700">
          {story.description}
        </p>
      </div>

      {/* Case Header Technical Summary Box */}
      <div className="bg-white border border-slate-200 p-5 rounded-sm space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-lg font-bold font-mono text-slate-900">{c.razorpay_payment_id}</h1>
              <span className={`px-2 py-0.5 rounded-sm text-[11px] font-mono font-semibold uppercase tracking-wider ${
                c.safety_state === "ACTIVE" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                c.safety_state === "AWAITING_RECONCILIATION" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                "bg-rose-50 text-rose-700 border border-rose-200"
              }`}>
                SAFETY STATE: {c.safety_state}
              </span>
            </div>
            <p className="text-xs font-mono text-slate-500 mt-1">
              Case ID: {c.id} | Ingested: {new Date(c.created_at).toLocaleString()}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono border-t md:border-t-0 pt-3 md:pt-0 border-slate-200">
            <div>
              <span className="text-slate-400 uppercase text-[10px]">Amount</span>
              <div className="font-semibold text-slate-900 mt-0.5">
                {c.currency || "INR"} {(c.amount ?? 0).toFixed(2)}
              </div>
            </div>
            <div>
              <span className="text-slate-400 uppercase text-[10px]">Error Code</span>
              <div className="font-semibold text-slate-900 mt-0.5">{c.error_code || "NONE"}</div>
            </div>
            <div>
              <span className="text-slate-400 uppercase text-[10px]">Integrity State</span>
              <div className={`font-semibold mt-0.5 ${
                c.integrity_state === "TRUSTED" ? "text-emerald-700" :
                c.integrity_state === "STALE" ? "text-amber-700" : "text-rose-700"
              }`}>
                {c.integrity_state}
              </div>
            </div>
            <div>
              <span className="text-slate-400 uppercase text-[10px]">Retries</span>
              <div className="font-semibold text-slate-900 mt-0.5">{c.retry_count} / 2</div>
            </div>
          </div>
        </div>

        {/* 7-Step Pipeline Linear Flow Bar */}
        <div className="pt-4 border-t border-slate-200">
          <div className="text-[10px] font-mono uppercase text-slate-400 mb-2">
            7-Step Decision & Safety Execution Pipeline
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {PIPELINE_STEPS.map((step) => {
              const stepLog = auditTrail?.find((a: any) => a.step_number === step.number);
              const hasLog = Boolean(stepLog);
              let cardStyle = "bg-slate-50 border-slate-200 text-slate-400";

              if (hasLog) {
                if (c.safety_state === "ESCALATED" || c.safety_state === "BLOCKED") {
                  cardStyle = "bg-rose-50 border-rose-200 text-rose-800";
                } else if (step.number === 6 && c.integrity_state === "TRUSTED") {
                  cardStyle = "bg-emerald-50 border-emerald-200 text-emerald-800";
                } else {
                  cardStyle = "bg-blue-50/80 border-blue-200 text-blue-800";
                }
              } else if (step.number === 6 && c.safety_state === "AWAITING_RECONCILIATION") {
                cardStyle = "bg-blue-50 border-blue-400 text-blue-900 animate-pulse";
              }

              return (
                <div key={step.number} className={`p-2.5 rounded-sm border text-xs font-mono ${cardStyle}`}>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>STEP {step.number}</span>
                    <span>{step.actor}</span>
                  </div>
                  <div className="font-semibold truncate mt-1 text-[11px]">{step.name}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Grid: Decision Breakdown & Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Column: Decision Story & Safety Rules */}
        <div className="space-y-4">
          {/* Section 1: AI Evidence Synthesis */}
          <div className="bg-white border border-slate-200 p-4 rounded-sm space-y-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-800">
                1. AI Evidence Synthesis & Recommendation
              </span>
              <span className="text-[10px] font-mono text-slate-500">GEMINI AI ENGINE</span>
            </div>

            {investigation ? (
              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-baseline space-x-2">
                  <span className="text-slate-500">AI Proposed Action:</span>
                  <span className={`font-bold ${
                    investigation.proposed_decision === "RETRY_NOW" || investigation.proposed_decision === "RETRY_LATER" ? "text-emerald-700" :
                    investigation.proposed_decision === "ESCALATE" ? "text-rose-700" : "text-amber-700"
                  }`}>
                    {investigation.proposed_decision}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Evidence Reasoning:</span>
                  <p className="text-slate-800 font-sans mt-0.5 leading-relaxed bg-slate-50 p-2.5 rounded-sm border border-slate-200">
                    {investigation.reasoning}
                  </p>
                </div>
                {investigation.risk_factors && investigation.risk_factors.length > 0 && (
                  <div>
                    <span className="text-slate-500">Risk Factors Identified:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {investigation.risk_factors.map((rf: string, idx: number) => (
                        <span key={idx} className="bg-rose-50 border border-rose-200 text-rose-800 px-2 py-0.5 rounded-sm text-[10px]">
                          {rf}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs font-mono text-slate-500">No AI investigation record.</div>
            )}
          </div>

          {/* Section 2: Deterministic Policy Engine Check */}
          <div className="bg-white border border-slate-200 p-4 rounded-sm space-y-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-800">
                2. Deterministic Safety & Policy Check
              </span>
              <span className="text-[10px] font-mono text-slate-500">UNOVERRIDABLE POLICY ENGINE</span>
            </div>

            {policyCheck ? (
              <div className="space-y-3 text-xs font-mono">
                <div className="flex items-baseline space-x-2">
                  <span className="text-slate-500">Deterministic Verdict:</span>
                  <span className={`font-bold ${policyCheck.status === "APPROVED" ? "text-emerald-700" : "text-rose-700"}`}>
                    {policyCheck.status}
                  </span>
                </div>

                {policyCheck.passed_rules && policyCheck.passed_rules.length > 0 && (
                  <div>
                    <span className="text-slate-500 text-[11px]">Passed Policy Rules:</span>
                    <ul className="mt-1 space-y-1">
                      {policyCheck.passed_rules.map((rule: string, idx: number) => (
                        <li key={idx} className="flex items-center space-x-2 text-emerald-700 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {policyCheck.violated_rules && policyCheck.violated_rules.length > 0 && (
                  <div>
                    <span className="text-slate-500 text-[11px]">Violated Policy Rules:</span>
                    <ul className="mt-1 space-y-1">
                      {policyCheck.violated_rules.map((rule: string, idx: number) => (
                        <li key={idx} className="flex items-center space-x-2 text-rose-700 text-[11px]">
                          <XCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="bg-slate-50 p-2.5 rounded-sm border border-slate-200 text-slate-800">
                  <span className="text-slate-500 text-[10px] block">DETERMINISTIC EVALUATION REASON:</span>
                  <span className="text-[11px]">{policyCheck.deterministic_reason}</span>
                </div>
              </div>
            ) : (
              <div className="text-xs font-mono text-slate-500">No policy check evaluated.</div>
            )}
          </div>

          {/* Section 3: Executed Recovery Action */}
          <div className="bg-white border border-slate-200 p-4 rounded-sm space-y-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-800">
                3. Autonomous Execution Result
              </span>
              <span className="text-[10px] font-mono text-slate-500">RAZORPAY RECOVERY EXECUTOR</span>
            </div>

            {recoveryAction ? (
              <div className="space-y-2 text-xs font-mono">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500">Action Type:</span>
                    <div className="font-semibold text-slate-900 mt-0.5">{recoveryAction.action_type}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Execution Status:</span>
                    <div className={`font-semibold mt-0.5 ${recoveryAction.status === "SUCCESS" ? "text-emerald-700" : "text-rose-700"}`}>
                      {recoveryAction.status}
                    </div>
                  </div>
                </div>

                {recoveryAction.razorpay_entity_id && (
                  <div>
                    <span className="text-slate-500">Razorpay Link ID:</span>
                    <div className="font-semibold text-slate-900">{recoveryAction.razorpay_entity_id}</div>
                  </div>
                )}

                {recoveryAction.api_response_payload?.short_url && (
                  <div className="bg-slate-50 p-2.5 rounded-sm border border-slate-200">
                    <span className="text-slate-500 text-[10px] block">GENERATED PAYMENT RECOVERY LINK:</span>
                    <a
                      href={recoveryAction.api_response_payload.short_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1 font-semibold mt-0.5 text-xs"
                    >
                      {recoveryAction.api_response_payload.short_url} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-50 p-3 rounded-sm border border-slate-200 text-xs font-mono text-slate-600">
                <div className="font-semibold text-amber-700">AUTONOMOUS ACTION SUPPRESSED</div>
                <div className="text-[11px] text-slate-600 mt-1 font-sans">
                  No financial or recovery API call was executed because deterministic safety checks did not return APPROVED status.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: 7-Step Complete Audit Trail Log */}
        <div className="bg-white border border-slate-200 p-4 rounded-sm space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-800">
              Complete Audit Trail Log
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              {auditTrail?.length || 0} audit records
            </span>
          </div>

          <div className="space-y-2.5 max-h-[680px] overflow-y-auto pr-1">
            {auditTrail?.map((log: any) => (
              <div key={log.id} className="bg-slate-50 border border-slate-200 p-3 rounded-sm text-xs font-mono space-y-1.5">
                <div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-200">
                  <span className="font-semibold text-blue-700">
                    Step {log.step_number}: {log.step_name}
                  </span>
                  <span className="text-slate-500 text-[10px]">
                    {log.actor} | {new Date(log.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <pre className="text-[11px] font-mono bg-white p-2 rounded-sm text-slate-800 overflow-x-auto leading-relaxed border border-slate-200">
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

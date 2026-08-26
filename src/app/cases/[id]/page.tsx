"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, RefreshCw, CheckCircle2, XCircle, AlertTriangle, ExternalLink, Shield } from "lucide-react";

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
      <div className="flex items-center justify-center py-24 font-mono text-xs text-slate-400">
        <RefreshCw className="w-4 h-4 animate-spin mr-2 text-blue-400" />
        Loading recovery case audit history...
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="text-center py-20 font-mono text-xs text-rose-400">
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

  return (
    <div className="space-y-5">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <Link href="/cases" className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-slate-200 transition">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Recovery Cases
        </Link>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleReconcile}
            disabled={reconciling}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-xs font-mono transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reconciling ? "animate-spin" : ""}`} /> Trigger Reconciliation API
          </button>
        </div>
      </div>

      {/* Reconciliation Warning Banner */}
      {c.safety_state === "AWAITING_RECONCILIATION" && (
        <div className="bg-blue-950/60 border border-blue-800 p-4 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-blue-200">Autonomous Recovery Paused — Awaiting Reconciliation</div>
              <div className="text-blue-300 text-[11px] font-sans mt-0.5">
                Stale event payload detected. Autonomous execution suspended until authoritative state is verified from Razorpay API.
              </div>
            </div>
          </div>
          <button
            onClick={handleReconcile}
            disabled={reconciling}
            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-xs font-mono shrink-0 transition disabled:opacity-50"
          >
            {reconciling ? "Reconciling..." : "Reconcile Now"}
          </button>
        </div>
      )}

      {/* Case Header Summary Box */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-bold font-mono text-slate-100">{c.razorpay_payment_id}</h1>
              <span className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold uppercase tracking-wider ${
                c.safety_state === "ACTIVE" ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800" :
                c.safety_state === "AWAITING_RECONCILIATION" ? "bg-blue-950/80 text-blue-400 border border-blue-800" :
                "bg-rose-950/80 text-rose-400 border border-rose-800"
              }`}>
                SAFETY STATE: {c.safety_state}
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400 mt-1">
              Case ID: {c.id} | Created: {new Date(c.created_at).toLocaleString()}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
            <div>
              <span className="text-slate-500 uppercase text-[10px]">Amount</span>
              <div className="font-semibold text-slate-200 mt-0.5">
                {c.currency || "INR"} {(c.amount ?? 0).toFixed(2)}
              </div>
            </div>
            <div>
              <span className="text-slate-500 uppercase text-[10px]">Error Code</span>
              <div className="font-semibold text-slate-200 mt-0.5">{c.error_code || "NONE"}</div>
            </div>
            <div>
              <span className="text-slate-500 uppercase text-[10px]">Integrity State</span>
              <div className={`font-semibold mt-0.5 ${
                c.integrity_state === "TRUSTED" ? "text-emerald-400" :
                c.integrity_state === "STALE" ? "text-amber-400" : "text-rose-400"
              }`}>
                {c.integrity_state}
              </div>
            </div>
            <div>
              <span className="text-slate-500 uppercase text-[10px]">Retries</span>
              <div className="font-semibold text-slate-200 mt-0.5">{c.retry_count} / 2</div>
            </div>
          </div>
        </div>

        {/* 7-Step Pipeline Linear Flow Bar */}
        <div className="pt-4 border-t border-slate-800">
          <div className="text-[10px] font-mono uppercase text-slate-500 mb-2">
            7-Step Decision & Safety Execution Pipeline
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {PIPELINE_STEPS.map((step) => {
              const stepLog = auditTrail?.find((a: any) => a.step_number === step.number);
              const hasLog = Boolean(stepLog);
              let cardStyle = "bg-slate-950/40 border-slate-800 text-slate-600";

              if (hasLog) {
                if (c.safety_state === "ESCALATED" || c.safety_state === "BLOCKED") {
                  cardStyle = "bg-rose-950/30 border-rose-800/80 text-rose-300";
                } else if (step.number === 6 && c.integrity_state === "TRUSTED") {
                  cardStyle = "bg-emerald-950/30 border-emerald-800/80 text-emerald-300";
                } else {
                  cardStyle = "bg-slate-950 border-blue-800/60 text-blue-400";
                }
              } else if (step.number === 6 && c.safety_state === "AWAITING_RECONCILIATION") {
                cardStyle = "bg-blue-950/40 border-blue-500/80 text-blue-300 animate-pulse";
              }

              return (
                <div key={step.number} className={`p-2.5 rounded border text-xs font-mono ${cardStyle}`}>
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
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300">
                1. AI Evidence Synthesis & Proposal
              </span>
              <span className="text-[10px] font-mono text-slate-500">GEMINI / AI ENGINE</span>
            </div>

            {investigation ? (
              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-baseline space-x-2">
                  <span className="text-slate-400">Proposed Action:</span>
                  <span className={`font-bold ${
                    investigation.proposed_decision === "RETRY_NOW" || investigation.proposed_decision === "RETRY_LATER" ? "text-emerald-400" :
                    investigation.proposed_decision === "ESCALATE" ? "text-rose-400" : "text-amber-400"
                  }`}>
                    {investigation.proposed_decision}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Evidence Reasoning:</span>
                  <p className="text-slate-300 font-sans mt-0.5 leading-relaxed bg-slate-950 p-2.5 rounded border border-slate-800/60">
                    {investigation.reasoning}
                  </p>
                </div>
                {investigation.risk_factors && investigation.risk_factors.length > 0 && (
                  <div>
                    <span className="text-slate-400">Risk Factors:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {investigation.risk_factors.map((rf: string, idx: number) => (
                        <span key={idx} className="bg-rose-950/60 border border-rose-800 text-rose-300 px-2 py-0.5 rounded text-[10px]">
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
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300">
                2. Deterministic Policy Safety Check
              </span>
              <span className="text-[10px] font-mono text-slate-500">UNOVERRIDABLE POLICY ENGINE</span>
            </div>

            {policyCheck ? (
              <div className="space-y-3 text-xs font-mono">
                <div className="flex items-baseline space-x-2">
                  <span className="text-slate-400">Policy Verdict:</span>
                  <span className={`font-bold ${policyCheck.status === "APPROVED" ? "text-emerald-400" : "text-rose-400"}`}>
                    {policyCheck.status}
                  </span>
                </div>

                {policyCheck.passed_rules && policyCheck.passed_rules.length > 0 && (
                  <div>
                    <span className="text-slate-400 text-[11px]">Passed Policy Rules:</span>
                    <ul className="mt-1 space-y-1">
                      {policyCheck.passed_rules.map((rule: string, idx: number) => (
                        <li key={idx} className="flex items-center space-x-2 text-emerald-400 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {policyCheck.violated_rules && policyCheck.violated_rules.length > 0 && (
                  <div>
                    <span className="text-slate-400 text-[11px]">Violated Policy Rules:</span>
                    <ul className="mt-1 space-y-1">
                      {policyCheck.violated_rules.map((rule: string, idx: number) => (
                        <li key={idx} className="flex items-center space-x-2 text-rose-400 text-[11px]">
                          <XCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="bg-slate-950 p-2.5 rounded border border-slate-800/60 text-slate-300">
                  <span className="text-slate-500 text-[10px] block">DETERMINISTIC EVALUATION REASON:</span>
                  <span className="text-[11px]">{policyCheck.deterministic_reason}</span>
                </div>
              </div>
            ) : (
              <div className="text-xs font-mono text-slate-500">No policy check evaluated.</div>
            )}
          </div>

          {/* Section 3: Executed Recovery Action */}
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300">
                3. Autonomous Execution Result
              </span>
              <span className="text-[10px] font-mono text-slate-500">RAZORPAY RECOVERY EXECUTOR</span>
            </div>

            {recoveryAction ? (
              <div className="space-y-2 text-xs font-mono">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400">Action Type:</span>
                    <div className="font-semibold text-slate-200 mt-0.5">{recoveryAction.action_type}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Status:</span>
                    <div className={`font-semibold mt-0.5 ${recoveryAction.status === "SUCCESS" ? "text-emerald-400" : "text-rose-400"}`}>
                      {recoveryAction.status}
                    </div>
                  </div>
                </div>

                {recoveryAction.razorpay_entity_id && (
                  <div>
                    <span className="text-slate-400">Razorpay Entity ID:</span>
                    <div className="font-semibold text-slate-200">{recoveryAction.razorpay_entity_id}</div>
                  </div>
                )}

                {recoveryAction.api_response_payload?.short_url && (
                  <div className="bg-slate-950 p-2.5 rounded border border-slate-800/60">
                    <span className="text-slate-500 text-[10px] block">GENERATED PAYMENT RECOVERY LINK:</span>
                    <a
                      href={recoveryAction.api_response_payload.short_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline inline-flex items-center gap-1 font-semibold mt-0.5 text-xs"
                    >
                      {recoveryAction.api_response_payload.short_url} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-950 p-3 rounded border border-slate-800/60 text-xs font-mono text-slate-400">
                <div className="font-semibold text-amber-400">AUTONOMOUS ACTION SUPPRESSED</div>
                <div className="text-[11px] text-slate-400 mt-1 font-sans">
                  No financial or recovery API call was executed because deterministic safety checks did not pass status APPROVED.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: 7-Step Complete Audit Trail Log */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300">
              Complete Audit Trail Log
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              {auditTrail?.length || 0} audit records
            </span>
          </div>

          <div className="space-y-2.5 max-h-[680px] overflow-y-auto pr-1">
            {auditTrail?.map((log: any) => (
              <div key={log.id} className="bg-slate-950 border border-slate-800/80 p-3 rounded text-xs font-mono space-y-1.5">
                <div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-800/60">
                  <span className="font-semibold text-blue-400">
                    Step {log.step_number}: {log.step_name}
                  </span>
                  <span className="text-slate-500 text-[10px]">
                    {log.actor} | {new Date(log.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <pre className="text-[11px] font-mono bg-slate-900/90 p-2 rounded text-slate-300 overflow-x-auto leading-relaxed border border-slate-800/40">
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

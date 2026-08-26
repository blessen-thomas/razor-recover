"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { RefreshCw, ArrowRight, ChevronDown } from "lucide-react";

export default function CasesPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState<string | null>(null);
  const [testMenuOpen, setTestMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/cases");
      const data = await res.json();
      setCases(data.cases || []);
    } catch (err) {
      console.error("Failed to fetch cases:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async (scenario: "happy" | "unsafe" | "reconcile") => {
    try {
      setSeeding(scenario);
      setTestMenuOpen(false);
      await fetch("/api/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
      });
      await fetchCases();
    } catch (err) {
      console.error("Seed error:", err);
    } finally {
      setSeeding(null);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setTestMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Compute operational summary metrics from actual cases
  const totalCases = cases.length;
  const revenueAtRisk = cases.reduce((sum, c) => sum + (c.amount || 0), 0);
  const recoveryInProgress = cases
    .filter((c) => c.current_status === "RECOVERY_INITIATED" || c.current_status === "RECOVERED")
    .reduce((sum, c) => sum + (c.amount || 0), 0);
  const casesNeedingAttention = cases.filter(
    (c) => c.safety_state === "ESCALATED" || c.safety_state === "BLOCKED" || c.safety_state === "AWAITING_RECONCILIATION"
  ).length;
  const autonomousActionRate = totalCases > 0
    ? Math.round((cases.filter((c) => c.current_status === "RECOVERY_INITIATED" || c.current_status === "RECOVERED").length / totalCases) * 100)
    : 0;

  const formatCurrency = (val: number) => {
    return `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getWhatHappenedText = (c: any) => {
    switch (c.integrity_state) {
      case "TRUSTED":
        return c.error_description || "Temporary payment failure";
      case "CONTRADICTORY":
        return "Payment status conflict";
      case "STALE":
        return "Outdated payment information";
      case "DUPLICATE":
        return "Duplicate event received";
      case "OUT_OF_ORDER":
        return "Out-of-order event sequence";
      case "INCOMPLETE":
        return "Incomplete event payload";
      default:
        return c.integrity_state;
    }
  };

  const getDecisionText = (c: any) => {
    if (c.safety_state === "AWAITING_RECONCILIATION" || c.integrity_state === "STALE") {
      return <span className="text-blue-400 font-semibold">Reconcile</span>;
    }
    if (c.safety_state === "ESCALATED" || c.safety_state === "BLOCKED" || c.integrity_state === "CONTRADICTORY") {
      return <span className="text-rose-400 font-semibold">Stop</span>;
    }
    return <span className="text-emerald-400 font-semibold">Recover</span>;
  };

  const getStatusText = (c: any) => {
    switch (c.current_status) {
      case "RECOVERY_INITIATED":
        return <span className="text-emerald-400 font-semibold">Recovery in progress</span>;
      case "RECOVERED":
        return <span className="text-emerald-400 font-semibold">Recovered</span>;
      case "ESCALATED":
        return <span className="text-rose-400 font-semibold">Needs review</span>;
      case "FAILED":
        return <span className="text-rose-400 font-semibold">Failed</span>;
      case "DETECTED":
        if (c.safety_state === "AWAITING_RECONCILIATION") {
          return <span className="text-blue-400 font-semibold">Checking payment status</span>;
        }
        return <span className="text-slate-300 font-semibold">Detected</span>;
      default:
        return <span className="text-slate-300 font-semibold">{c.current_status}</span>;
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">Payment Recovery Operations</h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Real-time deterministic safety engine evaluation and autonomous payment recovery audit trail
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Test / Demo Mode Compact Launcher */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setTestMenuOpen(!testMenuOpen)}
              disabled={seeding !== null}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 px-3 py-1.5 rounded text-xs font-mono transition disabled:opacity-50"
            >
              {seeding ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              )}
              <span>Test Scenarios</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
            </button>

            {testMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-64 bg-slate-900 border border-slate-700 rounded shadow-2xl z-50 py-1 text-xs">
                <div className="px-3 py-1.5 text-[10px] font-mono text-slate-500 uppercase tracking-wider border-b border-slate-800">
                  Select Demo Scenario
                </div>
                <button
                  onClick={() => handleSeed("happy")}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 text-slate-200 transition flex items-center justify-between font-mono"
                >
                  <div>
                    <div className="font-semibold text-emerald-400">1. Autonomous Recovery</div>
                    <div className="text-[11px] text-slate-400 font-sans">Valid failed payload & recovery link</div>
                  </div>
                </button>

                <button
                  onClick={() => handleSeed("unsafe")}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 text-slate-200 transition flex items-center justify-between border-t border-slate-800/60 font-mono"
                >
                  <div>
                    <div className="font-semibold text-rose-400">2. Safety Halt (Contradiction)</div>
                    <div className="text-[11px] text-slate-400 font-sans">Failed event after captured state</div>
                  </div>
                </button>

                <button
                  onClick={() => handleSeed("reconcile")}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 text-slate-200 transition flex items-center justify-between border-t border-slate-800/60 font-mono"
                >
                  <div>
                    <div className="font-semibold text-blue-400">3. Stale Reconciliation</div>
                    <div className="text-[11px] text-slate-400 font-sans">Stale webhook payload & API sync</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={fetchCases}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-1.5 rounded text-xs font-mono transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Operational Summary Metrics Panel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded space-y-1">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Revenue at Risk</div>
          <div className="text-xl font-bold font-mono text-slate-100">{formatCurrency(revenueAtRisk)}</div>
          <div className="text-[10px] text-slate-400 font-sans">Failed payments requiring recovery or investigation.</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded space-y-1">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Recovery in Progress</div>
          <div className="text-xl font-bold font-mono text-emerald-400">{formatCurrency(recoveryInProgress)}</div>
          <div className="text-[10px] text-slate-400 font-sans">Payments for which autonomous recovery action started.</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded space-y-1">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Attention Required</div>
          <div className={`text-xl font-bold font-mono ${casesNeedingAttention > 0 ? "text-amber-400" : "text-slate-300"}`}>
            {casesNeedingAttention}
          </div>
          <div className="text-[10px] text-slate-400 font-sans">Cases blocked, escalated, or waiting for reconciliation.</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded space-y-1">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Autonomous Action Rate</div>
          <div className="text-xl font-bold font-mono text-slate-100">{autonomousActionRate}%</div>
          <div className="text-[10px] text-slate-400 font-sans">Cases allowed to take recovery action automatically.</div>
        </div>
      </div>

      {/* Primary Operations Cases Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
            Active Recovery Cases
          </div>
          <div className="text-xs font-mono text-slate-500">
            Showing {cases.length} records
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold">Payment</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">What happened</th>
                <th className="px-4 py-3 font-semibold">Decision</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Retries</th>
                <th className="px-4 py-3 font-semibold text-right">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {cases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500 font-mono text-xs">
                    No payment recovery cases registered. Select "Test Scenarios" above or send webhooks.
                  </td>
                </tr>
              ) : (
                cases.map((c) => {
                  return (
                    <tr key={c.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3.5 font-mono font-medium text-slate-200">
                        {c.razorpay_payment_id}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-semibold text-slate-100">
                        {c.currency || "INR"} {(c.amount ?? 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5 text-slate-300 font-sans font-medium">
                        {getWhatHappenedText(c)}
                      </td>
                      <td className="px-4 py-3.5 font-sans">
                        {getDecisionText(c)}
                      </td>
                      <td className="px-4 py-3.5 font-sans">
                        {getStatusText(c)}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-400">
                        {c.retry_count} / 2
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          href={`/cases/${c.id}`}
                          className="inline-flex items-center gap-1 text-xs font-mono text-blue-400 hover:text-blue-300 hover:underline transition"
                        >
                          Inspect Audit <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

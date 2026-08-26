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
  const recoveredRevenue = cases
    .filter((c) => c.current_status === "RECOVERY_INITIATED" || c.current_status === "RECOVERED")
    .reduce((sum, c) => sum + (c.amount || 0), 0);
  const casesNeedingAttention = cases.filter(
    (c) => c.safety_state === "ESCALATED" || c.safety_state === "BLOCKED" || c.safety_state === "AWAITING_RECONCILIATION"
  ).length;
  const recoveryRate = totalCases > 0
    ? Math.round((cases.filter((c) => c.current_status === "RECOVERY_INITIATED" || c.current_status === "RECOVERED").length / totalCases) * 100)
    : 0;

  const formatCurrency = (val: number) => {
    return `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-5">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">Recovery Cases & Safety Audit</h1>
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
          <div className="text-[10px] text-slate-500 font-mono">{totalCases} total recovery case(s)</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded space-y-1">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Recovered Revenue</div>
          <div className="text-xl font-bold font-mono text-emerald-400">{formatCurrency(recoveredRevenue)}</div>
          <div className="text-[10px] text-slate-500 font-mono">Via Razorpay Payment Links</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded space-y-1">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Attention Required</div>
          <div className={`text-xl font-bold font-mono ${casesNeedingAttention > 0 ? "text-amber-400" : "text-slate-300"}`}>
            {casesNeedingAttention}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">Escalated or awaiting reconcile</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded space-y-1">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Autonomous Recovery Rate</div>
          <div className="text-xl font-bold font-mono text-slate-100">{recoveryRate}%</div>
          <div className="text-[10px] text-slate-500 font-mono">Policy-approved recovery execution</div>
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
                <th className="px-4 py-3 font-semibold">Payment / Case ID</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Integrity State</th>
                <th className="px-4 py-3 font-semibold">Safety Engine State</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Retries</th>
                <th className="px-4 py-3 font-semibold text-right">Audit Trail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
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
                      <td className="px-4 py-3.5 font-medium text-slate-200">
                        {c.razorpay_payment_id}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-100">
                        {c.currency || "INR"} {(c.amount ?? 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-block font-semibold ${
                          c.integrity_state === "TRUSTED" ? "text-emerald-400" :
                          c.integrity_state === "STALE" ? "text-amber-400" :
                          "text-rose-400"
                        }`}>
                          {c.integrity_state}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {c.safety_state === "ACTIVE" && (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> ACTIVE
                          </span>
                        )}
                        {c.safety_state === "ESCALATED" && (
                          <span className="text-rose-400 font-semibold flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-400"></span> ESCALATED
                          </span>
                        )}
                        {c.safety_state === "BLOCKED" && (
                          <span className="text-rose-400 font-semibold flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-400"></span> BLOCKED
                          </span>
                        )}
                        {c.safety_state === "AWAITING_RECONCILIATION" && (
                          <span className="text-blue-400 font-semibold flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse"></span> AWAITING RECONCILIATION
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-slate-300 font-semibold">
                          {c.current_status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-400">
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

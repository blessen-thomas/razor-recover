"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, AlertOctagon, RefreshCw, Clock, ArrowRight } from "lucide-react";

export default function CasesPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [seeding, setSeeding] = useState<string | null>(null);

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

  const getSafetyStateBadge = (state: string) => {
    switch (state) {
      case "ACTIVE":
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> ACTIVE</span>;
      case "BLOCKED":
        return <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1"><AlertOctagon className="w-3.5 h-3.5" /> BLOCKED</span>;
      case "ESCALATED":
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1"><AlertOctagon className="w-3.5 h-3.5" /> ESCALATED</span>;
      case "AWAITING_RECONCILIATION":
        return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> AWAITING RECONCILIATION</span>;
      default:
        return <span className="bg-slate-700 text-slate-300 px-2.5 py-1 rounded-md text-xs font-semibold">{state}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Autonomous Payment Recovery Cases</h2>
          <p className="text-sm text-slate-400">Deterministic safety engine status & recovery audit history</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchCases}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3.5 py-2 rounded-lg text-sm font-medium transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh Cases
          </button>
        </div>
      </div>

      {/* Demo Scenario Seeders Panel */}
      <div className="bg-slate-800/90 border border-slate-700 p-4 rounded-xl space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Demo Scenario Quick Launchers</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => handleSeed("happy")}
            disabled={seeding !== null}
            className="flex items-center justify-center gap-2 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/60 text-emerald-300 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition disabled:opacity-50"
          >
            {seeding === "happy" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "🚀"} Scenario 1: Autonomous Recovery
          </button>

          <button
            onClick={() => handleSeed("unsafe")}
            disabled={seeding !== null}
            className="flex items-center justify-center gap-2 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-700/60 text-rose-300 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition disabled:opacity-50"
          >
            {seeding === "unsafe" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "🛑"} Scenario 2: Safety Halt (Contradiction)
          </button>

          <button
            onClick={() => handleSeed("reconcile")}
            disabled={seeding !== null}
            className="flex items-center justify-center gap-2 bg-blue-950/60 hover:bg-blue-900/60 border border-blue-700/60 text-blue-300 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition disabled:opacity-50"
          >
            {seeding === "reconcile" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "🔄"} Scenario 3: Stale Reconciliation
          </button>
        </div>
      </div>

      <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/60 text-slate-400 uppercase text-xs font-semibold border-b border-slate-700/80">
              <tr>
                <th className="px-6 py-4">Case / Payment ID</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Integrity State</th>
                <th className="px-6 py-4">Safety State</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Retries</th>
                <th className="px-6 py-4 text-right">Audit Trail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {cases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    No active recovery cases. Use CLI seeders or trigger webhooks to test.
                  </td>
                </tr>
              ) : (
                cases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-700/30 transition">
                    <td className="px-6 py-4 font-mono font-medium text-slate-200">
                      {c.razorpay_payment_id}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-100">
                      {c.currency || "INR"} {(c.amount ?? 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                      <span className={`px-2 py-1 rounded font-semibold ${
                        c.integrity_state === "TRUSTED" ? "bg-emerald-950 text-emerald-400 border border-emerald-800" :
                        c.integrity_state === "STALE" ? "bg-amber-950 text-amber-400 border border-amber-800" :
                        "bg-rose-950 text-rose-400 border border-rose-800"
                      }`}>
                        {c.integrity_state}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {getSafetyStateBadge(c.safety_state)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
                        c.current_status === "RECOVERED" || c.current_status === "RECOVERY_INITIATED" ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/60" :
                        c.current_status === "ESCALATED" || c.current_status === "FAILED" ? "bg-rose-950/60 text-rose-300 border border-rose-800/60" :
                        "bg-slate-800 text-slate-300 border border-slate-700"
                      }`}>
                        {c.current_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">
                      {c.retry_count} / 2
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/cases/${c.id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-md transition"
                      >
                        Inspect Audit <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

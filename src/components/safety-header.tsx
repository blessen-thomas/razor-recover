import React from "react";
import Link from "next/link";
import { ShieldCheck, Activity } from "lucide-react";

export default function SafetyHeader() {
  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link href="/cases" className="flex items-center space-x-2.5 group">
            <div className="bg-blue-600/90 text-white font-mono font-bold text-xs px-2 py-1 rounded tracking-wider group-hover:bg-blue-500 transition">
              RR
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-sm font-semibold text-slate-100 tracking-tight">RazorRecover</span>
              <span className="text-slate-600 text-xs">|</span>
              <span className="text-xs text-slate-400 font-mono">Payment Recovery Console</span>
            </div>
          </Link>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded text-xs font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            <span className="text-slate-400">Safety Engine:</span>
            <span className="text-emerald-400 font-medium">ACTIVE</span>
          </div>

          <div className="flex items-center bg-slate-950 border border-slate-800 px-2.5 py-1 rounded text-xs font-mono text-slate-400">
            <span>Razorpay Test Mode</span>
          </div>
        </div>
      </div>
    </header>
  );
}

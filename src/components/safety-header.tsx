import React from "react";
import Link from "next/link";

export default function SafetyHeader() {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 h-13 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link href="/cases" className="flex items-center space-x-2.5 group">
            <div className="bg-blue-600 text-white font-mono font-bold text-[11px] px-1.5 py-0.5 rounded-sm tracking-wider">
              RR
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-sm font-semibold text-slate-900 tracking-tight">RazorRecover</span>
              <span className="text-slate-300 text-xs">/</span>
              <span className="text-xs text-slate-500 font-mono">Payment Recovery Console</span>
            </div>
          </Link>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-sm text-xs font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            <span className="text-slate-500">Safety Engine:</span>
            <span className="text-emerald-700 font-semibold">ACTIVE</span>
          </div>

          <div className="flex items-center bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-sm text-xs font-mono text-slate-600">
            <span>Razorpay Test Mode</span>
          </div>
        </div>
      </div>
    </header>
  );
}

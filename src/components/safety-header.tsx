import React from "react";
import Link from "next/link";
import { ShieldCheck, ShieldAlert, AlertTriangle, RefreshCw } from "lucide-react";

export default function SafetyHeader() {
  return (
    <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link href="/cases" className="flex items-center space-x-2">
            <div className="bg-blue-600 p-2 rounded-lg text-white font-bold text-lg">
              RR
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-none">RazorRecover</h1>
              <span className="text-xs text-slate-400 font-medium">Safe Autonomous Payment Recovery</span>
            </div>
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-full text-xs font-semibold">
            <span className="flex h-2 w-2 relative mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-400">System Safety Engine: ACTIVE</span>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <span className="bg-slate-700 px-2 py-1 rounded">Razorpay Test Mode</span>
          </div>
        </div>
      </div>
    </header>
  );
}

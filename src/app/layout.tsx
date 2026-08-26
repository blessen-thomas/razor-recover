import "./globals.css";
import React from "react";
import SafetyHeader from "@/components/safety-header";

export const metadata = {
  title: "RazorRecover — Safe Autonomous Payment Recovery",
  description: "Safe Autonomous Payment Recovery Agent for Razorpay",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-900 text-slate-100 min-h-screen">
        <SafetyHeader />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}

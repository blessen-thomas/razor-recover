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
      <body className="bg-slate-50 text-slate-900 min-h-screen font-sans antialiased">
        <SafetyHeader />
        <main className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}

"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { X, Send, RefreshCw, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  referencedCaseIds?: string[];
  suggestedActions?: string[];
  timestamp: string;
}

interface AssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialCaseId?: string;
}

const QUICK_PROMPTS = [
  "Which cases need attention?",
  "Why was a payment blocked?",
  "Explain the latest recovery decision",
];

export default function AssistantDrawer({ isOpen, onClose, initialCaseId }: AssistantDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Auto focus input when drawer opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Scroll to bottom of chat when new message arrives
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  if (!isOpen) return null;

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    setError(null);
    const userMsg: Message = {
      id: crypto.randomUUID(),
      sender: "user",
      text: trimmed,
      timestamp: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, caseId: initialCaseId }),
      });

      const data = await res.json();

      if (!res.ok && !data.answer) {
        throw new Error(data.message || "Failed to fetch response");
      }

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        sender: "assistant",
        text: data.answer || "No response received.",
        referencedCaseIds: data.referencedCaseIds,
        suggestedActions: data.suggestedActions,
        timestamp: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error("Assistant query error:", err);
      setError("Unable to connect to assistant. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleQuickPromptClick = (promptText: string) => {
    sendMessage(promptText);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-[1px] transition-opacity"
        onClick={onClose}
      />

      {/* Side Panel Drawer */}
      <div className="relative w-full max-w-md bg-white border-l border-slate-200 h-full shadow-2xl flex flex-col z-10 font-sans">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="bg-slate-900 text-white font-mono font-bold text-[10px] px-1.5 py-0.5 rounded-sm">
              AI
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Ask RazorRecover</h2>
              <p className="text-[11px] text-slate-500 font-mono">Safety & Case Explanation Assistant</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-sm transition"
            title="Close Assistant (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Informational Safety Banner */}
        <div className="bg-amber-50/80 border-b border-amber-200/60 px-4 py-2 text-[11px] text-amber-900 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold font-mono">Explanatory Mode Only:</span> The assistant explains decisions but cannot authorize retries, override safety blocks, or move money.
          </div>
        </div>

        {/* Chat Transcript Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {messages.length === 0 && (
            <div className="space-y-4 my-2">
              <div className="bg-slate-50 border border-slate-200 rounded-sm p-3.5 space-y-2">
                <div className="font-semibold text-slate-900 text-xs font-mono uppercase tracking-wider">
                  How can I help you today?
                </div>
                <p className="text-slate-600 text-xs leading-relaxed">
                  I can analyze your active payment recovery cases, explain safety engine blocks, clarify reconciliation holds, and summarize recovery decisions.
                </p>
              </div>

              {/* Quick Prompts */}
              <div className="space-y-2">
                <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-medium">
                  Suggested Prompts
                </div>
                <div className="flex flex-col space-y-1.5">
                  {QUICK_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickPromptClick(prompt)}
                      className="text-left bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-800 px-3 py-2 rounded-sm text-xs transition flex items-center justify-between font-mono group"
                    >
                      <span>{prompt}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === "user" ? "items-end" : "items-start"
              }`}
            >
              <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 font-mono mb-1">
                <span>{msg.sender === "user" ? "Merchant" : "RazorRecover AI"}</span>
                <span>·</span>
                <span>{msg.timestamp}</span>
              </div>

              <div
                className={`max-w-[90%] rounded-sm px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                  msg.sender === "user"
                    ? "bg-slate-900 text-slate-100 font-medium"
                    : "bg-slate-50 text-slate-800 border border-slate-200"
                }`}
              >
                {msg.text}

                {/* Case Reference Links */}
                {msg.referencedCaseIds && msg.referencedCaseIds.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-200/80 space-y-1">
                    <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-semibold">
                      Referenced Cases:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.referencedCaseIds.map((cId) => (
                        <Link
                          key={cId}
                          href={`/cases/${cId}`}
                          onClick={onClose}
                          className="inline-flex items-center gap-1 bg-white hover:bg-slate-100 border border-slate-300 px-2 py-0.5 text-[11px] font-mono text-blue-700 hover:text-blue-900 rounded-sm transition"
                        >
                          <span>Inspect Audit</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex items-center space-x-2 text-slate-500 font-mono text-xs py-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
              <span>Analyzing payment cases...</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-sm p-3 text-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-[11px] font-mono underline hover:text-rose-900"
              >
                Dismiss
              </button>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 border-t border-slate-200 bg-white">
          <form onSubmit={handleSubmit} className="flex items-center space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about payment cases or safety decisions..."
              disabled={loading}
              className="flex-1 bg-slate-50 border border-slate-300 focus:border-slate-500 focus:bg-white text-slate-900 text-xs px-3 py-2 rounded-sm focus:outline-none transition font-sans placeholder:text-slate-400 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white p-2 rounded-sm transition shrink-0"
              title="Send Message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
          <div className="mt-1.5 flex justify-between items-center text-[10px] text-slate-400 font-mono">
            <span>Press Esc to close</span>
            <span>Explanatory model</span>
          </div>
        </div>
      </div>
    </div>
  );
}

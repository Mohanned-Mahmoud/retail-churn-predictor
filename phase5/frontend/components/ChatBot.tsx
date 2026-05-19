"use client";

import { useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const WELCOME: Message = {
  role: "assistant",
  content:
    "Hello! I'm your Retail Churn Predictor AI assistant.\n\nI have **direct access to your project data files** and can analyse them to answer specific questions. I can help you with:\n- **Interpreting churn scores** and what risk tiers mean\n- **Querying real data** — ask about specific customers, tiers, or countries\n- **Understanding feature contributions** and RFM metrics\n- **Retention strategy recommendations** for different customer profiles\n- **Model performance** — F1, ROC-AUC, Recall explained in plain English\n\nI'm strictly scoped to this project. Try asking about a specific customer ID or country!",
};

const SUGGESTED = [
  "What is the overall churn rate across all 4,338 customers?",
  "Which country has the highest churn rate?",
  "How many customers are in the High risk tier?",
  "What retention actions work best for high-risk customers?",
  "What is the average monetary value for High vs Low risk customers?",
];

function renderMessage(text: string) {
  return text.split("\n").map((line, i) => {
    if (!line.trim()) return <div key={i} className="h-2" />;
    const withBold = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    const isBullet = withBold.startsWith("- ") || withBold.startsWith("• ");
    const content = isBullet ? withBold.slice(2) : withBold;
    return isBullet ? (
      <div key={i} className="flex gap-2">
        <span style={{ color: "rgba(165,180,252,0.7)", flexShrink: 0 }}>•</span>
        <span dangerouslySetInnerHTML={{ __html: content }} />
      </div>
    ) : (
      <p key={i} dangerouslySetInnerHTML={{ __html: withBold }} />
    );
  });
}

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);
    setShowSuggestions(false);

    try {
      const res = await apiRequest("/chat", {
        method: "POST",
        body: JSON.stringify({ messages: updated }),
      });
      setMessages((prev) => [...prev, { role: "assistant", content: res.response }]);
    } catch (e: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: e instanceof Error && e.message.includes("budget")
            ? "My AI credits have been exceeded. Please try again later."
            : "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 flex h-13 w-13 items-center justify-center rounded-full shadow-2xl transition-all duration-200"
        style={{
          background: open
            ? "rgba(99,102,241,0.9)"
            : "linear-gradient(135deg, #6366f1, #8b5cf6)",
          boxShadow: "0 4px 24px rgba(99,102,241,0.5)",
          width: 52,
          height: 52,
        }}
        aria-label="Open AI assistant"
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 4l12 12M16 4L4 16" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="9" cy="10" r="1" fill="white" />
            <circle cx="12" cy="10" r="1" fill="white" />
            <circle cx="15" cy="10" r="1" fill="white" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      <div
        className="fixed bottom-20 right-6 z-50 flex flex-col overflow-hidden rounded-2xl shadow-2xl transition-all duration-300"
        style={{
          width: 380,
          height: open ? 540 : 0,
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          background: "rgba(8,15,36,0.97)",
          border: "1px solid rgba(99,102,241,0.2)",
          backdropFilter: "blur(24px)",
        }}
      >
        {/* Panel header */}
        <div
          className="flex items-center gap-3 border-b px-4 py-3 shrink-0"
          style={{ borderColor: "rgba(99,102,241,0.15)" }}
        >
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            ✨
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Churn AI Assistant</p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              AI-powered · Data-grounded · Project-scoped
            </p>
          </div>
          <div
            className="flex items-center gap-1.5 rounded-full border px-2 py-0.5"
            style={{ background: "rgba(16,185,129,0.08)", borderColor: "rgba(16,185,129,0.2)" }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 5px #10b981" }} />
            <span className="text-xs text-emerald-400 font-medium">Online</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(99,102,241,0.3) transparent" }}>
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`mb-3 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div
                  className="mr-2 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs"
                  style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                >
                  ✨
                </div>
              )}
              <div
                className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed"
                style={
                  msg.role === "user"
                    ? {
                        background: "rgba(99,102,241,0.22)",
                        border: "1px solid rgba(99,102,241,0.3)",
                        color: "#e0e7ff",
                        borderBottomRightRadius: 4,
                      }
                    : {
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.82)",
                        borderBottomLeftRadius: 4,
                      }
                }
              >
                <div className="flex flex-col gap-0.5">{renderMessage(msg.content)}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="mb-3 flex justify-start">
              <div
                className="mr-2 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
              >
                ✨
              </div>
              <div
                className="flex items-center gap-1.5 rounded-2xl px-4 py-3"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderBottomLeftRadius: 4 }}
              >
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Suggested questions */}
          {showSuggestions && messages.length === 1 && (
            <div className="mt-2 flex flex-col gap-1.5">
              <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>Suggested questions</p>
              {SUGGESTED.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="rounded-xl border px-3 py-2 text-left text-xs transition-all duration-150"
                  style={{
                    background: "rgba(99,102,241,0.06)",
                    borderColor: "rgba(99,102,241,0.18)",
                    color: "rgba(165,180,252,0.85)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(99,102,241,0.14)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(99,102,241,0.06)")}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div
          className="border-t px-3 py-3 shrink-0"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <div
            className="flex items-center gap-2 rounded-xl border px-3 py-2"
            style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)" }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about churn predictions…"
              className="flex-1 bg-transparent text-xs text-white placeholder-opacity-30 outline-none"
              style={{ color: "rgba(255,255,255,0.85)" }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all disabled:opacity-30"
              style={{ background: input.trim() && !loading ? "rgba(99,102,241,0.5)" : "rgba(99,102,241,0.15)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <p className="mt-1.5 text-center text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
            Strictly scoped to the Retail Churn Predictor project
          </p>
        </div>
      </div>
    </>
  );
}

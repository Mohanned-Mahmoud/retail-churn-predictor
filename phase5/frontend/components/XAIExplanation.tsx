"use client";

import { useState } from "react";
import { CustomerFormData } from "@/components/InputForm";
import { PredictionResult } from "@/app/page";

interface Props {
  customer: CustomerFormData;
  result: PredictionResult;
}

const TIER_ICON: Record<string, string> = { High: "🔴", Medium: "🟡", Low: "🟢" };

function parseExplanation(text: string): { heading: string; body: string }[] {
  const sections: { heading: string; body: string }[] = [];
  const parts = text.split(/###\s+/);
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const newline = trimmed.indexOf("\n");
    if (newline === -1) {
      sections.push({ heading: trimmed, body: "" });
    } else {
      sections.push({
        heading: trimmed.slice(0, newline).trim(),
        body: trimmed.slice(newline).trim(),
      });
    }
  }
  return sections;
}

function renderText(text: string) {
  return text.split("\n").map((line, i) => {
    const bold = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    return (
      <p
        key={i}
        className="text-sm leading-relaxed"
        style={{ color: "rgba(255,255,255,0.72)" }}
        dangerouslySetInnerHTML={{ __html: bold || "&nbsp;" }}
      />
    );
  });
}

const SECTION_ICONS: Record<string, string> = {
  "why this score": "🎯",
  "key risk drivers": "⚙️",
  "what this means for the business": "💼",
  "recommended actions": "✅",
};

export default function XAIExplanation({ customer, result }: Props) {
  const [explanation, setExplanation] = useState<{ heading: string; body: string }[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer, prediction: result }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Explanation failed");
      }
      const data = await res.json();
      setExplanation(parseExplanation(data.explanation));
      setGenerated(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const tierIcon = TIER_ICON[result.risk_tier] ?? "⚪";

  return (
    <div
      className="glass-card overflow-hidden animate-fade-in"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between border-b px-6 py-4"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-base"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            ✨
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">AI Explanation</h2>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              AI-powered · Strictly scoped to this prediction
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Prediction summary badge */}
          <div
            className="hidden items-center gap-2 rounded-full border px-3 py-1 sm:flex"
            style={{
              background: `${result.risk_color}12`,
              borderColor: `${result.risk_color}33`,
            }}
          >
            <span>{tierIcon}</span>
            <span className="text-xs font-semibold" style={{ color: result.risk_color }}>
              {(result.churn_probability * 100).toFixed(1)}% {result.risk_tier} Risk
            </span>
          </div>

          {!generated && (
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition-all duration-150"
              style={{
                background: loading
                  ? "rgba(99,102,241,0.06)"
                  : "rgba(99,102,241,0.14)",
                borderColor: "rgba(99,102,241,0.35)",
                color: "#a5b4fc",
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.background = "rgba(99,102,241,0.22)";
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.background = "rgba(99,102,241,0.14)";
              }}
            >
              {loading ? (
                <>
                  <span
                    className="h-3.5 w-3.5 rounded-full border border-indigo-400/50 animate-spin"
                    style={{ borderTopColor: "#a5b4fc" }}
                  />
                  Generating…
                </>
              ) : (
                <>✨ Explain this prediction</>
              )}
            </button>
          )}

          {generated && (
            <button
              onClick={() => { setExplanation(null); setGenerated(false); }}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-all"
              style={{
                borderColor: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.4)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
            >
              ↺ Regenerate
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-5">
        {!generated && !loading && !error && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
              Click <span className="font-medium text-indigo-400">Explain this prediction</span> to get a plain-English
              breakdown of why this customer is at risk, what's driving the score, and concrete retention actions.
            </p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.12}s` }}
                />
              ))}
            </div>
            <p className="text-xs text-indigo-300">
              Analysing the prediction…
            </p>
          </div>
        )}

        {error && (
          <div
            className="rounded-xl border p-3 text-sm"
            style={{ background: "rgba(244,63,94,0.08)", borderColor: "rgba(244,63,94,0.2)", color: "#fb7185" }}
          >
            {error}
          </div>
        )}

        {explanation && (
          <div className="grid gap-5 sm:grid-cols-2">
            {explanation.map((section, i) => {
              const key = section.heading.toLowerCase();
              const icon = Object.entries(SECTION_ICONS).find(([k]) => key.includes(k))?.[1] ?? "📌";
              return (
                <div
                  key={i}
                  className="rounded-xl border p-4"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    borderColor: "rgba(255,255,255,0.07)",
                  }}
                >
                  <div className="mb-2.5 flex items-center gap-2">
                    <span className="text-base">{icon}</span>
                    <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#a5b4fc" }}>
                      {section.heading}
                    </h3>
                  </div>
                  <div className="flex flex-col gap-1.5">{renderText(section.body)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

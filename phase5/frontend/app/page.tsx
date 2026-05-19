"use client";

import { useState } from "react";
import Link from "next/link";
import InputForm, { CustomerFormData } from "@/components/InputForm";
import ResultsCard from "@/components/ResultsCard";
import FeatureChart from "@/components/FeatureChart";
import XAIExplanation from "@/components/XAIExplanation";

const NAV_LINKS = [
  { href: "/analytics", label: "Analytics", icon: "📊" },
  { href: "/batch", label: "Batch Scoring", icon: "📂" },
  { href: "/explorer", label: "Explorer", icon: "🗂️" },
];

export interface PredictionResult {
  churn_probability: number;
  risk_tier: "High" | "Medium" | "Low";
  risk_color: string;
  feature_contributions: {
    feature: string;
    label: string;
    contribution: number;
    direction: string;
  }[];
}

export default function Home() {
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [formData, setFormData] = useState<CustomerFormData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePredict(data: CustomerFormData) {
    setLoading(true);
    setError(null);
    setResult(null);
    setFormData(null);
    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Prediction failed");
      }
      const json = await res.json();
      setResult(json);
      setFormData(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.07) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.06) 0%, transparent 55%), #020617",
      }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          background: "rgba(2,6,23,0.85)",
          borderColor: "rgba(255,255,255,0.06)",
          backdropFilter: "blur(16px)",
        }}
      >
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-base"
              style={{
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              }}
            >
              🛒
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">
                Retail Churn Predictor
              </h1>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                Intelligent Decision Support System — Phase 5
              </p>
            </div>
          </div>
          {/* Page navigation */}
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150"
                style={{ color: "rgba(255,255,255,0.45)", border: "1px solid transparent" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.85)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.45)"; e.currentTarget.style.background = "transparent"; }}
              >
                <span>{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <div
              className="flex items-center gap-2 rounded-full border px-3 py-1"
              style={{
                background: "rgba(16,185,129,0.08)",
                borderColor: "rgba(16,185,129,0.2)",
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                style={{ boxShadow: "0 0 6px #10b981" }}
              />
              <span className="text-xs font-medium text-emerald-400">
                Model Online
              </span>
            </div>
            <div
              className="hidden rounded-lg border px-3 py-1.5 text-xs sm:block"
              style={{
                background: "rgba(255,255,255,0.04)",
                borderColor: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.4)",
              }}
            >
              UCI Online Retail · 4,338 customers
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-xl px-6 py-8">
        {/* Metrics bar */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Model", value: "Logistic Regression", icon: "🧠" },
            { label: "F1-Score", value: "0.6752", icon: "🎯" },
            { label: "Recall", value: "0.8172", icon: "📡" },
            { label: "ROC-AUC", value: "0.8129", icon: "📈" },
          ].map((m) => (
            <div key={m.label} className="glass-card px-4 py-3">
              <p className="label-text mb-1">{m.label}</p>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
                <span>{m.icon}</span>
                {m.value}
              </p>
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Input panel — 2/5 width */}
          <div className="lg:col-span-2">
            <InputForm onSubmit={handlePredict} loading={loading} />
          </div>

          {/* Results panel — 3/5 width */}
          <div className="lg:col-span-3">
            {error && (
              <div
                className="glass-card mb-4 flex items-start gap-3 p-4 animate-fade-in"
                style={{
                  background: "rgba(244,63,94,0.08)",
                  borderColor: "rgba(244,63,94,0.2)",
                }}
              >
                <span className="text-rose-400">⚠</span>
                <p className="text-sm text-rose-300">{error}</p>
              </div>
            )}

            {!result && !loading && (
              <div
                className="glass-card flex h-full min-h-[340px] flex-col items-center justify-center gap-4 p-8 text-center"
                style={{ minHeight: "340px" }}
              >
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
                  style={{ background: "rgba(99,102,241,0.1)" }}
                >
                  🔍
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    Awaiting Customer Profile
                  </p>
                  <p
                    className="mt-1 text-xs"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    Fill in the customer metrics on the left and click{" "}
                    <strong className="text-indigo-400">Run Analysis</strong>{" "}
                    to generate a churn risk assessment.
                  </p>
                </div>
              </div>
            )}

            {loading && (
              <div className="glass-card flex min-h-[340px] flex-col items-center justify-center gap-4 p-8">
                <div className="relative h-12 w-12">
                  <div
                    className="absolute inset-0 rounded-full border-2 border-indigo-500 animate-spin"
                    style={{ borderTopColor: "transparent" }}
                  />
                  <div
                    className="absolute inset-2 rounded-full border-2 border-violet-400 animate-spin"
                    style={{
                      borderTopColor: "transparent",
                      animationDirection: "reverse",
                      animationDuration: "0.7s",
                    }}
                  />
                </div>
                <p className="text-sm text-indigo-300">
                  Analysing customer profile…
                </p>
              </div>
            )}

            {result && !loading && <ResultsCard result={result} />}
          </div>
        </div>

        {/* Feature chart — full width, shown after prediction */}
        {result && !loading && (
          <div className="mt-6 animate-slide-up">
            <FeatureChart contributions={result.feature_contributions} />
          </div>
        )}

        {/* XAI Explanation — shown after prediction */}
        {result && formData && !loading && (
          <div className="mt-6 animate-slide-up">
            <XAIExplanation customer={formData} result={result} />
          </div>
        )}

        {/* Footer */}
        <footer
          className="mt-12 border-t pt-6 text-center text-xs"
          style={{
            borderColor: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.25)",
          }}
        >
          IDSS Phase 5 · Retail Churn Predictor · UCI Online Retail Dataset ·
          Built for demonstration purposes
        </footer>
      </main>
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import PageLayout from "@/components/PageLayout";

interface BatchResult {
  customer_id?: string | number;
  frequency?: number;
  monetary?: number;
  country?: string;
  churn_probability: number | null;
  risk_tier: string;
  [key: string]: unknown;
}

interface BatchResponse {
  total_rows: number;
  tier_summary: Record<string, number>;
  results: BatchResult[];
}

const TEMPLATE_CSV = `customer_id,frequency,monetary,num_items,num_products,tenure,avg_order_value,revenue_per_month,purchase_trend,return_rate,country
C001,42,750,380,35,90,19,220,0,0,United Kingdom
C002,8,120,60,10,30,15,40,-20,0.05,France
C003,120,4200,1800,95,340,35,380,15,0,United Kingdom
C004,3,45,20,5,12,15,15,-50,0.1,Germany
C005,65,1800,750,55,200,28,260,8,0,United Kingdom`;

const TIER_COLORS: Record<string, string> = {
  High: { bg: "rgba(244,63,94,0.12)", color: "#fb7185", border: "rgba(244,63,94,0.25)" } as unknown as string,
  Medium: { bg: "rgba(245,158,11,0.12)", color: "#fbbf24", border: "rgba(245,158,11,0.25)" } as unknown as string,
  Low: { bg: "rgba(16,185,129,0.12)", color: "#34d399", border: "rgba(16,185,129,0.25)" } as unknown as string,
};

const TIER_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  High: { bg: "rgba(244,63,94,0.12)", color: "#fb7185", border: "rgba(244,63,94,0.25)" },
  Medium: { bg: "rgba(245,158,11,0.12)", color: "#fbbf24", border: "rgba(245,158,11,0.25)" },
  Low: { bg: "rgba(16,185,129,0.12)", color: "#34d399", border: "rgba(16,185,129,0.25)" },
};

function downloadCSV(results: BatchResult[]) {
  if (!results.length) return;
  const headers = Object.keys(results[0]).join(",");
  const rows = results.map((r) =>
    Object.values(r)
      .map((v) => (v === null || v === undefined ? "" : String(v)))
      .join(",")
  );
  const csv = [headers, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "churn_predictions.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "churn_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function BatchPage() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [response, setResponse] = useState<BatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File) {
    if (!f.name.endsWith(".csv")) {
      setError("Please upload a .csv file.");
      return;
    }
    setFile(f);
    setResponse(null);
    setError(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/batch-predict", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Upload failed");
      }
      setResponse(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setUploading(false);
    }
  }

  const tierEntries = response
    ? (["High", "Medium", "Low"] as const).map((t) => ({
        tier: t,
        count: response.tier_summary[t] ?? 0,
      }))
    : [];

  return (
    <PageLayout>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Batch Scoring</h1>
          <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
            Upload a CSV of customer profiles and score them all at once
          </p>
        </div>
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-medium transition-all duration-150"
          style={{
            background: "rgba(99,102,241,0.08)",
            borderColor: "rgba(99,102,241,0.25)",
            color: "#a5b4fc",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(99,102,241,0.15)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(99,102,241,0.08)")}
        >
          ⬇ Download Template CSV
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Upload panel */}
        <div className="flex flex-col gap-4 lg:col-span-1">
          {/* Drop zone */}
          <div
            className="glass-card flex cursor-pointer flex-col items-center justify-center gap-4 p-8 text-center transition-all duration-200"
            style={{
              minHeight: 200,
              borderColor: dragging
                ? "rgba(99,102,241,0.6)"
                : file
                ? "rgba(16,185,129,0.4)"
                : "rgba(255,255,255,0.08)",
              background: dragging
                ? "rgba(99,102,241,0.08)"
                : file
                ? "rgba(16,185,129,0.05)"
                : "rgba(255,255,255,0.03)",
            }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
            />
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
              style={{ background: file ? "rgba(16,185,129,0.1)" : "rgba(99,102,241,0.1)" }}
            >
              {file ? "✅" : "📂"}
            </div>
            {file ? (
              <div>
                <p className="text-sm font-semibold text-emerald-400">{file.name}</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {(file.size / 1024).toFixed(1)} KB · Click to replace
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-white">Drop CSV here</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                  or click to browse
                </p>
              </div>
            )}
          </div>

          {/* Required columns info */}
          <div className="glass-card p-4">
            <p className="label-text mb-2">Required Columns</p>
            <div className="flex flex-col gap-1">
              {[
                "frequency", "monetary", "num_items", "num_products",
                "tenure", "avg_order_value", "revenue_per_month",
              ].map((col) => (
                <div key={col} className="flex items-center gap-2">
                  <span className="text-xs font-medium text-emerald-400">✓</span>
                  <span className="font-mono text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>{col}</span>
                </div>
              ))}
              {["purchase_trend", "return_rate", "country", "customer_id"].map((col) => (
                <div key={col} className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>○</span>
                  <span className="font-mono text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{col} (optional)</span>
                </div>
              ))}
            </div>
          </div>

          {/* Score button */}
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="btn-primary"
          >
            {uploading ? (
              <span className="flex items-center justify-center gap-2">
                <span
                  className="h-4 w-4 rounded-full border-2 border-white/30 animate-spin"
                  style={{ borderTopColor: "white" }}
                />
                Scoring {file?.name}…
              </span>
            ) : (
              `Score ${file ? file.name : "CSV file"}`
            )}
          </button>

          {error && (
            <div
              className="rounded-xl border p-3 text-xs"
              style={{ background: "rgba(244,63,94,0.08)", borderColor: "rgba(244,63,94,0.2)", color: "#fb7185" }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Results panel */}
        <div className="lg:col-span-2">
          {!response && !uploading && (
            <div
              className="glass-card flex h-full min-h-64 flex-col items-center justify-center gap-3 text-center p-8"
            >
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
                style={{ background: "rgba(99,102,241,0.1)" }}
              >
                📊
              </div>
              <p className="text-sm font-medium text-white">Results appear here</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                Upload a CSV and click Score to analyse your customer list
              </p>
            </div>
          )}

          {response && (
            <div className="flex flex-col gap-4 animate-fade-in">
              {/* Summary */}
              <div className="glass-card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="section-title">Scoring Complete</h2>
                  <button
                    onClick={() => downloadCSV(response.results)}
                    className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all"
                    style={{
                      background: "rgba(99,102,241,0.1)",
                      borderColor: "rgba(99,102,241,0.3)",
                      color: "#a5b4fc",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(99,102,241,0.18)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(99,102,241,0.1)")}
                  >
                    ⬇ Download Results CSV
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div className="rounded-lg p-3 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <p className="text-2xl font-bold text-white">{response.total_rows}</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Total Scored</p>
                  </div>
                  {tierEntries.map(({ tier, count }) => {
                    const s = TIER_STYLES[tier];
                    return (
                      <div
                        key={tier}
                        className="rounded-lg p-3 text-center"
                        style={{ background: s.bg, border: `1px solid ${s.border}` }}
                      >
                        <p className="text-2xl font-bold" style={{ color: s.color }}>{count}</p>
                        <p className="text-xs" style={{ color: s.color, opacity: 0.7 }}>{tier} Risk</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Preview table */}
              <div className="glass-card overflow-hidden">
                <div className="border-b px-5 py-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <p className="text-sm font-semibold text-white">
                    Results Preview
                    <span className="ml-2 text-xs font-normal" style={{ color: "rgba(255,255,255,0.4)" }}>
                      showing first {Math.min(response.results.length, 20)} of {response.results.length} rows
                    </span>
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        {["Customer", "Churn %", "Risk Tier", "Frequency", "Monetary (£)", "Country"].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-2.5 text-left font-medium uppercase tracking-wider"
                            style={{ color: "rgba(255,255,255,0.4)" }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {response.results.slice(0, 20).map((row, i) => {
                        const s = TIER_STYLES[row.risk_tier] ?? TIER_STYLES["Low"];
                        return (
                          <tr
                            key={i}
                            style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                          >
                            <td className="px-4 py-2.5 font-mono text-white">
                              {row.customer_id ?? `Row ${i + 1}`}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="font-semibold" style={{ color: s.color }}>
                                {row.churn_probability !== null
                                  ? `${(row.churn_probability * 100).toFixed(1)}%`
                                  : "—"}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span
                                className="rounded-full px-2 py-0.5 text-xs font-semibold"
                                style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
                              >
                                {row.risk_tier}
                              </span>
                            </td>
                            <td className="px-4 py-2.5" style={{ color: "rgba(255,255,255,0.7)" }}>
                              {row.frequency ?? "—"}
                            </td>
                            <td className="px-4 py-2.5" style={{ color: "rgba(255,255,255,0.7)" }}>
                              {row.monetary !== undefined ? `£${Number(row.monetary).toFixed(0)}` : "—"}
                            </td>
                            <td className="px-4 py-2.5" style={{ color: "rgba(255,255,255,0.7)" }}>
                              {row.country ?? "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

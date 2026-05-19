"use client";

import { useCallback, useEffect, useState } from "react";
import PageLayout from "@/components/PageLayout";

interface Customer {
  customer_id: number;
  churn_probability: number;
  risk_tier: string;
  actual_churn: number;
  recency: number | null;
  frequency: number | null;
  monetary: number | null;
  avg_order_value: number | null;
  tenure: number | null;
  country: string;
}

interface CustomersResponse {
  total: number;
  page: number;
  limit: number;
  pages: number;
  countries: string[];
  customers: Customer[];
}

const TIER_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  High: { bg: "rgba(244,63,94,0.12)", color: "#fb7185", border: "rgba(244,63,94,0.25)" },
  Medium: { bg: "rgba(245,158,11,0.12)", color: "#fbbf24", border: "rgba(245,158,11,0.25)" },
  Low: { bg: "rgba(16,185,129,0.12)", color: "#34d399", border: "rgba(16,185,129,0.25)" },
};

type SortKey = "churn_probability" | "recency" | "frequency" | "monetary" | "avg_order_value" | "tenure";

const COLUMNS: { key: SortKey | "customer_id" | "risk_tier" | "actual_churn" | "country"; label: string; sortable: boolean }[] = [
  { key: "customer_id", label: "Customer ID", sortable: false },
  { key: "churn_probability", label: "Churn Risk", sortable: true },
  { key: "risk_tier", label: "Tier", sortable: false },
  { key: "actual_churn", label: "Churned?", sortable: false },
  { key: "recency", label: "Recency (days)", sortable: true },
  { key: "frequency", label: "Orders", sortable: true },
  { key: "monetary", label: "Total Spend (£)", sortable: true },
  { key: "avg_order_value", label: "Avg Order (£)", sortable: true },
  { key: "tenure", label: "Tenure (days)", sortable: true },
  { key: "country", label: "Country", sortable: false },
];

export default function ExplorerPage() {
  const [data, setData] = useState<CustomersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tier, setTier] = useState("All");
  const [country, setCountry] = useState("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortKey>("churn_probability");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      page: String(page),
      limit: "50",
      sort_by: sortBy,
      sort_dir: sortDir,
    });
    if (tier !== "All") params.set("tier", tier);
    if (country !== "All") params.set("country", country);
    if (search) params.set("search", search);

    try {
      const res = await fetch(`/api/customers?${params}`);
      if (!res.ok) throw new Error("Failed to load customers");
      setData(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [page, tier, country, search, sortBy, sortDir]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleSort(key: SortKey) {
    if (sortBy === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortBy(key);
      setSortDir("desc");
    }
    setPage(1);
  }

  function handleFilterChange(fn: () => void) {
    fn();
    setPage(1);
  }

  const TIERS = ["All", "High", "Medium", "Low"];

  return (
    <PageLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Customer Explorer</h1>
        <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
          Browse and filter all scored customers from the UCI test set
        </p>
      </div>

      {/* Filters */}
      <div className="glass-card mb-4 flex flex-wrap items-center gap-3 p-4">
        {/* Search */}
        <div className="relative flex-1" style={{ minWidth: 180 }}>
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-xs"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            🔍
          </span>
          <input
            type="text"
            placeholder="Search Customer ID…"
            value={search}
            onChange={(e) => handleFilterChange(() => setSearch(e.target.value))}
            className="glass-input pl-8"
            style={{ maxWidth: 220 }}
          />
        </div>

        {/* Risk tier chips */}
        <div className="flex items-center gap-1">
          {TIERS.map((t) => {
            const isActive = tier === t;
            const s = t !== "All" ? TIER_STYLES[t] : null;
            return (
              <button
                key={t}
                onClick={() => handleFilterChange(() => setTier(t))}
                className="rounded-full px-3 py-1 text-xs font-medium transition-all duration-150"
                style={
                  isActive
                    ? s
                      ? { background: s.bg, color: s.color, border: `1px solid ${s.border}` }
                      : { background: "rgba(99,102,241,0.2)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.35)" }
                    : {
                        background: "rgba(255,255,255,0.04)",
                        color: "rgba(255,255,255,0.45)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }
                }
              >
                {t}
              </button>
            );
          })}
        </div>

        {/* Country dropdown */}
        <select
          value={country}
          onChange={(e) => handleFilterChange(() => setCountry(e.target.value))}
          className="glass-input"
          style={{ width: "auto", minWidth: 150, cursor: "pointer" }}
        >
          <option value="All" style={{ background: "#0f172a" }}>All Countries</option>
          {data?.countries.map((c) => (
            <option key={c} value={c} style={{ background: "#0f172a" }}>{c}</option>
          ))}
        </select>

        {/* Result count */}
        {data && (
          <span className="ml-auto text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
            {data.total.toLocaleString()} customers
          </span>
        )}
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading && (
          <div className="flex h-48 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div
                className="h-8 w-8 rounded-full border-2 border-indigo-500 animate-spin"
                style={{ borderTopColor: "transparent" }}
              />
              <p className="text-xs text-indigo-300">Loading customers…</p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-6 text-sm" style={{ color: "#fb7185" }}>
            Error: {error}
          </div>
        )}

        {!loading && data && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    {COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        className="px-4 py-3 text-left font-medium uppercase tracking-wider"
                        style={{
                          color: col.sortable && sortBy === col.key
                            ? "#a5b4fc"
                            : "rgba(255,255,255,0.4)",
                          cursor: col.sortable ? "pointer" : "default",
                          userSelect: "none",
                          whiteSpace: "nowrap",
                        }}
                        onClick={() => col.sortable && handleSort(col.key as SortKey)}
                      >
                        {col.label}
                        {col.sortable && (
                          <span className="ml-1">
                            {sortBy === col.key
                              ? sortDir === "desc" ? "↓" : "↑"
                              : "↕"}
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.customers.map((c, i) => {
                    const s = TIER_STYLES[c.risk_tier] ?? TIER_STYLES["Low"];
                    return (
                      <tr
                        key={c.customer_id}
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                          background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                        }}
                      >
                        {/* Customer ID */}
                        <td className="px-4 py-2.5 font-mono font-medium text-white">
                          {c.customer_id}
                        </td>

                        {/* Churn % with bar */}
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="w-10 font-semibold tabular-nums" style={{ color: s.color }}>
                              {(c.churn_probability * 100).toFixed(0)}%
                            </span>
                            <div
                              className="h-1.5 w-16 overflow-hidden rounded-full"
                              style={{ background: "rgba(255,255,255,0.08)" }}
                            >
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${c.churn_probability * 100}%`,
                                  background: s.color,
                                  opacity: 0.8,
                                }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Risk tier badge */}
                        <td className="px-4 py-2.5">
                          <span
                            className="rounded-full px-2 py-0.5 text-xs font-semibold"
                            style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
                          >
                            {c.risk_tier}
                          </span>
                        </td>

                        {/* Churned? */}
                        <td className="px-4 py-2.5">
                          <span
                            className="rounded-full px-2 py-0.5 text-xs font-medium"
                            style={
                              c.actual_churn === 1
                                ? { background: "rgba(244,63,94,0.1)", color: "#fb7185" }
                                : { background: "rgba(16,185,129,0.1)", color: "#34d399" }
                            }
                          >
                            {c.actual_churn === 1 ? "Yes" : "No"}
                          </span>
                        </td>

                        {/* Numeric cols */}
                        {(["recency", "frequency", "monetary", "avg_order_value", "tenure"] as const).map((key) => (
                          <td
                            key={key}
                            className="px-4 py-2.5 tabular-nums"
                            style={{ color: "rgba(255,255,255,0.65)" }}
                          >
                            {c[key] !== null && c[key] !== undefined
                              ? key === "monetary" || key === "avg_order_value"
                                ? `£${c[key]!.toFixed(0)}`
                                : c[key]!.toFixed(1)
                              : "—"}
                          </td>
                        ))}

                        {/* Country */}
                        <td className="px-4 py-2.5" style={{ color: "rgba(255,255,255,0.55)" }}>
                          {c.country}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div
              className="flex items-center justify-between border-t px-5 py-3"
              style={{ borderColor: "rgba(255,255,255,0.06)" }}
            >
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                Page {data.page} of {data.pages} · {data.total.toLocaleString()} customers
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-30"
                  style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
                >
                  ← Prev
                </button>
                {Array.from({ length: Math.min(5, data.pages) }, (_, i) => {
                  const p = Math.max(1, Math.min(data.pages - 4, page - 2)) + i;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className="h-7 w-7 rounded-lg text-xs font-medium transition-all"
                      style={
                        p === page
                          ? { background: "rgba(99,102,241,0.25)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.4)" }
                          : { color: "rgba(255,255,255,0.4)", border: "1px solid transparent" }
                      }
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                  disabled={page >= data.pages}
                  className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-30"
                  style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
}

"use client";

import { useEffect, useState } from "react";
import PageLayout from "@/components/PageLayout";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface RiskTier {
  tier: string;
  count: number;
  mean_probability: number;
  revenue_at_risk: number;
  color: string;
}

interface RfmRow {
  tier: string;
  Recency: number;
  Frequency: number;
  Monetary: number;
  AvgOrderValue: number;
}

interface CountryRow {
  country: string;
  High: number;
  Medium: number;
  Low: number;
  total: number;
}

interface HistRow {
  bin: string;
  count: number;
}

interface AnalyticsData {
  total_customers: number;
  overall_churn_rate: number;
  avg_churn_probability: number;
  total_revenue_at_risk: number;
  risk_tiers: RiskTier[];
  rfm_by_tier: RfmRow[];
  country_distribution: CountryRow[];
  prob_histogram: HistRow[];
}

const TIER_COLORS: Record<string, string> = {
  High: "#f43f5e",
  Medium: "#f59e0b",
  Low: "#10b981",
};

function StatCard({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon: string }) {
  return (
    <div className="glass-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg text-base"
          style={{ background: "rgba(99,102,241,0.15)" }}
        >
          {icon}
        </span>
        <span className="label-text">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{sub}</p>}
    </div>
  );
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl border p-3 text-xs shadow-2xl"
      style={{ background: "rgba(15,23,42,0.97)", borderColor: "rgba(255,255,255,0.1)", backdropFilter: "blur(16px)" }}
    >
      <p className="mb-2 font-semibold text-white">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span style={{ color: "rgba(255,255,255,0.6)" }}>{p.name}:</span>
          <span className="font-medium text-white">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Portfolio Analytics</h1>
        <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
          Aggregate churn risk across all scored customers from the UCI Online Retail test set
        </p>
      </div>

      {loading && (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div
              className="h-10 w-10 rounded-full border-2 border-indigo-500 animate-spin"
              style={{ borderTopColor: "transparent" }}
            />
            <p className="text-sm text-indigo-300">Loading analytics…</p>
          </div>
        </div>
      )}

      {error && (
        <div
          className="glass-card p-4 text-sm"
          style={{ background: "rgba(244,63,94,0.08)", borderColor: "rgba(244,63,94,0.2)", color: "#fb7185" }}
        >
          Failed to load analytics: {error}
        </div>
      )}

      {data && (
        <div className="flex flex-col gap-6 animate-fade-in">
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Total Customers Scored"
              value={data.total_customers.toLocaleString()}
              sub="UCI test set"
              icon="👥"
            />
            <StatCard
              label="Actual Churn Rate"
              value={`${(data.overall_churn_rate * 100).toFixed(1)}%`}
              sub="of test customers"
              icon="📉"
            />
            <StatCard
              label="Avg Churn Probability"
              value={`${(data.avg_churn_probability * 100).toFixed(1)}%`}
              sub="model output mean"
              icon="🎯"
            />
            <StatCard
              label="Total Revenue at Risk"
              value={`£${data.total_revenue_at_risk.toLocaleString()}`}
              sub="£300 per churner estimate"
              icon="💷"
            />
          </div>

          {/* Tier breakdown cards */}
          <div className="grid grid-cols-3 gap-4">
            {data.risk_tiers.map((t) => (
              <div
                key={t.tier}
                className="glass-card p-4"
                style={{ borderColor: `${t.color}22` }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{ background: `${t.color}20`, color: t.color, border: `1px solid ${t.color}33` }}
                  >
                    {t.tier} Risk
                  </span>
                </div>
                <p className="text-3xl font-bold text-white">{t.count}</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>customers</p>
                <div
                  className="mt-3 h-px"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                />
                <div className="mt-3 flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs">
                    <span style={{ color: "rgba(255,255,255,0.45)" }}>Mean probability</span>
                    <span className="font-medium text-white">{(t.mean_probability * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: "rgba(255,255,255,0.45)" }}>Revenue at risk</span>
                    <span className="font-medium" style={{ color: t.color }}>£{t.revenue_at_risk.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts row 1: Donut + Histogram */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Risk tier donut */}
            <div className="glass-card p-6">
              <h2 className="section-title mb-4">Risk Tier Distribution</h2>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.risk_tiers}
                      dataKey="count"
                      nameKey="tier"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={3}
                    >
                      {data.risk_tiers.map((t) => (
                        <Cell key={t.tier} fill={t.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as RiskTier;
                        return (
                          <div
                            className="rounded-xl border p-3 text-xs shadow-2xl"
                            style={{ background: "rgba(15,23,42,0.97)", borderColor: "rgba(255,255,255,0.1)" }}
                          >
                            <p className="font-semibold text-white">{d.tier} Risk</p>
                            <p style={{ color: "rgba(255,255,255,0.6)" }}>{d.count} customers ({((d.count / data.total_customers) * 100).toFixed(1)}%)</p>
                          </div>
                        );
                      }}
                    />
                    <Legend
                      formatter={(value) => (
                        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>{value} Risk</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Probability histogram */}
            <div className="glass-card p-6">
              <h2 className="section-title mb-4">Churn Probability Distribution</h2>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.prob_histogram} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="bin"
                      tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
                      axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                      tickLine={false}
                      interval={1}
                    />
                    <YAxis
                      tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                    <Bar dataKey="count" name="Customers" radius={[3, 3, 0, 0]}>
                      {data.prob_histogram.map((entry, i) => {
                        const midpoint = (i + 0.5) / data.prob_histogram.length;
                        const color =
                          midpoint >= 0.7 ? "#f43f5e" : midpoint >= 0.4 ? "#f59e0b" : "#10b981";
                        return <Cell key={i} fill={color} fillOpacity={0.8} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* RFM profiles by tier */}
          <div className="glass-card p-6">
            <h2 className="section-title mb-1">RFM Profile by Risk Tier</h2>
            <p className="mb-4 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              Average Recency (days since last order), Frequency (orders), Monetary (£), and Avg Order Value (£) per tier
            </p>
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.rfm_by_tier} margin={{ top: 4, right: 16, left: -10, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="tier"
                    tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Legend
                    formatter={(value) => (
                      <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>{value}</span>
                    )}
                  />
                  <Bar dataKey="Recency" name="Recency (days)" fill="#818cf8" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Frequency" name="Frequency" fill="#34d399" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Monetary" name="Monetary (£)" fill="#fbbf24" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="AvgOrderValue" name="Avg Order Value (£)" fill="#fb7185" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Country distribution */}
          <div className="glass-card p-6">
            <h2 className="section-title mb-1">Country Distribution by Risk Tier</h2>
            <p className="mb-4 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              Top 8 countries — customer count by risk tier
            </p>
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.country_distribution}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 90, bottom: 4 }}
                  barCategoryGap="25%"
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    type="number"
                    tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="country"
                    width={85}
                    tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Legend
                    formatter={(value) => (
                      <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>{value} Risk</span>
                    )}
                  />
                  <Bar dataKey="High" name="High" fill="#f43f5e" fillOpacity={0.85} radius={[0, 3, 3, 0]} />
                  <Bar dataKey="Medium" name="Medium" fill="#f59e0b" fillOpacity={0.85} radius={[0, 3, 3, 0]} />
                  <Bar dataKey="Low" name="Low" fill="#10b981" fillOpacity={0.85} radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

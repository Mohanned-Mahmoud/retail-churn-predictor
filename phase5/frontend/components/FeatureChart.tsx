"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface Contribution {
  feature: string;
  label: string;
  contribution: number;
  direction: string;
}

interface Props {
  contributions: Contribution[];
}

interface TooltipPayload {
  payload: {
    label: string;
    contribution: number;
    direction: string;
  };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  const isPositive = d.contribution > 0;
  return (
    <div
      className="rounded-xl border p-3 text-xs shadow-2xl"
      style={{
        background: "rgba(15,23,42,0.95)",
        borderColor: "rgba(255,255,255,0.12)",
        backdropFilter: "blur(16px)",
        minWidth: "200px",
      }}
    >
      <p className="mb-2 font-semibold text-white">{d.label}</p>
      <div className="flex items-center justify-between gap-4">
        <span style={{ color: "rgba(255,255,255,0.5)" }}>Contribution</span>
        <span
          className="font-mono font-bold"
          style={{ color: isPositive ? "#f43f5e" : "#10b981" }}
        >
          {d.contribution > 0 ? "+" : ""}
          {d.contribution.toFixed(4)}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-1.5">
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: isPositive ? "#f43f5e" : "#10b981" }}
        />
        <span style={{ color: "rgba(255,255,255,0.4)" }}>
          {isPositive ? "Increases churn risk" : "Reduces churn risk"}
        </span>
      </div>
    </div>
  );
}

function CustomYAxisTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  if (!payload) return <></>;
  return (
    <text
      x={x}
      y={y}
      dy={4}
      textAnchor="end"
      fill="rgba(255,255,255,0.5)"
      fontSize={11}
      fontFamily="Inter, system-ui, sans-serif"
    >
      {payload.value}
    </text>
  );
}

export default function FeatureChart({ contributions }: Props) {
  const data = [...contributions]
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 8)
    .map((c) => ({
      label: c.label,
      contribution: c.contribution,
      direction: c.direction,
    }))
    .reverse();

  const maxAbs = Math.max(...data.map((d) => Math.abs(d.contribution)));

  return (
    <div className="glass-card p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="section-title flex items-center gap-2">
            <span
              className="flex h-6 w-6 items-center justify-center rounded-md text-xs"
              style={{ background: "rgba(99,102,241,0.2)" }}
            >
              📊
            </span>
            Feature Contributions
          </h2>
          <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
            How each customer attribute influences the churn prediction (model
            coefficient × scaled value)
          </p>
        </div>

        <div className="hidden items-center gap-5 sm:flex">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-rose-500" />
            <span
              className="text-xs"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              Increases risk
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
            <span
              className="text-xs"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              Reduces risk
            </span>
          </div>
        </div>
      </div>

      <div style={{ height: "320px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
            barCategoryGap="30%"
          >
            <CartesianGrid
              horizontal={false}
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.05)"
            />
            <XAxis
              type="number"
              domain={[-maxAbs * 1.1, maxAbs * 1.1]}
              tickFormatter={(v) => v.toFixed(2)}
              tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={140}
              tick={CustomYAxisTick}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
            />
            <ReferenceLine
              x={0}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={1}
            />
            <Bar dataKey="contribution" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={
                    entry.contribution > 0
                      ? "rgba(244,63,94,0.8)"
                      : "rgba(16,185,129,0.8)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p
        className="mt-4 text-center text-xs"
        style={{ color: "rgba(255,255,255,0.25)" }}
      >
        Top 8 drivers by absolute contribution magnitude · Logistic Regression
        coefficients × standardised feature values
      </p>
    </div>
  );
}

"use client";

import { useState } from "react";

export interface CustomerFormData {
  frequency: number;
  monetary: number;
  num_items: number;
  num_products: number;
  tenure: number;
  avg_order_value: number;
  revenue_per_month: number;
  purchase_trend: number;
  return_rate: number;
  country: string;
}

const COUNTRIES = [
  "United Kingdom",
  "Belgium",
  "France",
  "Germany",
  "Spain",
  "Switzerland",
  "Other",
];

const DEFAULTS: CustomerFormData = {
  frequency: 42,
  monetary: 750,
  num_items: 380,
  num_products: 35,
  tenure: 90,
  avg_order_value: 19,
  revenue_per_month: 220,
  purchase_trend: 0,
  return_rate: 0,
  country: "United Kingdom",
};

interface Field {
  key: keyof CustomerFormData;
  label: string;
  unit?: string;
  min: number;
  max: number;
  step: number;
  hint: string;
}

const FIELDS: Field[] = [
  {
    key: "frequency",
    label: "Purchase Frequency",
    unit: "orders",
    min: 1,
    max: 500,
    step: 1,
    hint: "Total number of orders placed",
  },
  {
    key: "monetary",
    label: "Total Spend",
    unit: "£",
    min: 5,
    max: 20000,
    step: 1,
    hint: "Cumulative spend across all orders",
  },
  {
    key: "num_items",
    label: "Items Ordered",
    unit: "units",
    min: 1,
    max: 10000,
    step: 1,
    hint: "Total quantity of items ordered",
  },
  {
    key: "num_products",
    label: "Unique Products",
    unit: "SKUs",
    min: 1,
    max: 2000,
    step: 1,
    hint: "Number of distinct product types",
  },
  {
    key: "tenure",
    label: "Tenure",
    unit: "days",
    min: 0,
    max: 365,
    step: 1,
    hint: "Days since first purchase",
  },
  {
    key: "avg_order_value",
    label: "Avg Order Value",
    unit: "£",
    min: 1,
    max: 5000,
    step: 0.5,
    hint: "Average spend per order",
  },
  {
    key: "revenue_per_month",
    label: "Revenue / Month",
    unit: "£",
    min: 1,
    max: 5000,
    step: 0.5,
    hint: "Average monthly revenue from this customer",
  },
  {
    key: "purchase_trend",
    label: "Purchase Trend",
    unit: "",
    min: -500,
    max: 500,
    step: 1,
    hint: "Positive = accelerating purchases, negative = declining",
  },
  {
    key: "return_rate",
    label: "Return Rate",
    unit: "",
    min: 0,
    max: 1,
    step: 0.01,
    hint: "Proportion of items returned (0 = none, 1 = all)",
  },
];

interface Props {
  onSubmit: (data: CustomerFormData) => void;
  loading: boolean;
}

export default function InputForm({ onSubmit, loading }: Props) {
  const [form, setForm] = useState<CustomerFormData>(DEFAULTS);

  function handleChange(key: keyof CustomerFormData, value: string | number) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  function handleReset() {
    setForm(DEFAULTS);
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card p-5 flex flex-col gap-5">
      {/* Header */}
      <div>
        <h2 className="section-title flex items-center gap-2">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-md text-xs"
            style={{ background: "rgba(99,102,241,0.2)" }}
          >
            👤
          </span>
          Customer Profile
        </h2>
        <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
          Enter customer metrics to generate a churn risk assessment
        </p>
      </div>

      {/* Numeric fields */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <div key={f.key} className="flex flex-col gap-1">
            <label className="label-text" htmlFor={f.key}>
              {f.label}
              {f.unit && (
                <span
                  className="ml-1 normal-case"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  ({f.unit})
                </span>
              )}
            </label>
            <input
              id={f.key}
              type="number"
              className="glass-input"
              min={f.min}
              max={f.max}
              step={f.step}
              value={form[f.key] as number}
              onChange={(e) =>
                handleChange(f.key, parseFloat(e.target.value) || 0)
              }
              title={f.hint}
              placeholder={f.hint}
            />
          </div>
        ))}
      </div>

      {/* Country selector */}
      <div className="flex flex-col gap-1">
        <label className="label-text" htmlFor="country">
          Country
        </label>
        <select
          id="country"
          className="glass-input"
          value={form.country}
          onChange={(e) => handleChange("country", e.target.value)}
          style={{ cursor: "pointer" }}
        >
          {COUNTRIES.map((c) => (
            <option
              key={c}
              value={c}
              style={{ background: "#0f172a", color: "#e2e8f0" }}
            >
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Divider */}
      <div
        className="h-px"
        style={{ background: "rgba(255,255,255,0.06)" }}
      />

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span
                className="h-4 w-4 rounded-full border-2 border-white/30 animate-spin"
                style={{ borderTopColor: "white" }}
              />
              Analysing…
            </span>
          ) : (
            "Run Analysis"
          )}
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={loading}
          className="w-full rounded-xl py-2 px-4 text-xs font-medium transition-all duration-200 focus:outline-none disabled:opacity-50"
          style={{
            color: "rgba(255,255,255,0.4)",
            background: "transparent",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "rgba(255,255,255,0.7)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "rgba(255,255,255,0.4)")
          }
        >
          Reset to defaults
        </button>
      </div>
    </form>
  );
}

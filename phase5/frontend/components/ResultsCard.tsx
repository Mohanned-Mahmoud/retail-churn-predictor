"use client";

import { PredictionResult } from "@/app/page";

interface Props {
  result: PredictionResult;
}

interface Recommendation {
  priority: "Immediate" | "Standard" | "Monitor";
  icon: string;
  title: string;
  action: string;
  rationale: string;
  impact: string;
}

function getRecommendations(result: PredictionResult): Recommendation[] {
  const { risk_tier, churn_probability, feature_contributions } = result;
  const prob = churn_probability * 100;

  const topPositive = feature_contributions
    .filter((f) => f.direction === "increases_risk" && !f.feature.startsWith("Country") && f.feature !== "IsUK")
    .slice(0, 3)
    .map((f) => f.feature);

  const recs: Recommendation[] = [];

  if (risk_tier === "High") {
    recs.push({
      priority: "Immediate",
      icon: "🚨",
      title: "Personal Outreach — Within 24 Hours",
      action:
        "Contact this customer directly via phone or personalised email with a targeted retention offer.",
      rationale: `The model assigns a ${prob.toFixed(0)}% churn probability — well above the 70% high-risk threshold. Immediate intervention maximises the chance of retention.`,
      impact: "Estimated revenue at risk: ~£300 per customer lost.",
    });

    if (topPositive.includes("Recency")) {
      recs.push({
        priority: "Immediate",
        icon: "⏰",
        title: "Win-Back Campaign",
        action:
          "Send a time-limited discount or personalised product recommendation to re-engage this lapsed customer.",
        rationale:
          "Recency is a top driver of this prediction — the customer has not purchased recently, which is the strongest early-warning signal of impending churn.",
        impact: "Re-engagement rate for lapsed customers: 15–25%.",
      });
    }

    if (topPositive.includes("PurchaseTrend")) {
      recs.push({
        priority: "Immediate",
        icon: "📉",
        title: "Declining Trend Intervention",
        action:
          "Trigger a proactive 'we miss you' nurture sequence before the purchase trend worsens further.",
        rationale:
          "A declining purchase trend is a leading indicator that this customer is drifting away — intervening early is 5× cheaper than acquiring a replacement.",
        impact: "Reduces churn probability by ~10–15 percentage points when caught early.",
      });
    }

    recs.push({
      priority: "Standard",
      icon: "🎁",
      title: "Personalised Loyalty Incentive",
      action:
        "Offer an exclusive loyalty reward — such as bonus points, free shipping for 90 days, or a VIP discount tier.",
      rationale:
        "For high-risk customers, a loyalty incentive signals recognition and creates a switching cost that reduces the probability of defection.",
      impact: "Loyalty programmes reduce churn by 20–30% for at-risk segments.",
    });
  }

  if (risk_tier === "Medium") {
    recs.push({
      priority: "Standard",
      icon: "📧",
      title: "Automated Nurture Journey",
      action:
        "Enrol this customer in a 30-day email nurture sequence with relevant product highlights and value-reinforcement messaging.",
      rationale: `At ${prob.toFixed(0)}% churn probability, this customer shows meaningful risk but does not yet require a full personal intervention. A scalable automated journey is cost-effective.`,
      impact: "Automated nurture reduces medium-risk churn by 12–18%.",
    });

    if (topPositive.includes("ReturnRate")) {
      recs.push({
        priority: "Standard",
        icon: "📦",
        title: "Post-Purchase Satisfaction Check",
        action:
          "Send a satisfaction survey and proactively address any product fit issues before they erode loyalty.",
        rationale:
          "A high return rate indicates potential product-fit problems that, if unaddressed, accelerate churn in the medium-risk segment.",
        impact: "Resolving return issues increases NPS by 15+ points on average.",
      });
    }

    if (topPositive.includes("Frequency") || topPositive.includes("NumProducts")) {
      recs.push({
        priority: "Standard",
        icon: "🔁",
        title: "Cross-Sell & Repeat Purchase Prompts",
        action:
          "Trigger personalised product recommendations based on past purchase categories to drive a repeat order.",
        rationale:
          "Low frequency and narrow product range are warning signs. Increasing engagement breadth reduces churn probability significantly.",
        impact: "Cross-sell prompts improve repeat purchase rate by 8–14%.",
      });
    }

    recs.push({
      priority: "Monitor",
      icon: "📊",
      title: "30-Day Monitoring & Escalation Rule",
      action:
        "Set a monitoring alert: if no purchase is recorded within 30 days, escalate to a personal outreach workflow.",
      rationale:
        "Medium-risk customers can drift into high-risk quickly. An automated escalation rule ensures no customer slips through undetected.",
      impact: "Early escalation reduces false-negative rate by ~22%.",
    });
  }

  if (risk_tier === "Low") {
    recs.push({
      priority: "Monitor",
      icon: "✅",
      title: "Standard Communication Cadence",
      action:
        "Continue regular newsletters, product updates, and seasonal promotions. No urgent intervention required.",
      rationale: `At ${prob.toFixed(0)}% churn probability, this customer shows healthy engagement signals. Standard lifecycle communications are sufficient.`,
      impact: "Maintaining engagement preserves long-term LTV.",
    });

    recs.push({
      priority: "Monitor",
      icon: "🌱",
      title: "Loyalty Programme Maintenance",
      action:
        "Include in broad loyalty initiatives and seasonal campaigns to sustain satisfaction.",
      rationale:
        "Low-risk customers are your most valuable segment. Proactive loyalty investment reduces the likelihood they ever reach high-risk status.",
      impact: "Retaining low-risk customers is 5–7× cheaper than re-acquiring churned customers.",
    });
  }

  return recs;
}

function CircleGauge({ probability }: { probability: number }) {
  const pct = probability * 100;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - probability);

  let strokeColor = "#10b981";
  if (pct >= 70) strokeColor = "#f43f5e";
  else if (pct >= 40) strokeColor = "#f59e0b";

  return (
    <div className="relative flex items-center justify-center">
      <svg width="136" height="136" viewBox="0 0 136 136">
        <circle
          cx="68"
          cy="68"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="10"
        />
        <circle
          cx="68"
          cy="68"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 68 68)"
          style={{ transition: "stroke-dashoffset 1s ease-out, stroke 0.5s" }}
          filter={`drop-shadow(0 0 8px ${strokeColor})`}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span
          className="text-3xl font-bold tabular-nums"
          style={{ color: strokeColor }}
        >
          {pct.toFixed(0)}%
        </span>
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
          churn risk
        </span>
      </div>
    </div>
  );
}

const PRIORITY_STYLES = {
  Immediate: {
    bg: "rgba(244,63,94,0.08)",
    border: "rgba(244,63,94,0.2)",
    badge: { bg: "rgba(244,63,94,0.15)", color: "#fb7185" },
    dot: "#f43f5e",
  },
  Standard: {
    bg: "rgba(245,158,11,0.06)",
    border: "rgba(245,158,11,0.15)",
    badge: { bg: "rgba(245,158,11,0.12)", color: "#fbbf24" },
    dot: "#f59e0b",
  },
  Monitor: {
    bg: "rgba(99,102,241,0.06)",
    border: "rgba(99,102,241,0.15)",
    badge: { bg: "rgba(99,102,241,0.12)", color: "#a5b4fc" },
    dot: "#6366f1",
  },
};

export default function ResultsCard({ result }: Props) {
  const { churn_probability, risk_tier } = result;
  const recommendations = getRecommendations(result);

  const riskBadgeClass =
    risk_tier === "High"
      ? "risk-badge-high"
      : risk_tier === "Medium"
      ? "risk-badge-medium"
      : "risk-badge-low";

  const riskLabel =
    risk_tier === "High"
      ? "High Churn Risk"
      : risk_tier === "Medium"
      ? "Medium Churn Risk"
      : "Low Churn Risk";

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* Risk Score Card */}
      <div className="glass-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-title">Churn Risk Assessment</h2>
          <span className={riskBadgeClass}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {riskLabel}
          </span>
        </div>

        <div className="flex items-center gap-6">
          <CircleGauge probability={churn_probability} />

          <div className="flex flex-col gap-3 flex-1">
            {[
              {
                label: "Churn Probability",
                value: `${(churn_probability * 100).toFixed(1)}%`,
              },
              {
                label: "Risk Tier",
                value: risk_tier,
              },
              {
                label: "Action Required",
                value:
                  risk_tier === "High"
                    ? "Immediate outreach"
                    : risk_tier === "Medium"
                    ? "Nurture campaign"
                    : "Standard cadence",
              },
              {
                label: "Revenue at Risk",
                value: `~£${Math.round(churn_probability * 300)}`,
              },
            ].map((row) => (
              <div key={row.label} className="flex justify-between text-sm">
                <span style={{ color: "rgba(255,255,255,0.45)" }}>
                  {row.label}
                </span>
                <span className="font-medium text-white">{row.value}</span>
              </div>
            ))}

            {/* Risk bar */}
            <div className="mt-1">
              <div
                className="h-1.5 w-full overflow-hidden rounded-full"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${churn_probability * 100}%`,
                    background:
                      risk_tier === "High"
                        ? "linear-gradient(90deg, #fb7185, #f43f5e)"
                        : risk_tier === "Medium"
                        ? "linear-gradient(90deg, #fbbf24, #f59e0b)"
                        : "linear-gradient(90deg, #34d399, #10b981)",
                    boxShadow: `0 0 8px ${result.risk_color}`,
                  }}
                />
              </div>
              <div
                className="mt-1 flex justify-between text-xs"
                style={{ color: "rgba(255,255,255,0.25)" }}
              >
                <span>Low</span>
                <span>Medium</span>
                <span>High</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Action Plan */}
      <div className="glass-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-title flex items-center gap-2">
            <span
              className="flex h-6 w-6 items-center justify-center rounded-md text-xs"
              style={{ background: "rgba(99,102,241,0.2)" }}
            >
              📋
            </span>
            Recommended Action Plan
          </h2>
          <span
            className="text-xs"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            {recommendations.length} action
            {recommendations.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex flex-col gap-3 max-h-80 overflow-y-auto scrollbar-thin pr-1">
          {recommendations.map((rec, i) => {
            const s = PRIORITY_STYLES[rec.priority];
            return (
              <div
                key={i}
                className="rounded-xl border p-4 transition-all duration-200"
                style={{ background: s.bg, borderColor: s.border }}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-base leading-none">{rec.icon}</span>
                    <span className="text-sm font-semibold text-white leading-tight">
                      {rec.title}
                    </span>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      background: s.badge.bg,
                      color: s.badge.color,
                    }}
                  >
                    {rec.priority}
                  </span>
                </div>

                <p className="mb-2 text-xs text-white/70 leading-relaxed">
                  <strong className="text-white/90">Action:</strong>{" "}
                  {rec.action}
                </p>
                <p className="mb-2 text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                  <strong style={{ color: "rgba(255,255,255,0.65)" }}>
                    Rationale:
                  </strong>{" "}
                  {rec.rationale}
                </p>
                <p
                  className="text-xs font-medium"
                  style={{ color: s.badge.color }}
                >
                  💡 {rec.impact}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import warnings
warnings.filterwarnings("ignore")

import io
import os
from dotenv import load_dotenv
load_dotenv()
import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from numpy import log1p
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from fastapi import FastAPI, HTTPException, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional

# AI client
from google import genai
from google.genai import types as genai_types

_AI_MODEL = "gemini-2.5-flash"
ai_client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

BASE_DIR = Path(__file__).parent
MODEL_PATH = BASE_DIR / "../../shared/models/best_model.pkl"
FEAT_ENG_PATH = BASE_DIR / "../../shared/data/feature_engineered.csv"
RFM_PATH = BASE_DIR / "../../shared/data/rfm_base.csv"

FEATURE_NAMES = [
    "Frequency", "Monetary", "NumItems", "NumProducts", "Tenure",
    "AvgOrderValue", "RevenuePerMonth", "PurchaseTrend", "ReturnRate",
    "IsUK", "Country_Belgium", "Country_France", "Country_Germany",
    "Country_Other", "Country_Spain", "Country_Switzerland", "Country_United Kingdom",
]

FEATURE_LABELS = {
    "Frequency": "Purchase Frequency",
    "Monetary": "Total Spend (£)",
    "NumItems": "Items Ordered",
    "NumProducts": "Unique Products",
    "Tenure": "Customer Tenure",
    "AvgOrderValue": "Avg Order Value (£)",
    "RevenuePerMonth": "Revenue / Month (£)",
    "PurchaseTrend": "Purchase Trend",
    "ReturnRate": "Return Rate",
    "IsUK": "UK Customer",
    "Country_Belgium": "Country: Belgium",
    "Country_France": "Country: France",
    "Country_Germany": "Country: Germany",
    "Country_Other": "Country: Other",
    "Country_Spain": "Country: Spain",
    "Country_Switzerland": "Country: Switzerland",
    "Country_United Kingdom": "Country: United Kingdom",
}

# ── Startup: load model + fit scaler + pre-score test set ─────────────────────
print("Loading model and fitting scaler…")
model = joblib.load(MODEL_PATH)

feat_eng = pd.read_csv(FEAT_ENG_PATH)
rfm_base = pd.read_csv(RFM_PATH)

X_full = feat_eng.drop(columns=["Churned"])
y_full = feat_eng["Churned"]
cust_full = rfm_base["CustomerID"]

X_train_raw, X_test_raw, y_train_raw, y_test_raw, _, cust_test = train_test_split(
    X_full, y_full, cust_full, test_size=0.2, random_state=42, stratify=y_full
)

scaler = StandardScaler()
scaler.fit(X_train_raw)

X_test_scaled = pd.DataFrame(scaler.transform(X_test_raw), columns=FEATURE_NAMES)
probs_test = model.predict_proba(X_test_scaled.values)[:, 1]
preds_test = (probs_test >= 0.5).astype(int)

customer_df = pd.DataFrame({
    "CustomerID": cust_test.values,
    "ActualChurn": y_test_raw.values,
    "ChurnProbability": probs_test,
    "PredictedLabel": preds_test,
})

lookup = (
    rfm_base[["CustomerID", "Recency", "Frequency", "Monetary", "Country", "Tenure"]]
    .set_index("CustomerID")
)
customer_df = customer_df.join(lookup, on="CustomerID")
customer_df["AvgOrderValue"] = (
    customer_df["Monetary"] / customer_df["Frequency"].replace(0, np.nan)
).round(2)
customer_df["RiskTier"] = pd.cut(
    customer_df["ChurnProbability"],
    bins=[-np.inf, 0.40, 0.70, np.inf],
    labels=["Low", "Medium", "High"],
    right=False,
)
customer_df = customer_df.reset_index(drop=True)

# Load transaction-level data for RAG
TRANS_PATH = BASE_DIR / "../../shared/data/transactions_clean.csv"
transactions_df: pd.DataFrame | None = None
try:
    transactions_df = pd.read_csv(TRANS_PATH)
except Exception:
    pass

# ── Build RAG knowledge base from all data files ──────────────────────────────
def build_rag_context() -> str:
    lines: list[str] = []

    # ── Full dataset (rfm_base — all 4,338 customers) ──
    lines.append("=== FULL DATASET (rfm_base.csv — all 4,338 customers) ===")
    lines.append(f"Total customers: {len(rfm_base)}")
    lines.append(f"Overall churn rate: {rfm_base['Churned'].mean():.1%} ({int(rfm_base['Churned'].sum())} churned)")
    for col in ["Recency", "Frequency", "Monetary"]:
        s = rfm_base[col].describe()
        lines.append(
            f"{col}: mean={s['mean']:.1f}, median={rfm_base[col].median():.1f}, "
            f"min={s['min']:.1f}, max={s['max']:.1f}, std={s['std']:.1f}"
        )
    tenure_s = rfm_base["Tenure"].describe()
    lines.append(
        f"Tenure (days): mean={tenure_s['mean']:.1f}, median={rfm_base['Tenure'].median():.1f}, "
        f"min={tenure_s['min']:.1f}, max={tenure_s['max']:.1f}"
    )

    # Country breakdown (full dataset)
    lines.append("\n=== COUNTRY BREAKDOWN (full dataset) ===")
    ctry = (
        rfm_base.groupby("Country")
        .agg(customers=("CustomerID", "count"), churned=("Churned", "sum"), churn_rate=("Churned", "mean"))
        .sort_values("customers", ascending=False)
    )
    for country, row in ctry.iterrows():
        lines.append(
            f"{country}: {int(row['customers'])} customers, churn rate {row['churn_rate']:.1%} "
            f"({int(row['churned'])} churned)"
        )

    # Transactions summary
    if transactions_df is not None:
        lines.append("\n=== TRANSACTIONS (transactions_clean.csv) ===")
        lines.append(f"Total transaction rows: {len(transactions_df):,}")
        if "Quantity" in transactions_df.columns:
            lines.append(f"Quantity: mean={transactions_df['Quantity'].mean():.1f}, total={transactions_df['Quantity'].sum():,.0f}")
        if "UnitPrice" in transactions_df.columns:
            lines.append(f"Unit price: mean=£{transactions_df['UnitPrice'].mean():.2f}, max=£{transactions_df['UnitPrice'].max():.2f}")
        if "InvoiceDate" in transactions_df.columns:
            lines.append(f"Date range: {transactions_df['InvoiceDate'].min()} → {transactions_df['InvoiceDate'].max()}")

    # ── Test set (868 customers with model predictions) ──
    lines.append("\n=== TEST SET (868 customers with model predictions) ===")
    lines.append(f"Total scored: {len(customer_df)}")
    lines.append(f"Actual churn rate: {customer_df['ActualChurn'].mean():.1%} ({int(customer_df['ActualChurn'].sum())} churned)")
    lines.append(f"Average predicted churn probability: {customer_df['ChurnProbability'].mean():.1%}")

    # Risk tier breakdown
    lines.append("\n=== RISK TIER BREAKDOWN (test set) ===")
    for tier in ["High", "Medium", "Low"]:
        sub = customer_df[customer_df["RiskTier"] == tier]
        if len(sub):
            lines.append(
                f"{tier} Risk: {len(sub)} customers | avg probability {sub['ChurnProbability'].mean():.1%} | "
                f"actual churn rate {sub['ActualChurn'].mean():.1%} | "
                f"avg monetary £{sub['Monetary'].mean():.0f}"
            )

    # RFM profiles by risk tier
    lines.append("\n=== RFM PROFILES BY RISK TIER (mean values, test set) ===")
    profile = customer_df.groupby("RiskTier", observed=False)[
        ["Recency", "Frequency", "Monetary", "AvgOrderValue", "Tenure"]
    ].mean().round(2)
    for tier in ["High", "Medium", "Low"]:
        if tier in profile.index:
            r = profile.loc[tier]
            lines.append(
                f"{tier}: Recency={r['Recency']:.1f}d, Frequency={r['Frequency']:.1f} orders, "
                f"Monetary=£{r['Monetary']:.0f}, AvgOrder=£{r['AvgOrderValue']:.0f}, Tenure={r['Tenure']:.1f}d"
            )

    # Feature correlations with actual churn
    lines.append("\n=== FEATURE CORRELATIONS WITH ACTUAL CHURN ===")
    num_cols = ["Recency", "Frequency", "Monetary", "AvgOrderValue", "Tenure", "ChurnProbability"]
    corrs = (
        customer_df[[*num_cols, "ActualChurn"]]
        .corr()["ActualChurn"]
        .drop("ActualChurn")
        .sort_values(ascending=False)
    )
    for col, val in corrs.items():
        lines.append(f"{col}: {val:+.3f}")

    # Top HIGH-risk customers sorted by churn probability (full profiles)
    lines.append("\n=== TOP HIGH-RISK CUSTOMERS — sorted by churn probability descending (FULL PROFILES) ===")
    lines.append("Fields: CustomerID | ChurnProbability | ActualChurn | Recency(days) | Frequency(orders) | Monetary(£) | AvgOrderValue(£) | Tenure(days) | Country")
    high_sorted = (
        customer_df[customer_df["RiskTier"] == "High"]
        .sort_values("ChurnProbability", ascending=False)
        .head(30)
    )
    for rank, (_, row) in enumerate(high_sorted.iterrows(), 1):
        lines.append(
            f"#{rank} ID:{int(row['CustomerID'])} prob:{row['ChurnProbability']:.1%} "
            f"churned:{int(row['ActualChurn'])} recency:{row['Recency']:.0f}d "
            f"freq:{row['Frequency']:.0f} mon:£{row['Monetary']:.0f} "
            f"aov:£{row['AvgOrderValue']:.0f} tenure:{row['Tenure']:.0f}d country:{row['Country']}"
        )

    # Top MEDIUM-risk customers (full profiles, top 15)
    lines.append("\n=== TOP MEDIUM-RISK CUSTOMERS — sorted by churn probability descending (FULL PROFILES) ===")
    med_sorted = (
        customer_df[customer_df["RiskTier"] == "Medium"]
        .sort_values("ChurnProbability", ascending=False)
        .head(15)
    )
    for rank, (_, row) in enumerate(med_sorted.iterrows(), 1):
        lines.append(
            f"#{rank} ID:{int(row['CustomerID'])} prob:{row['ChurnProbability']:.1%} "
            f"churned:{int(row['ActualChurn'])} recency:{row['Recency']:.0f}d "
            f"freq:{row['Frequency']:.0f} mon:£{row['Monetary']:.0f} "
            f"aov:£{row['AvgOrderValue']:.0f} tenure:{row['Tenure']:.0f}d country:{row['Country']}"
        )

    # Sample LOW-risk customers (5, for contrast)
    lines.append("\n=== LOW-RISK CUSTOMER SAMPLES (5, for contrast) ===")
    low_sorted = (
        customer_df[customer_df["RiskTier"] == "Low"]
        .sort_values("ChurnProbability", ascending=False)
        .head(5)
    )
    for _, row in low_sorted.iterrows():
        lines.append(
            f"ID:{int(row['CustomerID'])} prob:{row['ChurnProbability']:.1%} "
            f"churned:{int(row['ActualChurn'])} recency:{row['Recency']:.0f}d "
            f"freq:{row['Frequency']:.0f} mon:£{row['Monetary']:.0f} "
            f"aov:£{row['AvgOrderValue']:.0f} tenure:{row['Tenure']:.0f}d country:{row['Country']}"
        )

    # ── Business KPIs ──
    lines.append("\n=== BUSINESS KPIs (test set) ===")
    high = customer_df[customer_df["RiskTier"] == "High"]
    med  = customer_df[customer_df["RiskTier"] == "Medium"]
    low  = customer_df[customer_df["RiskTier"] == "Low"]
    total_revenue   = customer_df["Monetary"].sum()
    revenue_at_risk_high = high["Monetary"].sum()
    revenue_at_risk_med  = med["Monetary"].sum()
    lines.append(f"Total portfolio revenue (test set): £{total_revenue:,.0f}")
    lines.append(f"Revenue at risk — High tier: £{revenue_at_risk_high:,.0f} ({revenue_at_risk_high/total_revenue:.1%} of portfolio)")
    lines.append(f"Revenue at risk — Medium tier: £{revenue_at_risk_med:,.0f} ({revenue_at_risk_med/total_revenue:.1%} of portfolio)")
    lines.append(f"Safe revenue — Low tier: £{low['Monetary'].sum():,.0f} ({low['Monetary'].sum()/total_revenue:.1%} of portfolio)")
    lines.append(f"Avg revenue per High-risk customer: £{high['Monetary'].mean():,.0f}")
    lines.append(f"Avg revenue per Low-risk customer: £{low['Monetary'].mean():,.0f}")

    # Top 10 most valuable customers AT HIGH RISK
    lines.append("\n=== TOP 10 MOST VALUABLE HIGH-RISK CUSTOMERS (highest monetary, still at risk) ===")
    valuable_at_risk = high.sort_values("Monetary", ascending=False).head(10)
    for rank, (_, row) in enumerate(valuable_at_risk.iterrows(), 1):
        lines.append(
            f"#{rank} ID:{int(row['CustomerID'])} mon:£{row['Monetary']:,.0f} "
            f"prob:{row['ChurnProbability']:.1%} freq:{row['Frequency']:.0f} "
            f"recency:{row['Recency']:.0f}d aov:£{row['AvgOrderValue']:.0f} country:{row['Country']}"
        )

    # Inactive customers (recency > 60 days) at High risk
    lines.append("\n=== HIGH-RISK CUSTOMERS INACTIVE >60 DAYS ===")
    inactive_high = high[high["Recency"] > 60].sort_values("Monetary", ascending=False).head(10)
    lines.append(f"Count: {len(high[high['Recency'] > 60])} High-risk customers inactive >60 days")
    for _, row in inactive_high.iterrows():
        lines.append(
            f"  ID:{int(row['CustomerID'])} recency:{row['Recency']:.0f}d "
            f"mon:£{row['Monetary']:.0f} prob:{row['ChurnProbability']:.1%} country:{row['Country']}"
        )

    # Country breakdown — test set
    lines.append("\n=== COUNTRY ANALYSIS (test set, scored customers) ===")
    ctry_test = (
        customer_df.groupby("Country")
        .agg(
            customers=("CustomerID", "count"),
            high_risk=("RiskTier", lambda x: (x == "High").sum()),
            actual_churned=("ActualChurn", "sum"),
            churn_rate=("ActualChurn", "mean"),
            avg_prob=("ChurnProbability", "mean"),
            total_revenue=("Monetary", "sum"),
            revenue_at_risk=("Monetary", lambda x: x[customer_df.loc[x.index, "RiskTier"] == "High"].sum()),
        )
        .sort_values("customers", ascending=False)
    )
    for country, row in ctry_test.iterrows():
        lines.append(
            f"{country}: {int(row['customers'])} customers | high_risk:{int(row['high_risk'])} | "
            f"churn_rate:{row['churn_rate']:.1%} | avg_prob:{row['avg_prob']:.1%} | "
            f"revenue:£{row['total_revenue']:,.0f} | revenue_at_risk:£{row['revenue_at_risk']:,.0f}"
        )

    # Top 10 safe / best customers (lowest churn prob, highest monetary)
    lines.append("\n=== TOP 10 SAFEST HIGH-VALUE CUSTOMERS (low churn risk, high spend) ===")
    best = customer_df[customer_df["RiskTier"] == "Low"].sort_values("Monetary", ascending=False).head(10)
    for rank, (_, row) in enumerate(best.iterrows(), 1):
        lines.append(
            f"#{rank} ID:{int(row['CustomerID'])} mon:£{row['Monetary']:,.0f} "
            f"prob:{row['ChurnProbability']:.1%} freq:{row['Frequency']:.0f} country:{row['Country']}"
        )

    return "\n".join(lines)


RAG_CONTEXT = build_rag_context()
print(f"Model: {type(model).__name__} | Test set: {len(customer_df)} customers | RAG context: {len(RAG_CONTEXT)} chars | Ready.")

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="Churn Predictor API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schemas ───────────────────────────────────────────────────────────────────
class CustomerInput(BaseModel):
    frequency: float = Field(..., ge=1)
    monetary: float = Field(..., ge=1)
    num_items: float = Field(..., ge=1)
    num_products: float = Field(..., ge=1)
    tenure: float = Field(..., ge=0)
    avg_order_value: float = Field(..., ge=1)
    revenue_per_month: float = Field(..., ge=1)
    purchase_trend: float = 0.0
    return_rate: float = Field(0.0, ge=0, le=1)
    country: str = "United Kingdom"


class FeatureContribution(BaseModel):
    feature: str
    label: str
    contribution: float
    direction: str


class PredictionResponse(BaseModel):
    churn_probability: float
    risk_tier: str
    risk_color: str
    feature_contributions: list[FeatureContribution]


# ── Helpers ───────────────────────────────────────────────────────────────────
COUNTRY_MAP = {
    "Belgium": "Country_Belgium",
    "France": "Country_France",
    "Germany": "Country_Germany",
    "Spain": "Country_Spain",
    "Switzerland": "Country_Switzerland",
    "United Kingdom": "Country_United Kingdom",
}


def build_feature_vector(c: CustomerInput) -> pd.DataFrame:
    row = {
        "Frequency": log1p(c.frequency),
        "Monetary": log1p(c.monetary),
        "NumItems": log1p(c.num_items),
        "NumProducts": log1p(c.num_products),
        "Tenure": log1p(c.tenure),
        "AvgOrderValue": log1p(c.avg_order_value),
        "RevenuePerMonth": log1p(c.revenue_per_month),
        "PurchaseTrend": c.purchase_trend,
        "ReturnRate": c.return_rate,
        "IsUK": 1.0 if c.country == "United Kingdom" else 0.0,
        "Country_Belgium": 0.0,
        "Country_France": 0.0,
        "Country_Germany": 0.0,
        "Country_Other": 0.0,
        "Country_Spain": 0.0,
        "Country_Switzerland": 0.0,
        "Country_United Kingdom": 0.0,
    }
    target = COUNTRY_MAP.get(c.country, "Country_Other")
    row[target] = 1.0
    return pd.DataFrame([row], columns=FEATURE_NAMES)


def score_row(row: dict) -> dict:
    ci = CustomerInput(**row)
    df = build_feature_vector(ci)
    scaled = scaler.transform(df)
    prob = float(model.predict_proba(scaled)[0][1])
    if prob >= 0.70:
        tier = "High"
    elif prob >= 0.40:
        tier = "Medium"
    else:
        tier = "Low"
    return {"churn_probability": round(prob, 4), "risk_tier": tier}


def tier_color(tier: str) -> str:
    return {"High": "#f43f5e", "Medium": "#f59e0b", "Low": "#10b981"}.get(tier, "#6366f1")


# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "model": type(model).__name__}


@app.post("/predict", response_model=PredictionResponse)
def predict(customer: CustomerInput):
    try:
        df = build_feature_vector(customer)
        scaled = scaler.transform(df)
        prob = float(model.predict_proba(scaled)[0][1])

        if hasattr(model, "coef_"):
            raw_contribs = (model.coef_[0] * scaled[0]).tolist()
        elif hasattr(model, "feature_importances_"):
            raw_contribs = model.feature_importances_.tolist()
        else:
            raw_contribs = [0.0] * len(FEATURE_NAMES)

        if prob >= 0.70:
            risk_tier, risk_color = "High", "#f43f5e"
        elif prob >= 0.40:
            risk_tier, risk_color = "Medium", "#f59e0b"
        else:
            risk_tier, risk_color = "Low", "#10b981"

        contributions = sorted(
            [
                FeatureContribution(
                    feature=feat,
                    label=FEATURE_LABELS.get(feat, feat),
                    contribution=round(float(c), 5),
                    direction="increases_risk" if c > 0 else "decreases_risk",
                )
                for feat, c in zip(FEATURE_NAMES, raw_contribs)
            ],
            key=lambda x: abs(x.contribution),
            reverse=True,
        )
        return PredictionResponse(
            churn_probability=round(prob, 4),
            risk_tier=risk_tier,
            risk_color=risk_color,
            feature_contributions=contributions[:10],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/analytics")
def analytics():
    df = customer_df.copy()

    tier_counts = df["RiskTier"].value_counts().reindex(["High", "Medium", "Low"], fill_value=0)
    tier_mean_prob = df.groupby("RiskTier", observed=False)["ChurnProbability"].mean().reindex(["High", "Medium", "Low"])

    risk_tiers = [
        {
            "tier": t,
            "count": int(tier_counts[t]),
            "mean_probability": round(float(tier_mean_prob[t]), 4),
            "revenue_at_risk": int(tier_counts[t] * float(tier_mean_prob[t]) * 300),
            "color": tier_color(t),
        }
        for t in ["High", "Medium", "Low"]
    ]

    rfm_profile = (
        df.groupby("RiskTier", observed=False)[["Recency", "Frequency", "Monetary", "AvgOrderValue"]]
        .mean()
        .round(2)
        .reindex(["High", "Medium", "Low"])
    )
    rfm_by_tier = [
        {
            "tier": t,
            "Recency": float(rfm_profile.loc[t, "Recency"]) if t in rfm_profile.index else 0,
            "Frequency": float(rfm_profile.loc[t, "Frequency"]) if t in rfm_profile.index else 0,
            "Monetary": float(rfm_profile.loc[t, "Monetary"]) if t in rfm_profile.index else 0,
            "AvgOrderValue": float(rfm_profile.loc[t, "AvgOrderValue"]) if t in rfm_profile.index else 0,
        }
        for t in ["High", "Medium", "Low"]
    ]

    country_counts = (
        df.groupby(["Country", "RiskTier"], observed=False)
        .size()
        .unstack(fill_value=0)
        .reindex(columns=["High", "Medium", "Low"], fill_value=0)
    )
    top_countries = country_counts.sum(axis=1).nlargest(8).index
    country_distribution = [
        {
            "country": c,
            "High": int(country_counts.loc[c, "High"]),
            "Medium": int(country_counts.loc[c, "Medium"]),
            "Low": int(country_counts.loc[c, "Low"]),
            "total": int(country_counts.loc[c].sum()),
        }
        for c in top_countries
    ]

    bins = np.arange(0, 1.1, 0.1)
    labels = [f"{int(b*100)}-{int((b+0.1)*100)}%" for b in bins[:-1]]
    hist_counts, _ = np.histogram(df["ChurnProbability"], bins=bins)
    prob_histogram = [{"bin": lbl, "count": int(c)} for lbl, c in zip(labels, hist_counts)]

    return {
        "total_customers": len(df),
        "overall_churn_rate": round(float(df["ActualChurn"].mean()), 4),
        "avg_churn_probability": round(float(df["ChurnProbability"].mean()), 4),
        "total_revenue_at_risk": int(df["ChurnProbability"].sum() * 300),
        "risk_tiers": risk_tiers,
        "rfm_by_tier": rfm_by_tier,
        "country_distribution": country_distribution,
        "prob_histogram": prob_histogram,
    }


@app.get("/customers")
def customers(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    tier: str = Query(None),
    country: str = Query(None),
    search: str = Query(None),
    sort_by: str = Query("ChurnProbability"),
    sort_dir: str = Query("desc"),
):
    df = customer_df.copy()

    if tier and tier != "All":
        df = df[df["RiskTier"] == tier]
    if country and country != "All":
        df = df[df["Country"] == country]
    if search:
        df = df[df["CustomerID"].astype(str).str.contains(search)]

    valid_sort = ["ChurnProbability", "Recency", "Frequency", "Monetary", "AvgOrderValue", "Tenure"]
    if sort_by not in valid_sort:
        sort_by = "ChurnProbability"
    df = df.sort_values(sort_by, ascending=(sort_dir == "asc"))

    total = len(df)
    start = (page - 1) * limit
    page_df = df.iloc[start : start + limit]

    records = []
    for _, row in page_df.iterrows():
        records.append({
            "customer_id": int(row["CustomerID"]),
            "churn_probability": round(float(row["ChurnProbability"]), 4),
            "risk_tier": str(row["RiskTier"]),
            "actual_churn": int(row["ActualChurn"]),
            "recency": round(float(row["Recency"]), 1) if pd.notna(row["Recency"]) else None,
            "frequency": round(float(row["Frequency"]), 1) if pd.notna(row["Frequency"]) else None,
            "monetary": round(float(row["Monetary"]), 2) if pd.notna(row["Monetary"]) else None,
            "avg_order_value": round(float(row["AvgOrderValue"]), 2) if pd.notna(row["AvgOrderValue"]) else None,
            "tenure": round(float(row["Tenure"]), 1) if pd.notna(row["Tenure"]) else None,
            "country": str(row["Country"]) if pd.notna(row["Country"]) else "Unknown",
        })

    all_countries = sorted(customer_df["Country"].dropna().unique().tolist())

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "pages": max(1, -(-total // limit)),
        "countries": all_countries,
        "customers": records,
    }


@app.post("/batch-predict")
async def batch_predict(file: UploadFile = File(...)):
    try:
        content = await file.read()
        df = pd.read_csv(io.BytesIO(content))

        required = ["frequency", "monetary", "num_items", "num_products",
                    "tenure", "avg_order_value", "revenue_per_month"]
        missing = [c for c in required if c not in df.columns]
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Missing columns: {', '.join(missing)}",
            )

        df = df.fillna({
            "purchase_trend": 0, "return_rate": 0, "country": "United Kingdom"
        })

        results = []
        for _, row in df.iterrows():
            try:
                scored = score_row({
                    "frequency": float(row["frequency"]),
                    "monetary": float(row["monetary"]),
                    "num_items": float(row["num_items"]),
                    "num_products": float(row["num_products"]),
                    "tenure": float(row.get("tenure", 1)),
                    "avg_order_value": float(row["avg_order_value"]),
                    "revenue_per_month": float(row["revenue_per_month"]),
                    "purchase_trend": float(row.get("purchase_trend", 0)),
                    "return_rate": float(row.get("return_rate", 0)),
                    "country": str(row.get("country", "United Kingdom")),
                })
                record = row.to_dict()
                record.update(scored)
                results.append(record)
            except Exception as e:
                record = row.to_dict()
                record.update({"churn_probability": None, "risk_tier": "Error", "error": str(e)})
                results.append(record)

        tier_summary = pd.DataFrame(results)["risk_tier"].value_counts().to_dict()

        return {
            "total_rows": len(results),
            "tier_summary": tier_summary,
            "results": results,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── AI endpoints ─────────────────────────────────────────────────────────────

import re as _re

# ── Keyword sets for query routing ─────────────────────────────────────────────
_KW_URGENT    = {"immediate","urgent","action","priority","contact","reach","intervene","call","email","first","now","today"}
_KW_REVENUE   = {"revenue","money","financial","value","spend","worth","income","turnover","sales","profit","loss","risk"}
_KW_INACTIVE  = {"inactive","inactiv","dormant","silent","lapsed","not purchased","haven't purchased","haven't bought","no purchase"}
_KW_VALUABLE  = {"valuable","best","biggest","largest","top spend","highest spend","vip","premium","most important"}
_KW_COMPARE   = {"compare","versus","vs","difference","between","contrast","against"}
_KW_MODEL     = {"model","accuracy","f1","roc","auc","recall","precision","performance","metrics","score","how good","how accurate"}
_KW_RETENTION = {"retain","retention","save","recover","win back","winback","prevent","stop","reduce churn","action plan","strategy","recommend"}
_KW_COUNTRY   = {"uk","united kingdom","germany","france","spain","belgium","switzerland","portugal","norway","finland","netherlands","sweden","australia"}


def _query_context(messages: list) -> str:
    """Route each manager question to the right live data slice."""
    last_raw = next((m.content for m in reversed(messages) if m.role == "user"), "")
    last = last_raw.lower()
    words = set(_re.split(r"\W+", last))
    parts: list[str] = []

    # ── 1. Customer ID lookup ──────────────────────────────────────────────────
    ids_found = _re.findall(r"\b1[0-9]{4}\b", last)
    for cid_str in ids_found[:5]:
        cid = int(cid_str)
        rows = customer_df[customer_df["CustomerID"] == cid]
        if not rows.empty:
            r = rows.iloc[0]
            rb = rfm_base[rfm_base["CustomerID"] == cid]
            num_items = int(rb.iloc[0]["NumItems"]) if not rb.empty else "N/A"
            num_prods = int(rb.iloc[0]["NumProducts"]) if not rb.empty else "N/A"
            parts.append(
                f"EXACT PROFILE — Customer {cid}:\n"
                f"  ChurnProbability={r['ChurnProbability']:.1%} | RiskTier={r['RiskTier']} | "
                f"ActualChurn={'Yes' if r['ActualChurn'] else 'No'}\n"
                f"  Recency={r['Recency']:.0f}d | Frequency={r['Frequency']:.0f} orders | "
                f"Monetary=£{r['Monetary']:,.0f} | AvgOrderValue=£{r['AvgOrderValue']:,.0f}\n"
                f"  Tenure={r['Tenure']:.0f}d | Country={r['Country']} | "
                f"NumItems={num_items} | NumProducts={num_prods}"
            )
        else:
            parts.append(f"Customer {cid} is NOT in the scored test set (868 customers).")

    # ── 2. Immediate action / top-priority customers ───────────────────────────
    if _KW_URGENT & words or any(k in last for k in ["immediate action","need action","who needs","should i call","should i contact","needs attention","needs action"]):
        top10 = (
            customer_df[customer_df["RiskTier"] == "High"]
            .sort_values("ChurnProbability", ascending=False)
            .head(10)
        )
        parts.append(f"TOP 10 PRIORITY CUSTOMERS (High risk, sorted by churn probability):")
        for rank, (_, row) in enumerate(top10.iterrows(), 1):
            parts.append(
                f"  #{rank} ID:{int(row['CustomerID'])} | prob:{row['ChurnProbability']:.1%} | "
                f"recency:{row['Recency']:.0f}d | freq:{row['Frequency']:.0f} orders | "
                f"mon:£{row['Monetary']:,.0f} | aov:£{row['AvgOrderValue']:,.0f} | "
                f"tenure:{row['Tenure']:.0f}d | country:{row['Country']}"
            )

    # ── 3. Revenue / financial impact ─────────────────────────────────────────
    if _KW_REVENUE & words or "revenue at risk" in last or "financial" in last:
        high = customer_df[customer_df["RiskTier"] == "High"]
        med  = customer_df[customer_df["RiskTier"] == "Medium"]
        low  = customer_df[customer_df["RiskTier"] == "Low"]
        total = customer_df["Monetary"].sum()
        rar_h = high["Monetary"].sum()
        rar_m = med["Monetary"].sum()
        parts.append(
            f"REVENUE ANALYSIS:\n"
            f"  Total portfolio revenue (868 customers): £{total:,.0f}\n"
            f"  High-risk revenue at risk: £{rar_h:,.0f} ({rar_h/total:.1%} of portfolio) across {len(high)} customers\n"
            f"  Medium-risk revenue at risk: £{rar_m:,.0f} ({rar_m/total:.1%} of portfolio) across {len(med)} customers\n"
            f"  Safe Low-risk revenue: £{low['Monetary'].sum():,.0f} ({low['Monetary'].sum()/total:.1%}) across {len(low)} customers\n"
            f"  If all High-risk customers churn: estimated loss £{rar_h:,.0f}\n"
            f"  Avg revenue per High-risk customer: £{high['Monetary'].mean():,.0f}\n"
            f"  Avg revenue per Low-risk customer: £{low['Monetary'].mean():,.0f}"
        )
        top5_val = high.sort_values("Monetary", ascending=False).head(5)
        parts.append("  Top 5 most valuable High-risk customers:")
        for rank, (_, row) in enumerate(top5_val.iterrows(), 1):
            parts.append(f"    #{rank} ID:{int(row['CustomerID'])} mon:£{row['Monetary']:,.0f} prob:{row['ChurnProbability']:.1%} country:{row['Country']}")

    # ── 4. Inactive / dormant customers ───────────────────────────────────────
    if _KW_INACTIVE & words or any(k in last for k in ["haven't","not purchased","no purchase","days since","inactive","dormant","lapsed"]):
        # Try to extract a threshold
        threshold_match = _re.search(r"(\d+)\s*days?", last)
        threshold = int(threshold_match.group(1)) if threshold_match else 60
        sub = customer_df[customer_df["Recency"] > threshold].sort_values("Monetary", ascending=False)
        high_inactive = sub[sub["RiskTier"] == "High"]
        parts.append(
            f"INACTIVE CUSTOMERS (recency >{threshold} days): {len(sub)} total | {len(high_inactive)} are High-risk"
        )
        for _, row in high_inactive.head(8).iterrows():
            parts.append(
                f"  ID:{int(row['CustomerID'])} recency:{row['Recency']:.0f}d | "
                f"mon:£{row['Monetary']:,.0f} | prob:{row['ChurnProbability']:.1%} | country:{row['Country']}"
            )

    # ── 5. Most valuable at-risk customers ────────────────────────────────────
    if _KW_VALUABLE & words or any(k in last for k in ["most valuable","highest value","biggest spender","vip","most important"]):
        top = customer_df[customer_df["RiskTier"] == "High"].sort_values("Monetary", ascending=False).head(10)
        parts.append("TOP 10 MOST VALUABLE HIGH-RISK CUSTOMERS:")
        for rank, (_, row) in enumerate(top.iterrows(), 1):
            parts.append(
                f"  #{rank} ID:{int(row['CustomerID'])} | mon:£{row['Monetary']:,.0f} | "
                f"prob:{row['ChurnProbability']:.1%} | freq:{row['Frequency']:.0f} orders | "
                f"recency:{row['Recency']:.0f}d | country:{row['Country']}"
            )

    # ── 6. Country-specific analysis ──────────────────────────────────────────
    country_map = {
        "uk": "United Kingdom", "united kingdom": "United Kingdom",
        "germany": "Germany", "france": "France", "spain": "Spain",
        "belgium": "Belgium", "switzerland": "Switzerland",
        "portugal": "Portugal", "norway": "Norway", "finland": "Finland",
        "netherlands": "Netherlands", "sweden": "Sweden", "australia": "Australia",
        "usa": "USA", "usa": "USA",
    }
    for kw, canonical in country_map.items():
        if kw in last:
            sub_full = rfm_base[rfm_base["Country"] == canonical]
            sub_test = customer_df[customer_df["Country"] == canonical]
            if not sub_full.empty:
                parts.append(
                    f"COUNTRY: {canonical} — Full dataset: {len(sub_full)} customers | "
                    f"churn rate {sub_full['Churned'].mean():.1%} ({int(sub_full['Churned'].sum())} churned)"
                )
            if not sub_test.empty:
                h = sub_test[sub_test["RiskTier"] == "High"]
                parts.append(
                    f"  Test set: {len(sub_test)} scored | High-risk: {len(h)} | "
                    f"avg prob {sub_test['ChurnProbability'].mean():.1%} | "
                    f"total revenue £{sub_test['Monetary'].sum():,.0f}"
                )
                for _, row in h.sort_values("ChurnProbability", ascending=False).head(5).iterrows():
                    parts.append(f"    ID:{int(row['CustomerID'])} prob:{row['ChurnProbability']:.1%} mon:£{row['Monetary']:,.0f}")
            break

    # ── 7. Tier comparison ────────────────────────────────────────────────────
    if _KW_COMPARE & words or "compare" in last:
        tiers = {}
        for t in ["High", "Medium", "Low"]:
            s = customer_df[customer_df["RiskTier"] == t]
            tiers[t] = s
        parts.append("TIER COMPARISON:")
        for t, s in tiers.items():
            parts.append(
                f"  {t}: {len(s)} customers | avg_prob:{s['ChurnProbability'].mean():.1%} | "
                f"actual_churn:{s['ActualChurn'].mean():.1%} | avg_monetary:£{s['Monetary'].mean():,.0f} | "
                f"avg_recency:{s['Recency'].mean():.0f}d | avg_freq:{s['Frequency'].mean():.1f} orders | "
                f"avg_tenure:{s['Tenure'].mean():.0f}d"
            )

    # ── 8. Model performance ──────────────────────────────────────────────────
    if _KW_MODEL & words or any(k in last for k in ["how accurate","model performance","confusion","roc curve","how well"]):
        parts.append(
            "MODEL PERFORMANCE (Logistic Regression on 868-customer test set):\n"
            "  F1-Score:  0.6752\n"
            "  Recall:    0.8172  (catches 82% of actual churners — very important for proactive outreach)\n"
            "  ROC-AUC:   0.8129  (strong separation between churners and non-churners)\n"
            "  Precision: 0.5510  (55% of flagged customers do actually churn)\n"
            "  Accuracy:  ~75%\n"
            "  Test set churn rate: 33.4%  (290 actual churners out of 868)\n"
            "  High Recall means very few real churners are missed (low false-negative rate)."
        )

    # ── 9. Retention / strategy questions ─────────────────────────────────────
    if _KW_RETENTION & words or any(k in last for k in ["how to retain","retention plan","win back","win-back","save customer","prevent churn"]):
        high = customer_df[customer_df["RiskTier"] == "High"]
        med  = customer_df[customer_df["RiskTier"] == "Medium"]
        parts.append(
            "RETENTION CONTEXT:\n"
            f"  196 High-risk customers — immediate outreach recommended (prob ≥70%)\n"
            f"  289 Medium-risk customers — proactive nurturing recommended (40–70%)\n"
            f"  Revenue at risk if High-risk churns: £{high['Monetary'].sum():,.0f}\n"
            f"  Revenue at risk if Medium-risk churns: £{med['Monetary'].sum():,.0f}\n"
            "  Typical retention levers: personalised discount, re-engagement email, \n"
            "    loyalty points, dedicated account manager, product recommendation."
        )

    # ── 10. Full list for a specific tier ─────────────────────────────────────
    if any(k in last for k in ["list all high","all high risk","show all high","every high"]):
        high_all = customer_df[customer_df["RiskTier"] == "High"].sort_values("ChurnProbability", ascending=False)
        parts.append(f"ALL {len(high_all)} HIGH-RISK CUSTOMERS (sorted by probability):")
        for _, row in high_all.iterrows():
            parts.append(f"  ID:{int(row['CustomerID'])} prob:{row['ChurnProbability']:.1%} mon:£{row['Monetary']:,.0f} recency:{row['Recency']:.0f}d country:{row['Country']}")

    if any(k in last for k in ["list all medium","all medium risk","show all medium"]):
        med_all = customer_df[customer_df["RiskTier"] == "Medium"].sort_values("ChurnProbability", ascending=False)
        parts.append(f"ALL {len(med_all)} MEDIUM-RISK CUSTOMERS (sorted by probability):")
        for _, row in med_all.iterrows():
            parts.append(f"  ID:{int(row['CustomerID'])} prob:{row['ChurnProbability']:.1%} mon:£{row['Monetary']:,.0f} recency:{row['Recency']:.0f}d country:{row['Country']}")

    return "\n".join(parts) if parts else ""


CHAT_SYSTEM_PROMPT_TEMPLATE = """You are an expert Retail Manager's AI Assistant embedded in the Retail Churn Predictor IDSS. You act as a knowledgeable business analyst who has full access to the company's customer data and churn predictions. Think and respond like a senior retail analyst briefing an executive.

SCOPE: Answer any question a retail manager might ask about customers, churn, revenue, segments, retention strategy, or model performance. If asked something completely unrelated (cooking, coding, general knowledge), politely redirect.

BUSINESS CONTEXT:
- Dataset: UCI Online Retail (2010-2011), 4,338 UK-based wholesale customers
- Model: Logistic Regression | F1=0.6752 | Recall=0.8172 | ROC-AUC=0.8129 | Precision=0.551
- Churn definition: no purchase in the last 90 days of the observation period
- Risk tiers: Low <40% | Medium 40–70% | High ≥70% churn probability
- You have scored 868 test-set customers with full profiles and churn probabilities

WHAT YOU CAN ANSWER:
- "Who needs immediate action?" → top high-risk customers by probability
- "What is our revenue at risk?" → exact £ figures from data
- "Show me inactive customers" → recency-filtered lists
- "Which country is worst performing?" → country churn breakdown
- "Who are our most valuable at-risk customers?" → high monetary + high risk
- "Compare the tiers" → side-by-side RFM profiles
- "Tell me about customer [ID]" → full exact profile
- "What retention strategy should I use?" → tailored recommendation
- "How accurate is the model?" → F1, Recall, ROC-AUC explained
- "List all high-risk customers" → full ranked list
- "What's our total revenue?" → portfolio financial summary

=== LIVE DATA — extracted directly from your project files at startup ===
{rag_context}
{query_context}
=== END LIVE DATA ===

STRICT DATA RULES:
1. NEVER invent, approximate, or say "typically" — only cite exact numbers from the data above.
2. NEVER say "not specified" — every customer in the test set has Recency, Frequency, Monetary, AOV, Tenure, Country. Look them up in the TOP HIGH-RISK list above.
3. For "immediate action" / "who to contact" → always cite the exact #1–10 from the priority list above.
4. When quoting a customer profile, copy all 6 fields: Recency, Frequency, Monetary, AvgOrderValue, Tenure, Country.
5. If a customer ID is not in the test set, say so clearly — do not guess their profile.

FORMAT: Use bullet points, bold key numbers, and clear headings. Keep answers concise but complete. Use British English (£ for currency, "colour" not "color", etc.)."""


class ExplainRequest(BaseModel):
    customer: CustomerInput
    prediction: dict


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


@app.post("/explain")
def explain(req: ExplainRequest):
    try:
        c = req.customer
        p = req.prediction
        prob_pct = round(p.get("churn_probability", 0) * 100, 1)
        tier = p.get("risk_tier", "Unknown")

        contribs = p.get("feature_contributions", [])
        top_contribs = contribs[:5]
        contrib_lines = "\n".join(
            f"  - {fc['label']}: {'+' if fc['contribution'] > 0 else ''}{fc['contribution']:.4f} "
            f"({'increases' if fc['direction'] == 'increases_risk' else 'decreases'} churn risk)"
            for fc in top_contribs
        )

        prompt = f"""You are an XAI (Explainable AI) engine for a Retail Customer Churn Prediction System.

A Logistic Regression model has analysed a customer from the UCI Online Retail dataset (2010-2011, UK-based wholesale customers) and predicted:
- Churn Probability: {prob_pct}% ({tier} Risk)
- The model achieved F1=0.675, ROC-AUC=0.813, Recall=0.817.
- Churn means no purchases in the last 90 days of the dataset period.

Customer Profile:
- Purchase Frequency: {c.frequency} orders
- Total Spend: £{c.monetary}
- Items Ordered: {c.num_items}
- Unique Products: {c.num_products}
- Customer Tenure: {c.tenure} days
- Avg Order Value: £{c.avg_order_value}
- Revenue/Month: £{c.revenue_per_month}
- Purchase Trend: {c.purchase_trend}
- Return Rate: {c.return_rate * 100:.0f}%
- Country: {c.country}

Top Feature Contributions (positive = increases churn risk, negative = decreases risk):
{contrib_lines}

Provide a clear, business-focused XAI report for a retail manager using EXACTLY these four section headings (each preceded by ###):

### Why This Score
Explain in plain English why this customer received this churn probability. Reference 2-3 specific data points from their profile.

### Key Risk Drivers
Explain the top 3 features driving this prediction. For each: name it in business terms, say whether it increases or decreases risk, and why it matters for retention.

### What This Means for the Business
Assess this customer's value and the business impact of losing them. Estimate risk in concrete terms.

### Recommended Actions
Give exactly 3 specific, personalised retention actions for this customer based on their profile. Be concrete and practical.

Keep language clear, professional, and actionable. Avoid mathematical jargon. Use British English."""

        response = ai_client.models.generate_content(
            model=_AI_MODEL,
            contents=prompt,
            config=genai_types.GenerateContentConfig(max_output_tokens=8192),
        )
        return {"explanation": response.text or ""}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Manager assistant REST endpoints ─────────────────────────────────────────

@app.get("/manager/summary")
def manager_summary():
    """Full portfolio executive summary."""
    high = customer_df[customer_df["RiskTier"] == "High"]
    med  = customer_df[customer_df["RiskTier"] == "Medium"]
    low  = customer_df[customer_df["RiskTier"] == "Low"]
    total_rev = customer_df["Monetary"].sum()
    return {
        "total_customers": len(customer_df),
        "churn_rate": round(customer_df["ActualChurn"].mean(), 4),
        "actual_churned": int(customer_df["ActualChurn"].sum()),
        "tiers": {
            "High":   {"count": len(high), "avg_probability": round(high["ChurnProbability"].mean(), 4), "actual_churn_rate": round(high["ActualChurn"].mean(), 4), "total_revenue": round(high["Monetary"].sum(), 2)},
            "Medium": {"count": len(med),  "avg_probability": round(med["ChurnProbability"].mean(), 4),  "actual_churn_rate": round(med["ActualChurn"].mean(), 4),  "total_revenue": round(med["Monetary"].sum(), 2)},
            "Low":    {"count": len(low),  "avg_probability": round(low["ChurnProbability"].mean(), 4),  "actual_churn_rate": round(low["ActualChurn"].mean(), 4),  "total_revenue": round(low["Monetary"].sum(), 2)},
        },
        "revenue": {
            "total_portfolio": round(total_rev, 2),
            "at_risk_high": round(high["Monetary"].sum(), 2),
            "at_risk_medium": round(med["Monetary"].sum(), 2),
            "safe_low": round(low["Monetary"].sum(), 2),
            "pct_at_risk_high": round(high["Monetary"].sum() / total_rev, 4),
        },
        "model": {"f1": 0.6752, "recall": 0.8172, "roc_auc": 0.8129, "precision": 0.551},
        "dataset": {"total_full": len(rfm_base), "scored_test": len(customer_df)},
    }


@app.get("/manager/top-risk")
def manager_top_risk(n: int = Query(20, ge=1, le=196), format: str = Query("json")):
    """Top N high-risk customers sorted by churn probability. format=json or csv."""
    top = (
        customer_df[customer_df["RiskTier"] == "High"]
        .sort_values("ChurnProbability", ascending=False)
        .head(n)
    )
    rows = [
        {
            "rank": i + 1,
            "customer_id": int(r["CustomerID"]),
            "churn_probability": round(r["ChurnProbability"], 4),
            "actual_churn": bool(r["ActualChurn"]),
            "recency_days": round(r["Recency"], 1),
            "frequency": round(r["Frequency"], 0),
            "monetary": round(r["Monetary"], 2),
            "avg_order_value": round(r["AvgOrderValue"], 2),
            "tenure_days": round(r["Tenure"], 1),
            "country": r["Country"],
        }
        for i, (_, r) in enumerate(top.iterrows())
    ]
    if format == "csv":
        import csv, io as _io
        buf = _io.StringIO()
        if rows:
            w = csv.DictWriter(buf, fieldnames=rows[0].keys())
            w.writeheader(); w.writerows(rows)
        from fastapi.responses import Response
        return Response(content=buf.getvalue(), media_type="text/csv",
                        headers={"Content-Disposition": "attachment; filename=top_risk_customers.csv"})
    return {"count": len(rows), "customers": rows}


@app.get("/manager/revenue-at-risk")
def manager_revenue_at_risk():
    """Revenue at risk breakdown and financial impact analysis."""
    high = customer_df[customer_df["RiskTier"] == "High"]
    med  = customer_df[customer_df["RiskTier"] == "Medium"]
    total = customer_df["Monetary"].sum()
    top_valuable = high.sort_values("Monetary", ascending=False).head(10)
    return {
        "total_portfolio_revenue": round(total, 2),
        "high_risk": {
            "customers": len(high),
            "revenue_at_risk": round(high["Monetary"].sum(), 2),
            "pct_of_portfolio": round(high["Monetary"].sum() / total, 4),
            "avg_revenue_per_customer": round(high["Monetary"].mean(), 2),
        },
        "medium_risk": {
            "customers": len(med),
            "revenue_at_risk": round(med["Monetary"].sum(), 2),
            "pct_of_portfolio": round(med["Monetary"].sum() / total, 4),
            "avg_revenue_per_customer": round(med["Monetary"].mean(), 2),
        },
        "top_10_most_valuable_at_high_risk": [
            {
                "customer_id": int(r["CustomerID"]),
                "monetary": round(r["Monetary"], 2),
                "churn_probability": round(r["ChurnProbability"], 4),
                "recency_days": round(r["Recency"], 1),
                "country": r["Country"],
            }
            for _, r in top_valuable.iterrows()
        ],
    }


@app.get("/manager/country-analysis")
def manager_country_analysis():
    """Country-by-country churn and revenue breakdown."""
    result = []
    ctry = (
        customer_df.groupby("Country")
        .agg(
            customers=("CustomerID", "count"),
            actual_churned=("ActualChurn", "sum"),
            churn_rate=("ActualChurn", "mean"),
            avg_probability=("ChurnProbability", "mean"),
            high_risk_count=("RiskTier", lambda x: (x == "High").sum()),
            total_revenue=("Monetary", "sum"),
            avg_revenue=("Monetary", "mean"),
        )
        .sort_values("customers", ascending=False)
        .reset_index()
    )
    full_ctry = (
        rfm_base.groupby("Country")
        .agg(full_customers=("CustomerID", "count"), full_churn_rate=("Churned", "mean"))
        .reset_index()
    )
    merged = ctry.merge(full_ctry, on="Country", how="left")
    for _, row in merged.iterrows():
        result.append({
            "country": row["Country"],
            "test_set_customers": int(row["customers"]),
            "actual_churned": int(row["actual_churned"]),
            "churn_rate": round(row["churn_rate"], 4),
            "avg_predicted_probability": round(row["avg_probability"], 4),
            "high_risk_customers": int(row["high_risk_count"]),
            "total_revenue": round(row["total_revenue"], 2),
            "avg_revenue_per_customer": round(row["avg_revenue"], 2),
            "full_dataset_customers": int(row["full_customers"]) if pd.notna(row.get("full_customers")) else None,
            "full_dataset_churn_rate": round(row["full_churn_rate"], 4) if pd.notna(row.get("full_churn_rate")) else None,
        })
    return {"countries": result}


@app.get("/manager/customer/{customer_id}")
def manager_customer_profile(customer_id: int):
    """Full profile for a single customer (test set)."""
    row = customer_df[customer_df["CustomerID"] == customer_id]
    if row.empty:
        raise HTTPException(status_code=404, detail=f"Customer {customer_id} not found in scored test set.")
    r = row.iloc[0]
    rb = rfm_base[rfm_base["CustomerID"] == customer_id]
    full = rb.iloc[0].to_dict() if not rb.empty else {}
    return {
        "customer_id": customer_id,
        "prediction": {
            "churn_probability": round(r["ChurnProbability"], 4),
            "risk_tier": r["RiskTier"],
            "actual_churn": bool(r["ActualChurn"]),
        },
        "profile": {
            "recency_days": round(r["Recency"], 1),
            "frequency": round(r["Frequency"], 0),
            "monetary": round(r["Monetary"], 2),
            "avg_order_value": round(r["AvgOrderValue"], 2),
            "tenure_days": round(r["Tenure"], 1),
            "country": r["Country"],
            "num_items": int(full.get("NumItems", 0)) if full else None,
            "num_products": int(full.get("NumProducts", 0)) if full else None,
        },
    }


@app.get("/manager/segment/{tier}")
def manager_segment(tier: str, sort_by: str = Query("probability", enum=["probability", "monetary", "recency"]), limit: int = Query(50, ge=1, le=300)):
    """All customers in a risk tier with sorting options."""
    tier = tier.capitalize()
    if tier not in ("High", "Medium", "Low"):
        raise HTTPException(status_code=400, detail="tier must be High, Medium, or Low")
    sub = customer_df[customer_df["RiskTier"] == tier].copy()
    sort_col = {"probability": "ChurnProbability", "monetary": "Monetary", "recency": "Recency"}[sort_by]
    asc = sort_by == "recency"
    sub = sub.sort_values(sort_col, ascending=asc).head(limit)
    customers = [
        {
            "customer_id": int(r["CustomerID"]),
            "churn_probability": round(r["ChurnProbability"], 4),
            "actual_churn": bool(r["ActualChurn"]),
            "recency_days": round(r["Recency"], 1),
            "frequency": round(r["Frequency"], 0),
            "monetary": round(r["Monetary"], 2),
            "avg_order_value": round(r["AvgOrderValue"], 2),
            "tenure_days": round(r["Tenure"], 1),
            "country": r["Country"],
        }
        for _, r in sub.iterrows()
    ]
    full_tier = customer_df[customer_df["RiskTier"] == tier]
    return {
        "tier": tier,
        "total_in_tier": len(full_tier),
        "returned": len(customers),
        "stats": {
            "avg_probability": round(full_tier["ChurnProbability"].mean(), 4),
            "actual_churn_rate": round(full_tier["ActualChurn"].mean(), 4),
            "avg_monetary": round(full_tier["Monetary"].mean(), 2),
            "total_revenue": round(full_tier["Monetary"].sum(), 2),
            "avg_recency_days": round(full_tier["Recency"].mean(), 1),
        },
        "customers": customers,
    }


@app.get("/manager/inactive")
def manager_inactive(recency_threshold: int = Query(60, ge=1), tier: Optional[str] = Query(None)):
    """Customers who haven't purchased in N days (default 60), optionally filtered by tier."""
    sub = customer_df[customer_df["Recency"] > recency_threshold].copy()
    if tier:
        sub = sub[sub["RiskTier"] == tier.capitalize()]
    sub = sub.sort_values("Monetary", ascending=False)
    return {
        "recency_threshold_days": recency_threshold,
        "tier_filter": tier,
        "total_inactive": len(sub),
        "revenue_at_risk": round(sub["Monetary"].sum(), 2),
        "customers": [
            {
                "customer_id": int(r["CustomerID"]),
                "recency_days": round(r["Recency"], 1),
                "risk_tier": r["RiskTier"],
                "churn_probability": round(r["ChurnProbability"], 4),
                "monetary": round(r["Monetary"], 2),
                "country": r["Country"],
            }
            for _, r in sub.head(50).iterrows()
        ],
    }


@app.get("/manager/high-value-at-risk")
def manager_high_value_at_risk(monetary_threshold: float = Query(500.0), top_n: int = Query(20)):
    """High-risk customers who are also high-value (monetary > threshold)."""
    sub = customer_df[
        (customer_df["RiskTier"] == "High") &
        (customer_df["Monetary"] >= monetary_threshold)
    ].sort_values("Monetary", ascending=False).head(top_n)
    return {
        "monetary_threshold": monetary_threshold,
        "count": len(sub),
        "total_revenue_at_risk": round(sub["Monetary"].sum(), 2),
        "customers": [
            {
                "customer_id": int(r["CustomerID"]),
                "monetary": round(r["Monetary"], 2),
                "churn_probability": round(r["ChurnProbability"], 4),
                "recency_days": round(r["Recency"], 1),
                "frequency": round(r["Frequency"], 0),
                "avg_order_value": round(r["AvgOrderValue"], 2),
                "country": r["Country"],
            }
            for _, r in sub.iterrows()
        ],
    }


@app.get("/manager/retention-priorities")
def manager_retention_priorities(top_n: int = Query(20)):
    """Smart retention priority list: score = churn_prob × monetary (ROI-weighted)."""
    df = customer_df[customer_df["RiskTier"] == "High"].copy()
    df["priority_score"] = df["ChurnProbability"] * df["Monetary"]
    df = df.sort_values("priority_score", ascending=False).head(top_n)
    return {
        "description": "Customers ranked by expected revenue loss (churn_probability × monetary spend)",
        "count": len(df),
        "customers": [
            {
                "rank": i + 1,
                "customer_id": int(r["CustomerID"]),
                "priority_score": round(r["priority_score"], 2),
                "churn_probability": round(r["ChurnProbability"], 4),
                "monetary": round(r["Monetary"], 2),
                "expected_loss": round(r["ChurnProbability"] * r["Monetary"], 2),
                "recency_days": round(r["Recency"], 1),
                "country": r["Country"],
            }
            for i, (_, r) in enumerate(df.iterrows())
        ],
    }


@app.post("/chat")
def chat(req: ChatRequest):
    try:
        query_ctx = _query_context(req.messages)
        system_prompt = CHAT_SYSTEM_PROMPT_TEMPLATE.format(
            rag_context=RAG_CONTEXT,
            query_context=f"\n=== CUSTOMER LOOKUP ===\n{query_ctx}" if query_ctx else "",
        )

        contents = []
        for msg in req.messages:
            role = "user" if msg.role == "user" else "model"
            contents.append(
                genai_types.Content(
                    role=role,
                    parts=[genai_types.Part(text=msg.content)],
                )
            )

        response = ai_client.models.generate_content(
            model=_AI_MODEL,
            contents=contents,
            config=genai_types.GenerateContentConfig(
                system_instruction=system_prompt,
                max_output_tokens=8192,
            ),
        )
        return {"response": response.text or ""}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

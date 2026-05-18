# 🛒 Retail Customer Churn Predictor

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A production-grade machine learning system that predicts customer churn probability for a UK-based online gift retailer — enabling targeted retention campaigns before customers are lost.

> **Business context:** Retaining an existing customer costs 5–7× less than acquiring a new one. This system identifies high-risk customers to protect revenue and optimize marketing spend.

---

## 📋 Table of Contents

- [Problem Statement](#problem-statement)
- [Solution Overview](#solution-overview)
- [Key Results](#key-results)
- [Repository Structure](#repository-structure)
- [Quickstart](#quickstart)
- [Pipeline](#pipeline)
- [Feature Engineering](#feature-engineering)
- [Model Performance](#model-performance)
- [Business Outputs](#business-outputs)

---

## Problem Statement

A UK-based non-store online retailer (UCI Online Retail dataset, 541k transactions, 4,338 customers, Dec 2010 – Dec 2011) applies identical post-purchase treatment to all customers, leaving significant retention opportunities unexploited.

**Core question:** Which customers are drifting toward churn *before* it is too late to intervene cost-effectively?

**Churn definition:** No purchase in the 90 days preceding the observation date.

---

## Solution Overview

An end-to-end ML pipeline organized by development phase:

1. **Phase 1: EDA & Problem Definition** — Analysis of transactional data, target distribution, and baseline business patterns.
2. **Phase 2: Feature Engineering** — Transformation of raw transactions into customer-level RFM and behavioral features with skew reduction.
3. **Phase 3: Model Development** — Comparison of four classifiers (Logistic Regression, Random Forest, XGBoost, LightGBM) and hyperparameter tuning.
4. **Phase 4: Explainability & Reporting** — SHAP-based feature interpretation, customer risk segmentation, and executive business reporting.

---

## Key Results

| Metric | Score |
|--------|-------|
| **F1-Score (test set)** | **0.6752** |
| **ROC-AUC** | **0.8129** |
| **Recall** | **0.8172** |

> **Business Logic:** Metric priority is **Recall $\rightarrow$ F1 $\rightarrow$ ROC-AUC**, reflecting that a missed churner (~£300 lost revenue) costs ~100× more than a false positive (~£3 campaign spend).

---

## Repository Structure

```
phase 1/
├── phase1/                 # EDA & Problem Definition
│   ├── notebooks/           # Exploratory analysis
│   ├── outputs/             # Target & feature distributions
│   └── docs/                # Problem statement
├── phase2/                 # Data Preparation
│   ├── notebooks/           # Feature engineering logic
│   └── outputs/             # Transformation plots
├── phase3/                 # Model Development
│   ├── notebooks/           # Training, tuning, and evaluation
│   └── outputs/             # ROC curves, confusion matrices
├── phase4/                 # Explainability & Insights
│   ├── notebooks/           # SHAP analysis & case studies
│   ├── scripts/             # Automated generation scripts
│   └── outputs/             # Business report, risk tiers, SHAP plots
└── shared/                 # Centralized Resources
    ├── data/                # Processed CSVs (X_train, y_test, etc.)
    ├── models/              # Serialized production model (best_model.pkl)
    ├── visualizations/      # All project-wide charts
    └── scripts/            # Utility & verification scripts
```

---

## Quickstart

### 1. Setup
```bash
# Install dependencies
pip install -r requirements.txt
```

### 2. Run Analysis
Navigate to the phase notebooks to reproduce the results:
- **Phase 1:** `phase1/notebooks/phase1_online_retail.ipynb`
- **Phase 2:** `phase2/notebooks/phase2_final.ipynb`
- **Phase 3:** `phase3/notebooks/phase3_modeling.ipynb`
- **Phase 4:** `phase4/notebooks/phase4_explainability.ipynb`

### 3. Generate Business Reports
```bash
cd phase4/scripts
python phase4_generate.py
```

---

## Pipeline

```
Raw Transactions (UCI)
    │
    ▼
Phase 1: EDA                ← Target definition (Recency > 90), basic RFM
    │
    ▼
Phase 2: Feature Eng        ← log1p transforms, OHE Country, Leakage removal
    │
    ▼
Phase 3: Modelling          ← SMOTE, Logistic Regression (Best), RandomizedSearchCV
    │
    ▼
shared/models/best_model.pkl ← Production Artifact
    │
    ▼
Phase 4: Explainability     ← SHAP Values, Risk Tiers, Executive PDF Report
```

---

## Feature Engineering

| Feature | Type | Business Rationale |
|---------|------|-----------|
| `recency` | Numeric | Strongest churn signal (log-scaled) |
| `frequency` | Numeric | Engagement depth; highly correlated with spend |
| `monetary` | Numeric | Total customer value (log-scaled) |
| `avg_order_value` | Numeric | Separates volume shoppers from big-ticket buyers |
| `revenue_per_month`| Numeric | Normalized revenue rate across tenure |
| `purchase_trend` | Numeric | OLS slope of monthly spend (captures declining engagement) |
| `return_rate` | Numeric | Ratio of cancelled invoices; dissatisfaction signal |
| `is_uk` | Binary | Domestic vs international behavior differences |
| `recency_frequency`| Interaction | Captures the RFM "sweet spot" for loyal customers |

---

## Business Outputs

The model produces three primary stakeholder-ready deliverables:

| Output | Consumer | Format | Description |
|--------|----------|--------|-------------|
| **Risk Tier List** | Marketing Manager | CSV | Probability scores $\rightarrow$ High/Med/Low Risk |
| **SHAP Explanations**| Data Scientist | Plots | Individual-level drivers for every prediction |
| **Business Report** | Executive/CFO | PDF | Summary of F1, Recall, and financial impact |

**Risk tiers:**

| Tier | Probability | Recommended action |
|------|-------------|-------------------|
| 🔴 **High** | $\ge 0.70$ | Personalised high-value discount + priority outreach |
| 🟡 **Medium** | $0.40 - 0.69$ | Automated re-engagement email sequence |
| 🟢 **Low** | $< 0.40$ | Standard lifecycle communications |

---

## License

MIT — see [LICENSE](LICENSE).

# Phase 5 — Intelligent Decision Support System (IDSS)

A production-grade B2B SaaS dashboard for customer churn prediction and retention strategy.

## Architecture

```
phase5/
├── backend/          # FastAPI prediction API
│   ├── main.py       # Loads model, serves /predict endpoint
│   └── requirements.txt
├── frontend/         # Next.js 14 App Router dashboard
│   ├── app/          # Pages and global styles
│   └── components/   # InputForm, ResultsCard, FeatureChart
└── README.md
```

## Tech Stack

| Layer     | Technology                                  |
|-----------|---------------------------------------------|
| Frontend  | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Charts    | Recharts                                    |
| Backend   | FastAPI, Uvicorn                            |
| ML Model  | scikit-learn LogisticRegression (best_model.pkl) |

## Running Locally

### Backend (port 8000)
```bash
cd phase5/backend
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### Frontend (port 5000)
```bash
cd phase5/frontend
npm install
npm run dev
```

Open **http://localhost:5000** in your browser.

## API

`POST /predict`

```json
{
  "frequency": 42,
  "monetary": 750,
  "num_items": 380,
  "num_products": 35,
  "tenure": 90,
  "avg_order_value": 19,
  "revenue_per_month": 220,
  "purchase_trend": 0,
  "return_rate": 0,
  "country": "United Kingdom"
}
```

Response includes `churn_probability`, `risk_tier`, and `feature_contributions`.

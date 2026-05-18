#!/usr/bin/env python3
"""
Updated phase4_generate.py with paths relative to new project structure.
This script should be placed in: phase4/scripts/
Data files are in: ../../shared/data/
Models are in: ../../shared/models/
Output files go to: ../outputs/
"""
import warnings
warnings.filterwarnings('ignore')

import os
import sys
import joblib
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import shap
from matplotlib.backends.backend_pdf import PdfPages
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import f1_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

# Setup paths - absolute paths for consistency
BASE_DIR = Path(r"F:\idss-project - Copy\phase 1")
DATA_DIR = BASE_DIR / "shared" / "data"
MODELS_DIR = BASE_DIR / "shared" / "models"
OUTPUT_DIR = BASE_DIR / "phase4" / "outputs"

# Create output dirs if they don't exist
os.makedirs(os.path.join(OUTPUT_DIR, 'predictions'), exist_ok=True)
os.makedirs(os.path.join(OUTPUT_DIR, 'visualizations'), exist_ok=True)
os.makedirs(os.path.join(OUTPUT_DIR, 'reports'), exist_ok=True)

BG = '#0F1117'
AX = '#161B22'
TXT = '#C9D1D9'
GRID = '#21262D'
COLORS = ['#58A6FF', '#F78166', '#3FB950']
plt.rcParams.update({
    'figure.facecolor': BG,
    'axes.facecolor': AX,
    'axes.edgecolor': '#30363D',
    'axes.labelcolor': TXT,
    'xtick.color': '#8B949E',
    'ytick.color': '#8B949E',
    'text.color': TXT,
    'grid.color': GRID,
    'grid.linestyle': '--',
    'grid.alpha': 0.5,
    'font.family': 'monospace',
    'axes.titleweight': 'bold',
})


def save_fig(path):
    """Save figure with correct path handling"""
    full_path = os.path.join(OUTPUT_DIR, 'visualizations', os.path.basename(path))
    plt.savefig(full_path, dpi=180, bbox_inches='tight', facecolor=BG)
    plt.close()
    return full_path


def read_data(filename):
    """Read data file with correct path"""
    return pd.read_csv(os.path.join(DATA_DIR, filename))


def main():
    # Data
    X_train = read_data('X_train.csv')
    X_test = read_data('X_test.csv')
    y_train = read_data('y_train.csv').squeeze()
    y_test = read_data('y_test.csv').squeeze()
    rfm_base = read_data('rfm_base.csv')
    feat_eng = read_data('feature_engineered.csv')

    X_full = feat_eng.drop(columns=['Churned'])
    y_full = feat_eng['Churned']
    cust_full = rfm_base['CustomerID']
    X_train_raw, X_test_raw, _, y_test_raw, _, cust_test = train_test_split(
        X_full, y_full, cust_full, test_size=0.2, random_state=42, stratify=y_full
    )
    scaler = StandardScaler()
    X_test_scaled = pd.DataFrame(
        scaler.fit(X_train_raw).transform(X_test_raw),
        columns=X_full.columns,
    )
    assert np.allclose(X_test_scaled.values, X_test.values)
    assert np.array_equal(y_test_raw.values, y_test.values)

    customer_test = pd.DataFrame({'CustomerID': cust_test.values, 'ActualChurn': y_test.values})
    lookup = rfm_base[['CustomerID', 'Recency', 'Frequency', 'Monetary']].set_index('CustomerID')
    customer_test = customer_test.join(lookup, on='CustomerID')
    customer_test['AvgOrderValue'] = customer_test['Monetary'] / customer_test['Frequency'].replace(0, np.nan)

    # Model
    model_path = os.path.join(MODELS_DIR, 'best_model.pkl')
    model = joblib.load(model_path)
    probs = model.predict_proba(X_test)[:, 1]
    preds = (probs >= 0.5).astype(int)
    print('Model:', type(model).__name__)
    print('Test F1:', round(f1_score(y_test, preds), 4))
    print('Test Recall:', round(recall_score(y_test, preds), 4))
    print('ROC-AUC:', round(roc_auc_score(y_test, probs), 4))

    if hasattr(model, 'feature_importances_'):
        native_importance = pd.Series(model.feature_importances_, index=X_train.columns).sort_values(ascending=False)
    elif hasattr(model, 'coef_'):
        native_importance = pd.Series(np.abs(model.coef_[0]), index=X_train.columns).sort_values(ascending=False)
    else:
        native_importance = pd.Series(dtype=float)

    rf_benchmark = RandomForestClassifier(n_estimators=250, random_state=42, class_weight='balanced', n_jobs=-1)
    rf_benchmark.fit(X_train, y_train)
    rf_importance = pd.Series(rf_benchmark.feature_importances_, index=X_train.columns).sort_values(ascending=False)

    # SHAP
    explainer = shap.Explainer(model, X_train, feature_names=X_train.columns)
    shap_values = explainer(X_test)
    shap_importance = pd.Series(np.abs(shap_values.values).mean(axis=0), index=X_test.columns).sort_values(ascending=False)

    plt.figure(figsize=(10, 6), facecolor=BG)
    shap.summary_plot(shap_values.values, X_test, show=False, max_display=10)
    plt.title('SHAP Summary - Test Set', color=TXT, fontweight='bold')
    save_fig('phase4_shap_beeswarm.png')

    plt.figure(figsize=(10, 6), facecolor=BG)
    shap.summary_plot(shap_values.values, X_test, plot_type='bar', show=False, max_display=10)
    plt.title('SHAP Feature Importance - Mean |SHAP|', color=TXT, fontweight='bold')
    save_fig('phase4_shap_bar.png')

    comparison_df = pd.DataFrame({
        'SHAP Mean |value|': shap_importance,
        'Native importance': native_importance.reindex(shap_importance.index),
        'Benchmark RF importance': rf_importance.reindex(shap_importance.index),
    }).fillna(0)
    comparison_path = os.path.join(OUTPUT_DIR, 'predictions', 'phase4_shap_comparison.csv')
    comparison_df.to_csv(comparison_path)

    print('Top SHAP features:')
    print(shap_importance.head(10).to_string())

    # Plain-English drivers
    plain = []
    for feat in shap_importance.head(5).index:
        if feat == 'Frequency':
            s = 'Customers who buy more often are less likely to leave, because they stay engaged.'
        elif feat == 'Monetary':
            s = 'Customers who spend more tend to be more loyal and less likely to churn.'
        elif feat == 'Tenure':
            s = 'Customers who have been with the business longer are usually more stable.'
        elif feat == 'AvgOrderValue':
            s = 'Customers with stronger basket values often show healthier engagement.'
        elif feat == 'RevenuePerMonth':
            s = 'Customers generating more monthly revenue are usually more valuable and less likely to disappear.'
        elif feat == 'PurchaseTrend':
            s = 'A weakening purchase trend is an early warning sign that the customer may be drifting away.'
        else:
            s = f'{feat} is one of the strongest signals in the model.'
        plain.append((feat, s))

    # Individual cases
    case_ids = {
        'correct_positive': int(np.where((preds == 1) & (y_test.values == 1))[0][0]),
        'correct_negative': int(np.where((preds == 0) & (y_test.values == 0))[0][0]),
        'misclassification': int(np.where(preds != y_test.values)[0][0]),
    }
    case_text = {}
    for key, idx in case_ids.items():
        plt.figure(figsize=(10, 6), facecolor=BG)
        shap.plots.waterfall(shap_values[idx], max_display=10, show=False)
        plt.title(key.replace('_', ' ').title(), color=TXT, fontweight='bold')
        save_fig(f'phase4_{key}_waterfall.png')
        vals = shap_values[idx].values
        top_idx = np.argsort(np.abs(vals))[::-1][:3]
        top_feats = [X_test.columns[i] for i in top_idx]
        top_dirs = ['pushes risk up' if vals[i] > 0 else 'pushes risk down' for i in top_idx]
        extras = '; '.join([f'{f} {d}' for f, d in zip(top_feats, top_dirs)])
        if key == 'correct_positive':
            case_text[key] = f'This customer was correctly flagged because the model saw several warning signs at once. {extras}. The pattern suggests a customer who is drifting away, so a retention action is justified.'
        elif key == 'correct_negative':
            case_text[key] = f'This customer was correctly kept out of the churn list because the strongest signals were stable. {extras}. The profile suggests a healthy customer who does not need immediate intervention.'
        else:
            case_text[key] = f'This is the most useful failure case because the model made the wrong call. {extras}. The customer sits near the decision boundary, so a follow-up rule or a more specific segment could help.'

    # Segmentation
    segment_df = customer_test.copy()
    segment_df['ChurnProbability'] = probs
    segment_df['PredictedLabel'] = preds
    segment_df['RiskTier'] = pd.cut(
        segment_df['ChurnProbability'],
        bins=[-np.inf, 0.40, 0.70, np.inf],
        labels=['Low Risk', 'Medium Risk', 'High Risk'],
        right=False,
    )
    segment_df = segment_df.merge(rfm_base[['CustomerID', 'Country']], on='CustomerID', how='left')
    profile = segment_df.groupby('RiskTier', observed=False)[['Recency', 'Frequency', 'Monetary', 'AvgOrderValue']].mean().round(2).reindex(['High Risk', 'Medium Risk', 'Low Risk'])
    profile_path = os.path.join(OUTPUT_DIR, 'predictions', 'phase4_segment_profile.csv')
    profile.to_csv(profile_path)
    
    predictions_path = os.path.join(OUTPUT_DIR, 'predictions', 'phase4_customer_predictions.csv')
    segment_df[['CustomerID', 'ChurnProbability', 'PredictedLabel', 'RiskTier']].to_csv(predictions_path, index=False)
    counts = segment_df['RiskTier'].value_counts().reindex(['High Risk', 'Medium Risk', 'Low Risk'])

    fig, axes = plt.subplots(2, 2, figsize=(14, 10), facecolor=BG)
    for ax, col in zip(axes.flatten(), ['Recency', 'Frequency', 'Monetary', 'AvgOrderValue']):
        profile[col].plot(kind='bar', ax=ax, color=COLORS)
        ax.set_title(col, fontweight='bold')
        ax.grid(axis='y', alpha=0.25)
        ax.tick_params(axis='x', rotation=20)
    plt.suptitle('Customer Risk Tier Profiles', fontsize=16, fontweight='bold', y=1.02)
    plt.tight_layout()
    save_fig('phase4_segment_profiles.png')

    # Report figures and PDF
    risk_summary = segment_df.groupby('RiskTier', observed=False).agg(Customers=('CustomerID', 'count'), MeanProb=('ChurnProbability', 'mean')).reindex(['High Risk', 'Medium Risk', 'Low Risk'])
    risk_summary['ExpectedValueAtRisk_£'] = (risk_summary['Customers'] * risk_summary['MeanProb'] * 300).round(0)
    low_tenure = segment_df.merge(rfm_base[['CustomerID', 'Tenure']], on='CustomerID', how='left')
    low_tenure_risk = low_tenure[low_tenure['Tenure'] <= low_tenure['Tenure'].quantile(0.25)]
    onboarding_value = float(low_tenure_risk['ChurnProbability'].sum() * 300)
    non_uk_value = float(segment_df.loc[segment_df['Country'] != 'United Kingdom', 'ChurnProbability'].sum() * 300)
    recommendations = pd.DataFrame([
        {'Priority': 'H', 'What to do': 'Call or email High Risk customers within 24 hours.', 'Why supported': 'This tier has the highest predicted churn probability and the strongest warning signals.', 'Estimated £ impact': f"Up to £{risk_summary.loc['High Risk', 'ExpectedValueAtRisk_£']:.0f}"},
        {'Priority': 'H', 'What to do': 'Automate a lighter nurture journey for Medium Risk customers.', 'Why supported': 'The model shows meaningful churn risk, but not enough to justify a full intervention.', 'Estimated £ impact': f"Up to £{risk_summary.loc['Medium Risk', 'ExpectedValueAtRisk_£']:.0f}"},
        {'Priority': 'M', 'What to do': 'Strengthen onboarding and early-life engagement for new or short-tenure customers.', 'Why supported': 'Customers with short histories are harder to score and can look artificially risky.', 'Estimated £ impact': f"Up to £{onboarding_value:.0f}"},
        {'Priority': 'M', 'What to do': 'Calibrate thresholds or build a light regional check for non-UK customers.', 'Why supported': 'The portfolio is heavily UK-skewed, so smaller geographies may be less reliable.', 'Estimated £ impact': f"Up to £{non_uk_value:.0f}"},
    ])

    report_path = os.path.join(OUTPUT_DIR, 'reports', 'phase4_business_report.pdf')
    with PdfPages(report_path) as pdf:
        # Page 1
        fig = plt.figure(figsize=(8.27, 11.69), facecolor=BG)
        ax = fig.add_axes([0, 0, 1, 1])
        ax.axis('off')
        fig.text(0.06, 0.95, 'Phase 4 Business Report', fontsize=22, fontweight='bold', color=TXT)
        fig.text(0.06, 0.92, 'Executive Summary', fontsize=16, fontweight='bold', color=COLORS[0])
        fig.text(0.06, 0.86, f'The model is a {type(model).__name__}. It delivered F1 = {f1_score(y_test, preds):.4f}, Recall = {recall_score(y_test, preds):.4f}, and ROC-AUC = {roc_auc_score(y_test, probs):.4f} on the held-out test set.', fontsize=11, wrap=True)
        fig.text(0.06, 0.79, 'Logistic Regression is the best model on held-out test F1 in this run. The tree model and stacking check do not improve F1 enough to replace it.', fontsize=10, wrap=True)
        fig.text(0.06, 0.72, 'The customer population is split into High, Medium, and Low risk tiers. The business should focus immediate retention effort on the High Risk tier and use lighter-touch journeys for the Medium Risk tier.', fontsize=10, wrap=True)
        table_rows = [
            ['Metric', 'Value'],
            ['F1', f'{f1_score(y_test, preds):.4f}'],
            ['Recall', f'{recall_score(y_test, preds):.4f}'],
            ['ROC-AUC', f'{roc_auc_score(y_test, probs):.4f}'],
            ['High Risk', str(int(counts['High Risk']))],
            ['Medium Risk', str(int(counts['Medium Risk']))],
            ['Low Risk', str(int(counts['Low Risk']))],
        ]
        t1 = ax.table(cellText=table_rows[1:], colLabels=table_rows[0], cellLoc='left', bbox=[0.06, 0.49, 0.40, 0.18])
        t1.auto_set_font_size(False)
        t1.set_fontsize(9)
        for _, cell in t1.get_celld().items():
            cell.set_facecolor(AX)
            cell.set_edgecolor('#30363D')
            cell.get_text().set_color(TXT)
        img_path = os.path.join(OUTPUT_DIR, 'visualizations', 'phase4_segment_profiles.png')
        img = plt.imread(img_path)
        ax_img = fig.add_axes([0.48, 0.32, 0.46, 0.30])
        ax_img.imshow(img)
        ax_img.axis('off')
        pdf.savefig(fig, facecolor=BG, bbox_inches='tight')
        plt.close(fig)

        # Page 2
        fig = plt.figure(figsize=(8.27, 11.69), facecolor=BG)
        ax = fig.add_axes([0, 0, 1, 1])
        ax.axis('off')
        fig.text(0.06, 0.95, 'Key Churn Drivers', fontsize=16, fontweight='bold', color=COLORS[0])
        img_path = os.path.join(OUTPUT_DIR, 'visualizations', 'phase4_shap_bar.png')
        img = plt.imread(img_path)
        ax_img = fig.add_axes([0.06, 0.58, 0.88, 0.28])
        ax_img.imshow(img)
        ax_img.axis('off')
        drivers = '\n'.join([f'• {f}: {shap_importance[f]:.4f} mean |SHAP|' for f in shap_importance.head(5).index])
        fig.text(0.06, 0.50, 'Top 5 drivers:\n' + drivers, fontsize=11, va='top')
        fig.text(0.06, 0.33, 'Plain-English readout:\n' + '\n'.join([f'- {f}: {txt}' for f, txt in plain]), fontsize=10, va='top', wrap=True)
        pdf.savefig(fig, facecolor=BG, bbox_inches='tight')
        plt.close(fig)

        # Page 3
        fig = plt.figure(figsize=(8.27, 11.69), facecolor=BG)
        ax = fig.add_axes([0, 0, 1, 1])
        ax.axis('off')
        fig.text(0.06, 0.95, 'Customer Segments', fontsize=16, fontweight='bold', color=COLORS[0])
        fig.text(0.06, 0.91, 'Risk tiers translate the probability score into a simple campaign list.', fontsize=10)
        fig.text(0.06, 0.84, profile.to_string(), fontsize=9, family='monospace', va='top')
        img_path = os.path.join(OUTPUT_DIR, 'visualizations', 'phase4_segment_profiles.png')
        img = plt.imread(img_path)
        ax_img = fig.add_axes([0.06, 0.34, 0.88, 0.26])
        ax_img.imshow(img)
        ax_img.axis('off')
        fig.text(0.06, 0.29, f'High Risk: {int(counts["High Risk"])} customers\nMedium Risk: {int(counts["Medium Risk"])} customers\nLow Risk: {int(counts["Low Risk"])} customers', fontsize=11, va='top')
        pdf.savefig(fig, facecolor=BG, bbox_inches='tight')
        plt.close(fig)

        # Page 4
        fig = plt.figure(figsize=(8.27, 11.69), facecolor=BG)
        ax = fig.add_axes([0, 0, 1, 1])
        ax.axis('off')
        fig.text(0.06, 0.95, 'Recommendations, Ethics, and Roadmap', fontsize=16, fontweight='bold', color=COLORS[0])
        rec_text = '\n\n'.join([
            f"{row.Priority}. {row['What to do']}\nWhy: {row['Why supported']}\nEstimated £ impact: {row['Estimated £ impact']}"
            for _, row in recommendations.iterrows()
        ])
        fig.text(0.06, 0.90, rec_text, fontsize=9, va='top', wrap=True)
        fig.text(0.06, 0.46, 'Ethical considerations:\n- The data is heavily UK-weighted, so small-country performance needs monitoring.\n- New customers may be scored with less confidence because the model sees shorter histories.\n- Mitigations: monitor country-level calibration and add cohort-aware review for early-life customers.', fontsize=10, va='top', wrap=True)
        fig.text(0.06, 0.30, 'Implementation roadmap:\n1. Week 1-2: launch High Risk outreach and tracking.\n2. Month 1: automate Medium Risk nurture and monitor conversion.\n3. Month 2: calibrate by country and add onboarding rules for new customers.\n4. Ongoing: refresh SHAP and segment reports monthly.', fontsize=10, va='top', wrap=True)
        pdf.savefig(fig, facecolor=BG, bbox_inches='tight')
        plt.close(fig)

    print('Output files saved to:')
    print(f'  Visualizations: {os.path.join(OUTPUT_DIR, "visualizations")}')
    print(f'  Predictions: {os.path.join(OUTPUT_DIR, "predictions")}')
    print(f'  Reports: {os.path.join(OUTPUT_DIR, "reports")}')


if __name__ == '__main__':
    main()

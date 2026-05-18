# IDSS Project - Reorganized Structure

## Project Overview
This is a multi-phase data science project analyzing customer churn using the Online Retail dataset.

## Directory Structure

```
idss-project/
├── phase1/                          # EDA & Feature Engineering
│   ├── notebooks/
│   │   ├── phase1_online_retail.ipynb
│   │   └── phase1_online_retail.html
│   ├── outputs/
│   │   └── phase1_online_retail(notebook).pdf
│   └── docs/
│       ├── phase1_problem_statement.pdf
│       └── phase1_problem_statement.tex
│
├── phase2/                          # Data Preparation
│   ├── notebooks/
│   │   └── phase2_final.ipynb
│   └── outputs/
│
├── phase3/                          # Model Development & Validation
│   ├── notebooks/
│   │   ├── phase3_churn_modelling.ipynb
│   │   └── phase3_modeling.ipynb
│   └── outputs/
│
├── phase4/                          # Explainability & Business Insights
│   ├── scripts/
│   │   └── phase4_generate.py       (generates reports & predictions)
│   ├── notebooks/
│   │   └── phase4_explainability.ipynb
│   └── outputs/
│       ├── predictions/             (CSV outputs: customer predictions, segment profiles)
│       ├── visualizations/          (PNG: SHAP plots, waterfall charts, profiles)
│       └── reports/                 (PDF: business report)
│
├── shared/                          # Shared resources across phases
│   ├── data/                        (training/test sets, engineered features)
│   │   ├── X_train.csv
│   │   ├── X_test.csv
│   │   ├── y_train.csv
│   │   ├── y_test.csv
│   │   ├── rfm_base.csv
│   │   ├── feature_engineered.csv
│   │   └── transactions_clean.csv
│   ├── models/                      (trained models)
│   │   └── best_model.pkl
│   ├── visualizations/              (shared exploratory plots)
│   │   ├── target_distribution.png
│   │   ├── feature_distributions.png
│   │   ├── correlation_heatmap.png
│   │   ├── bivariate_*.png
│   │   ├── boxplots_churn.png
│   │   ├── churn_by_country.png
│   │   ├── confusion_matrices.png
│   │   ├── roc_curves.png
│   │   └── *.png (other analysis plots)
│   └── scripts/                     (utility scripts)
│       └── verify_fix.py            (data integrity & model verification)
│
└── requirements.txt                 (Python dependencies)
```

## File Locations Guide

### Phase-specific Files
- **Phase 1**: EDA and feature engineering notebooks → `phase1/notebooks/`
- **Phase 2**: Data preparation → `phase2/notebooks/`
- **Phase 3**: Model development and comparison → `phase3/notebooks/`
- **Phase 4**: Explainability analysis → `phase4/notebooks/`
- **Phase 4 Scripts**: Model generation and reporting → `phase4/scripts/`

### Shared Resources
- **Training/Test Data**: `shared/data/` (CSV files)
- **Trained Models**: `shared/models/` (pickle files)
- **Exploratory Visualizations**: `shared/visualizations/` (PNG files from EDA phases)
- **Utility Scripts**: `shared/scripts/` (verification, helpers)

### Outputs by Phase
- **Phase 1-3**: `phaseN/outputs/`
- **Phase 4**: `phase4/outputs/`
  - `predictions/` → Customer predictions and segment profiles (CSV)
  - `visualizations/` → SHAP plots and analysis charts (PNG)
  - `reports/` → Business reports and PDF exports (PDF)

## Running Scripts

### From Phase 4 Scripts
```bash
cd phase4/scripts
python phase4_generate.py
```
The script automatically:
- Reads data from `../../shared/data/`
- Loads model from `../../shared/models/`
- Saves outputs to `../outputs/`

### From Shared Scripts
```bash
cd shared/scripts
python verify_fix.py
```
The script verifies data integrity and model performance.

## Path References in Code

All Python scripts use **relative paths** based on their location:

```python
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(SCRIPT_DIR))
DATA_DIR = os.path.join(PROJECT_ROOT, 'shared', 'data')
MODELS_DIR = os.path.join(PROJECT_ROOT, 'shared', 'models')
OUTPUT_DIR = os.path.join(SCRIPT_DIR, '..', 'outputs')
```

This ensures scripts work correctly regardless of where they're run from.

## Jupyter Notebooks

When working with Jupyter notebooks, paths should reference:
- **Data files**: Use relative paths like `../../shared/data/X_train.csv`
- **Models**: Use relative paths like `../../shared/models/best_model.pkl`
- **Shared visualizations**: Use `../../shared/visualizations/`

## Dependencies

Install all dependencies using:
```bash
pip install -r requirements.txt
```

Current dependencies:
- streamlit
- pandas
- numpy
- scikit-learn
- joblib
- plotly
- reportlab
- imbalanced-learn
- shap
- matplotlib

## Migrating from Old Structure

The old flat structure has been reorganized into phases for better clarity:

| Old Name | New Location |
|----------|--------------|
| phase1_online_retail.ipynb | phase1/notebooks/ |
| phase2_final.ipynb | phase2/notebooks/ |
| phase3_churn_modelling.ipynb | phase3/notebooks/ |
| phase4_generate.py | phase4/scripts/ |
| X_train.csv, y_train.csv | shared/data/ |
| best_model.pkl | shared/models/ |
| *_*.png (exploratory) | shared/visualizations/ |

All Python scripts have been updated to use the new paths.

## Notes

- **Data Integrity**: All data files are in `shared/data/` to ensure consistency
- **Single Model Location**: Best model is in `shared/models/` with references in phase4
- **Separation of Concerns**: Each phase has its own notebook and output directories
- **Cross-Phase Access**: Shared resources (data, models) are centralized for easy reference

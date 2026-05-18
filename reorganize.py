#!/usr/bin/env python3
"""
Reorganize project structure by phase
"""
import os
import shutil
from pathlib import Path

base_dir = Path('.')

# Define directory structure
dirs_to_create = [
    'phase1/notebooks',
    'phase1/outputs',
    'phase1/docs',
    'phase2/notebooks',
    'phase2/outputs',
    'phase3/notebooks',
    'phase3/outputs',
    'phase4/scripts',
    'phase4/notebooks',
    'phase4/outputs/predictions',
    'phase4/outputs/visualizations',
    'phase4/outputs/reports',
    'shared/data',
    'shared/models',
    'shared/visualizations',
    'shared/scripts',
]

# Create all directories
for dir_path in dirs_to_create:
    Path(dir_path).mkdir(parents=True, exist_ok=True)
    print(f"[+] Created: {dir_path}")

# Define file movements
file_moves = {
    # Phase 1
    'phase1_online_retail.ipynb': 'phase1/notebooks/',
    'phase1_online_retail.html': 'phase1/notebooks/',
    'phase1_online_retail(notebook).pdf': 'phase1/outputs/',
    'phase1_problem_statement.pdf': 'phase1/docs/',
    'phase1_problem_statement.tex': 'phase1/docs/',
    
    # Phase 2
    'phase2_final.ipynb': 'phase2/notebooks/',
    
    # Phase 3
    'phase3_churn_modelling.ipynb': 'phase3/notebooks/',
    'phase3_modeling.ipynb': 'phase3/notebooks/',
    
    # Phase 4 - Scripts
    'phase4_generate.py': 'phase4/scripts/',
    'phase4_explainability.ipynb': 'phase4/notebooks/',
    
    # Phase 4 - Outputs
    'phase4_business_report.pdf': 'phase4/outputs/reports/',
    'phase4_customer_predictions.csv': 'phase4/outputs/predictions/',
    'phase4_segment_profile.csv': 'phase4/outputs/predictions/',
    'phase4_shap_comparison.csv': 'phase4/outputs/predictions/',
    'phase4_segment_profiles.png': 'phase4/outputs/visualizations/',
    'phase4_shap_bar.png': 'phase4/outputs/visualizations/',
    'phase4_shap_beeswarm.png': 'phase4/outputs/visualizations/',
    'phase4_correct_negative_waterfall.png': 'phase4/outputs/visualizations/',
    'phase4_correct_positive_waterfall.png': 'phase4/outputs/visualizations/',
    'phase4_misclassification_waterfall.png': 'phase4/outputs/visualizations/',
    
    # Shared data
    'X_train.csv': 'shared/data/',
    'X_test.csv': 'shared/data/',
    'y_train.csv': 'shared/data/',
    'y_test.csv': 'shared/data/',
    'rfm_base.csv': 'shared/data/',
    'feature_engineered.csv': 'shared/data/',
    'transactions_clean.csv': 'shared/data/',
    
    # Shared models
    'best_model.pkl': 'shared/models/',
    
    # Shared visualizations
    'target_distribution.png': 'shared/visualizations/',
    'feature_distributions.png': 'shared/visualizations/',
    'correlation_heatmap.png': 'shared/visualizations/',
    'bivariate_country_churn.png': 'shared/visualizations/',
    'bivariate_monetary_churn.png': 'shared/visualizations/',
    'bivariate_recency_frequency.png': 'shared/visualizations/',
    'boxplots_churn.png': 'shared/visualizations/',
    'churn_by_country.png': 'shared/visualizations/',
    'churn_profiling.png': 'shared/visualizations/',
    'confusion_matrices.png': 'shared/visualizations/',
    'country_distribution.png': 'shared/visualizations/',
    'log1p_distributions.png': 'shared/visualizations/',
    'outlier_capping.png': 'shared/visualizations/',
    'outlier_monetary.png': 'shared/visualizations/',
    'roc_curves.png': 'shared/visualizations/',
    'tenure_vs_churn.png': 'shared/visualizations/',
    'train_test_split.png': 'shared/visualizations/',
    'presentation_visuals.png': 'shared/visualizations/',
    
    # Shared scripts
    'verify_fix.py': 'shared/scripts/',
}

# Move files
print("\nMoving files...")
moved_count = 0
for src, dst in file_moves.items():
    src_path = base_dir / src
    dst_path = base_dir / dst / src
    
    if src_path.exists():
        shutil.move(str(src_path), str(dst_path))
        print(f"[+] Moved: {src} -> {dst}")
        moved_count += 1
    else:
        print(f"[-] Not found: {src}")

print(f"\n[+] Successfully moved {moved_count} files")
print("[+] Reorganization complete!")

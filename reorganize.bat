@echo off
REM Reorganize IDSS Project by Phase
REM Run this from the root directory of the project

setlocal enabledelayedexpansion

echo Creating directory structure...

REM Create Phase 1 directories
mkdir phase1\notebooks 2>nul
mkdir phase1\outputs 2>nul
mkdir phase1\docs 2>nul

REM Create Phase 2 directories
mkdir phase2\notebooks 2>nul
mkdir phase2\outputs 2>nul

REM Create Phase 3 directories
mkdir phase3\notebooks 2>nul
mkdir phase3\outputs 2>nul

REM Create Phase 4 directories
mkdir phase4\scripts 2>nul
mkdir phase4\notebooks 2>nul
mkdir phase4\outputs\predictions 2>nul
mkdir phase4\outputs\visualizations 2>nul
mkdir phase4\outputs\reports 2>nul

REM Create Shared directories
mkdir shared\data 2>nul
mkdir shared\models 2>nul
mkdir shared\visualizations 2>nul
mkdir shared\scripts 2>nul

echo.
echo Moving files...
echo.

REM Move Phase 1 files
if exist "phase1_online_retail.ipynb" move "phase1_online_retail.ipynb" "phase1\notebooks\" && echo Moved: phase1_online_retail.ipynb
if exist "phase1_online_retail.html" move "phase1_online_retail.html" "phase1\notebooks\" && echo Moved: phase1_online_retail.html
if exist "phase1_online_retail(notebook).pdf" move "phase1_online_retail(notebook).pdf" "phase1\outputs\" && echo Moved: phase1_online_retail(notebook).pdf
if exist "phase1_problem_statement.pdf" move "phase1_problem_statement.pdf" "phase1\docs\" && echo Moved: phase1_problem_statement.pdf
if exist "phase1_problem_statement.tex" move "phase1_problem_statement.tex" "phase1\docs\" && echo Moved: phase1_problem_statement.tex

REM Move Phase 2 files
if exist "phase2_final.ipynb" move "phase2_final.ipynb" "phase2\notebooks\" && echo Moved: phase2_final.ipynb

REM Move Phase 3 files
if exist "phase3_churn_modelling.ipynb" move "phase3_churn_modelling.ipynb" "phase3\notebooks\" && echo Moved: phase3_churn_modelling.ipynb
if exist "phase3_modeling.ipynb" move "phase3_modeling.ipynb" "phase3\notebooks\" && echo Moved: phase3_modeling.ipynb

REM Move Phase 4 files
if exist "phase4_explainability.ipynb" move "phase4_explainability.ipynb" "phase4\notebooks\" && echo Moved: phase4_explainability.ipynb
if exist "phase4_business_report.pdf" move "phase4_business_report.pdf" "phase4\outputs\reports\" && echo Moved: phase4_business_report.pdf
if exist "phase4_customer_predictions.csv" move "phase4_customer_predictions.csv" "phase4\outputs\predictions\" && echo Moved: phase4_customer_predictions.csv
if exist "phase4_segment_profile.csv" move "phase4_segment_profile.csv" "phase4\outputs\predictions\" && echo Moved: phase4_segment_profile.csv
if exist "phase4_shap_comparison.csv" move "phase4_shap_comparison.csv" "phase4\outputs\predictions\" && echo Moved: phase4_shap_comparison.csv

REM Move Phase 4 visualizations
if exist "phase4_segment_profiles.png" move "phase4_segment_profiles.png" "phase4\outputs\visualizations\" && echo Moved: phase4_segment_profiles.png
if exist "phase4_shap_bar.png" move "phase4_shap_bar.png" "phase4\outputs\visualizations\" && echo Moved: phase4_shap_bar.png
if exist "phase4_shap_beeswarm.png" move "phase4_shap_beeswarm.png" "phase4\outputs\visualizations\" && echo Moved: phase4_shap_beeswarm.png
if exist "phase4_correct_negative_waterfall.png" move "phase4_correct_negative_waterfall.png" "phase4\outputs\visualizations\" && echo Moved: phase4_correct_negative_waterfall.png
if exist "phase4_correct_positive_waterfall.png" move "phase4_correct_positive_waterfall.png" "phase4\outputs\visualizations\" && echo Moved: phase4_correct_positive_waterfall.png
if exist "phase4_misclassification_waterfall.png" move "phase4_misclassification_waterfall.png" "phase4\outputs\visualizations\" && echo Moved: phase4_misclassification_waterfall.png

REM Move shared data files
echo.
echo Moving shared data files...
if exist "X_train.csv" move "X_train.csv" "shared\data\" && echo Moved: X_train.csv
if exist "X_test.csv" move "X_test.csv" "shared\data\" && echo Moved: X_test.csv
if exist "y_train.csv" move "y_train.csv" "shared\data\" && echo Moved: y_train.csv
if exist "y_test.csv" move "y_test.csv" "shared\data\" && echo Moved: y_test.csv
if exist "rfm_base.csv" move "rfm_base.csv" "shared\data\" && echo Moved: rfm_base.csv
if exist "feature_engineered.csv" move "feature_engineered.csv" "shared\data\" && echo Moved: feature_engineered.csv
if exist "transactions_clean.csv" move "transactions_clean.csv" "shared\data\" && echo Moved: transactions_clean.csv

REM Move models
echo.
echo Moving models...
if exist "best_model.pkl" move "best_model.pkl" "shared\models\" && echo Moved: best_model.pkl

REM Move shared visualizations
echo.
echo Moving shared visualizations...
if exist "target_distribution.png" move "target_distribution.png" "shared\visualizations\" && echo Moved: target_distribution.png
if exist "feature_distributions.png" move "feature_distributions.png" "shared\visualizations\" && echo Moved: feature_distributions.png
if exist "correlation_heatmap.png" move "correlation_heatmap.png" "shared\visualizations\" && echo Moved: correlation_heatmap.png
if exist "bivariate_country_churn.png" move "bivariate_country_churn.png" "shared\visualizations\" && echo Moved: bivariate_country_churn.png
if exist "bivariate_monetary_churn.png" move "bivariate_monetary_churn.png" "shared\visualizations\" && echo Moved: bivariate_monetary_churn.png
if exist "bivariate_recency_frequency.png" move "bivariate_recency_frequency.png" "shared\visualizations\" && echo Moved: bivariate_recency_frequency.png
if exist "boxplots_churn.png" move "boxplots_churn.png" "shared\visualizations\" && echo Moved: boxplots_churn.png
if exist "churn_by_country.png" move "churn_by_country.png" "shared\visualizations\" && echo Moved: churn_by_country.png
if exist "churn_profiling.png" move "churn_profiling.png" "shared\visualizations\" && echo Moved: churn_profiling.png
if exist "confusion_matrices.png" move "confusion_matrices.png" "shared\visualizations\" && echo Moved: confusion_matrices.png
if exist "country_distribution.png" move "country_distribution.png" "shared\visualizations\" && echo Moved: country_distribution.png
if exist "log1p_distributions.png" move "log1p_distributions.png" "shared\visualizations\" && echo Moved: log1p_distributions.png
if exist "outlier_capping.png" move "outlier_capping.png" "shared\visualizations\" && echo Moved: outlier_capping.png
if exist "outlier_monetary.png" move "outlier_monetary.png" "shared\visualizations\" && echo Moved: outlier_monetary.png
if exist "roc_curves.png" move "roc_curves.png" "shared\visualizations\" && echo Moved: roc_curves.png
if exist "tenure_vs_churn.png" move "tenure_vs_churn.png" "shared\visualizations\" && echo Moved: tenure_vs_churn.png
if exist "train_test_split.png" move "train_test_split.png" "shared\visualizations\" && echo Moved: train_test_split.png
if exist "presentation_visuals.png" move "presentation_visuals.png" "shared\visualizations\" && echo Moved: presentation_visuals.png

REM Copy updated scripts
echo.
echo Copying updated scripts...
if exist "phase4_scripts_generate.py" copy "phase4_scripts_generate.py" "phase4\scripts\phase4_generate.py" && echo Copied: phase4_scripts_generate.py to phase4\scripts\phase4_generate.py
if exist "shared_scripts_verify_fix.py" copy "shared_scripts_verify_fix.py" "shared\scripts\verify_fix.py" && echo Copied: shared_scripts_verify_fix.py to shared\scripts\verify_fix.py

echo.
echo Cleanup: Removing temporary scripts...
if exist "phase4_scripts_generate.py" del "phase4_scripts_generate.py"
if exist "shared_scripts_verify_fix.py" del "shared_scripts_verify_fix.py"
if exist "reorganize.py" del "reorganize.py"
if exist "reorganize.bat" del "reorganize.bat"

echo.
echo ========================================
echo Reorganization Complete!
echo ========================================
echo.
echo New structure created with:
echo - phase1/, phase2/, phase3/, phase4/ directories
echo - shared/ directory for common resources
echo - Updated Python scripts with correct paths
echo.
echo See PROJECT_STRUCTURE.md for details.
echo.
pause

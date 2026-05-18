# IDSS Project Reorganization - Quick Start

## ⚡ QUICK START (Windows)

### Step 1: Run the Reorganization Script
```bash
cd "f:\idss-project - Copy\phase 1"
reorganize.bat
```

This script will:
- ✓ Create all phase directories
- ✓ Create shared resource directories
- ✓ Move all files to correct locations
- ✓ Copy updated Python scripts
- ✓ Clean up temporary files

### Step 2: Verify the Structure
```bash
tree /f
```
Should show:
```
├── phase1/
├── phase2/
├── phase3/
├── phase4/
├── shared/
└── requirements.txt
```

### Step 3: Test Scripts
```bash
cd phase4\scripts
python phase4_generate.py
```

---

## 📁 What Gets Reorganized

### **48 Files** will be organized into:

**Phase Directories**:
- ✓ 5 phase1 files (notebooks + docs)
- ✓ 1 phase2 file (notebook)
- ✓ 2 phase3 files (notebooks)
- ✓ 8 phase4 files (scripts + notebooks + outputs)

**Shared Directories**:
- ✓ 7 data files (CSV)
- ✓ 1 model file (PKL)
- ✓ 18 visualization files (PNG)
- ✓ 1 utility script (PY)

**Configuration**:
- ✓ 1 requirements.txt (stays in root)

---

## 📋 Files Included

### Setup & Documentation (NEW)
1. **PROJECT_STRUCTURE.md** - Complete structure reference
2. **REORGANIZATION_GUIDE.md** - Detailed guide (you're reading it!)
3. **reorganize.bat** - Windows batch script
4. **reorganize.py** - Python reorganization script

### Updated Scripts (NEW)
5. **phase4_scripts_generate.py** - Phase 4 analysis (→ phase4/scripts/)
6. **shared_scripts_verify_fix.py** - Data verification (→ shared/scripts/)

### Original Project Files (TO BE MOVED)
- phase1-3 notebooks
- phase4 notebook + script
- All CSV data files
- Model file (best_model.pkl)
- All PNG visualization files

---

## 🔄 Before & After

### Before (Flat Structure)
```
phase1_online_retail.ipynb
phase2_final.ipynb
phase3_churn_modelling.ipynb
phase4_generate.py
phase4_explainability.ipynb
X_train.csv
y_train.csv
...
best_model.pkl
<50 more files>
```

### After (Organized Structure)
```
phase1/
  notebooks/
    phase1_online_retail.ipynb
    phase1_online_retail.html
  outputs/
  docs/
phase2/
  notebooks/
    phase2_final.ipynb
  outputs/
phase3/
  notebooks/
    phase3_churn_modelling.ipynb
    phase3_modeling.ipynb
  outputs/
phase4/
  scripts/
    phase4_generate.py ✓ (UPDATED PATHS)
  notebooks/
    phase4_explainability.ipynb
  outputs/
    predictions/
    visualizations/
    reports/
shared/
  data/
    X_train.csv, y_train.csv, etc.
  models/
    best_model.pkl
  visualizations/
    *.png files
  scripts/
    verify_fix.py ✓ (UPDATED PATHS)
requirements.txt
```

---

## 🔧 Path Updates Made

### In `phase4_generate.py` (NEW)

**Old**:
```python
X_train = pd.read_csv('X_train.csv')
model = joblib.load('best_model.pkl')
plt.savefig('phase4_shap_bar.png')
```

**New**:
```python
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(SCRIPT_DIR))
DATA_DIR = os.path.join(PROJECT_ROOT, 'shared', 'data')
MODELS_DIR = os.path.join(PROJECT_ROOT, 'shared', 'models')
OUTPUT_DIR = os.path.join(SCRIPT_DIR, '..', 'outputs')

X_train = pd.read_csv(os.path.join(DATA_DIR, 'X_train.csv'))
model = joblib.load(os.path.join(MODELS_DIR, 'best_model.pkl'))
# Output automatically saved to phase4/outputs/
```

**Benefits**:
- ✓ Works from any directory
- ✓ No hardcoded paths
- ✓ Portable across systems

### In `verify_fix.py` (NEW)

Same approach - reads from `shared/data/` using relative paths.

---

## ✅ Verification Steps

After running `reorganize.bat`, verify:

```bash
REM Check directory structure
dir /s /b > structure.txt

REM Verify phase1 files
dir phase1\notebooks
dir phase1\outputs
dir phase1\docs

REM Verify shared resources
dir shared\data
dir shared\models
dir shared\visualizations
dir shared\scripts

REM Verify phase4 outputs
dir phase4\outputs\predictions
dir phase4\outputs\visualizations
dir phase4\outputs\reports
```

All directories should be populated with moved files.

---

## 🚀 Running Scripts After Reorganization

### Phase 4 Analysis
```bash
cd phase4\scripts
python phase4_generate.py
```
Output files appear in:
- `phase4\outputs\predictions\` - CSV files
- `phase4\outputs\visualizations\` - PNG charts
- `phase4\outputs\reports\` - PDF reports

### Data Verification
```bash
cd shared\scripts
python verify_fix.py
```
Verifies:
- Data integrity
- Model consistency
- Train/test split correctness

---

## 🐍 Using Notebooks After Reorganization

In Phase 1 notebook:
```python
# To load shared data from phase1/notebooks/
import pandas as pd

X_train = pd.read_csv('../../shared/data/X_train.csv')
rfm = pd.read_csv('../../shared/data/rfm_base.csv')
```

In Phase 4 notebook:
```python
# Same relative path works from phase4/notebooks/
X_train = pd.read_csv('../../shared/data/X_train.csv')
```

---

## ⚠️ Important Notes

1. **Run Script Once**: The reorganization script is one-time only
   - After running, you can delete `reorganize.bat` and `reorganize.py`
   - They're not needed after files are moved

2. **Preserve Original Files**: The script moves (not copies) files
   - Files are gone from root once moved
   - They exist in their new phase/shared directories

3. **Updated Scripts are Ready**: 
   - `phase4_scripts_generate.py` is ready to copy
   - It has correct paths already
   - Just move it to `phase4/scripts/phase4_generate.py`

4. **Test First** (Optional):
   - If you want to test without moving, run Python script with `--dry-run`
   - Or manually verify structure before cleanup

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `PROJECT_STRUCTURE.md` | Complete structure reference |
| `REORGANIZATION_GUIDE.md` | Detailed guide (this file) |
| `reorganize.bat` | Windows batch script |
| `reorganize.py` | Python alternative |
| `README.md` | Main project readme (optional) |

---

## 🎯 Goals Achieved

✓ **Organized by phase** - Each phase has dedicated workspace
✓ **Shared resources** - Data/models centralized for consistency  
✓ **Updated paths** - Scripts use relative paths
✓ **Scalable** - Easy to add phases or reorganize further
✓ **Documented** - Complete structure guide provided
✓ **Portable** - Works across Windows/Mac/Linux
✓ **Maintainable** - Clear where each file belongs

---

## 💡 Next Steps

1. Run `reorganize.bat` to reorganize files
2. Read `PROJECT_STRUCTURE.md` for complete reference
3. Test `phase4_generate.py` in phase4/scripts/
4. Update any custom notebooks to use new paths
5. Commit to version control if using git

---

**Ready to reorganize? Run: `reorganize.bat`**

Questions? See `PROJECT_STRUCTURE.md` for detailed guidance.

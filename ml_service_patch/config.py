"""
Central configuration for the medical image analysis ML pipeline.

Everything path- or hyperparameter-related lives here so training scripts,
preprocessing scripts, and the evaluation script all agree on the same
values. Change dataset locations / image sizes / class lists here only.
"""

import os
import torch

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(ROOT_DIR, "data")
CHECKPOINT_DIR = os.path.join(ROOT_DIR, "models", "checkpoints")
EVAL_OUTPUT_DIR = os.path.join(ROOT_DIR, "evaluation", "outputs")

os.makedirs(CHECKPOINT_DIR, exist_ok=True)
os.makedirs(EVAL_OUTPUT_DIR, exist_ok=True)

# --- Chest X-ray (NIH ChestX-ray14) ----------------------------------------
CHEST_XRAY_DIR = os.path.join(DATA_DIR, "chest_xray")
CHEST_XRAY_IMAGES_DIR = os.path.join(CHEST_XRAY_DIR, "images")
CHEST_XRAY_RAW_CSV = os.path.join(CHEST_XRAY_DIR, "Data_Entry_2017.csv")
CHEST_XRAY_CLEAN_CSV = os.path.join(CHEST_XRAY_DIR, "metadata_clean.csv")

CHEST_XRAY_LABELS = [
    "Atelectasis", "Cardiomegaly", "Effusion", "Infiltration", "Mass",
    "Nodule", "Pneumonia", "Pneumothorax", "Consolidation", "Edema",
    "Emphysema", "Fibrosis", "Pleural_Thickening", "Hernia",
]  # 14 findings, multi-label. "No Finding" is implicit (all-zero vector).

CHEST_XRAY_IMAGE_SIZE = 224
CHEST_XRAY_BATCH_SIZE = 32
CHEST_XRAY_EPOCHS = 20
CHEST_XRAY_LR = 1e-4

# --- Skin lesions (HAM10000) -------------------------------------------------
SKIN_DIR = os.path.join(DATA_DIR, "skin")
SKIN_IMAGES_DIR = os.path.join(SKIN_DIR, "images")
SKIN_RAW_CSV = os.path.join(SKIN_DIR, "HAM10000_metadata.csv")
SKIN_CLEAN_CSV = os.path.join(SKIN_DIR, "metadata_clean.csv")

# dx codes used by HAM10000
SKIN_LABELS = ["akiec", "bcc", "bkl", "df", "mel", "nv", "vasc"]
SKIN_LABEL_NAMES = {
    "akiec": "Actinic keratoses / intraepithelial carcinoma",
    "bcc": "Basal cell carcinoma",
    "bkl": "Benign keratosis-like lesions",
    "df": "Dermatofibroma",
    "mel": "Melanoma",
    "nv": "Melanocytic nevi",
    "vasc": "Vascular lesions",
}

SKIN_IMAGE_SIZE = 224
SKIN_BATCH_SIZE = 32
SKIN_EPOCHS = 25
SKIN_LR = 1e-4

# --- Brain MRI ----------------------------------------------------------------
MRI_DIR = os.path.join(DATA_DIR, "mri")
# Expected layout (standard Kaggle "Brain Tumor MRI Dataset" layout):
#   data/mri/Training/<class_name>/*.jpg
#   data/mri/Testing/<class_name>/*.jpg
MRI_TRAIN_DIR = os.path.join(MRI_DIR, "Training")
MRI_TEST_DIR = os.path.join(MRI_DIR, "Testing")
MRI_CLEAN_CSV = os.path.join(MRI_DIR, "metadata_clean.csv")

MRI_LABELS = ["glioma", "meningioma", "notumor", "pituitary"]

MRI_IMAGE_SIZE = 224
MRI_BATCH_SIZE = 32
MRI_EPOCHS = 20
MRI_LR = 1e-4

# ---------------------------------------------------------------------------
# General
# ---------------------------------------------------------------------------
SEED = 42
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
NUM_WORKERS = 2

TRAIN_SPLIT = 0.7
VAL_SPLIT = 0.15
TEST_SPLIT = 0.15

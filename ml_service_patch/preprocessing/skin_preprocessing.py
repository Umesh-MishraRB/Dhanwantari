"""
HAM10000 — curation + metadata preparation.

Expected raw layout (as downloaded from Kaggle):
    data/skin/images/*.jpg                  (10,015 dermatoscopic images)
    data/skin/HAM10000_metadata.csv         (image_id, dx, dx_type, age,
                                              sex, localization, lesion_id)

Unlike chest X-ray, HAM10000 has some images sharing the same lesion_id
(multiple photos of the same lesion) — these must be split so the SAME
lesion never appears in both train and test (leakage), which is a subtler
version of the "duplicate" curation problem called out in the project doc.
"""

import os
import sys

import numpy as np
import pandas as pd
import cv2

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import SKIN_IMAGES_DIR, SKIN_RAW_CSV, SKIN_CLEAN_CSV, SKIN_LABELS, SKIN_IMAGE_SIZE
from preprocessing.common import curate_image_list, print_curation_report, resize_and_pad, remove_hair_artifacts, normalize_to_unit


def build_metadata():
    if not os.path.exists(SKIN_RAW_CSV):
        raise FileNotFoundError(
            f"Expected HAM10000 metadata at {SKIN_RAW_CSV}. Download "
            "'HAM10000_metadata.csv' + images from Kaggle/ISIC and place "
            "them under data/skin/."
        )

    df = pd.read_csv(SKIN_RAW_CSV)

    def find_image_path(image_id: str):
        for ext in (".jpg", ".jpeg", ".png"):
            p = os.path.join(SKIN_IMAGES_DIR, image_id + ext)
            if os.path.exists(p):
                return p
        return None

    df["image_path"] = df["image_id"].apply(find_image_path)
    missing = df["image_path"].isna().sum()
    if missing:
        print(f"Dropping {missing} rows with no matching image file")
    df = df[df["image_path"].notna()].reset_index(drop=True)

    # Incorrect/ambiguous label guard: dx must be one of the known classes.
    unknown = ~df["dx"].isin(SKIN_LABELS)
    if unknown.sum():
        print(f"Dropping {unknown.sum()} rows with unrecognized dx label")
    df = df[~unknown].reset_index(drop=True)

    # --- Curation pass ------------------------------------------------------
    keep_paths, report = curate_image_list(df["image_path"].tolist())
    print_curation_report(report, total=len(df))
    df = df[df["image_path"].isin(keep_paths)].reset_index(drop=True)

    # --- Ambiguous metadata guard: conflicting age/sex for the same lesion_id
    if "lesion_id" in df.columns:
        for col in ("age", "sex"):
            if col in df.columns:
                conflict = df.groupby("lesion_id")[col].nunique()
                conflicting_lesions = conflict[conflict > 1].index
                if len(conflicting_lesions):
                    print(f"Note: {len(conflicting_lesions)} lesion_ids have "
                          f"conflicting '{col}' values across records (metadata "
                          "inconsistency) — flagged, not dropped, since the image "
                          "itself is still usable for classification.")

    # --- Class imbalance report ----------------------------------------------
    print("Class distribution:")
    print(df["dx"].value_counts())

    # --- Group-aware split key: prevent lesion leakage across train/val/test
    if "lesion_id" not in df.columns:
        df["lesion_id"] = df["image_id"]  # fallback: treat each image as its own group

    out_cols = ["image_id", "image_path", "dx", "lesion_id"]
    df[out_cols].to_csv(SKIN_CLEAN_CSV, index=False)
    print(f"Wrote cleaned metadata for {len(df)} images to {SKIN_CLEAN_CSV}")


def skin_transform(image_path: str, image_size: int = SKIN_IMAGE_SIZE, augment: bool = False) -> np.ndarray:
    """
    Modality-specific per-sample transform used by SkinDataset:
    hair-artifact removal -> aspect-preserving resize+pad -> [0,1]
    normalization. Returns a (3, H, W) float32 array (channel-first, RGB).
    """
    img = cv2.imread(image_path, cv2.IMREAD_COLOR)  # BGR
    if img is None:
        raise ValueError(f"Could not read image: {image_path}")

    img = remove_hair_artifacts(img)
    img = resize_and_pad(img, image_size)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    if augment:
        if np.random.rand() < 0.5:
            img = cv2.flip(img, 1)
        if np.random.rand() < 0.5:
            img = cv2.flip(img, 0)  # lesions have no canonical orientation
        if np.random.rand() < 0.3:
            angle = np.random.uniform(-20, 20)
            h, w = img.shape[:2]
            m = cv2.getRotationMatrix2D((w / 2, h / 2), angle, 1.0)
            img = cv2.warpAffine(img, m, (w, h), borderMode=cv2.BORDER_REFLECT)

    img = normalize_to_unit(img)
    img = np.transpose(img, (2, 0, 1))  # (3, H, W)
    return img

    
if __name__ == "__main__":
    build_metadata()

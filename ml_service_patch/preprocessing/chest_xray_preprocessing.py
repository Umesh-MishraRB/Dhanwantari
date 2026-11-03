"""
NIH ChestX-ray14 — curation + metadata preparation.

Expected raw layout (as downloaded from Kaggle):
    data/chest_xray/images/*.png            (112,120 frontal X-rays)
    data/chest_xray/Data_Entry_2017.csv     (official metadata: image name,
                                              'Finding Labels' pipe-separated
                                              string, patient age/sex, etc.)

This script does NOT resize/normalize/enhance images to disk — that's a
per-sample transform applied lazily in ChestXrayDataset (preprocessing.py
transforms are shared there via `chest_xray_transform`). What this script
does is the heavier one-time curation pass: verify files, drop
corrupted/blank/low-quality/duplicate images, and turn the pipe-separated
multi-label finding string into a clean one-hot label matrix ready for
BCE-based multi-label training. Output: metadata_clean.csv.
"""

import os
import sys

import numpy as np
import pandas as pd
import cv2

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import (
    CHEST_XRAY_IMAGES_DIR, CHEST_XRAY_RAW_CSV, CHEST_XRAY_CLEAN_CSV,
    CHEST_XRAY_LABELS, CHEST_XRAY_IMAGE_SIZE,
)
from preprocessing.common import curate_image_list, print_curation_report, resize_and_pad, apply_clahe, normalize_to_unit


def build_metadata():
    if not os.path.exists(CHEST_XRAY_RAW_CSV):
        raise FileNotFoundError(
            f"Expected NIH ChestX-ray14 metadata at {CHEST_XRAY_RAW_CSV}. "
            "Download 'Data_Entry_2017.csv' + images/ from the Kaggle dataset "
            "and place them under data/chest_xray/."
        )

    df = pd.read_csv(CHEST_XRAY_RAW_CSV)
    df = df.rename(columns={"Image Index": "image_name", "Finding Labels": "finding_labels"})
    df["image_path"] = df["image_name"].apply(lambda n: os.path.join(CHEST_XRAY_IMAGES_DIR, n))

    # Keep only rows whose image file actually exists on disk (Kaggle ships
    # the dataset split across multiple zip parts; a partial download is common).
    df = df[df["image_path"].apply(os.path.exists)].reset_index(drop=True)
    print(f"Found {len(df)} images with matching metadata rows")

    # --- Curation pass (corrupted / blank / low-quality / duplicates) -----
    keep_paths, report = curate_image_list(df["image_path"].tolist())
    print_curation_report(report, total=len(df))
    df = df[df["image_path"].isin(keep_paths)].reset_index(drop=True)

    # --- Incorrect / ambiguous label guard ---------------------------------
    # Drop rows with a missing finding string outright (lacking-labels case
    # from the curation checklist) rather than silently treating as "No Finding".
    df = df[df["finding_labels"].notna() & (df["finding_labels"].str.len() > 0)].reset_index(drop=True)

    # --- Multi-label one-hot encoding --------------------------------------
    for label in CHEST_XRAY_LABELS:
        df[label] = df["finding_labels"].apply(lambda s: 1 if label in s.split("|") else 0)
    # Wrong-modality guard: a chest X-ray row with zero findings AND labeled
    # "No Finding" is valid (normal scan); anything with an unrecognized
    # finding string that isn't "No Finding" and matches none of our labels
    # is suspicious and dropped.
    known_mask = df["finding_labels"].apply(
        lambda s: s == "No Finding" or any(l in s.split("|") for l in CHEST_XRAY_LABELS)
    )
    dropped_unknown = (~known_mask).sum()
    if dropped_unknown:
        print(f"Dropping {dropped_unknown} rows with unrecognized finding labels")
    df = df[known_mask].reset_index(drop=True)

    # --- Class imbalance report (informational — handled via loss weighting
    # at training time, not by dropping data) -------------------------------
    print("Per-class positive counts:")
    for label in CHEST_XRAY_LABELS:
        print(f"  {label}: {int(df[label].sum())} / {len(df)}")

    out_cols = ["image_name", "image_path"] + CHEST_XRAY_LABELS
    df[out_cols].to_csv(CHEST_XRAY_CLEAN_CSV, index=False)
    print(f"Wrote cleaned metadata for {len(df)} images to {CHEST_XRAY_CLEAN_CSV}")


def chest_xray_transform(image_path: str, image_size: int = CHEST_XRAY_IMAGE_SIZE, augment: bool = False) -> np.ndarray:
    """
    Modality-specific per-sample transform used by ChestXrayDataset:
    grayscale -> CLAHE contrast enhancement -> aspect-preserving resize+pad
    -> [0,1] normalization. Returns a (1, H, W) float32 array (channel-first).
    """
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ValueError(f"Could not read image: {image_path}")

    img = apply_clahe(img)
    img = resize_and_pad(img, image_size)

    if augment:
        if np.random.rand() < 0.5:
            img = cv2.flip(img, 1)  # horizontal flip only — chest anatomy
            # is not vertically symmetric, so no vertical flip.

    img = normalize_to_unit(img)
    img = np.expand_dims(img, axis=0)  # (1, H, W)
    return img


if __name__ == "__main__":
    build_metadata()

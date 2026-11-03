"""
Brain Tumor MRI Dataset — curation + metadata preparation.

Expected raw layout (standard Kaggle layout for this dataset):
    data/mri/Training/glioma/*.jpg
    data/mri/Training/meningioma/*.jpg
    data/mri/Training/notumor/*.jpg
    data/mri/Training/pituitary/*.jpg
    data/mri/Testing/<same 4 class folders>/*.jpg

No CSV ships with this dataset — labels come from the folder name, so the
"lacking labels" curation case can't occur here, but "wrong modality" (a
non-MRI image dropped into a class folder) and corrupted/blank/low-quality/
duplicate images still need checking.

Note: this dataset ships pre-split into Training/Testing. We keep that
split (not merging + re-splitting) so results stay comparable to published
baselines, and additionally carve a validation set out of Training.
"""

import os
import sys

import numpy as np
import pandas as pd
import cv2

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import MRI_TRAIN_DIR, MRI_TEST_DIR, MRI_CLEAN_CSV, MRI_LABELS, MRI_IMAGE_SIZE
from preprocessing.common import curate_image_list, print_curation_report, resize_and_pad, apply_clahe, normalize_to_unit

VALID_EXTS = (".jpg", ".jpeg", ".png")


def _scan_split(split_dir: str, split_name: str) -> pd.DataFrame:
    rows = []
    if not os.path.isdir(split_dir):
        raise FileNotFoundError(
            f"Expected MRI '{split_name}' folder at {split_dir}. Download the "
            "Brain Tumor MRI Dataset from Kaggle and place Training/ and "
            "Testing/ folders under data/mri/."
        )
    for label in MRI_LABELS:
        class_dir = os.path.join(split_dir, label)
        if not os.path.isdir(class_dir):
            print(f"Warning: missing expected class folder {class_dir}")
            continue
        for fname in os.listdir(class_dir):
            if fname.lower().endswith(VALID_EXTS):
                rows.append({
                    "image_path": os.path.join(class_dir, fname),
                    "label": label,
                    "split": split_name,
                })
    return pd.DataFrame(rows)


def build_metadata():
    df_train = _scan_split(MRI_TRAIN_DIR, "train")
    df_test = _scan_split(MRI_TEST_DIR, "test")
    df = pd.concat([df_train, df_test], ignore_index=True)
    print(f"Found {len(df)} raw images ({len(df_train)} train, {len(df_test)} test)")

    # --- Curation pass --------------------------------------------------
    keep_paths, report = curate_image_list(df["image_path"].tolist())
    print_curation_report(report, total=len(df))
    df = df[df["image_path"].isin(keep_paths)].reset_index(drop=True)

    # --- Carve a validation split out of the train portion ---------------
    rng = np.random.RandomState(42)
    train_idx = df[df["split"] == "train"].index.to_numpy().copy()  # .to_numpy() can be read-only
    rng.shuffle(train_idx)
    n_val = int(0.15 * len(train_idx))
    val_idx = set(train_idx[:n_val])
    df.loc[df.index.isin(val_idx), "split"] = "val"

    print("Class distribution by split:")
    print(df.groupby(["split", "label"]).size())

    df.to_csv(MRI_CLEAN_CSV, index=False)
    print(f"Wrote cleaned metadata for {len(df)} images to {MRI_CLEAN_CSV}")


def mri_transform(image_path: str, image_size: int = MRI_IMAGE_SIZE, augment: bool = False) -> np.ndarray:
    """
    Modality-specific per-sample transform used by MRIDataset:
    grayscale -> CLAHE contrast enhancement -> aspect-preserving resize+pad
    -> [0,1] normalization. Returns a (1, H, W) float32 array (channel-first).

    Note: proper skull-stripping / N4 bias-field correction (common in MRI
    pipelines via tools like FSL or SimpleITK) is out of scope for this
    stage — flagging this explicitly as a known simplification, not a
    silent omission.
    """
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ValueError(f"Could not read image: {image_path}")

    img = apply_clahe(img)
    img = resize_and_pad(img, image_size)

    if augment:
        if np.random.rand() < 0.5:
            img = cv2.flip(img, 1)
        if np.random.rand() < 0.3:
            angle = np.random.uniform(-10, 10)
            h, w = img.shape[:2]
            m = cv2.getRotationMatrix2D((w / 2, h / 2), angle, 1.0)
            img = cv2.warpAffine(img, m, (w, h), borderMode=cv2.BORDER_REFLECT)

    img = normalize_to_unit(img)
    img = np.expand_dims(img, axis=0)
    return img


if __name__ == "__main__":
    build_metadata()

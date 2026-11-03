"""
Curation utilities shared across all three modalities.

These implement the checks described in the project's Data Curation stage:
corrupted files, duplicates, unusable/blank images, and low-quality
(very blurry / poorly exposed) images. Modality-specific scripts call these
on top of their own label-handling logic, then produce a single
`metadata_clean.csv` that the Dataset classes read from.
"""

import hashlib
import os
from typing import Optional

import cv2
import numpy as np
from PIL import Image


def is_corrupted(image_path: str) -> bool:
    """Return True if the file can't be opened / decoded as an image."""
    try:
        with Image.open(image_path) as img:
            img.verify()
        # verify() leaves the file in a state where it can't be reused,
        # so re-open to confirm actual pixel data loads too.
        with Image.open(image_path) as img:
            img.load()
        return False
    except Exception:
        return True


def compute_image_hash(image_path: str, hash_size: int = 16) -> Optional[str]:
    """
    Cheap perceptual hash for duplicate detection: downsize to a small
    grayscale thumbnail and hash the raw bytes. Two images that hash the
    same are near-identical; this is deliberately simple (no external
    imagehash dependency) but sufficient for catching literal duplicates
    and near-duplicates from repeated exports.
    """
    try:
        with Image.open(image_path) as img:
            img = img.convert("L").resize((hash_size, hash_size), Image.LANCZOS)
            arr = np.asarray(img)
            return hashlib.md5(arr.tobytes()).hexdigest()
    except Exception:
        return None


def is_blank_or_unusable(image_path: str, std_threshold: float = 5.0) -> bool:
    """
    Flag images with near-zero pixel variance (blank, solid-color, or
    otherwise unusable scans).
    """
    try:
        with Image.open(image_path) as img:
            arr = np.asarray(img.convert("L"), dtype=np.float32)
            return float(arr.std()) < std_threshold
    except Exception:
        return True


def blur_score(image_path: str) -> float:
    """
    Variance of the Laplacian — a standard sharpness proxy. Low values
    indicate a blurry / low-quality image.
    """
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        return 0.0
    return float(cv2.Laplacian(img, cv2.CV_64F).var())


def is_low_quality(image_path: str, blur_threshold: float = 15.0) -> bool:
    return blur_score(image_path) < blur_threshold


def curate_image_list(
    image_paths,
    blur_threshold: float = 15.0,
    dedup: bool = True,
):
    """
    Run the full curation pass over a list of image paths.

    Returns
    -------
    keep_paths : list[str]         paths that passed all checks
    report : dict[str, list[str]]  reasons -> dropped paths, for auditing
    """
    report = {
        "corrupted": [],
        "blank_or_unusable": [],
        "low_quality": [],
        "duplicate": [],
    }
    seen_hashes = set()
    keep_paths = []

    for path in image_paths:
        if is_corrupted(path):
            report["corrupted"].append(path)
            continue
        if is_blank_or_unusable(path):
            report["blank_or_unusable"].append(path)
            continue
        if is_low_quality(path, blur_threshold=blur_threshold):
            report["low_quality"].append(path)
            continue
        if dedup:
            h = compute_image_hash(path)
            if h is None:
                report["corrupted"].append(path)
                continue
            if h in seen_hashes:
                report["duplicate"].append(path)
                continue
            seen_hashes.add(h)
        keep_paths.append(path)

    return keep_paths, report


def print_curation_report(report: dict, total: int) -> None:
    dropped = sum(len(v) for v in report.values())
    print(f"Curation: {total} images in, {dropped} dropped, {total - dropped} kept")
    for reason, paths in report.items():
        print(f"  - {reason}: {len(paths)}")


# ---------------------------------------------------------------------------
# Shared low-level image transforms (used inside Dataset __getitem__)
# ---------------------------------------------------------------------------

def resize_and_pad(img: np.ndarray, target_size: int) -> np.ndarray:
    """
    Resize preserving aspect ratio, then pad to a square `target_size` x
    `target_size`. Avoids the distortion a naive resize introduces, which
    matters for lesion boundary / anatomical structure shape.
    """
    h, w = img.shape[:2]
    scale = target_size / max(h, w)
    new_h, new_w = int(round(h * scale)), int(round(w * scale))
    resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)

    if resized.ndim == 2:
        canvas = np.zeros((target_size, target_size), dtype=resized.dtype)
    else:
        canvas = np.zeros((target_size, target_size, resized.shape[2]), dtype=resized.dtype)

    top = (target_size - new_h) // 2
    left = (target_size - new_w) // 2
    canvas[top:top + new_h, left:left + new_w] = resized
    return canvas


def apply_clahe(gray_img: np.ndarray, clip_limit: float = 2.0, tile_size: int = 8) -> np.ndarray:
    """Contrast-Limited Adaptive Histogram Equalization for grayscale images
    (chest X-ray, MRI) — boosts local contrast without blowing out global
    intensity, which plain histogram equalization tends to do."""
    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(tile_size, tile_size))
    return clahe.apply(gray_img)


def remove_hair_artifacts(bgr_img: np.ndarray) -> np.ndarray:
    """
    Dermoscopy images (HAM10000) frequently have hair occluding the lesion.
    Standard approach: blackhat morphological filter to find hair-like
    structures, threshold, then inpaint. Cheap and commonly used as a
    preprocessing step for skin lesion classification.
    """
    gray = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2GRAY)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (17, 17))
    blackhat = cv2.morphologyEx(gray, cv2.MORPH_BLACKHAT, kernel)
    _, mask = cv2.threshold(blackhat, 10, 255, cv2.THRESH_BINARY)
    return cv2.inpaint(bgr_img, mask, inpaintRadius=1, flags=cv2.INPAINT_TELEA)


def normalize_to_unit(img: np.ndarray) -> np.ndarray:
    """Scale uint8 [0,255] image to float32 [0,1]."""
    return img.astype(np.float32) / 255.0

"""
Modality router: loads the three trained CNNs and dispatches an image to
the right one. This mirrors the "Modality Router" box in your full-stack
diagram — it's built now so the future FastAPI ML service can import
`ModalityRouter` directly and call `.predict(image_path, modality)` without
needing to know about training code, checkpoints, or per-modality
preprocessing details.

INCOMPLETE / KNOWN LIMITATION (flagging explicitly rather than faking it):
`infer_modality()` below is a placeholder heuristic, NOT a trained
classifier. Chest X-rays and MRI slices are both grayscale, so simple
pixel statistics cannot reliably tell them apart — that would need its own
small classifier trained on all three image types, which is out of scope
for this ML stage. Until that exists, the router requires the caller (the
future frontend / API layer, where the user explicitly picks "X-ray" /
"Skin" / "MRI" before upload) to pass `modality` explicitly. Do not rely
on infer_modality() for real routing decisions yet.
"""

import os
import sys

import numpy as np
import torch

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import (
    DEVICE, CHECKPOINT_DIR,
    CHEST_XRAY_LABELS, SKIN_LABELS, MRI_LABELS,
)
from models.chest_xray_model import ChestXrayCNN
from models.skin_model import SkinLesionCNN
from models.mri_model import MRIClassifierCNN
from preprocessing.chest_xray_preprocessing import chest_xray_transform
from preprocessing.skin_preprocessing import skin_transform
from preprocessing.mri_preprocessing import mri_transform

MODALITIES = ("chest_xray", "skin", "mri")


class ModalityRouter:
    def __init__(self, checkpoint_dir: str = CHECKPOINT_DIR, device=DEVICE):
        self.device = device
        self.models = {}
        self.labels = {
            "chest_xray": CHEST_XRAY_LABELS,
            "skin": SKIN_LABELS,
            "mri": MRI_LABELS,
        }
        self.transforms = {
            "chest_xray": chest_xray_transform,
            "skin": skin_transform,
            "mri": mri_transform,
        }
        self._checkpoint_dir = checkpoint_dir

    def _load_model(self, modality: str):
        if modality in self.models:
            return self.models[modality]

        if modality == "chest_xray":
            model = ChestXrayCNN(num_labels=len(CHEST_XRAY_LABELS))
        elif modality == "skin":
            model = SkinLesionCNN(num_classes=len(SKIN_LABELS))
        elif modality == "mri":
            model = MRIClassifierCNN(num_classes=len(MRI_LABELS))
        else:
            raise ValueError(f"Unknown modality '{modality}'. Expected one of {MODALITIES}.")

        ckpt_path = os.path.join(self._checkpoint_dir, f"{modality}_best.pt")
        if not os.path.exists(ckpt_path):
            raise FileNotFoundError(
                f"No trained checkpoint found for '{modality}' at {ckpt_path}. "
                f"Run training/train_{modality}.py first."
            )
        model.load_state_dict(torch.load(ckpt_path, map_location=self.device))
        model.to(self.device)
        model.eval()
        self.models[modality] = model
        return model

    def infer_modality(self, image_path: str) -> str:
        """
        Placeholder heuristic only — see module docstring. Uses color vs.
        grayscale as the one signal that's actually reliable (skin images
        are color; chest X-ray / MRI are grayscale), and cannot distinguish
        chest X-ray from MRI at all. Raises to make that limitation loud
        rather than silently guessing wrong.
        """
        import cv2
        img = cv2.imread(image_path, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError(f"Could not read image: {image_path}")
        b, g, r = img[:, :, 0], img[:, :, 1], img[:, :, 2]
        is_color = not (np.allclose(b, g, atol=5) and np.allclose(g, r, atol=5))
        if is_color:
            return "skin"
        raise NotImplementedError(
            "Cannot reliably distinguish chest X-ray from MRI automatically "
            "yet — pass modality explicitly."
        )

    def predict(self, image_path: str, modality: str) -> dict:
        """
        Run inference for one image against one modality's model.

        Returns a dict shaped for direct JSON serialization by a future
        FastAPI endpoint:
            {"modality": ..., "predicted_label": ..., "confidence": ...,
             "probabilities": {label: prob, ...}}
        """
        if modality not in MODALITIES:
            raise ValueError(f"Unknown modality '{modality}'. Expected one of {MODALITIES}.")

        model = self._load_model(modality)
        transform_fn = self.transforms[modality]
        labels = self.labels[modality]

        img = transform_fn(image_path, augment=False)
        tensor = torch.from_numpy(img).unsqueeze(0).float().to(self.device)  # (1, C, H, W)

        with torch.no_grad():
            logits = model(tensor)
            if modality == "chest_xray":
                probs = torch.sigmoid(logits).cpu().numpy()[0]
                result_probs = {label: float(p) for label, p in zip(labels, probs)}
                # multi-label: report all findings above 0.5, or "No Finding"
                positive = [l for l, p in result_probs.items() if p >= 0.5]
                predicted_label = "|".join(positive) if positive else "No Finding"
                confidence = float(max(probs)) if positive else float(1 - max(probs))
            else:
                probs = torch.softmax(logits, dim=1).cpu().numpy()[0]
                result_probs = {label: float(p) for label, p in zip(labels, probs)}
                best_idx = int(np.argmax(probs))
                predicted_label = labels[best_idx]
                confidence = float(probs[best_idx])

        return {
            "modality": modality,
            "predicted_label": predicted_label,
            "confidence": confidence,
            "probabilities": result_probs,
        }

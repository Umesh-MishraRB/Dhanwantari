"""
Prediction + Grad-CAM in one call, for the MERN backend.

Drop this file into  <your ML project>/inference/explain.py
It reuses the already-loaded models from ModalityRouter (no second copy in memory) and
the same Grad-CAM target layer used in evaluation/evaluate_and_visualize.py
(the Conv2d of the last ConvBlock in `model.features`).
"""

import base64
import os
import sys

import cv2
import numpy as np
import torch
import torch.nn.functional as F

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from inference.predict import _get_router, predict_image  # noqa: E402


def _target_layer(model):
    return list(model.features.children())[-1].block[0]


def _gradcam_overlay_base64(image_path: str, modality: str):
    """
    Returns (png_base64, class_index) - a JET heat-map blended over the preprocessed
    input, explaining the model's top class (for chest X-ray: the strongest finding).
    """
    router = _get_router()
    model = router._load_model(modality)
    transform_fn = router.transforms[modality]
    device = router.device

    img = transform_fn(image_path, augment=False)                     # (C, H, W) float32 in [0, 1]
    tensor = torch.from_numpy(img).unsqueeze(0).float().to(device)    # (1, C, H, W)

    store = {}
    layer = _target_layer(model)

    def fwd_hook(_module, _inp, out):
        store["act"] = out
        out.register_hook(lambda grad: store.__setitem__("grad", grad))

    handle = layer.register_forward_hook(fwd_hook)
    try:
        with torch.enable_grad():
            model.zero_grad()
            logits = model(tensor)
            class_idx = int(logits[0].argmax().item())
            logits[0, class_idx].backward()
    finally:
        handle.remove()

    act, grad = store["act"].detach(), store["grad"].detach()
    weights = grad.mean(dim=(2, 3), keepdim=True)
    cam = F.relu((weights * act).sum(dim=1, keepdim=True))
    cam = F.interpolate(cam, size=tensor.shape[2:], mode="bilinear", align_corners=False)
    cam = cam.squeeze().cpu().numpy()
    cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)

    base = np.clip(img, 0, 1)
    if base.shape[0] == 1:
        base = np.repeat(base, 3, axis=0)
    base = (np.transpose(base, (1, 2, 0)) * 255).astype(np.uint8)       # RGB, as used in evaluation plots
    base_bgr = cv2.cvtColor(base, cv2.COLOR_RGB2BGR)

    heat = cv2.applyColorMap((cam * 255).astype(np.uint8), cv2.COLORMAP_JET)  # BGR
    overlay = cv2.addWeighted(base_bgr, 0.6, heat, 0.4, 0)
    overlay = cv2.resize(overlay, (512, 512), interpolation=cv2.INTER_CUBIC)

    ok, buf = cv2.imencode(".png", overlay)
    if not ok:
        raise RuntimeError("Could not encode Grad-CAM image")
    return base64.b64encode(buf.tobytes()).decode("ascii"), class_idx


def predict_with_gradcam(image_path: str, modality: str) -> dict:
    """Same dict as predict_image(), plus `gradcam_base64` (PNG) and `gradcam_label`."""
    result = predict_image(image_path, modality)
    router = _get_router()
    labels = router.labels[modality]

    try:
        gradcam_b64, class_idx = _gradcam_overlay_base64(image_path, modality)
        result["gradcam_base64"] = gradcam_b64
        result["gradcam_label"] = labels[class_idx] if class_idx < len(labels) else str(class_idx)
    except Exception as exc:  # never lose the prediction because the heat-map failed
        print(f"Grad-CAM failed for {modality}: {exc}")
        result["gradcam_base64"] = None
        result["gradcam_label"] = None
    return result

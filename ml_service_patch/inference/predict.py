"""
Single inference entrypoint, kept deliberately thin. This is the exact
function boundary your future FastAPI ML service (from the full-stack
diagram) should call — it takes a file path and a modality string and
returns a plain dict, no web framework, HTTP, or DB code involved.

Example of how that future service would use this (illustrative only,
not implemented here since you said not to touch the full-stack part):

    from fastapi import FastAPI, UploadFile, Form
    from inference.predict import predict_image

    app = FastAPI()

    @app.post("/predict")
    async def predict(file: UploadFile, modality: str = Form(...)):
        tmp_path = save_upload_to_tmp(file)
        result = predict_image(tmp_path, modality)
        return result   # already JSON-serializable
"""

import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models.modality_router import ModalityRouter

_router = None


def _get_router() -> ModalityRouter:
    global _router
    if _router is None:
        _router = ModalityRouter()
    return _router


def predict_image(image_path: str, modality: str) -> dict:
    """
    modality must be one of: "chest_xray", "skin", "mri".
    Returns: {"modality", "predicted_label", "confidence", "probabilities"}
    """
    router = _get_router()
    return router.predict(image_path, modality)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Run a single-image prediction from the command line.")
    parser.add_argument("image_path")
    parser.add_argument("modality", choices=["chest_xray", "skin", "mri"])
    args = parser.parse_args()

    result = predict_image(args.image_path, args.modality)
    print(result)

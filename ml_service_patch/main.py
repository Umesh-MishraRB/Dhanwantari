
import os
import tempfile
from pathlib import Path

import cv2
from fastapi import FastAPI, File, HTTPException, UploadFile

from inference.predict import predict_image
from inference.explain import predict_with_gradcam


app = FastAPI(
    title="Medical Image ML API",
    description=(
        "Research API for MRI, skin-lesion, and chest X-ray "
        "image classification."
    ),
    version="1.0.0",
)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

DISCLAIMER = (
    "For research and software testing only. "
    "Predictions are not medical diagnoses and must not "
    "be used as a substitute for professional medical advice."
)


@app.get("/")
def home():
    return {
        "message": "Medical Image ML API is running",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/models")
def available_models():
    return {
        "models": [
            {
                "modality": "mri",
                "endpoint": "/predict/mri",
            },
            {
                "modality": "skin",
                "endpoint": "/predict/skin",
            },
            {
                "modality": "chest_xray",
                "endpoint": "/predict/chest_xray",
            },
        ],
        "with_gradcam": [
            "/analyze/mri",
            "/analyze/skin",
            "/analyze/chest_xray",
        ],
    }


def run_prediction(file: UploadFile, modality: str, with_gradcam: bool = False):
    suffix = Path(file.filename or "").suffix.lower()

    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file extension. Use JPG, JPEG, PNG, or BMP.",
        )

    temp_path = None

    try:
        contents = file.file.read(MAX_FILE_SIZE + 1)

        if not contents:
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is empty.",
            )

        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail="Image exceeds the 10 MB upload limit.",
            )

        with tempfile.NamedTemporaryFile(
            mode="wb",
            suffix=suffix,
            delete=False,
        ) as temp_file:
            temp_file.write(contents)
            temp_path = temp_file.name

        # Reject files that OpenCV cannot decode as images.
        image = cv2.imread(temp_path, cv2.IMREAD_UNCHANGED)

        if image is None:
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is not a readable image.",
            )

        if with_gradcam:
            result = predict_with_gradcam(temp_path, modality)
        else:
            result = predict_image(temp_path, modality)

        return {
            **result,
            "disclaimer": DISCLAIMER,
        }

    except HTTPException:
        raise

    except Exception as exc:
        # Keep detailed diagnostics in the terminal during development.
        print(f"Prediction failed for {modality}: {exc}")
        raise HTTPException(
            status_code=500,
            detail="Prediction failed. Check the server terminal for details.",
        ) from exc

    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


@app.post("/predict/mri")
def predict_mri(file: UploadFile = File(...)):
    return run_prediction(file, "mri")


@app.post("/predict/skin")
def predict_skin(file: UploadFile = File(...)):
    return run_prediction(file, "skin")


@app.post("/predict/chest_xray")
def predict_chest_xray(file: UploadFile = File(...)):
    return run_prediction(file, "chest_xray")


# --- Added for the MERN app: prediction + Grad-CAM heat-map (base64 PNG) -----
@app.post("/analyze/mri")
def analyze_mri(file: UploadFile = File(...)):
    return run_prediction(file, "mri", with_gradcam=True)


@app.post("/analyze/skin")
def analyze_skin(file: UploadFile = File(...)):
    return run_prediction(file, "skin", with_gradcam=True)


@app.post("/analyze/chest_xray")
def analyze_chest_xray(file: UploadFile = File(...)):
    return run_prediction(file, "chest_xray", with_gradcam=True)

import { env } from "../config/env.js";
import { HttpError } from "../utils/HttpError.js";

const MOCK = {
  mri: { label: "meningioma", labels: ["glioma", "meningioma", "notumor", "pituitary"], p: [0.1, 0.72, 0.1, 0.08] },
  skin: { label: "nv", labels: ["akiec", "bcc", "bkl", "df", "mel", "nv", "vasc"], p: [0.02, 0.03, 0.08, 0.01, 0.1, 0.74, 0.02] },
  chest_xray: { label: "Effusion", labels: ["Effusion", "Pneumonia", "Cardiomegaly"], p: [0.64, 0.31, 0.12] },
};

function mockResult(modality) {
  const m = MOCK[modality];
  const probabilities = Object.fromEntries(m.labels.map((l, i) => [l, m.p[i]]));
  return {
    modality,
    predicted_label: m.label,
    confidence: Math.max(...m.p),
    probabilities,
    gradcam_base64: null, // the UI shows a placeholder when no Grad-CAM is returned
    disclaimer: "MOCK RESULT - ML_MOCK=true. Not a real prediction.",
  };
}

/**
 * Sends the image to the separate FastAPI ML service.
 * Expects the /analyze/<modality> endpoint from ml_service_patch/ (prediction + Grad-CAM).
 */
export async function analyzeImage({ buffer, filename, mimetype, modality }) {
  if (env.mlMock) return mockResult(modality);

  const form = new FormData();
  form.append("file", new Blob([buffer], { type: mimetype || "application/octet-stream" }), filename || "scan.jpg");

  let res;
  try {
    res = await fetch(`${env.mlApiUrl}/analyze/${modality}`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(90_000),
    });
  } catch {
    throw new HttpError(503, "The prediction service is not reachable right now. Please try again shortly.");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = typeof body.detail === "string" ? body.detail : "";
    if (res.status === 400 || res.status === 413) throw new HttpError(res.status, detail || "The image could not be processed.");
    if (res.status === 404) {
      throw new HttpError(502, "ML service is missing the /analyze endpoints. Apply ml_service_patch/ (see README).");
    }
    throw new HttpError(502, detail || "The prediction service failed to process this image.");
  }
  return res.json();
}

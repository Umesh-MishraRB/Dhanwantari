import mongoose from "mongoose";

const predictionSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    modality: { type: String, enum: ["mri", "skin", "chest_xray"], required: true },
    imageUrl: { type: String, required: true },
    predictedLabel: { type: String, required: true }, // raw label(s) from the ML service
    primaryLabel: { type: String, required: true }, // single label used for display/mapping
    displayName: { type: String, required: true },
    confidence: { type: Number, min: 0, max: 1, required: true },
    probabilities: { type: Map, of: Number },
    riskLevel: { type: String, enum: ["low", "medium", "high"], required: true },
    riskNote: { type: String, default: "" },
    specialization: { type: mongoose.Schema.Types.ObjectId, ref: "Specialization" },
    blogSlug: { type: String, default: "" },
    gradcamUrl: { type: String, default: "" },
    disclaimer: { type: String, default: "" },
  },
  { timestamps: true }
);

predictionSchema.index({ patient: 1, createdAt: -1 });

export default mongoose.model("Prediction", predictionSchema);

import mongoose from "mongoose";

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    category: { type: String, required: true, index: true }, // e.g. "Respiratory", "Skin", "Neurology", "Heart"
    summary: { type: String, required: true },
    overview: { type: String, default: "" },
    symptoms: [String],
    precautions: [String],
    treatments: [String], // general information only
    whenToSeeDoctor: [String],
    coverImageUrl: { type: String, default: "" },
    readMinutes: { type: Number, default: 4 },
    author: { type: String, default: "Dhanwantari Editorial Team" },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

blogSchema.index({ title: "text", summary: "text", category: "text" });

export default mongoose.model("Blog", blogSchema);

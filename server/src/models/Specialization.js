import mongoose from "mongoose";

const specializationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "" },
    iconUrl: { type: String, default: "" }, // optional image, rendered with a plain <img>
  },
  { timestamps: true }
);

export default mongoose.model("Specialization", specializationSchema);

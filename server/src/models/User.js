import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Not required for accounts created through "Continue with Google".
    passwordHash: { type: String, required: function () { return !this.googleId && this.authProvider !== "google"; }, select: false },
    googleId: { type: String, unique: true, sparse: true, index: true },
    authProvider: { type: String, enum: ["local", "google"], default: "local" },
    role: { type: String, enum: ["patient", "doctor"], required: true, index: true },
    avatarUrl: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);

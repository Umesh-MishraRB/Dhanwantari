// Casual safety check: every ML label the model can output must map to a display name, a specialization that
// exists in the seed data, and (when set) a blog that exists. Run:  npm run check-mapping
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describePrediction } from "../src/config/diseaseMap.js";
import { specializations, blogs, doctors } from "../src/seed/data.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const cfg = path.resolve(here, "../../ml_service_patch/config.py");
const py = fs.existsSync(cfg) ? fs.readFileSync(cfg, "utf8") : "";
const list = (name) => {
  const m = py.match(new RegExp(`${name}\\s*=\\s*\\[([\\s\\S]*?)\\]`));
  return m ? [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : [];
};
const LABELS = { chest_xray: list("CHEST_XRAY_LABELS"), skin: list("SKIN_LABELS"), mri: list("MRI_LABELS") };
if (!Object.values(LABELS).every((l) => l.length)) {
  console.error("Could not read the label lists from ml_service_patch/config.py");
  process.exit(2);
}

const specSlugs = new Set(specializations.map((s) => s.slug));
const blogSlugs = new Set(blogs.map((b) => b.slug));
const doctorSpecs = new Set(doctors.map((d) => d.spec));
let bad = 0;
const fail = (m) => { bad++; console.log("  FAIL", m); };

for (const [modality, labels] of Object.entries(LABELS)) {
  console.log(`${modality}: ${labels.length} labels`);
  const all = modality === "chest_xray" ? [...labels, "No Finding", `${labels[0]}|${labels[2]}`] : labels;
  for (const label of all) {
    const probs = Object.fromEntries(labels.map((l) => [l, l === label.split("|")[0] ? 0.9 : 0.05]));
    const r = describePrediction(modality, { predicted_label: label, confidence: 0.9, probabilities: probs });
    if (!r.displayName) fail(`${modality}/${label}: no display name`);
    if (!specSlugs.has(r.specialtySlug)) fail(`${modality}/${label}: specialization "${r.specialtySlug}" does not exist`);
    if (!doctorSpecs.has(r.specialtySlug)) fail(`${modality}/${label}: no seeded doctor for "${r.specialtySlug}"`);
    if (r.blogSlug && !blogSlugs.has(r.blogSlug)) fail(`${modality}/${label}: blog "${r.blogSlug}" does not exist`);
    if (!["low", "medium", "high"].includes(r.riskLevel)) fail(`${modality}/${label}: bad risk level`);
  }
}
// low confidence must step the risk down
const hi = describePrediction("skin", { predicted_label: "mel", confidence: 0.9, probabilities: {} }).riskLevel;
const lo = describePrediction("skin", { predicted_label: "mel", confidence: 0.3, probabilities: {} }).riskLevel;
if (!(hi === "high" && lo === "medium")) fail(`risk step-down broken (high-confidence=${hi}, low-confidence=${lo})`);

console.log(bad ? `\n${bad} problem(s) found` : "\nAll labels map to a real specialization, doctor and blog.");
process.exit(bad ? 1 : 0);

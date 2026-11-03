/**
 * Maps ML labels -> display name, specialization, base severity and related blog.
 * This is the "generalized" domain content: edit freely. Specialization slugs must exist
 * in the specializations collection (see seed/seed.js).
 *
 * severity: "none" | "low" | "medium" | "high"  (how worrying the finding is on its own)
 */
const pretty = (s) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const MAP = {
  mri: {
    glioma: { name: "Glioma (brain tumor pattern)", spec: "neurology", severity: "high", blog: "brain-tumors-overview" },
    meningioma: { name: "Meningioma (brain tumor pattern)", spec: "neurology", severity: "medium", blog: "brain-tumors-overview" },
    pituitary: { name: "Pituitary tumor pattern", spec: "endocrinology", severity: "medium", blog: "brain-tumors-overview" },
    notumor: { name: "No tumor pattern detected", spec: "general-medicine", severity: "none", blog: "" },
  },
  skin: {
    mel: { name: "Melanoma", spec: "dermatology", severity: "high", blog: "skin-cancer-melanoma-awareness" },
    bcc: { name: "Basal cell carcinoma", spec: "dermatology", severity: "high", blog: "skin-cancer-melanoma-awareness" },
    akiec: { name: "Actinic keratosis / intraepithelial carcinoma", spec: "dermatology", severity: "medium", blog: "skin-cancer-melanoma-awareness" },
    bkl: { name: "Benign keratosis-like lesion", spec: "dermatology", severity: "low", blog: "benign-skin-lesions" },
    df: { name: "Dermatofibroma", spec: "dermatology", severity: "low", blog: "benign-skin-lesions" },
    nv: { name: "Melanocytic nevus (common mole)", spec: "dermatology", severity: "low", blog: "benign-skin-lesions" },
    vasc: { name: "Vascular skin lesion", spec: "dermatology", severity: "low", blog: "benign-skin-lesions" },
  },
  chest_xray: {
    Pneumonia: { name: "Pneumonia", spec: "pulmonology", severity: "high", blog: "pneumonia-basics" },
    Pneumothorax: { name: "Pneumothorax", spec: "pulmonology", severity: "high", blog: "pneumonia-basics" },
    Mass: { name: "Lung mass", spec: "pulmonology", severity: "high", blog: "" },
    Nodule: { name: "Lung nodule", spec: "pulmonology", severity: "medium", blog: "" },
    Effusion: { name: "Pleural effusion", spec: "pulmonology", severity: "medium", blog: "pneumonia-basics" },
    Infiltration: { name: "Lung infiltration", spec: "pulmonology", severity: "medium", blog: "pneumonia-basics" },
    Consolidation: { name: "Lung consolidation", spec: "pulmonology", severity: "medium", blog: "pneumonia-basics" },
    Atelectasis: { name: "Atelectasis", spec: "pulmonology", severity: "medium", blog: "" },
    Edema: { name: "Pulmonary edema", spec: "cardiology", severity: "high", blog: "heart-enlargement-cardiomegaly" },
    Cardiomegaly: { name: "Cardiomegaly (enlarged heart)", spec: "cardiology", severity: "medium", blog: "heart-enlargement-cardiomegaly" },
    Emphysema: { name: "Emphysema", spec: "pulmonology", severity: "medium", blog: "" },
    Fibrosis: { name: "Pulmonary fibrosis", spec: "pulmonology", severity: "medium", blog: "" },
    Pleural_Thickening: { name: "Pleural thickening", spec: "pulmonology", severity: "low", blog: "" },
    Hernia: { name: "Hernia", spec: "general-surgery", severity: "low", blog: "" },
  },
};

const LEVELS = ["low", "medium", "high"];
const FALLBACK = { name: "", spec: "general-medicine", severity: "low", blog: "" };

/**
 * Turns the raw ML response into display data + a risk level.
 * Risk = base severity of the finding, stepped down one level when model confidence < 0.5.
 * This is decision support for choosing a doctor - NOT a clinical risk score.
 */
export function describePrediction(modality, ml) {
  const probs = ml.probabilities || {};
  const raw = String(ml.predicted_label || "");
  const confidence = Number(ml.confidence ?? 0);

  let primary = raw;
  if (modality === "chest_xray") {
    if (raw === "No Finding") {
      return {
        primaryLabel: "No Finding",
        displayName: "No significant finding detected",
        specialtySlug: "general-medicine",
        blogSlug: "",
        riskLevel: "low",
        riskNote: "The model did not flag any of the 14 findings above its threshold. Symptoms still deserve a doctor's opinion.",
      };
    }
    // multi-label output looks like "Effusion|Infiltration" - use the strongest finding
    const positives = raw.split("|").filter(Boolean);
    primary = positives.sort((a, b) => (probs[b] ?? 0) - (probs[a] ?? 0))[0] || raw;
  }

  const entry = MAP[modality]?.[primary] || { ...FALLBACK, name: pretty(primary) };
  let risk;
  if (entry.severity === "none") risk = "low";
  else {
    let idx = LEVELS.indexOf(entry.severity);
    if (confidence < 0.5) idx = Math.max(0, idx - 1);
    risk = LEVELS[idx];
  }

  const notes = [];
  if (confidence < 0.5) notes.push("Model confidence is low - treat this result as uncertain.");
  if (modality === "chest_xray" && raw.includes("|")) notes.push(`Multiple findings flagged: ${raw.split("|").map(pretty).join(", ")}.`);

  return {
    primaryLabel: primary,
    displayName: entry.name,
    specialtySlug: entry.spec,
    blogSlug: entry.blog,
    riskLevel: risk,
    riskNote: notes.join(" "),
  };
}

export const MODALITIES = ["mri", "skin", "chest_xray"];
export const MODALITY_LABELS = { mri: "Brain MRI", skin: "Skin lesion", chest_xray: "Chest X-ray" };

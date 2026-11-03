// Generalized seed content - replace with real doctors / articles whenever you like.

export const specializations = [
  { name: "General Medicine", slug: "general-medicine", description: "First point of contact for common illnesses, check-ups and unclear symptoms." },
  { name: "Neurology", slug: "neurology", description: "Disorders of the brain, spinal cord and nerves, including brain tumors." },
  { name: "Dermatology", slug: "dermatology", description: "Skin, hair and nail conditions, including skin lesion and mole evaluation." },
  { name: "Pulmonology", slug: "pulmonology", description: "Lung and breathing conditions such as pneumonia, effusion and fibrosis." },
  { name: "Cardiology", slug: "cardiology", description: "Heart and circulation, including an enlarged heart and heart failure." },
  { name: "Endocrinology", slug: "endocrinology", description: "Hormonal conditions including pituitary and thyroid disorders and diabetes." },
  { name: "General Surgery", slug: "general-surgery", description: "Surgical evaluation for hernias and other conditions that may need an operation." },
];

export const doctors = [
  { name: "Dr. Aarav Mehta", email: "aarav.mehta@demo.com", spec: "general-medicine", qualifications: ["MBBS", "MD (Internal Medicine)"], exp: 12, city: "Bhopal", clinic: "CityCare Clinic", languages: ["English", "Hindi"], bio: "Internal medicine physician focused on preventive care and early evaluation of undiagnosed symptoms." },
  { name: "Dr. Nisha Verma", email: "nisha.verma@demo.com", spec: "neurology", qualifications: ["MBBS", "DM (Neurology)"], exp: 15, city: "Indore", clinic: "NeuroLife Centre", languages: ["English", "Hindi"], bio: "Neurologist with a special interest in brain tumors, epilepsy and headache disorders." },
  { name: "Dr. Rohan Iyer", email: "rohan.iyer@demo.com", spec: "dermatology", qualifications: ["MBBS", "MD (Dermatology)"], exp: 9, city: "Bhopal", clinic: "ClearSkin Dermatology", languages: ["English", "Hindi", "Tamil"], bio: "Dermatologist experienced in dermoscopy, mole mapping and early skin cancer detection." },
  { name: "Dr. Meera Kapoor", email: "meera.kapoor@demo.com", spec: "dermatology", qualifications: ["MBBS", "DDVL"], exp: 7, city: "Delhi", clinic: "Kapoor Skin & Laser", languages: ["English", "Hindi", "Punjabi"], bio: "Treats inflammatory skin disease, pigmentation and benign skin growths." },
  { name: "Dr. Sanjay Rao", email: "sanjay.rao@demo.com", spec: "pulmonology", qualifications: ["MBBS", "MD (Pulmonary Medicine)"], exp: 18, city: "Hyderabad", clinic: "BreatheWell Chest Clinic", languages: ["English", "Telugu", "Hindi"], bio: "Chest physician managing pneumonia, pleural disease, COPD and interstitial lung disease." },
  { name: "Dr. Farah Khan", email: "farah.khan@demo.com", spec: "pulmonology", qualifications: ["MBBS", "DNB (Respiratory Medicine)"], exp: 10, city: "Mumbai", clinic: "Harbor Lung Institute", languages: ["English", "Hindi", "Urdu"], bio: "Focuses on lung nodules, chronic cough and sleep-related breathing disorders." },
  { name: "Dr. Vikram Singh", email: "vikram.singh@demo.com", spec: "cardiology", qualifications: ["MBBS", "DM (Cardiology)"], exp: 20, city: "Jaipur", clinic: "HeartFirst Cardiac Centre", languages: ["English", "Hindi"], bio: "Interventional cardiologist with experience in heart failure and cardiomyopathy care." },
  { name: "Dr. Ananya Das", email: "ananya.das@demo.com", spec: "endocrinology", qualifications: ["MBBS", "DM (Endocrinology)"], exp: 11, city: "Kolkata", clinic: "Hormone Health Clinic", languages: ["English", "Bengali", "Hindi"], bio: "Endocrinologist treating pituitary, thyroid and diabetes-related conditions." },
  { name: "Dr. Kabir Joshi", email: "kabir.joshi@demo.com", spec: "general-surgery", qualifications: ["MBBS", "MS (General Surgery)"], exp: 14, city: "Pune", clinic: "Joshi Surgical Care", languages: ["English", "Hindi", "Marathi"], bio: "General surgeon performing hernia repair and minimally invasive procedures." },
];

export const demoPatient = { name: "Demo Patient", email: "patient@demo.com", password: "Patient@123" };
export const DOCTOR_PASSWORD = "Doctor@123";

export const blogs = [
  {
    slug: "pneumonia-basics", category: "Respiratory", readMinutes: 5, title: "Pneumonia: Symptoms, Precautions and Treatment",
    summary: "An infection that inflames the air sacs of one or both lungs. Learn the warning signs and how it is usually treated.",
    overview: "Pneumonia is an infection of the lungs caused by bacteria, viruses or, less often, fungi. The air sacs can fill with fluid or pus, which makes breathing painful and reduces oxygen reaching the blood. It ranges from mild to life-threatening and is most serious in infants, older adults and people with weak immunity or long-term illness.",
    symptoms: ["Cough, sometimes with phlegm", "Fever, chills and sweating", "Shortness of breath or fast breathing", "Chest pain that worsens when breathing or coughing", "Fatigue and loss of appetite"],
    precautions: ["Get recommended vaccines (pneumococcal, influenza, COVID-19)", "Wash hands often and avoid close contact with sick people", "Do not smoke and limit exposure to smoke and air pollution", "Treat colds and flu early and rest well", "Keep chronic conditions such as diabetes and asthma under control"],
    treatments: ["Bacterial pneumonia is usually treated with antibiotics prescribed by a doctor", "Viral pneumonia is mainly managed with rest, fluids and fever control; some viruses have specific antivirals", "Severe cases may need hospital care, oxygen or IV medicines", "Complete the full course of any prescribed medicine"],
    whenToSeeDoctor: ["Difficulty breathing or bluish lips", "Persistent high fever or confusion", "Cough lasting more than two weeks", "Symptoms that worsen after initial improvement"],
  },
  {
    slug: "heart-enlargement-cardiomegaly", category: "Heart", readMinutes: 5, title: "Enlarged Heart (Cardiomegaly): What It Means",
    summary: "Cardiomegaly is a sign, not a disease by itself. Understand common causes and the lifestyle steps that protect your heart.",
    overview: "An enlarged heart appears larger than normal on a chest X-ray. It can result from the heart working harder than usual, for example because of high blood pressure, valve disease or weakened heart muscle, and sometimes from temporary causes such as pregnancy or severe anaemia. Finding the underlying cause is the key step.",
    symptoms: ["Shortness of breath, especially when lying flat", "Swelling in legs, ankles or feet", "Irregular or rapid heartbeat", "Persistent tiredness", "Many people have no symptoms at first"],
    precautions: ["Check and control blood pressure regularly", "Eat a balanced, lower-salt diet", "Stay physically active as advised by your doctor", "Avoid smoking and limit alcohol", "Manage diabetes and cholesterol"],
    treatments: ["Treatment targets the underlying cause", "Medicines may be used to lower blood pressure or reduce strain on the heart", "Some people need procedures such as valve repair or a device", "Regular follow-up with a cardiologist is important"],
    whenToSeeDoctor: ["Chest pain or pressure", "Fainting or near-fainting", "Sudden or worsening breathlessness", "Rapid swelling of legs or abdomen"],
  },
  {
    slug: "skin-cancer-melanoma-awareness", category: "Skin", readMinutes: 5, title: "Skin Cancer and Melanoma: Know the Warning Signs",
    summary: "Most skin cancers are treatable when found early. Learn the ABCDE checklist and how to protect your skin.",
    overview: "Skin cancer is the abnormal growth of skin cells, often triggered by ultraviolet (UV) exposure. Basal cell and squamous cell cancers are the most common; melanoma is less common but more likely to spread if not found early. Any new or changing spot deserves a professional look - a self-check or an app cannot replace a dermatologist.",
    symptoms: ["Asymmetry: one half of a mole does not match the other", "Border: edges that are irregular or blurred", "Colour: several shades within one spot", "Diameter: larger than about 6 mm, or growing", "Evolving: any change in size, shape, colour, itching or bleeding"],
    precautions: ["Use broad-spectrum sunscreen (SPF 30+) and reapply every two hours outdoors", "Wear hats, sunglasses and protective clothing", "Seek shade during peak midday sun", "Avoid tanning beds", "Check your skin monthly and photograph moles to track change"],
    treatments: ["Diagnosis is confirmed by a skin biopsy", "Most early skin cancers are treated by surgical removal", "Other options include topical treatments, freezing or radiotherapy depending on type", "Advanced melanoma may need immunotherapy or targeted therapy under a specialist"],
    whenToSeeDoctor: ["A mole or spot that changes, bleeds or does not heal", "A new dark or unusual lesion", "A sore that persists for several weeks"],
  },
  {
    slug: "benign-skin-lesions", category: "Skin", readMinutes: 3, title: "Common Benign Skin Lesions: Moles, Keratoses and More",
    summary: "Many skin growths are harmless. Learn what typical benign lesions look like and when a check-up is still wise.",
    overview: "Benign lesions such as common moles (nevi), seborrheic keratoses, dermatofibromas and small vascular spots are very common and usually harmless. They tend to stay stable over time. Because some cancers can look similar, new or changing lesions should be examined by a dermatologist.",
    symptoms: ["Evenly coloured, round or oval moles with smooth borders", "Waxy, 'stuck-on' brown growths (seborrheic keratosis)", "Firm small bumps that dimple when pinched (dermatofibroma)", "Small red or purple spots (vascular lesions)"],
    precautions: ["Protect skin from excess sun", "Avoid picking or scratching lesions", "Take dated photos to notice change", "Have a full-skin check if you have many moles or a family history of skin cancer"],
    treatments: ["Most need no treatment", "Removal is optional for cosmetic reasons or irritation", "Any lesion removed is usually sent for examination to be sure"],
    whenToSeeDoctor: ["Rapid growth, bleeding, itching or colour change", "A lesion that looks different from your other moles"],
  },
  {
    slug: "brain-tumors-overview", category: "Neurology", readMinutes: 6, title: "Brain Tumors: Types, Symptoms and Care Options",
    summary: "A plain-language overview of glioma, meningioma and pituitary tumors and how they are evaluated.",
    overview: "A brain tumor is an abnormal growth of cells in or around the brain. Gliomas arise from supportive brain cells, meningiomas from the membranes covering the brain, and pituitary tumors from the pituitary gland. Many meningiomas and pituitary tumors are benign, while gliomas vary widely in behaviour. MRI is the main imaging test, and the final diagnosis often needs specialist review and sometimes a biopsy.",
    symptoms: ["New or changing headaches", "Seizures", "Nausea or vomiting without another cause", "Vision or hearing changes", "Weakness, balance problems or personality changes", "Hormonal symptoms with pituitary tumors"],
    precautions: ["There is no guaranteed prevention - early evaluation of persistent symptoms matters", "Avoid unnecessary radiation exposure", "Keep follow-up appointments if a lesion is being monitored", "Seek support: a multidisciplinary team improves care"],
    treatments: ["Options include observation, surgery, radiotherapy and medicines depending on tumor type, size and location", "Hormone-related treatment is used for some pituitary tumors", "Rehabilitation and supportive care help recovery"],
    whenToSeeDoctor: ["Sudden severe headache or seizure", "Progressive weakness, speech or vision problems", "Headaches that wake you from sleep or keep worsening"],
  },
  {
    slug: "sun-safety-skin-health", category: "Skin", readMinutes: 3, title: "Everyday Sun Safety for Healthy Skin",
    summary: "Simple daily habits that lower the risk of sunburn, premature ageing and skin cancer.",
    overview: "UV radiation is present even on cloudy days. Cumulative exposure and repeated sunburn are the biggest controllable risks for skin damage.",
    symptoms: ["Redness and pain after sun exposure", "Peeling skin", "New dark patches or freckles"],
    precautions: ["Apply sunscreen 15 minutes before going out", "Use about a teaspoon for the face and neck", "Wear UV-protective sunglasses", "Stay hydrated and limit midday sun"],
    treatments: ["Cool compresses and moisturiser for mild sunburn", "Avoid further sun until healed", "See a doctor for blistering sunburn or fever"],
    whenToSeeDoctor: ["Blistering or severe sunburn", "Any spot that changes after sun exposure"],
  },
  {
    slug: "healthy-habits-for-lungs", category: "Respiratory", readMinutes: 3, title: "Healthy Habits for Stronger Lungs",
    summary: "Everyday choices that keep your lungs working well and lower the risk of respiratory illness.",
    overview: "Lung health depends on clean air, regular activity and avoiding irritants. Small habits add up over a lifetime.",
    symptoms: ["Persistent cough", "Wheezing", "Breathlessness on mild exertion"],
    precautions: ["Do not smoke and avoid second-hand smoke", "Exercise regularly to improve lung capacity", "Ventilate your home and use masks in heavy pollution or dust", "Stay up to date with vaccinations"],
    treatments: ["Breathing exercises can help some people", "Long-term lung conditions need a personalised plan from a pulmonologist"],
    whenToSeeDoctor: ["Cough longer than three weeks", "Coughing blood", "Breathlessness that limits daily activity"],
  },
];

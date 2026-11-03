# Dhanwantari - patient-doctor healthcare app (MERN + ML)

Patient: login -> upload scan -> ML prediction + risk -> doctors of the matching specialization -> book session -> report.
Doctor: calendar/availability -> accept requests -> see image + prediction + Grad-CAM -> priority & diagnosis status -> report (+ handwritten upload) -> emailed + shown in app.

```
dhanwantari/
  client/            React (Vite) + Tailwind, landing/auth page from your reference video
  server/            Express + Mongoose + Auth.js (@auth/express)
  ml_service_patch/  2 files to drop into your FastAPI project (adds prediction + Grad-CAM)
```

## 1. Run it

Prerequisites: Node 20+, MongoDB running locally (or an Atlas URI), Python env of your ML project.

```bash
npm run setup                          # installs server + client
cp server/.env.example server/.env     # then set AUTH_SECRET  (openssl rand -base64 32)
npm run seed                           # specializations, blogs, 9 demo doctors + availability, demo patient
npm run server                         # API on :5000      (terminal 1)
npm run client                         # app on :5173      (terminal 2)
```

Demo logins (from the seed): `patient@demo.com / Patient@123`, doctors e.g. `rohan.iyer@demo.com / Doctor@123`
(all doctor emails are in `server/src/seed/data.js`). `npm run seed -- --reset` wipes the DB first.

No ML service yet? Set `ML_MOCK=true` in `server/.env` and the app returns a fake prediction so you can test the whole flow.

## 2. Connect your ML service (required for real predictions)

Your current FastAPI app returns label/confidence/probabilities but **no Grad-CAM** (that only exists in `evaluation/evaluate_and_visualize.py`).
Copy these into your ML project (they only add code; `/predict/*` is untouched):

- `ml_service_patch/inference/explain.py` -> `<ml project>/inference/explain.py`
- `ml_service_patch/main.py` -> replaces `<ml project>/main.py` (adds `/analyze/{mri|skin|chest_xray}` returning the prediction plus `gradcam_base64`)

Then `uvicorn main:app --port 8000` and keep `ML_API_URL=http://127.0.0.1:8000`.
The user picks the scan type (MRI / skin / chest X-ray) in the UI, because your router cannot auto-detect it.

**Risk level is computed in the Node backend** (`server/src/config/diseaseMap.js`): each label has a base severity and a specialization; risk steps down one level when confidence < 0.5. It is decision support for choosing a doctor, not a clinical score - edit the map freely.

## 3. Auth.js

`@auth/express` is mounted at `/auth/*` (Credentials provider, JWT in an httpOnly cookie). The role (`patient|doctor`) is read from MongoDB in `authorize()` and copied into the token/session (`server/src/config/auth.js`). `requireAuth` / `requireRole` guard the API; `ProtectedRoute` guards the React routes. The client talks to Auth.js with plain fetch (`client/src/api/authClient.js`). Sign-up is a separate `POST /api/register`.
The Vite dev proxy forwards `/api`, `/auth`, `/uploads` to :5000 so cookies stay same-origin. In production run `npm run build` and set `NODE_ENV=production` + `AUTH_URL`; Express then serves `client/dist`.

### Google sign-in
Optional "Continue with Google" via the Auth.js Google provider. Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in `server/.env` - full Google Cloud Console steps in [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md).
- A Google e-mail that already has an account is linked and logs in with its existing role (patient or doctor).
- A first-time Google e-mail does **not** become a patient automatically. The app shows "Finish setting up": pick patient or doctor (doctors add specialization, qualifications, licence) and only then the account is created (`POST /api/google/complete`). After that the same Google account logs in as that role.
- Account created by mistake with the old build (a doctor stuck as a patient)? `npm run remove-user -- their@gmail.com` deletes it (only if it has no appointments/reports), then sign in with Google again and choose doctor.

### Consultation fee & payment QR
On the doctor dashboard a doctor sets a fee with a slider (Rs. 0-5000, step 50; 0 = free) and uploads a UPI payment QR (`PUT /api/doctor/payment`). When a patient books a paid doctor, the form shows the QR and the amount; the request can only be submitted together with the **UPI reference number (UTR)** (optional screenshot). Each UTR can be used once. The doctor sees the amount, UTR and screenshot on the appointment, checks them in their UPI/bank app and presses **Payment received** (or **Not received**); a paid session cannot be accepted before the payment is verified.

**Limitation:** a personal UPI QR has no webhook, so the server cannot see the money arrive. "Payment detected" here means the patient proved it with the UTR and the doctor verified it. Real automatic detection needs a payment gateway (e.g. Razorpay Payment Links/Route with webhooks), which replaces the QR step. Refunds for declined/cancelled paid sessions are handled outside the app.

## 4. Database (Mongoose, 10 collections as in the plan)

| Collection | Key fields |
| --- | --- |
| users | name, email (unique), passwordHash (not for Google-only accounts), googleId, authProvider, role, isActive |
| patientProfiles | user, dateOfBirth, gender, phone, bloodGroup, height/weight, allergies[], chronicConditions[], currentMedications[], emergencyContact, address |
| doctorProfiles | user, specialization, qualifications[], experienceYears, licenseNumber, clinicName, city, bio, languages[], photoUrl, consultationFee, paymentQrUrl, isVerified |
| specializations | name, slug, description |
| predictions | patient, modality, imageUrl, predictedLabel, displayName, confidence, probabilities, riskLevel, specialization, gradcamUrl |
| appointments | patient, doctor, doctorProfile, prediction, date, startTime, endTime, session-request form fields, fee, payment{status, utr, screenshotUrl}, status, priority, diagnosisStatus, slotLocked |
| doctorAvailability | doctor, date, slots[{startTime,endTime,isBooked,appointment}] |
| medicalReports | appointment (unique), patient, doctor, diagnosis, observations, treatment, prescription[], handwrittenReportUrl, status, emailStatus |
| notifications | user, type, title, message, link, isRead |
| blogs | title, slug, category, summary, overview, symptoms[], precautions[], treatments[], whenToSeeDoctor[] |

History uses these same collections (no extra history collections). Double booking is prevented twice: an atomic `isBooked false -> true` claim on the slot, plus a partial unique index on `appointments`.

## 5. Images

Every image is a plain `<img>`. Placeholders live in `client/public/images/` (see the README there for which component uses which file). Uploaded scans, Grad-CAM, reports are saved under `server/uploads/` and only the URL is stored in MongoDB; swap `server/src/services/storage.js` for S3/Cloudinary when you deploy.

## 6. Email

Set `SMTP_*` in `server/.env` to enable e-mails; if unset they are skipped and everything still works. Two mails are sent to the patient, and **neither contains medical details** (no reason, symptoms, diagnosis, treatment or prescription):

- **Session confirmed** (when the doctor accepts): doctor name, date, time, online/in-person, and a link.
- **Report ready** (when the doctor publishes): the mail body has no medical details, but the **report is attached**: an auto-generated PDF (diagnosis, observations, treatment, prescription, follow-up) plus the doctor's handwritten file if one was uploaded. Set `MAIL_ATTACH_REPORT=false` to send only a link.

**Doctors are e-mailed too**: every in-app notification a doctor gets (new session request, patient cancellation, ...) is also sent to the doctor's account e-mail with a link. No medical details are included.

## Theme, fonts and languages

- **Theme:** the moon/sun button is in the app top bar **and on the landing page**. The choice is remembered and shared everywhere; the landing page has a full light version.
- **Fonts:** site text uses Google's *Baloo Bhai 2*. Hindi and Marathi use *Tiro Devanagari Sanskrit / Marathi*. Other scripts use the matching Baloo 2 family (Bengali, Telugu, Tamil, Kannada, Malayalam, Punjabi) and *Noto Nastaliq Urdu*. A script's font is downloaded only when that language is selected (`client/src/i18n/index.jsx`). Note: "Sanskrit Text" is a Microsoft system font, not a Google Font, so Tiro Devanagari Sanskrit is used.
- **Languages (11):** English, Hindi, Bengali, Marathi, Telugu, Tamil, Gujarati, Urdu (right-to-left), Kannada, Malayalam, Punjabi. Translations live in `client/src/i18n/locales/*.js` (same keys in every file; a missing key falls back to English). Covered: navigation, landing page, login/sign-up, prediction flow, doctor suggestions, doctor media, footer, dashboard titles. **Not yet translated:** blog articles, specialization/disease names from the server, appointment/report screens, form labels on the doctor profile. Have a native speaker review medical wording before launch.

## Prediction -> doctor suggestion

Right under every patient prediction the app shows up to 3 matching doctors (`GET /api/predictions/:id/doctors`): same specialization, soonest open slot first. A high-risk result shows an urgent-care banner. If nobody practises that specialization, General Medicine doctors are shown with a note. `npm run check-mapping` verifies that every label the ML model can output maps to a real specialization, a seeded doctor and an existing blog.

## Doctor photo and intro video

Doctor > My profile > upload a photo and an introduction video (MP4 / MOV / WebM, max 40 MB, max 3 minutes, with a progress bar). The video plays on the doctor's page for patients. The server checks the file's real bytes, not just its extension, and deletes the replaced file. `PUT /api/doctor/media`.

## Before you deploy (checklist)

1. `server/.env`: set `NODE_ENV=production`, a long random `AUTH_SECRET`, `MONGODB_URI` (Atlas), `CLIENT_URL` and `AUTH_URL` (your public URL, `AUTH_URL` ends with `/auth`), `TRUST_PROXY=1` behind Render/Railway/Nginx. Add the production redirect URI in Google Cloud Console.
2. `npm run setup && npm run build && npm start` (Express serves `client/dist`; a strict Content-Security-Policy is on in production).
3. Run the ML service separately and set `ML_API_URL`; keep `ML_MOCK=false`.
4. Set `REQUIRE_DOCTOR_APPROVAL=true` so new doctors are hidden until you run `npm run verify-doctor -- doctor@email.com`.
5. Uploads: `server/uploads/` must be on a **persistent disk** (most free hosts wipe it on every deploy). Otherwise swap `services/storage.js` for S3/Cloudinary.
6. Set `SMTP_*` so confirmation/report e-mails are sent.

## Security hardening added in this version

- `/uploads` is access-controlled: scans and Grad-CAM only for the owning patient and their treating doctor, payment screenshots only for that patient and doctor, handwritten reports only for the patient (once published) and doctor. Doctor photos/videos are public; QR codes need a login.
- Login is rate-limited (15 / 15 min per IP), sign-up (20 / hour), predictions (40 / hour per user).
- Strict CSP in production, `x-powered-by` removed, graceful shutdown, `/api/health` reports DB status.
- A session that expires mid-use sends the person back to login instead of showing errors.
- Error boundary and a 404 page; routes are lazy-loaded.

## 7. What was and was not tested

Tested here: server and client build/syntax; the full Auth.js login/session/role-guard flow (real server, stubbed DB); the landing page and login in a real browser.
**Not tested (no MongoDB or PyTorch in my sandbox):** controllers against a real database (booking, availability, reports, notifications), the seed script, and the Grad-CAM patch. Run the seed and click through the flow once; report any error text and it can be fixed quickly.

## 8. Known MVP limits

- Doctors are listed immediately unless `REQUIRE_DOCTOR_APPROVAL=true`; there is no admin web page yet (approval is the `verify-doctor` command).
- Rate limits are in-memory (one server instance). Use Redis if you scale to several.
- Video uploads are held in memory while saving (max 40 MB each). Fine for a small deployment; use direct-to-S3 uploads at scale.
- Dates/times are clinic-local strings; the server's timezone decides "past".
- Auth.js JWT sessions: deactivating a user takes effect when the session expires (7 days) for API reads that skip the DB.
- Medical content in the seed blogs is general information; have a clinician review it before publishing.

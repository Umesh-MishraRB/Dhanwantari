# Image slots

Every image in the app is a plain `<img src="/images/...">` tag. Replace the placeholder
files below with your own artwork (keep the same file name) - or edit the `src` in the
component named in the right-hand column.

| File | Where it is used |
| --- | --- |
| `logo.svg` | Navbar, landing page, favicon (`components/Brand.jsx`) |
| `avatar-placeholder.svg` | Patient avatar fallback (`components/Navbar.jsx`, doctor patient view) |
| `doctor-placeholder.svg` | Doctor photo fallback (`pages/patient/Doctors.jsx`, `DoctorDetail.jsx`) |
| `blog-placeholder.svg` | Blog cover fallback (`pages/Blogs.jsx`, `BlogDetail.jsx`) |
| `scan-placeholder.svg` | Upload drop zone (`pages/Predict.jsx`) |
| `gradcam-placeholder.svg` | Shown when the ML service returns no Grad-CAM (`components/PredictionResult.jsx`) |
| `modality-mri.svg`, `modality-skin.svg`, `modality-chest-xray.svg` | Scan-type picker (`pages/Predict.jsx`) |

Images that come from the server (uploaded scans, Grad-CAM, handwritten reports, doctor
photos, blog covers) are stored as URLs in MongoDB and rendered with the same `<img>` tag.

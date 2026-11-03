import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./auth/ProtectedRoute.jsx";
import Landing from "./pages/Landing.jsx";
import NotFound from "./pages/NotFound.jsx";
import { PageLoader } from "./components/ui.jsx";
const Blogs = lazy(() => import("./pages/Blogs.jsx"));
const BlogDetail = lazy(() => import("./pages/BlogDetail.jsx"));
const Notifications = lazy(() => import("./pages/Notifications.jsx"));
const Predict = lazy(() => import("./pages/Predict.jsx"));

const PatientDashboard = lazy(() => import("./pages/patient/Dashboard.jsx"));
const PatientProfile = lazy(() => import("./pages/patient/Profile.jsx"));
const PredictionDetail = lazy(() => import("./pages/patient/PredictionDetail.jsx"));
const Doctors = lazy(() => import("./pages/patient/Doctors.jsx"));
const DoctorDetail = lazy(() => import("./pages/patient/DoctorDetail.jsx"));
const Sessions = lazy(() => import("./pages/patient/Sessions.jsx"));
const SessionDetail = lazy(() => import("./pages/patient/SessionDetail.jsx"));
const Reports = lazy(() => import("./pages/patient/Reports.jsx"));

const DoctorDashboard = lazy(() => import("./pages/doctor/Dashboard.jsx"));
const Appointments = lazy(() => import("./pages/doctor/Appointments.jsx"));
const Analysis = lazy(() => import("./pages/doctor/Analysis.jsx"));
const Calendar = lazy(() => import("./pages/doctor/Calendar.jsx"));
const DoctorProfile = lazy(() => import("./pages/doctor/Profile.jsx"));

const P = ({ children }) => <ProtectedRoute role="patient">{children}</ProtectedRoute>;
const D = ({ children }) => <ProtectedRoute role="doctor">{children}</ProtectedRoute>;

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
    <Routes>
      {/* first page: hero + Auth.js login / sign-up */}
      <Route path="/" element={<Landing />} />

      <Route element={<Layout />}>
        <Route path="/blogs" element={<Blogs />} />
        <Route path="/blogs/:slug" element={<BlogDetail />} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />

        <Route path="/patient" element={<P><PatientDashboard /></P>} />
        <Route path="/patient/profile" element={<P><PatientProfile /></P>} />
        <Route path="/patient/predict" element={<P><Predict /></P>} />
        <Route path="/patient/predictions/:id" element={<P><PredictionDetail /></P>} />
        <Route path="/patient/doctors" element={<P><Doctors /></P>} />
        <Route path="/patient/doctors/:id" element={<P><DoctorDetail /></P>} />
        <Route path="/patient/sessions" element={<P><Sessions /></P>} />
        <Route path="/patient/sessions/:id" element={<P><SessionDetail /></P>} />
        <Route path="/patient/reports" element={<P><Reports /></P>} />

        <Route path="/doctor" element={<D><DoctorDashboard /></D>} />
        <Route path="/doctor/appointments" element={<D><Appointments /></D>} />
        <Route path="/doctor/appointments/:id" element={<D><Analysis /></D>} />
        <Route path="/doctor/patients" element={<D><Appointments mode="patients" /></D>} />
        <Route path="/doctor/calendar" element={<D><Calendar /></D>} />
        <Route path="/doctor/analyze" element={<D><Predict /></D>} />
        <Route path="/doctor/profile" element={<D><DoctorProfile /></D>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
    </Suspense>
  );
}

import { Navigate, useLocation } from "react-router-dom";
import { useAuth, homeFor } from "./AuthContext.jsx";
import { PageLoader } from "../components/ui.jsx";

/** Redirects to the login page when logged out, and to the user's own dashboard on a role mismatch. */
export default function ProtectedRoute({ role, children }) {
  const { user, pending, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user && pending) return <Navigate to="/" replace />; // Google identity: finish onboarding on the landing page
  if (!user) return <Navigate to="/?auth=login" replace state={{ from: location.pathname }} />;
  if (role && user.role !== role) return <Navigate to={homeFor(user.role)} replace />;
  return children;
}

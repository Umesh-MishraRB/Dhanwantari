import { Link, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useApi } from "../../lib/useApi.js";
import { ErrorState, PageLoader } from "../../components/ui.jsx";
import PredictionResult from "../../components/PredictionResult.jsx";

export default function PredictionDetail() {
  const { id } = useParams();
  const { data, loading, error, reload } = useApi(`/api/predictions/${id}`);
  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  return (
    <div className="stagger">
      <Link to="/patient" className="mb-4 inline-flex items-center gap-1 text-sm text-lav-300 hover:text-lav-100"><ChevronLeft className="h-4 w-4" /> Back</Link>
      <PredictionResult prediction={data.prediction} showActions />
    </div>
  );
}

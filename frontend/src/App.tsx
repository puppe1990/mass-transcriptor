import { Route, Routes } from "react-router-dom";

import JobDetailPage from "./pages/JobDetailPage";
import JobsPage from "./pages/JobsPage";
import UploadPage from "./pages/UploadPage";

export default function App() {
  return (
    <Routes>
      <Route path="/t/:tenantSlug/uploads" element={<UploadPage />} />
      <Route path="/t/:tenantSlug/jobs" element={<JobsPage />} />
      <Route path="/t/:tenantSlug/jobs/:jobId" element={<JobDetailPage />} />
    </Routes>
  );
}

import { useParams } from "react-router-dom";

import { UploadForm } from "../components/UploadForm";

export default function UploadPage() {
  const { tenantSlug = "" } = useParams();

  return (
    <section className="page">
      <h1>Upload Audio</h1>
      <p>Tenant: {tenantSlug}</p>
      <UploadForm tenantSlug={tenantSlug} />
    </section>
  );
}

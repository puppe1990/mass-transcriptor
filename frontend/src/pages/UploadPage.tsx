import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

import { UploadForm } from "../components/UploadForm";

export default function UploadPage() {
  const { t } = useTranslation();
  const { tenantSlug = "" } = useParams();

  return (
    <section className="page">
      <header className="page__header">
        <p className="page__eyebrow">{tenantSlug}</p>
        <h1 className="page__title">{t("upload.title")}</h1>
        <p className="page__subtitle">{t("upload.dropzone")}</p>
      </header>
      <div className="page__body">
        <UploadForm tenantSlug={tenantSlug} />
      </div>
    </section>
  );
}

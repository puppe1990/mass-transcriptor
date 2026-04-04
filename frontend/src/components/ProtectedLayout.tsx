import { ChangeEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, Outlet, useNavigate, useParams } from "react-router-dom";

import { clearAuth } from "../lib/auth";

export function ProtectedLayout() {
  const { t, i18n } = useTranslation();
  const [language, setLanguage] = useState(i18n.resolvedLanguage ?? i18n.language);
  const navigate = useNavigate();
  const { tenantSlug = "" } = useParams();

  useEffect(() => {
    function syncLanguage(nextLanguage: string) {
      setLanguage(nextLanguage);
    }

    i18n.on("languageChanged", syncLanguage);
    return () => {
      i18n.off("languageChanged", syncLanguage);
    };
  }, [i18n]);

  function handleSignOut() {
    clearAuth();
    navigate("/signin", { replace: true });
  }

  function handleLanguageChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextLanguage = event.target.value;
    setLanguage(nextLanguage);
    void i18n.changeLanguage(nextLanguage);
  }

  return (
    <div className="app-shell">
      <nav className="app-sidebar" aria-label={t("sidebar.ariaLabel")}>
        <div className="app-sidebar__brand">
          <p className="app-sidebar__eyebrow">Mass Transcriptor</p>
          <strong>{tenantSlug}</strong>
        </div>

        <div className="app-sidebar__links">
          <Link to={`/t/${tenantSlug}/uploads`}>{t("sidebar.uploads")}</Link>
          <Link to={`/t/${tenantSlug}/jobs`}>{t("sidebar.jobs")}</Link>
          <Link to={`/t/${tenantSlug}/settings`}>{t("sidebar.settings")}</Link>
        </div>

        <label className="app-sidebar__field">
          <span>{t("sidebar.language")}</span>
          <select
            className="app-control app-control--select"
            aria-label={t("sidebar.language")}
            value={language}
            onChange={handleLanguageChange}
          >
            <option value="en">{t("language.en")}</option>
            <option value="pt-BR">{t("language.pt-BR")}</option>
          </select>
        </label>

        <button type="button" onClick={handleSignOut}>
          {t("sidebar.signOut")}
        </button>
      </nav>

      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}

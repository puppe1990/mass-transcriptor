import { ChangeEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";

import { clearAuth } from "../lib/auth";
import { ThemeToggle } from "./ThemeToggle";

function NavIcon({ name }: { name: "uploads" | "jobs" | "settings" }) {
  if (name === "uploads") {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    );
  }
  if (name === "jobs") {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    );
  }
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function ProtectedLayout() {
  const { t, i18n } = useTranslation();
  const [language, setLanguage] = useState(() => i18n.resolvedLanguage || i18n.language || "en");
  const navigate = useNavigate();
  const { tenantSlug = "" } = useParams();

  useEffect(() => {
    function syncLanguage(nextLanguage: string) {
      setLanguage(nextLanguage);
    }

    syncLanguage(i18n.resolvedLanguage || i18n.language || "en");

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
    void i18n.changeLanguage(nextLanguage);
  }

  return (
    <div className="app-shell">
      <nav className="app-sidebar" aria-label={t("sidebar.ariaLabel")}>
        <div className="app-sidebar__brand">
          <div className="app-sidebar__logo" aria-hidden="true">
            M
          </div>
          <div className="app-sidebar__brand-text">
            <p className="app-sidebar__eyebrow">Mass Transcriptor</p>
            <strong>{tenantSlug}</strong>
          </div>
        </div>

        <div className="app-sidebar__links">
          <NavLink
            to={`/t/${tenantSlug}/uploads`}
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            <NavIcon name="uploads" />
            {t("sidebar.uploads")}
          </NavLink>
          <NavLink
            to={`/t/${tenantSlug}/jobs`}
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            <NavIcon name="jobs" />
            {t("sidebar.jobs")}
          </NavLink>
          <NavLink
            to={`/t/${tenantSlug}/settings`}
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            <NavIcon name="settings" />
            {t("sidebar.settings")}
          </NavLink>
        </div>

        <div className="app-sidebar__footer">
          <ThemeToggle />

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

          <button type="button" className="btn--ghost" onClick={handleSignOut}>
            {t("sidebar.signOut")}
          </button>
        </div>
      </nav>

      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}

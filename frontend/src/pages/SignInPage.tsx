import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { AuthForm } from "../components/AuthForm";
import { AuthShell } from "../components/AuthShell";

export default function SignInPage() {
  const { t } = useTranslation();

  return (
    <AuthShell
      eyebrow={t("auth.welcomeBack")}
      title={t("auth.signIn")}
      subtitle={t("auth.signInSubtitle")}
    >
      <AuthForm mode="signin" />
      <p className="auth-shell__switch">
        {t("auth.needWorkspace")} <Link to="/signup">{t("auth.createWorkspace")}</Link>
      </p>
    </AuthShell>
  );
}

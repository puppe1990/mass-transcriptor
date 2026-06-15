import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { AuthForm } from "../components/AuthForm";
import { AuthShell } from "../components/AuthShell";

export default function SignUpPage() {
  const { t } = useTranslation();

  return (
    <AuthShell
      eyebrow={t("auth.createWorkspaceEyebrow")}
      title={t("auth.createWorkspaceTitle")}
      subtitle={t("auth.createWorkspaceSubtitle")}
    >
      <AuthForm mode="signup" />
      <p className="auth-shell__switch">
        {t("auth.alreadyHaveAccount")}{" "}
        <Link to="/signin">{t("auth.signInInstead")}</Link>
      </p>
    </AuthShell>
  );
}

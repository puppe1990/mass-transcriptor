import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <section className="auth-shell">
      <div className="auth-shell__story">
        <div>
          <p className="auth-shell__eyebrow">Mass Transcriptor</p>
          <h1 className="auth-shell__hero">{t("auth.storyTitle")}</h1>
          <p className="auth-shell__lede">{t("auth.storyBody")}</p>
        </div>
        <div className="auth-shell__visual" aria-hidden="true">
          <div className="auth-shell__wave auth-shell__wave--tall" />
          <div className="auth-shell__wave auth-shell__wave--mid" />
          <div className="auth-shell__wave auth-shell__wave--short" />
          <div className="auth-shell__wave auth-shell__wave--mid" />
          <div className="auth-shell__wave auth-shell__wave--tall" />
          <div className="auth-shell__wave auth-shell__wave--short" />
          <div className="auth-shell__wave auth-shell__wave--mid" />
          <div className="auth-shell__wave auth-shell__wave--tall" />
          <div className="auth-shell__wave auth-shell__wave--short" />
          <div className="auth-shell__wave auth-shell__wave--mid" />
          <div className="auth-shell__wave auth-shell__wave--tall" />
        </div>
      </div>
      <div className="auth-shell__panel">
        <p className="auth-shell__eyebrow">{eyebrow}</p>
        <h2 className="auth-shell__panel-title">{title}</h2>
        <p className="auth-shell__panel-subtitle">{subtitle}</p>
        {children}
      </div>
    </section>
  );
}

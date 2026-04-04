import type { ReactNode } from "react";

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
  return (
    <section className="auth-shell">
      <div className="auth-shell__story">
        <p className="auth-shell__eyebrow">Mass Transcriptor</p>
        <h1 className="auth-shell__hero">Turn raw audio into structured notes.</h1>
        <p className="auth-shell__lede">
          Upload recordings, run Whisper or AssemblyAI, and keep every transcript saved as markdown.
        </p>
        <div className="auth-shell__visual" aria-hidden="true">
          <div className="auth-shell__wave auth-shell__wave--tall" />
          <div className="auth-shell__wave auth-shell__wave--mid" />
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

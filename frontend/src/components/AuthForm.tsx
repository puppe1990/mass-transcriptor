import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import { saveAuth } from "../lib/auth";
import { signIn, signUp } from "../lib/api";

export function AuthForm({ mode }: { mode: "signup" | "signin" }) {
  const [error, setError] = useState<string | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries()) as Record<string, string>;
    setError(null);
    try {
      const auth = mode === "signup" ? await signUp(payload) : await signIn(payload);
      saveAuth(auth);
      const targetSlug = auth.tenant?.slug ?? auth.memberships[0]?.tenant_slug;
      navigate(mode === "signup" ? `/t/${targetSlug}/uploads` : `/t/${targetSlug}/jobs`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Authentication failed");
    }
  }

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      {mode === "signup" ? (
        <>
          <input aria-label="Workspace name" name="workspace_name" placeholder="Workspace name" />
          <input aria-label="Workspace slug" name="workspace_slug" placeholder="Workspace slug" />
          <input aria-label="Name" name="name" placeholder="Name" />
        </>
      ) : null}
      <input aria-label="Email" name="email" type="email" placeholder="Email" />
      <div className="auth-form__password-row">
        <input
          aria-label="Password"
          name="password"
          type={passwordVisible ? "text" : "password"}
          placeholder="Password"
          className="auth-form__password-input"
        />
        <button
          type="button"
          aria-label={passwordVisible ? "Hide password" : "Show password"}
          onClick={() => setPasswordVisible((current) => !current)}
          className="auth-form__eye"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
            {passwordVisible ? null : <path d="M4 4l16 16" />}
          </svg>
        </button>
      </div>
      <button className="auth-form__submit" type="submit">
        {mode === "signup" ? "Create Account" : "Sign In"}
      </button>
      {error ? <p className="auth-form__error" role="alert">{error}</p> : null}
    </form>
  );
}

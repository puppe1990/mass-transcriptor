import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import { saveAuth } from "../lib/auth";
import { signIn, signUp } from "../lib/api";

export function AuthForm({ mode }: { mode: "signup" | "signin" }) {
  const [error, setError] = useState<string | null>(null);
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
    <form className="upload-form" onSubmit={onSubmit}>
      {mode === "signup" ? (
        <>
          <input aria-label="Workspace name" name="workspace_name" placeholder="Workspace name" />
          <input aria-label="Workspace slug" name="workspace_slug" placeholder="Workspace slug" />
          <input aria-label="Name" name="name" placeholder="Name" />
        </>
      ) : null}
      <input aria-label="Email" name="email" type="email" placeholder="Email" />
      <input aria-label="Password" name="password" type="password" placeholder="Password" />
      <button type="submit">{mode === "signup" ? "Create Account" : "Sign In"}</button>
      {error ? <p role="alert">{error}</p> : null}
    </form>
  );
}

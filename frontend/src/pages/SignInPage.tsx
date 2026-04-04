import { Link } from "react-router-dom";

import { AuthForm } from "../components/AuthForm";
import { AuthShell } from "../components/AuthShell";

export default function SignInPage() {
  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign In"
      subtitle="Continue into your workspace and keep your transcripts flowing."
    >
      <AuthForm mode="signin" />
      <p className="auth-shell__switch">
        Need a workspace? <Link to="/signup">Create Workspace</Link>
      </p>
    </AuthShell>
  );
}

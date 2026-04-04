import { Link } from "react-router-dom";

import { AuthForm } from "../components/AuthForm";
import { AuthShell } from "../components/AuthShell";

export default function SignUpPage() {
  return (
    <AuthShell
      eyebrow="Create workspace"
      title="Create Workspace"
      subtitle="Set up your transcription hub and start turning recordings into clean markdown."
    >
      <AuthForm mode="signup" />
      <p className="auth-shell__switch">
        Already have an account? <Link to="/signin">Sign In Instead</Link>
      </p>
    </AuthShell>
  );
}

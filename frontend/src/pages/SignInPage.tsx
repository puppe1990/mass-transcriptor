import { Link } from "react-router-dom";

import { AuthForm } from "../components/AuthForm";

export default function SignInPage() {
  return (
    <section className="page">
      <h1>Sign In</h1>
      <AuthForm mode="signin" />
      <p>
        Need a workspace? <Link to="/signup">Create Workspace</Link>
      </p>
    </section>
  );
}

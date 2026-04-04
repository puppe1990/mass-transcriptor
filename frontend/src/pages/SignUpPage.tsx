import { Link } from "react-router-dom";

import { AuthForm } from "../components/AuthForm";

export default function SignUpPage() {
  return (
    <section className="page">
      <h1>Create Workspace</h1>
      <AuthForm mode="signup" />
      <p>
        Already have an account? <Link to="/signin">Sign In Instead</Link>
      </p>
    </section>
  );
}

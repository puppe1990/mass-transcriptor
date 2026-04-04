import { AuthForm } from "../components/AuthForm";

export default function SignUpPage() {
  return (
    <section className="page">
      <h1>Create Workspace</h1>
      <AuthForm mode="signup" />
    </section>
  );
}

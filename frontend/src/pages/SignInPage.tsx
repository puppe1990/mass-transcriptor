import { AuthForm } from "../components/AuthForm";

export default function SignInPage() {
  return (
    <section className="page">
      <h1>Sign In</h1>
      <AuthForm mode="signin" />
    </section>
  );
}

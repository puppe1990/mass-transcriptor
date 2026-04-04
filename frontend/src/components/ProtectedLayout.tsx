import { Link, Outlet, useNavigate, useParams } from "react-router-dom";

import { clearAuth } from "../lib/auth";

export function ProtectedLayout() {
  const navigate = useNavigate();
  const { tenantSlug = "" } = useParams();

  function handleSignOut() {
    clearAuth();
    navigate("/signin", { replace: true });
  }

  return (
    <div className="page">
      <header className="job-actions" aria-label="Workspace navigation">
        <Link to={`/t/${tenantSlug}/uploads`}>Uploads</Link>
        <Link to={`/t/${tenantSlug}/jobs`}>Jobs</Link>
        <Link to={`/t/${tenantSlug}/settings`}>Settings</Link>
        <button type="button" onClick={handleSignOut}>
          Sign out
        </button>
      </header>
      <Outlet />
    </div>
  );
}

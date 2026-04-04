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
    <div className="app-shell">
      <nav className="app-sidebar" aria-label="Workspace sidebar">
        <div className="app-sidebar__brand">
          <p className="app-sidebar__eyebrow">Mass Transcriptor</p>
          <strong>{tenantSlug}</strong>
        </div>

        <div className="app-sidebar__links">
          <Link to={`/t/${tenantSlug}/uploads`}>Uploads</Link>
          <Link to={`/t/${tenantSlug}/jobs`}>Jobs</Link>
          <Link to={`/t/${tenantSlug}/settings`}>Settings</Link>
        </div>

        <button type="button" onClick={handleSignOut}>
          Sign out
        </button>
      </nav>

      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}

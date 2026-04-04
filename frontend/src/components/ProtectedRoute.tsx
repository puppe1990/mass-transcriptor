import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";

import { getAccessToken } from "../lib/auth";

export function ProtectedRoute({ children }: { children: ReactElement }) {
  return getAccessToken() ? children : <Navigate to="/signin" replace />;
}

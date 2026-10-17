import { Navigate, Outlet } from "react-router-dom";
import { session } from "../../api";

export default function RequireAdmin() {
  const current = session();
  if (!current) return <Navigate to="/login" replace />;
  if (current.role !== "ADMIN") return <Navigate to="/" replace />;
  return <Outlet />;
}

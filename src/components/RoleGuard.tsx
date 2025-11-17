import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

interface RoleGuardProps {
  children: JSX.Element;
  roles?: string[]; // Allowed roles
}

export default function RoleGuard({ children, roles }: RoleGuardProps) {
  const { user, initialized } = useAuthStore();

  // Wait until auth is initialized to avoid flicker
  if (!initialized) return null;

  // Not logged in → redirect to login
  if (!user) return <Navigate to="/" replace />;

  // Role not allowed → redirect to default dashboard
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;

  return children;
}

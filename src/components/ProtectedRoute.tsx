import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function ProtectedRoute({
  children,
  roles,
}: {
  children: JSX.Element;
  roles?: string[];
}) {
  const { user, initialized } = useAuthStore();

  // still initializing → avoid flicker
  if (!initialized) return null;

  // not logged in → redirect to login
  if (!user) return <Navigate to="/" replace />;

  // role restricted
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

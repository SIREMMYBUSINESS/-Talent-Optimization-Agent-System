import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LoadingSpinner } from './LoadingSpinner';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'admin' | 'recruiter' | 'compliance' | 'viewer';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, userRole, isLoading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/', { replace: true });
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (!isLoading && user && requiredRole) {
      const hasAccess = checkRoleAccess(userRole, requiredRole);
      if (!hasAccess) {
        navigate('/dashboard/overview', { replace: true });
      }
    }
  }, [user, userRole, requiredRole, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (requiredRole && !checkRoleAccess(userRole, requiredRole)) {
    return null;
  }

  return <>{children}</>;
}

function checkRoleAccess(userRole: string, requiredRole: string): boolean {
  const roleHierarchy: Record<string, number> = {
    admin: 4,
    recruiter: 3,
    compliance: 2,
    viewer: 1,
  };

  const userLevel = roleHierarchy[userRole] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;

  if (requiredRole === 'compliance' && userRole === 'compliance') {
    return true;
  }

  if (requiredRole === 'compliance' && userRole !== 'admin' && userRole !== 'compliance') {
    return false;
  }

  return userLevel >= requiredLevel;
}

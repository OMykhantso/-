import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Role } from "../types";

export default function ProtectedRoute({
  roles,
  children,
}: {
  roles?: Role[];
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="center-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.role)) {
    const fallback = user.role === "DISPATCHER" ? "/dispatcher" : user.role === "COURIER" ? "/courier" : "/client";
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}

import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ClientDashboardPage from "./pages/ClientDashboardPage";
import DeliveryDetailPage from "./pages/DeliveryDetailPage";
import DispatcherDashboardPage from "./pages/DispatcherDashboardPage";
import CourierDashboardPage from "./pages/CourierDashboardPage";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";

export default function App() {
  const { user, loading } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<Layout />}>
        <Route
          path="/client"
          element={
            <ProtectedRoute roles={["CLIENT"]}>
              <ClientDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/client/deliveries/:id"
          element={
            <ProtectedRoute roles={["CLIENT"]}>
              <DeliveryDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dispatcher"
          element={
            <ProtectedRoute roles={["DISPATCHER"]}>
              <DispatcherDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dispatcher/deliveries/:id"
          element={
            <ProtectedRoute roles={["DISPATCHER"]}>
              <DeliveryDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/courier"
          element={
            <ProtectedRoute roles={["COURIER"]}>
              <CourierDashboardPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route
        path="/"
        element={
          loading ? null : (
            <Navigate
              to={
                !user
                  ? "/login"
                  : user.role === "DISPATCHER"
                  ? "/dispatcher"
                  : user.role === "COURIER"
                  ? "/courier"
                  : "/client"
              }
              replace
            />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

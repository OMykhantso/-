import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";

export default function Layout() {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const homePath =
    user?.role === "DISPATCHER" ? "/dispatcher" : user?.role === "COURIER" ? "/courier" : "/client";

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <NavLink to={homePath} className="brand">
            <span className="brand-mark">DMS</span>
            <span className="brand-name">Delivery Management</span>
          </NavLink>
          <div className="topbar-right">
            <span className={`conn-pill ${connected ? "conn-on" : "conn-off"}`}>
              <span className="conn-dot" /> {connected ? "Live" : "Offline"}
            </span>
            {user && (
              <div className="user-chip">
                <div className="user-avatar">{user.name.slice(0, 1).toUpperCase()}</div>
                <div className="user-meta">
                  <span className="user-name">{user.name}</span>
                  <span className="user-role">{user.role}</span>
                </div>
              </div>
            )}
            <button className="btn btn-ghost" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

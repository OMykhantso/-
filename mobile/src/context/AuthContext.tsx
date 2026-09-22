import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as authApi from "../api/auth";
import { ApiError } from "../api/client";
import { PublicUser } from "../api/types";
import { clearSession, loadSession, saveSession } from "../services/storage";

interface AuthContextValue {
  token: string | null;
  user: PublicUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const session = await loadSession();
        if (session && session.user.role === "COURIER") {
          setToken(session.token);
          setUser(session.user);
          // Validate the token is still good and refresh the cached profile in
          // the background; if it's expired/invalid, sign the courier out.
          authApi
            .me(session.token)
            .then((freshUser) => setUser(freshUser))
            .catch(() => {
              clearSession();
              setToken(null);
              setUser(null);
            });
        } else if (session) {
          // A non-courier account somehow ended up cached — never allow it.
          await clearSession();
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token: newToken, user: newUser } = await authApi.login(email, password);
    if (newUser.role !== "COURIER") {
      throw new ApiError(
        "This app is for couriers only. Use a courier account to sign in.",
        403
      );
    }
    await saveSession(newToken, newUser);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(async () => {
    await clearSession();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ token, user, isLoading, login, logout }),
    [token, user, isLoading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

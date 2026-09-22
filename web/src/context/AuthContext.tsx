import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { User } from "../types";
import { getToken, setToken as persistToken } from "../api/client";
import * as authApi from "../api/auth";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: Parameters<typeof authApi.register>[0]) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(getToken());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      const existing = getToken();
      if (!existing) {
        setLoading(false);
        return;
      }
      try {
        const profile = await authApi.me();
        if (!cancelled) {
          setUser(profile);
          setTokenState(existing);
        }
      } catch {
        persistToken(null);
        if (!cancelled) {
          setUser(null);
          setTokenState(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    persistToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(async (input: Parameters<typeof authApi.register>[0]) => {
    const res = await authApi.register(input);
    persistToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(() => {
    persistToken(null);
    setTokenState(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout }),
    [user, token, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, hasSession, setUnauthorizedHandler } from "./api";
import { applyBrand } from "./utils";
import type { Me, Organization, RegisterForm } from "./types";

interface AuthContextValue {
  me: Me | null;
  org: Organization | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (form: RegisterForm) => Promise<void>;
  logout: () => Promise<void>;
  switchOrg: (orgId: string) => Promise<void>;
  reload: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadSession = useCallback(async () => {
    try {
      const meRes = await api.auth.me();
      setMe(meRes);
      if (meRes.active_org_id) {
        try {
          const orgRes = await api.org.current();
          setOrg(orgRes);
          applyBrand(orgRes.primary_color, orgRes.accent_color);
        } catch {
          setOrg(null);
        }
      } else {
        setOrg(null);
      }
    } catch {
      setMe(null);
      setOrg(null);
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setMe(null);
      setOrg(null);
      router.replace("/login");
    });
    (async () => {
      if (hasSession()) await loadSession();
      setLoading(false);
    })();
  }, [loadSession, router]);

  const login = useCallback(
    async (email: string, password: string) => {
      await api.auth.login(email, password);
      await loadSession();
      router.replace("/dashboard");
    },
    [loadSession, router],
  );

  const register = useCallback(
    async (form: RegisterForm) => {
      await api.auth.register(form);
      await loadSession();
      router.replace("/dashboard");
    },
    [loadSession, router],
  );

  const logout = useCallback(async () => {
    await api.auth.logout().catch(() => undefined);
    setMe(null);
    setOrg(null);
    router.replace("/login");
  }, [router]);

  const switchOrg = useCallback(
    async (orgId: string) => {
      await api.auth.switchOrg(orgId);
      await loadSession();
      router.refresh();
    },
    [loadSession, router],
  );

  const reload = useCallback(async () => {
    await loadSession();
  }, [loadSession]);

  return (
    <AuthContext.Provider value={{ me, org, loading, login, register, logout, switchOrg, reload }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an <AuthProvider>");
  return ctx;
}

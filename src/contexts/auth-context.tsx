"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ALL_PERMISSIONS, type Permission, type Role } from "@/lib/rbac";

interface User {
  id: string;
  name: string;
  email: string;
  role?: Role;
  permissions?: Permission[];
}

interface AuthResult {
  ok: boolean;
  error?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  /** The caller's workspace role; null until /api/auth/me resolves it. */
  role: Role | null;
  /**
   * Permissions for the caller's role. Defaults to ALL permissions until the
   * role is loaded so owner/admin UI never flash-hides on first paint.
   */
  permissions: Permission[];
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (name: string, email: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const refreshUser = React.useCallback(() => {
    return fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => setUser(data.user ?? null))
      .catch(() => {});
  }, []);

  // Hydrate the current user from the httpOnly session cookie on mount.
  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => {
        if (active) setUser(data.user ?? null);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const login = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const error = data.error || "Failed to sign in";
        toast.error(error);
        return { ok: false, error };
      }
      setUser(data.user);
      // Login responses don't carry role/permissions; hydrate them.
      refreshUser();
      toast.success("Successfully logged in");
      router.push("/dashboard");
      return { ok: true };
    } catch {
      const error = "Network error. Please try again.";
      toast.error(error);
      return { ok: false, error };
    }
  };

  const signup = async (name: string, email: string, password: string): Promise<AuthResult> => {
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const error = data.error || "Failed to create account";
        toast.error(error);
        return { ok: false, error };
      }
      setUser(data.user);
      refreshUser();
      toast.success("Account created successfully");
      router.push("/dashboard");
      return { ok: true };
    } catch {
      const error = "Network error. Please try again.";
      toast.error(error);
      return { ok: false, error };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors on logout; clear client state regardless.
    }
    setUser(null);
    toast.success("Logged out successfully");
    router.push("/login");
  };

  const role = user?.role ?? null;
  const permissions = user?.permissions ?? ALL_PERMISSIONS;

  return (
    <AuthContext.Provider value={{ user, isLoading, role, permissions, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

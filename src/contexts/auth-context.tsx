"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string) => void;
  signup: (name: string, email: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const storedUser = localStorage.getItem("lipi_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    
    // Protect dashboard routes
    const isDashboardRoute = !['/login', '/signup', '/forgot-password', '/'].includes(pathname);
    if (!user && isDashboardRoute) {
      router.push("/login");
    }
    // Redirect away from auth routes if already logged in
    if (user && ['/login', '/signup'].includes(pathname)) {
      router.push("/dashboard");
    }
  }, [user, pathname, isLoaded, router]);

  const login = (email: string) => {
    const newUser = { id: "u_1", name: "Demo User", email };
    setUser(newUser);
    localStorage.setItem("lipi_user", JSON.stringify(newUser));
    toast.success("Successfully logged in");
    router.push("/dashboard");
  };

  const signup = (name: string, email: string) => {
    const newUser = { id: "u_2", name, email };
    setUser(newUser);
    localStorage.setItem("lipi_user", JSON.stringify(newUser));
    toast.success("Account created successfully");
    router.push("/dashboard");
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("lipi_user");
    toast.success("Logged out successfully");
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
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

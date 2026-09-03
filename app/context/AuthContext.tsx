"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser, LoginRequest } from "@/app/api/auth/login";
import { registerUser, RegisterPayload } from "@/app/api/auth/register";
import { Role } from "@/app/lib/navigation";

interface AuthUser {
  id: string;
  email: string;
  username: string;
  roles: Role[];
  isBanned: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (credentials: LoginRequest) => Promise<void>;
  /**
   * Creates the account and returns without signing anyone in — the address has to be
   * verified first. Resolves with the address the verification link was sent to, so the
   * caller can say which inbox to look in.
   */
  register: (payload: RegisterPayload) => Promise<{ email: string }>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const mapSessionToUser = (data: {
  userId: number;
  email: string;
  username: string;
  roles: string[];
  isBanned: boolean;
}): AuthUser => ({
  id: String(data.userId),
  email: data.email,
  username: data.username,
  roles: (data.roles ?? []) as Role[],
  isBanned: data.isBanned,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const parsed = JSON.parse(raw) as {
          userId: number;
          email: string;
          username: string;
          roles: string[];
          isBanned: boolean;
        };
        setUser(mapSessionToUser(parsed));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (credentials: LoginRequest) => {
    const data = await loginUser(credentials);
    if (data.isBanned) {
      throw new Error("This account has been banned. Please contact support.");
    }

    localStorage.setItem("user", JSON.stringify(data));
    setUser(mapSessionToUser(data));
    router.push("/dashboard");
  };

  // No session and no redirect: registration returns no token, because the account cannot be
  // signed in to until the verification link is clicked. The caller shows the inbox prompt.
  const register = async (payload: RegisterPayload) => {
    const data = await registerUser(payload);
    return { email: data.email };
  };

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
    router.push("/auth");
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
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
  register: (payload: RegisterPayload) => Promise<void>;
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

  const register = async (payload: RegisterPayload) => {
    const data = await registerUser(payload);
    if (data.isBanned) {
      throw new Error("This account has been banned. Please contact support.");
    }

    localStorage.setItem("user", JSON.stringify(data));
    setUser(mapSessionToUser(data));
    router.push("/dashboard");
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
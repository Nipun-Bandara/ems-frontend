"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  type AuthApiResponse,
  type LoginRequest,
} from "@/app/services/auth/login";
import { registerUser, RegisterPayload } from "@/app/services/auth/register";
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
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const mapSessionToUser = (data: AuthApiResponse): AuthUser => ({
  id: String(data.userId),
  email: data.email,
  username: data.username,
  roles: (data.roles ?? []) as Role[],
  isBanned: data.isBanned ?? false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  /**
   * The session lives in httpOnly cookies this code cannot read, so the only way to know who
   * is signed in is to ask. `/api/auth/me` reads the cookie server-side and answers.
   *
   * An expired access token is not a signed-out user: the 401 goes through axios's interceptor,
   * which refreshes and replays before this ever sees it. That is what makes a hard refresh
   * survive a 15-minute-old token.
   */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await getCurrentUser();
        if (!cancelled) setUser(mapSessionToUser(data));
      } catch {
        // 401 with no usable refresh token, i.e. nobody is signed in. A public page is
        // entitled to that answer; protected pages are handled by proxy.ts and the (user)
        // layout, not here.
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (credentials: LoginRequest) => {
      // The tokens go straight into httpOnly cookies inside the route handler; what comes back
      // is only the user. A banned account is refused there with a 403 before any cookie is
      // written, so there is nothing to check for here.
      const data = await loginUser(credentials);
      setUser(mapSessionToUser(data));
      router.push("/dashboard");
    },
    [router]
  );

  // No session and no redirect: registration returns no token, because the account cannot be
  // signed in to until the verification link is clicked. The caller shows the inbox prompt.
  const register = useCallback(async (payload: RegisterPayload) => {
    const data = await registerUser(payload);
    return { email: data.email };
  }, []);

  const logout = useCallback(async () => {
    try {
      // Ends the session at the backend and expires both cookies. Without this the refresh
      // token would stay valid for its full seven days.
      await logoutUser();
    } finally {
      setUser(null);
      router.push("/auth");
    }
  }, [router]);

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

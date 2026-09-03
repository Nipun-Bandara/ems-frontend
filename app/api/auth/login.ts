import axiosInstance from "@/app/lib/axios";
import { API_PATHS } from "@/app/lib/apipaths";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthSessionUser {
  token: string;
  userId: number;
  email: string;
  username: string;
  roles: string[];
  isBanned: boolean;
}

export interface AuthApiResponse {
  token: string;
  userId: number;
  email: string;
  username: string;
  roles: string[];
  isBanned: boolean;
  emailVerified: boolean;
}

/**
 * Rejects with an ApiError carrying EMAIL_NOT_VERIFIED when the password was right but the
 * address has not been confirmed — the one 403 worth offering a resend link for.
 */
export async function loginUser(payload: LoginRequest) {
  const { data } = await axiosInstance.post<AuthApiResponse>(
    API_PATHS.AUTH.LOGIN,
    payload
  );

  return data;
}

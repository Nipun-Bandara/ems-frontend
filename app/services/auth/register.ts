import axiosInstance from "@/app/lib/axios";
import { API_PATHS } from "@/app/lib/apipaths";

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
}

/**
 * What registration returns. Note the absence of a token: an account cannot be signed in to
 * until its email address is verified, so registering starts the verification flow rather
 * than a session. The caller's next step is to tell the user to check their inbox.
 */
export interface RegisterApiResponse {
  userId: number;
  email: string;
  username: string;
  roles: string[];
  isBanned: boolean;
  emailVerified: boolean;
}

export async function registerUser(payload: RegisterPayload) {
  const { data } = await axiosInstance.post<RegisterApiResponse>(
    API_PATHS.AUTH.REGISTER,
    payload
  );

  return data;
}

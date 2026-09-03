import axios from "axios";

export interface ApiError {
  status: number;
  error: string;
  message: string;
  /**
   * Stable identifier for the specific failure, present only on the ones a caller has to
   * tell apart from others sharing their status — see ERROR_CODES in ./errorcodes. Branch on
   * this, never on `message`.
   */
  code?: string;
}

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL + "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = JSON.parse(localStorage.getItem("user") as string)?.token ;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const payload = error?.response?.data ?? {};

    const normalizedError: ApiError = {
      status: payload.status ?? error?.response?.status ?? 500,
      error: payload.error ?? "Request failed",
      message: payload.message ?? "Something went wrong",
      code: payload.code,
    };

    return Promise.reject(normalizedError);
  }
);

export default axiosInstance;

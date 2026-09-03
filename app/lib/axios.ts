import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

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

declare module "axios" {
  interface AxiosRequestConfig {
    /**
     * Opts a request out of the redirect that normally follows a failed refresh — not out of
     * the refresh itself. AuthContext's bootstrap call sets it: a signed-out visitor on the
     * landing page should get `user: null`, not be thrown at the sign-in screen.
     */
    skipAuthRedirect?: boolean;
  }
}

interface RetryableConfig extends InternalAxiosRequestConfig {
  /** Set once a request has already been replayed behind a refresh, so it cannot loop. */
  _retry?: boolean;
}

/**
 * Points at this app's own origin, not the gateway. Every request goes through a route handler
 * that attaches the access token from an httpOnly cookie, which is why there is no request
 * interceptor here any more and nothing reads a token client-side.
 */
const axiosInstance = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Endpoints where a 401 is the answer rather than an expired session. Refreshing on a rejected
 * sign-in would fire a pointless request and, worse, bounce the user off the login form.
 */
const NO_REFRESH_PATHS = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"];

/**
 * The in-flight refresh, or null. Concurrent 401s all await this same promise, so a page that
 * fires six requests on mount against an expired token performs one refresh and six replays.
 *
 * That matters beyond saving requests: identity-service is built to rotate refresh tokens and
 * to treat a replayed one as a breach, so six parallel refreshes would be six uses of the same
 * token and could revoke the whole family, logging the user out of every session.
 */
let refreshPromise: Promise<unknown> | null = null;

function refreshSession() {
  if (!refreshPromise) {
    // Bare axios, not axiosInstance: a 401 from the refresh endpoint must not re-enter this
    // interceptor and try to refresh the refresh.
    refreshPromise = axios
      .post("/api/auth/refresh", null, { withCredentials: true })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

function redirectToSignIn() {
  if (typeof window === "undefined") return;
  // Already there: redirecting again would loop.
  if (window.location.pathname.startsWith("/auth")) return;
  // A full navigation rather than a router push, so in-memory user state is dropped with the
  // document. The cookies are already gone — /api/auth/refresh clears them when it fails.
  window.location.assign("/auth");
}

function normalize(error: AxiosError): ApiError {
  const payload = (error?.response?.data ?? {}) as Partial<ApiError>;

  return {
    status: payload.status ?? error?.response?.status ?? 500,
    error: payload.error ?? "Request failed",
    message: payload.message ?? "Something went wrong",
    code: payload.code,
  };
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryableConfig | undefined;
    const status = error.response?.status;

    const isRefreshable =
      status === 401 &&
      original &&
      !original._retry &&
      !NO_REFRESH_PATHS.some((path) => (original.url ?? "").startsWith(path));

    if (isRefreshable) {
      original._retry = true;

      try {
        await refreshSession();
      } catch {
        if (!original.skipAuthRedirect) {
          redirectToSignIn();
        }
        return Promise.reject(normalize(error));
      }

      // Fresh cookies are in place; the replay carries them automatically.
      return axiosInstance(original);
    }

    return Promise.reject(normalize(error));
  }
);

export default axiosInstance;

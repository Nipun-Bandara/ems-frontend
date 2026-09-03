export const API_PATHS = {
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    ME: "/auth/me",
    LOGOUT: "/auth/logout",
    VERIFY: "/auth/verify",
    RESEND_VERIFICATION: "/auth/resend-verification",
  },
  USERS:{
    GETALL:"/users",
    USER_ASSIGNMENT:"/users/{id}/assignment",
  },
  DEPARTMENTS: {
    GETALL: "/departments",
  },
};

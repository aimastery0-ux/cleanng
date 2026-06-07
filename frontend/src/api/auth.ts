import apiClient from "./client";
import type { User } from "@/store/auth";

export interface RegisterPayload {
  email: string;
  phone?: string;
  first_name: string;
  last_name: string;
  role: "CUSTOMER" | "CLEANER";
  password: string;
  password_confirm: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  tokens: { access: string; refresh: string };
}

export const authApi = {
  register: (data: RegisterPayload) =>
    apiClient.post<AuthResponse>("/auth/register/", data).then((r) => r.data),

  login: (data: LoginPayload) =>
    apiClient.post<AuthResponse>("/auth/login/", data).then((r) => r.data),

  logout: (refresh: string) =>
    apiClient.post("/auth/logout/", { refresh }),

  me: () =>
    apiClient.get<User>("/auth/me/").then((r) => r.data),

  sendOtp: (phone: string) =>
    apiClient.post("/auth/send-otp/", { phone }),

  verifyOtp: (phone: string, code: string) =>
    apiClient.post("/auth/verify-otp/", { phone, code }),

  sendOtp: (phone: string) =>
    apiClient.post("/auth/send-otp/", { phone }).then((r) => r.data),

  verifyOtp: (phone: string, code: string) =>
    apiClient.post("/auth/verify-otp/", { phone, code }).then((r) => r.data),

  resendVerification: () =>
    apiClient.post("/auth/resend-verification/").then((r) => r.data),

  googleAuth: (id_token: string, role?: string) =>
    apiClient.post<AuthResponse>("/auth/google/", { id_token, role }).then((r) => r.data),

  healthCheck: () =>
    apiClient.get("/auth/health/").then((r) => r.data),
};

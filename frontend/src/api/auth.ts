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

  healthCheck: () =>
    apiClient.get("/auth/health/").then((r) => r.data),
};

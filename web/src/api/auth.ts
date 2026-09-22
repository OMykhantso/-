import { api } from "./client";
import { Role, User } from "../types";

export interface AuthResponse {
  token: string;
  user: User;
}

export function login(email: string, password: string) {
  return api.post<AuthResponse>("/auth/login", { email, password });
}

export function register(input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: Role;
}) {
  return api.post<AuthResponse>("/auth/register", input);
}

export function me() {
  return api.get<User>("/auth/me");
}

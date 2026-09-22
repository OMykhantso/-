import { api } from "./client";
import { PublicUser } from "./types";

export interface LoginResponse {
  token: string;
  user: PublicUser;
}

export function login(email: string, password: string): Promise<LoginResponse> {
  return api.post<LoginResponse>("/auth/login", { email, password });
}

export function me(token: string): Promise<PublicUser> {
  return api.get<PublicUser>("/auth/me", token);
}

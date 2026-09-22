import * as SecureStore from "expo-secure-store";
import { PublicUser } from "../api/types";

const TOKEN_KEY = "courier_auth_token";
const USER_KEY = "courier_auth_user";

export async function saveSession(token: string, user: PublicUser): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function loadSession(): Promise<{ token: string; user: PublicUser } | null> {
  const [token, userJson] = await Promise.all([
    SecureStore.getItemAsync(TOKEN_KEY),
    SecureStore.getItemAsync(USER_KEY),
  ]);
  if (!token || !userJson) return null;
  try {
    const user = JSON.parse(userJson) as PublicUser;
    return { token, user };
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

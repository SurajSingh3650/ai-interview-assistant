import AsyncStorage from "@react-native-async-storage/async-storage";
import type { User } from "./types";

const TOKEN_KEY = "aicopilot.mobile.token";
const USER_KEY = "aicopilot.mobile.user";

export async function saveSession(token: string, user: User) {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, token],
    [USER_KEY, JSON.stringify(user)]
  ]);
}

export async function loadSession() {
  const [[, token], [, rawUser]] = await AsyncStorage.multiGet([TOKEN_KEY, USER_KEY]);
  if (!token || !rawUser) {
    return null;
  }

  return {
    token,
    user: JSON.parse(rawUser) as User
  };
}

export async function clearSession() {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}

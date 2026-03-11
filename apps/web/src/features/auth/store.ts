"use client";

import { create } from "zustand";
import { getCookie, removeCookie, setCookie } from "@/lib/cookies";
import type { User } from "./types";

function isExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const payloadBase64 = (token.split(".")[1] || "").replace(/-/g, "+").replace(/_/g, "/");
    const padded = payloadBase64.padEnd(payloadBase64.length + ((4 - (payloadBase64.length % 4)) % 4), "=");
    const payload = JSON.parse(atob(padded)) as { exp?: number };
    if (!payload.exp) return false;
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

interface AuthState {
  token: string | null;
  user: User | null;
  hydrated: boolean;
  hydrate: () => void;
  setSession: (token: string, user: User) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  hydrated: false,
  hydrate: () => {
    const token = getCookie("auth_token");
    const rawUser = getCookie("auth_user");
    if (isExpired(token)) {
      removeCookie("auth_token");
      removeCookie("auth_user");
      set({ token: null, user: null, hydrated: true });
      return;
    }
    set({
      token,
      user: rawUser ? (JSON.parse(rawUser) as User) : null,
      hydrated: true
    });
  },
  setSession: (token, user) => {
    setCookie("auth_token", token, 60 * 60 * 24);
    setCookie("auth_user", JSON.stringify(user), 60 * 60 * 24);
    set({ token, user, hydrated: true });
  },
  clearSession: () => {
    removeCookie("auth_token");
    removeCookie("auth_user");
    set({ token: null, user: null, hydrated: true });
  }
}));

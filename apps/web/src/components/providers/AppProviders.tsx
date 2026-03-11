"use client";

import { useEffect } from "react";
import { useUIStore } from "@/store/ui.store";
import { useAuthStore } from "@/features/auth/store";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const hydrateAuth = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrateAuth();
    const persisted = window.localStorage.getItem("ui_theme");
    if (persisted === "dark" || persisted === "light") {
      setTheme(persisted);
    }
  }, [hydrateAuth, setTheme]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("ui_theme", theme);
  }, [theme]);

  return <>{children}</>;
}

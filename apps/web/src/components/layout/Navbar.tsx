"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUIStore } from "@/store/ui.store";
import { useAuthStore } from "@/features/auth/store";
import { logoutUser } from "@/features/auth/api";

const nav = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" }
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const token = useAuthStore((s) => s.token);
  const clearSession = useAuthStore((s) => s.clearSession);

  async function handleLogout() {
    try {
      await logoutUser();
    } catch {
      // Local session should still be cleared even if network logout fails.
    } finally {
      clearSession();
      router.push("/login");
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link href="/" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          AI Interview Copilot
        </Link>
        <nav className="hidden gap-6 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm ${pathname === item.href ? "text-brand-600 dark:text-brand-100" : "text-slate-600 dark:text-slate-300"}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="rounded-md border border-slate-200 px-3 py-1 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200"
          >
            {theme === "dark" ? "Light" : "Dark"}
          </button>
          {!token ? (
            <Link href="/login" className="rounded-md bg-brand-600 px-3 py-1 text-sm text-white">
              Login
            </Link>
          ) : (
            <>
              <Link href="/dashboard" className="rounded-md bg-brand-600 px-3 py-1 text-sm text-white">
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-md border border-slate-200 px-3 py-1 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

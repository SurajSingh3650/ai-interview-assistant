"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import { loginUser, registerUser } from "./api";
import { useAuthStore } from "./store";

interface FormValues {
  email: string;
  password: string;
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<FormValues>({
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    setLoading(true);
    try {
      if (mode === "register") {
        await registerUser(values.email, values.password);
      }
      const login = await loginUser(values.email, values.password);
      setSession(login.accessToken, login.user);
      const next = searchParams.get("next");
      router.push(next || "/dashboard");
    } catch {
      setError("Authentication failed. Verify credentials and try again.");
    } finally {
      setLoading(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-panel dark:border-slate-800 dark:bg-slate-900">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
        {mode === "login" ? "Sign in to your workspace" : "Create your account"}
      </h1>
      <p className="mt-1 text-slate-600 dark:text-slate-300">
        {mode === "login" ? "Access dashboard, live interview, and analytics." : "Start AI-guided interview practice."}
      </p>

      <label className="mt-5 block text-sm text-slate-700 dark:text-slate-200">
        Email
        <input
          type="email"
          {...register("email", { required: "Email is required" })}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
        />
      </label>
      {errors.email ? <p className="mt-1 text-sm text-red-500">{errors.email.message}</p> : null}

      <label className="mt-4 block text-sm text-slate-700 dark:text-slate-200">
        Password
        <input
          type="password"
          {...register("password", { required: "Password is required", minLength: 8 })}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
        />
      </label>
      {errors.password ? <p className="mt-1 text-sm text-red-500">Minimum 8 characters required.</p> : null}
      {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-lg bg-brand-600 px-3 py-2 font-medium text-white disabled:opacity-60"
      >
        {loading ? "Submitting..." : mode === "login" ? "Login" : "Register"}
      </button>
    </form>
  );
}

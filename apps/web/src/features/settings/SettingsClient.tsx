"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Card } from "@/components/ui/Card";
import { sanitizeInput } from "@/lib/sanitize";
import { useAuthStore } from "@/features/auth/store";

interface SettingsValues {
  displayName: string;
  difficulty: "easy" | "medium" | "hard";
  responseStyle: "concise" | "balanced" | "detailed";
}

export function SettingsClient() {
  const user = useAuthStore((s) => s.user);
  const [resumeName, setResumeName] = useState<string>("");
  const [saved, setSaved] = useState(false);
  const { register, handleSubmit } = useForm<SettingsValues>({
    defaultValues: {
      displayName: user?.email?.split("@")[0] ?? "",
      difficulty: "medium",
      responseStyle: "balanced"
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      displayName: sanitizeInput(values.displayName),
      difficulty: values.difficulty,
      responseStyle: values.responseStyle
    };
    console.log("Settings payload", payload);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  });

  return (
    <div className="container-section">
      <h1 className="text-3xl font-semibold">Settings</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">Manage profile, resume, difficulty, and AI response style.</p>

      <Card className="mt-6 max-w-3xl">
        <form onSubmit={onSubmit} className="space-y-5">
          <label className="block text-sm">
            <span className="text-slate-700 dark:text-slate-200">Display Name</span>
            <input
              {...register("displayName", { required: true })}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>

          <label className="block text-sm">
            <span className="text-slate-700 dark:text-slate-200">Difficulty Level</span>
            <select
              {...register("difficulty")}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-slate-700 dark:text-slate-200">AI Response Style</span>
            <select
              {...register("responseStyle")}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="concise">Concise</option>
              <option value="balanced">Balanced</option>
              <option value="detailed">Detailed</option>
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-slate-700 dark:text-slate-200">Upload Resume (PDF)</span>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setResumeName(e.target.files?.[0]?.name || "")}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          {resumeName ? <p className="text-sm text-slate-500">Selected: {resumeName}</p> : null}

          <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-white">
            Save Settings
          </button>
          {saved ? <p className="text-sm text-emerald-500">Settings saved.</p> : null}
        </form>
      </Card>
    </div>
  );
}

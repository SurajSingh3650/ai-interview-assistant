"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { useAuthStore } from "@/features/auth/store";

const quick = [
  { href: "/live-interview", title: "Live Interview", desc: "Stream transcript and receive hints in real time." },
  { href: "/practice", title: "Practice Mode", desc: "Run mock sessions by topic and difficulty." },
  { href: "/analytics", title: "Analytics", desc: "Visualize score trends and breakdowns." },
  { href: "/settings", title: "Settings", desc: "Manage profile, resume, and AI response preferences." }
];

export function DashboardClient() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="container-section">
      <h1 className="text-3xl font-semibold">Welcome back{user?.email ? `, ${user.email}` : ""}</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        Continue interview practice with real-time coaching and measurable progress tracking.
      </p>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {quick.map((item, i) => (
          <motion.div key={item.href} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link href={item.href}>
              <Card className="h-full transition hover:-translate-y-0.5 hover:border-brand-500">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{item.title}</h2>
                <p className="mt-2 text-slate-600 dark:text-slate-300">{item.desc}</p>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

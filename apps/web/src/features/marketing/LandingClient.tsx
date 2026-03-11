"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { platformFeatures } from "./data";

export function LandingClient() {
  return (
    <>
      <section className="gradient-hero border-b border-slate-200/70 dark:border-slate-800">
        <div className="container-section">
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-100">
              AI Interview Practice Platform
            </p>
            <h1 className="mt-4 max-w-4xl text-5xl font-semibold leading-tight text-slate-900 dark:text-slate-100">
              Real-time interview coaching engineered for high-performing candidates.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
              AI Interview Copilot combines live hints, adaptive questioning, and performance analytics to help users
              improve interview outcomes with measurable progress.
            </p>
            <div className="mt-8 flex gap-4">
              <Link href="/register" className="rounded-lg bg-brand-600 px-5 py-3 text-white">
                Start Practicing
              </Link>
              <Link
                href="/features"
                className="rounded-lg border border-slate-300 px-5 py-3 text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                Explore Features
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="container-section">
        <SectionTitle
          eyebrow="Capabilities"
          title="Everything needed for interview readiness"
          subtitle="Designed for startup-scale growth with enterprise-grade architecture."
        />
        <div className="grid gap-5 md:grid-cols-2">
          {platformFeatures.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <Card>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{item.title}</h3>
                <p className="mt-2 text-slate-600 dark:text-slate-300">{item.desc}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="container-section pt-0">
        <SectionTitle
          eyebrow="How It Works"
          title="From transcript stream to actionable coaching"
          subtitle="Simple flow optimized for real-time low-latency responses."
        />
        <Card className="overflow-x-auto">
          <pre className="text-xs text-slate-700 dark:text-slate-200">
{`Client Apps -> API Gateway -> Session + Coaching Services
                -> AI Orchestration Layer -> LLM Provider
                -> Live hints via WebSocket -> Analytics Storage`}
          </pre>
        </Card>
      </section>
    </>
  );
}

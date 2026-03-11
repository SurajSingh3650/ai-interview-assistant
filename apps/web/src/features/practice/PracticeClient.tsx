"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";

const topics = {
  dsa: ["Explain the time complexity of quicksort.", "How would you detect a cycle in a graph?"],
  system: ["Design a URL shortener at scale.", "How do you partition data for chat systems?"],
  hr: ["Describe a conflict you resolved under pressure.", "How do you prioritize multiple deadlines?"]
};

export function PracticeClient() {
  const [topic, setTopic] = useState<keyof typeof topics>("dsa");
  const [active, setActive] = useState(false);

  return (
    <div className="container-section">
      <h1 className="text-3xl font-semibold">Practice Mode</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">Select topic, generate mock questions, and practice structured responses.</p>
      <Card className="mt-6">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setTopic("dsa")} className={`rounded-md px-3 py-2 text-sm ${topic === "dsa" ? "bg-brand-600 text-white" : "border border-slate-300 dark:border-slate-700"}`}>
            DSA
          </button>
          <button onClick={() => setTopic("system")} className={`rounded-md px-3 py-2 text-sm ${topic === "system" ? "bg-brand-600 text-white" : "border border-slate-300 dark:border-slate-700"}`}>
            System Design
          </button>
          <button onClick={() => setTopic("hr")} className={`rounded-md px-3 py-2 text-sm ${topic === "hr" ? "bg-brand-600 text-white" : "border border-slate-300 dark:border-slate-700"}`}>
            HR
          </button>
          <button onClick={() => setActive(true)} className="ml-auto rounded-md bg-brand-600 px-3 py-2 text-sm text-white">
            Start Mock Session
          </button>
        </div>
        <div className="mt-5 space-y-3">
          {(active ? topics[topic] : []).map((q, idx) => (
            <div key={q} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
              <p className="text-sm font-semibold">Q{idx + 1}</p>
              <p className="mt-1 text-slate-700 dark:text-slate-200">{q}</p>
              <p className="mt-2 text-xs text-slate-500">Hint: answer with context, action, and measurable result.</p>
            </div>
          ))}
          {!active ? <p className="text-sm text-slate-500">Start a session to generate questions and structured hints.</p> : null}
        </div>
      </Card>
    </div>
  );
}

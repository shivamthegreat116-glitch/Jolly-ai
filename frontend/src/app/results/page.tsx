"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmergencyButton } from "@/components/EmergencyButton";

type Assessment = {
  svi_score: number;
  risk_category: string;
  confidence: string;
  risk_reasons: string[];
  recommended_action: string;
  human_review_recommended: boolean;
  voice_signal_status: string;
  disclaimer: string;
  crisis_mode: boolean;
};

export default function ResultsPage() {
  const [a, setA] = useState<Assessment | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("jolly_assessment");
    if (raw && raw !== "null") setA(JSON.parse(raw));
  }, []);

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="flex justify-between">
        <h1 className="text-3xl text-sage-800">Support suggestion</h1>
        <EmergencyButton />
      </div>
      {!a && (
        <p className="mt-6">
          No suggestion yet. <Link className="underline" href="/chat">Continue the conversation</Link>.
        </p>
      )}
      {a && (
        <div className="mt-6 space-y-4 rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-stone-600">{a.disclaimer}</p>
          <div className="flex flex-wrap gap-3">
            <Badge label={`SVI ${a.svi_score}/100`} />
            <Badge label={a.risk_category} />
            <Badge label={`Confidence: ${a.confidence}`} />
            <Badge label={`Voice: ${a.voice_signal_status}`} />
          </div>
          <h2 className="pt-2 font-semibold">Why this was suggested</h2>
          <ul className="list-disc space-y-1 pl-5 text-stone-700">
            {a.risk_reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <h2 className="font-semibold">Suggested next step</h2>
          <p>{a.recommended_action}</p>
          {a.human_review_recommended && (
            <p className="rounded-xl bg-amber-50 p-3 text-sm">
              Human review recommended. Nothing is sent unless you approve a summary and confirm sharing.
            </p>
          )}
        </div>
      )}
      <Link href="/summary" className="mt-6 inline-block rounded-full bg-sage-700 px-5 py-3 text-white">
        Review my summary
      </Link>
    </main>
  );
}

function Badge({ label }: { label: string }) {
  return <span className="rounded-full bg-sand-100 px-3 py-1 text-sm">{label}</span>;
}

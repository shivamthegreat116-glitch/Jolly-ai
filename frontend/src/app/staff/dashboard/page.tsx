"use client";

import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";
import { SanctuaryHeader } from "@/components/SanctuaryHeader";

type CaseRow = {
  id: string;
  status: string;
  language: string;
  svi: number | null;
  risk: string | null;
  confidence: string | null;
  recommended_action: string | null;
  evidence_summary: string | null;
  approved_summary: string | null;
  timestamp: string;
  human_review: boolean | null;
  consent_share: boolean;
  voice_signal_status: string;
};

export default function Dashboard() {
  const [rows, setRows] = useState<CaseRow[]>([]);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [risk, setRisk] = useState("");
  const [notes, setNotes] = useState("");

  async function load(filter = risk) {
    const token = sessionStorage.getItem("jolly_token");
    const q = filter ? `?risk=${encodeURIComponent(filter)}` : "";
    try {
      const res = await fetch(`${API_URL}/api/staff/cases${q}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setRows(await res.json());
      const s = await fetch(`${API_URL}/api/staff/stats`, { headers: { Authorization: `Bearer ${token}` } });
      if (s.ok) setStats(await s.json());
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    void load("");
  }, []);

  async function setStatus(id: string, status: string) {
    const token = sessionStorage.getItem("jolly_token");
    await fetch(`${API_URL}/api/staff/cases/${id}/status`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status, notes }),
    });
    void load();
  }

  return (
    <div className="min-h-screen bg-bg-canvas text-text-primary flex flex-col font-body-md antialiased">
      <SanctuaryHeader />

      <main className="flex-1 max-w-5xl w-full mx-auto px-gutter-sm sm:px-gutter py-8 pt-20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-surface-container text-primary-container font-label-sm mb-1">
              Case Worker Queue
            </span>
            <h1 className="font-headline-md text-text-primary">Consented Case Reviews</h1>
            <p className="font-body-sm text-text-secondary mt-0.5">
              Only shows complainant-approved summaries. Identity is not used in risk assessment.
            </p>
          </div>
        </div>

        {stats && (
          <div className="mb-6 rounded-2xl bg-surface-crisp p-4 border border-border-subtle/60 shadow-whisper text-sm text-text-secondary flex flex-wrap gap-4 items-center">
            <span className="font-label-md font-medium text-text-primary">Aggregate Metrics:</span>
            <span>Total Cases: <strong className="text-primary-container">{String(stats.case_count)}</strong></span>
            <span>Risk Breakdown: {JSON.stringify(stats.risk_counts)}</span>
          </div>
        )}

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="font-label-sm text-text-secondary mr-1">Filter by strain:</span>
          {["", "Low", "Moderate", "High", "Critical"].map((r) => {
            const isActive = risk === r;
            return (
              <button
                key={r || "all"}
                className={`px-3.5 py-1.5 rounded-full font-label-sm transition-all ${
                  isActive
                    ? "bg-primary-container text-surface-crisp shadow-xs"
                    : "bg-surface-crisp border border-border-subtle/70 text-text-secondary hover:text-text-primary hover:bg-surface-container-low"
                }`}
                onClick={() => {
                  setRisk(r);
                  void load(r);
                }}
              >
                {r || "All"}
              </button>
            );
          })}
        </div>

        {/* Case Cards */}
        <div className="space-y-4">
          {rows.map((c) => (
            <article
              key={c.id}
              className="rounded-3xl bg-surface-crisp p-6 shadow-whisper border border-border-subtle/60 space-y-3.5"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-surface-container text-primary-container px-2.5 py-1 font-semibold">
                  {c.risk || "Unspecified"}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-bg-canvas border border-border-subtle/50 text-text-secondary">
                  SVI {c.svi ?? "—"}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-bg-canvas border border-border-subtle/50 text-text-secondary">
                  Confidence {c.confidence ?? "—"}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-bg-canvas border border-border-subtle/50 text-text-secondary">
                  Lang: {c.language}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-bg-canvas border border-border-subtle/50 text-text-secondary">
                  Status: {c.status}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-bg-canvas border border-border-subtle/50 text-text-secondary">
                  Voice: {c.voice_signal_status}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-bg-canvas border border-border-subtle/40">
                <span className="block font-label-sm text-text-secondary mb-1">
                  Complainant Approved Summary:
                </span>
                <p className="font-body-md text-text-primary whitespace-pre-wrap leading-relaxed">
                  {c.approved_summary || "No summary text provided."}
                </p>
              </div>

              {c.recommended_action && (
                <p className="font-body-sm text-text-secondary">
                  <strong className="text-primary-container">Suggested action:</strong> {c.recommended_action}
                </p>
              )}

              <p className="text-xs text-text-secondary/70">{c.timestamp}</p>

              <div className="pt-2 border-t border-border-subtle/50 flex flex-col sm:flex-row gap-2.5 items-center">
                <input
                  className="w-full sm:flex-1 rounded-xl bg-bg-canvas border border-border-subtle/60 p-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-container"
                  placeholder="Private case worker notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <div className="flex flex-wrap gap-1.5 shrink-0">
                  {["reviewed", "contacted_with_consent", "referred", "resolved"].map((st) => (
                    <button
                      key={st}
                      className="rounded-lg bg-surface-container hover:bg-surface-container-high px-2.5 py-1.5 text-xs text-primary-container font-medium transition-colors"
                      onClick={() => setStatus(c.id, st)}
                    >
                      {st.replaceAll("_", " ")}
                    </button>
                  ))}
                </div>
              </div>
            </article>
          ))}

          {rows.length === 0 && (
            <div className="rounded-3xl bg-surface-crisp p-10 text-center border border-border-subtle/60 text-text-secondary">
              No consented cases currently in this queue.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

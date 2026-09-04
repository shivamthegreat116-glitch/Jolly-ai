"use client";

import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";

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
    const res = await fetch(`${API_URL}/api/staff/cases${q}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setRows(await res.json());
    const s = await fetch(`${API_URL}/api/staff/stats`, { headers: { Authorization: `Bearer ${token}` } });
    setStats(await s.json());
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
    <main className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-3xl text-sage-800">Case-worker queue</h1>
      <p className="mt-2 text-sm text-stone-600">
        Only consented, approved summaries. Raw audio is not shown. Identity is not used in scoring.
      </p>
      {stats && (
        <div className="mt-4 rounded-xl bg-white p-4 text-sm shadow-sm">
          Anonymized totals: {JSON.stringify(stats.risk_counts)} · cases {String(stats.case_count)}
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {["", "Low", "Moderate", "High", "Critical"].map((r) => (
          <button
            key={r || "all"}
            className="rounded-full border px-3 py-1"
            onClick={() => {
              setRisk(r);
              void load(r);
            }}
          >
            {r || "All"}
          </button>
        ))}
      </div>
      <div className="mt-6 space-y-4">
        {rows.map((c) => (
          <article key={c.id} className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-sand-100 px-2 py-0.5">{c.risk || "n/a"}</span>
              <span>SVI {c.svi}</span>
              <span>Confidence {c.confidence}</span>
              <span>{c.language}</span>
              <span>{c.status}</span>
              <span>Voice {c.voice_signal_status}</span>
            </div>
            <p className="mt-3 whitespace-pre-wrap">{c.approved_summary || "No approved summary."}</p>
            <p className="mt-2 text-sm text-stone-600">{c.recommended_action}</p>
            <p className="mt-1 text-xs text-stone-400">{c.timestamp}</p>
            <input
              className="mt-3 w-full rounded-lg border p-2 text-sm"
              placeholder="Private case notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              {["reviewed", "contacted_with_consent", "referred", "resolved"].map((st) => (
                <button key={st} className="rounded-lg border px-2 py-1" onClick={() => setStatus(c.id, st)}>
                  {st.replaceAll("_", " ")}
                </button>
              ))}
            </div>
          </article>
        ))}
        {rows.length === 0 && <p className="text-stone-500">No consented cases in this filter.</p>}
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";
import { SanctuaryHeader } from "@/components/SanctuaryHeader";

export default function AdminPage() {
  const [refs, setRefs] = useState<Record<string, string>[]>([]);
  const [docs, setDocs] = useState<Record<string, string>[]>([]);
  const [logs, setLogs] = useState<Record<string, string>[]>([]);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  async function authFetch(path: string, init?: RequestInit) {
    const token = sessionStorage.getItem("jolly_token");
    return fetch(`${API_URL}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers || {}) },
    });
  }

  async function load() {
    try {
      setRefs(await (await authFetch("/api/admin/referrals")).json());
      setDocs(await (await authFetch("/api/admin/knowledge")).json());
      setLogs(await (await authFetch("/api/admin/audit")).json());
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="min-h-screen bg-bg-canvas text-text-primary flex flex-col font-body-md antialiased">
      <SanctuaryHeader />

      <main className="flex-1 max-w-5xl w-full mx-auto px-gutter-sm sm:px-gutter py-8 pt-20 space-y-8">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-surface-container text-primary-container font-label-sm mb-1">
            Administration
          </span>
          <h1 className="font-headline-md text-text-primary">Knowledge Base & Directory</h1>
          <p className="font-body-sm text-text-secondary mt-0.5">
            Audit logging, crisis referral directory management, and automated data retention policies.
          </p>
        </div>

        {/* Add Referral */}
        <section className="bg-surface-crisp rounded-3xl p-6 shadow-whisper border border-border-subtle/60 space-y-4">
          <h2 className="font-headline-sm text-text-primary">Helpline & Referral Directory</h2>
          <p className="font-body-sm text-text-secondary">
            Mark sources carefully. Unverified entries will be tagged as DEMO DATA.
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              className="flex-1 rounded-xl bg-bg-canvas border border-border-subtle/60 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary-container"
              placeholder="Agency / Helpline Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="flex-1 rounded-xl bg-bg-canvas border border-border-subtle/60 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary-container"
              placeholder="Contact Number / Pathway"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
            <button
              className="min-h-[44px] px-5 rounded-xl bg-primary-container text-surface-crisp font-label-md font-medium hover:opacity-95 transition-all shadow-xs shrink-0"
              onClick={async () => {
                await authFetch("/api/admin/referrals", {
                  method: "POST",
                  body: JSON.stringify({
                    service_type: "helpline",
                    name: name + " (DEMO DATA)",
                    contact,
                    notes: "DEMO DATA — verify before complainant use",
                  }),
                });
                setName("");
                setContact("");
                void load();
              }}
            >
              Add Entry
            </button>
          </div>

          <ul className="space-y-2 pt-2">
            {refs.map((r) => (
              <li
                key={r.id}
                className="rounded-2xl bg-bg-canvas p-3 text-sm flex items-center justify-between border border-border-subtle/40"
              >
                <span className="font-medium text-text-primary">{r.name}</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-primary-container">{r.contact}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-surface-container text-text-secondary">
                    verified: {String(r.verified)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Knowledge Base */}
        <section className="bg-surface-crisp rounded-3xl p-6 shadow-whisper border border-border-subtle/60 space-y-4">
          <h2 className="font-headline-sm text-text-primary">Clinical & Triage Knowledge Base</h2>
          <div className="space-y-3">
            <input
              className="w-full rounded-xl bg-bg-canvas border border-border-subtle/60 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary-container"
              placeholder="Protocol Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="w-full h-24 rounded-xl bg-bg-canvas border border-border-subtle/60 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary-container resize-none"
              placeholder="Protocol Content & Guidance..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <button
              className="px-5 py-2.5 rounded-xl bg-primary-container text-surface-crisp font-label-md font-medium hover:opacity-95 transition-all shadow-xs"
              onClick={async () => {
                await authFetch("/api/admin/knowledge", {
                  method: "POST",
                  body: JSON.stringify({ title, category: "general", body, source: "DEMO DATA" }),
                });
                setTitle("");
                setBody("");
                void load();
              }}
            >
              Save Article
            </button>
          </div>

          <ul className="space-y-2 pt-2">
            {docs.map((d) => (
              <li
                key={d.id}
                className="rounded-2xl bg-bg-canvas p-3.5 text-sm border border-border-subtle/40 space-y-1"
              >
                <strong className="text-text-primary font-medium">{d.title}</strong>
                <p className="text-xs text-text-secondary">Source: {d.source}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Retention Policy Cleanup */}
        <section className="bg-surface-crisp rounded-3xl p-6 shadow-whisper border border-border-subtle/60 space-y-3">
          <h2 className="font-headline-sm text-text-primary">Automated Retention & Expired Purge</h2>
          <p className="font-body-sm text-text-secondary leading-relaxed">
            Trigger purge of expired sessions and ephemeral records past the 30-day retention window.
            Action is logged immutably in the compliance audit trail.
          </p>
          <button
            className="px-5 py-2.5 rounded-xl bg-safety-emergency text-surface-crisp font-label-md font-medium hover:opacity-90 active:scale-95 transition-all shadow-xs flex items-center gap-2"
            onClick={async () => {
              const res = await authFetch("/api/admin/cleanup", { method: "POST" });
              if (res.ok) {
                const data = await res.json();
                alert(`Cleanup complete: Purged ${data.purged_sessions} sessions, ${data.purged_messages} messages.`);
                void load();
              }
            }}
          >
            <span className="material-symbols-outlined text-[18px]">auto_delete</span>
            <span>Run Retention Purge Now</span>
          </button>
        </section>

        {/* Audit Log */}
        <section className="bg-surface-crisp rounded-3xl p-6 shadow-whisper border border-border-subtle/60 space-y-3">
          <h2 className="font-headline-sm text-text-primary">Immutable Audit Log</h2>
          <ul className="max-h-72 space-y-1.5 overflow-y-auto text-xs font-mono pr-2">
            {logs.map((l) => (
              <li
                key={l.id}
                className="p-2.5 rounded-xl bg-bg-canvas border border-border-subtle/30 text-text-secondary"
              >
                {l.timestamp} · {l.actor} · {l.action} · {l.purpose}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

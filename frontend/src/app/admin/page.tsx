"use client";

import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";

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
    setRefs(await (await authFetch("/api/admin/referrals")).json());
    setDocs(await (await authFetch("/api/admin/knowledge")).json());
    setLogs(await (await authFetch("/api/admin/audit")).json());
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-3xl text-sage-800">Admin · knowledge & directory</h1>
      <p className="mt-2 text-sm">Mark sources carefully. Unverified rows stay labelled DEMO DATA.</p>

      <section className="mt-8">
        <h2 className="text-xl">Add referral (DEMO DATA unless you verify)</h2>
        <div className="mt-2 flex gap-2">
          <input className="flex-1 rounded-lg border p-2" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="flex-1 rounded-lg border p-2" placeholder="Contact" value={contact} onChange={(e) => setContact(e.target.value)} />
          <button
            className="rounded-lg bg-sage-700 px-3 text-white"
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
              void load();
            }}
          >
            Add
          </button>
        </div>
        <ul className="mt-3 space-y-2">
          {refs.map((r) => (
            <li key={r.id} className="rounded-xl bg-white p-3 text-sm">
              {r.name} · {r.contact} · verified={r.verified}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xl">Knowledge base</h2>
        <input className="mt-2 w-full rounded-lg border p-2" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="mt-2 h-24 w-full rounded-lg border p-2" value={body} onChange={(e) => setBody(e.target.value)} />
        <button
          className="mt-2 rounded-lg bg-sage-700 px-3 py-2 text-white"
          onClick={async () => {
            await authFetch("/api/admin/knowledge", {
              method: "POST",
              body: JSON.stringify({ title, category: "general", body, source: "DEMO DATA" }),
            });
            void load();
          }}
        >
          Save article
        </button>
        <ul className="mt-3 space-y-2">
          {docs.map((d) => (
            <li key={d.id} className="rounded-xl bg-white p-3 text-sm">
              <strong>{d.title}</strong> — {d.source}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xl">Retention policy & data cleanup</h2>
        <p className="mt-1 text-sm text-stone-600">
          Trigger automated purge of expired sessions and records past retention date. Audit log records compliance action.
        </p>
        <button
          className="mt-3 rounded-lg bg-clay-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-clay-500"
          onClick={async () => {
            const res = await authFetch("/api/admin/cleanup", { method: "POST" });
            const data = await res.json();
            alert(`Cleanup complete: Purged ${data.purged_sessions} sessions, ${data.purged_messages} messages.`);
            void load();
          }}
        >
          Run retention cleanup now
        </button>
      </section>

      <section className="mt-8">
        <h2 className="text-xl">Audit log (immutable)</h2>
        <ul className="mt-3 max-h-80 space-y-1 overflow-auto text-xs">
          {logs.map((l) => (
            <li key={l.id}>
              {l.timestamp} · {l.actor} · {l.action} · {l.purpose}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

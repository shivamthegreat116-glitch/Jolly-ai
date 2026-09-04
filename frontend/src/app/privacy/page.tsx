"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function PrivacyPage() {
  const [sessionId, setSessionId] = useState("");
  const [msg, setMsg] = useState("");
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => {
    setSessionId(sessionStorage.getItem("jolly_session") || "");
  }, []);

  async function del() {
    const r = await api<{ message: string }>("/api/privacy/delete", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId, confirmation }),
    });
    setMsg(r.message);
    sessionStorage.clear();
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-3xl text-sage-800">Privacy and data deletion</h1>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-stone-700">
        <li>Minimum data: anonymous session, consented messages, optional voice features — not raw audio by default.</li>
        <li>Conversation text is encrypted at rest.</li>
        <li>Analytics for staff are anonymized aggregates.</li>
        <li>Default retention is 30 days unless you delete sooner.</li>
        <li>Caste, religion, gender, disability, and location are never used as risk predictors.</li>
      </ul>
      <label className="mt-6 block text-sm">Session ID (from this browser session)</label>
      <input
        className="mt-1 w-full rounded-xl border p-3"
        value={sessionId}
        onChange={(e) => setSessionId(e.target.value)}
        placeholder="Paste session id or we can fill it"
        onFocus={() => {
          if (!sessionId) setSessionId(sessionStorage.getItem("jolly_session") || "");
        }}
      />
      <label className="mt-4 block text-sm">Type DELETE to confirm</label>
      <input
        className="mt-1 w-full rounded-xl border p-3"
        value={confirmation}
        onChange={(e) => setConfirmation(e.target.value)}
        placeholder="DELETE"
      />
      <button
        className="mt-4 rounded-full bg-clay-600 px-5 py-2 text-white disabled:opacity-40"
        onClick={del}
        disabled={!sessionId || confirmation !== "DELETE"}
      >
        Delete my data
      </button>
      {msg && <p className="mt-3">{msg}</p>}
    </main>
  );
}

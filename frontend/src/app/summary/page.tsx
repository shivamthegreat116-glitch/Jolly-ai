"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { EmergencyButton } from "@/components/EmergencyButton";
import { ShareConfirmModal } from "@/components/ShareConfirmModal";

export default function SummaryPage() {
  const [sessionId, setSessionId] = useState("");
  const [summary, setSummary] = useState("");
  const [msg, setMsg] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [allowStorage, setAllowStorage] = useState(false);

  useEffect(() => {
    setSessionId(sessionStorage.getItem("jolly_session") || "");
    setSummary(sessionStorage.getItem("jolly_summary") || "");
    setAllowStorage(sessionStorage.getItem("jolly_storage") === "1");
  }, []);

  async function save() {
    sessionStorage.setItem("jolly_summary", summary);
    if (!allowStorage) {
      setMsg("Saved only in this browser. It was not sent to or stored by Jolly AI.");
      return;
    }
    const r = await api<{ message: string }>("/api/summary", {
      method: "POST",
      body: JSON.stringify({
        session_id: sessionId,
        summary,
        approve: true,
        share_with_caseworker: false,
      }),
    });
    setMsg(r.message);
  }

  async function confirmAndShare() {
    const r = await api<{ message: string }>("/api/summary", {
      method: "POST",
      body: JSON.stringify({
        session_id: sessionId,
        summary,
        approve: true,
        share_with_caseworker: true,
      }),
    });
    setMsg(r.message);
    setShareOpen(false);
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="flex justify-between">
        <h1 className="text-3xl text-sage-800">Your summary</h1>
        <EmergencyButton />
      </div>
      <p className="mt-3 text-sm text-stone-600">
        Edit anything you do not want stored or shared. Case workers only see this if you consent and
        confirm.
      </p>
      <textarea className="mt-4 h-48 w-full rounded-2xl border p-4" value={summary} onChange={(e) => setSummary(e.target.value)} />
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="rounded-full bg-sage-700 px-4 py-2 text-white" onClick={() => void save()}>
          {allowStorage ? "Save only for me" : "Save only in this browser"}
        </button>
        <button className="rounded-full border px-4 py-2" onClick={() => setShareOpen(true)}>
          Approve and share with a case worker
        </button>
      </div>
      {msg && <p className="mt-3 text-sage-800">{msg}</p>}
      {shareOpen && sessionId && (
        <ShareConfirmModal
          sessionId={sessionId}
          destination="case_worker_queue"
          onClose={() => setShareOpen(false)}
          onConfirmed={confirmAndShare}
        />
      )}
    </main>
  );
}

"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export function ShareConfirmModal({
  sessionId,
  destination,
  onClose,
  onConfirmed,
}: {
  sessionId: string;
  destination: string;
  onClose: () => void;
  onConfirmed?: () => Promise<void>;
}) {
  const [msg, setMsg] = useState("");

  async function decide(confirm: boolean) {
    try {
      const r = await api<{ message: string }>("/api/share/confirm", {
        method: "POST",
        body: JSON.stringify({ session_id: sessionId, confirm, destination, reason: "user_choice" }),
      });
      if (confirm && onConfirmed) await onConfirmed();
      setMsg(r.message);
      if (!confirm) onClose();
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "We could not record that choice. Please try again.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6">
        <h2 className="text-lg font-semibold">Confirm before anyone is contacted</h2>
        <p className="mt-2 text-sm text-stone-600">
          Jolly AI never automatically contacts police, family, counsellors, or authorities. If you
          continue, you are choosing to reach out yourself (or to share a summary with a case worker
          you already consented to). Destination: <strong>{destination}</strong>
        </p>
        {msg && <p className="mt-3 text-sage-700">{msg}</p>}
        <div className="mt-4 flex gap-2">
          <button className="rounded-lg bg-sage-700 px-3 py-2 text-white" onClick={() => decide(true)}>
            I choose this
          </button>
          <button className="rounded-lg border px-3 py-2" onClick={() => decide(false)}>
            Do not contact anyone
          </button>
        </div>
      </div>
    </div>
  );
}

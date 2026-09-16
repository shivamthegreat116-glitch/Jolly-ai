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
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function decide(confirm: boolean) {
    setIsSubmitting(true);
    try {
      const r = await api<{ message: string }>("/api/share/confirm", {
        method: "POST",
        body: JSON.stringify({ session_id: sessionId, confirm, destination, reason: "user_choice" }),
      });
      if (confirm && onConfirmed) await onConfirmed();
      setMsg(r.message);
      if (!confirm) {
        setTimeout(onClose, 300);
      }
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "We could not record that choice. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-3xl bg-surface-crisp p-6 sm:p-7 shadow-whisper border border-border-subtle/70 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-surface-container-low text-primary-container flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">verified_user</span>
          </div>
          <div>
            <h2 className="font-headline-sm text-text-primary">Confirm before sharing</h2>
            <p className="font-label-sm text-text-secondary">Explicit consent required</p>
          </div>
        </div>

        <p className="font-body-sm text-text-secondary leading-relaxed">
          Jolly AI never automatically contacts police, family, counsellors, or authorities. If you
          continue, you are choosing to share your edited summary with a designated caseworker.
        </p>

        <div className="p-3.5 rounded-2xl bg-surface-container-low border border-border-subtle/50 flex items-center justify-between">
          <span className="font-label-sm text-text-secondary">Destination queue</span>
          <span className="font-label-sm font-semibold text-primary-container font-mono">
            {destination}
          </span>
        </div>

        {msg && (
          <div className="p-3 rounded-xl bg-surface-container text-primary-container font-body-sm">
            {msg}
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
          <button
            className="flex-1 min-h-[44px] rounded-xl bg-primary-container text-surface-crisp font-label-md font-medium shadow-xs hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            disabled={isSubmitting}
            onClick={() => decide(true)}
          >
            {isSubmitting ? (
              <span className="material-symbols-outlined text-[18px] animate-spin">
                progress_activity
              </span>
            ) : (
              <span className="material-symbols-outlined text-[18px]">check</span>
            )}
            <span>I choose to share</span>
          </button>
          <button
            className="min-h-[44px] px-4 rounded-xl bg-surface-container text-text-secondary font-label-md hover:text-text-primary hover:bg-surface-container-high transition-colors"
            disabled={isSubmitting}
            onClick={() => decide(false)}
          >
            Do not share
          </button>
        </div>
      </div>
    </div>
  );
}

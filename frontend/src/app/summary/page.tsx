"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { SanctuaryHeader } from "@/components/SanctuaryHeader";
import { SanctuaryNav } from "@/components/SanctuaryNav";
import { ShareConfirmModal } from "@/components/ShareConfirmModal";

export default function SummaryPage() {
  const [sessionId, setSessionId] = useState("");
  const [summary, setSummary] = useState("");
  const [msg, setMsg] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [allowStorage, setAllowStorage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSessionId(sessionStorage.getItem("jolly_session") || "");
    setSummary(sessionStorage.getItem("jolly_summary") || "");
    setAllowStorage(sessionStorage.getItem("jolly_storage") === "1");
  }, []);

  async function save() {
    setIsSaving(true);
    try {
      sessionStorage.setItem("jolly_summary", summary);
      if (!allowStorage) {
        setMsg("Saved only in this browser session. It was not sent to or stored by Jolly AI servers.");
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
    } catch {
      setMsg("Summary could not be saved right now. Your local copy is preserved.");
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmAndShare() {
    try {
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
    } catch {
      setMsg("Unable to transmit summary to case worker queue. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-bg-canvas text-text-primary flex flex-col font-body-md antialiased">
      <SanctuaryHeader />

      <main className="flex-1 flex flex-col relative w-full pt-20 pb-28 px-gutter-sm sm:px-gutter max-w-2xl mx-auto">
        {/* Intro Card */}
        <div className="flex flex-col mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-primary-container font-label-sm w-fit mb-2">
            <span className="material-symbols-outlined text-[15px]">description</span>
            Complainant Controlled Summary
          </span>
          <h1 className="font-headline-md text-text-primary">Your Private Summary</h1>
          <p className="font-body-md text-text-secondary mt-1 leading-relaxed">
            You hold total control over this text. Edit anything you do not want stored or shared.
            Caseworkers can only view this if you explicitly approve and confirm.
          </p>
        </div>

        {/* Text Area Card */}
        <div className="w-full bg-surface-crisp rounded-3xl shadow-whisper p-5 sm:p-7 border border-border-subtle/60 flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border-subtle/50">
            <div className="flex items-center gap-2 text-text-secondary font-label-sm">
              <span className="material-symbols-outlined text-[18px]">edit_note</span>
              <span>Draft notes & key points</span>
            </div>
            <span className="font-label-sm text-text-secondary">
              {summary ? `${summary.length} characters` : "Empty"}
            </span>
          </div>

          <textarea
            aria-label="Summary content"
            className="w-full min-h-[220px] rounded-2xl bg-bg-canvas p-4 font-body-md text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-primary-container/40 border border-border-subtle/40 resize-y leading-relaxed"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="No notes compiled yet. You can write your own notes, thoughts, or reflections here freely..."
          />

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5 text-xs text-text-secondary">
              <span className="material-symbols-outlined text-[16px] text-primary-container">
                lock
              </span>
              <span>{allowStorage ? "Encrypted server storage enabled" : "Local browser storage only"}</span>
            </div>
            {summary && (
              <button
                type="button"
                onClick={() => setSummary("")}
                className="text-xs text-text-secondary hover:text-safety-emergency transition-colors"
              >
                Clear text
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="pt-3 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              className="flex-1 min-h-[48px] rounded-xl bg-primary-container text-surface-crisp font-label-md font-medium shadow-sm hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              disabled={isSaving}
              onClick={() => void save()}
            >
              {isSaving ? (
                <span className="material-symbols-outlined text-[18px] animate-spin">
                  progress_activity
                </span>
              ) : (
                <span className="material-symbols-outlined text-[18px]">save</span>
              )}
              <span>{allowStorage ? "Save only for me" : "Save only in this browser"}</span>
            </button>
            <button
              type="button"
              className="min-h-[48px] px-5 rounded-xl bg-surface-container text-primary-container font-label-md font-medium hover:bg-surface-container-high transition-colors flex items-center justify-center gap-2"
              onClick={() => setShareOpen(true)}
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              <span>Approve & share with case worker</span>
            </button>
          </div>

          {msg && (
            <div className="mt-3 p-4 rounded-2xl bg-surface-container-low text-primary-container font-body-sm flex items-start gap-2.5 border border-primary-container/20">
              <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">
                check_circle
              </span>
              <p>{msg}</p>
            </div>
          )}
        </div>

        {/* Quick Navigation Cards */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/chat"
            className="p-4 rounded-2xl bg-surface-crisp border border-border-subtle/60 hover:bg-surface-container-low/50 transition-colors flex items-center gap-3 shadow-xs"
          >
            <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary-container shrink-0">
              <span className="material-symbols-outlined text-[20px]">forum</span>
            </div>
            <div>
              <p className="font-label-md font-medium text-text-primary">Continue Conversation</p>
              <p className="font-body-sm text-text-secondary">Return to the quiet chat space</p>
            </div>
          </Link>

          <Link
            href="/results"
            className="p-4 rounded-2xl bg-surface-crisp border border-border-subtle/60 hover:bg-surface-container-low/50 transition-colors flex items-center gap-3 shadow-xs"
          >
            <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary-container shrink-0">
              <span className="material-symbols-outlined text-[20px]">assignment_turned_in</span>
            </div>
            <div>
              <p className="font-label-md font-medium text-text-primary">View Assessment</p>
              <p className="font-body-sm text-text-secondary">Check-in questions & SVI score</p>
            </div>
          </Link>
        </div>

        {shareOpen && sessionId && (
          <ShareConfirmModal
            sessionId={sessionId}
            destination="case_worker_queue"
            onClose={() => setShareOpen(false)}
            onConfirmed={confirmAndShare}
          />
        )}
      </main>

      <SanctuaryNav activePath="summary" />
    </div>
  );
}

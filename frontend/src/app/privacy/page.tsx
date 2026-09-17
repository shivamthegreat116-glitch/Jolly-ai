"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { SanctuaryHeader } from "@/components/SanctuaryHeader";
import { SanctuaryNav } from "@/components/SanctuaryNav";

export default function PrivacyPage() {
  const [sessionId, setSessionId] = useState("");
  const [msg, setMsg] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setSessionId(sessionStorage.getItem("jolly_session") || "");
  }, []);

  async function del() {
    setIsDeleting(true);
    try {
      const r = await api<{ message: string }>("/api/privacy/delete", {
        method: "POST",
        body: JSON.stringify({ session_id: sessionId, confirmation }),
      });
      setMsg(r.message);
      sessionStorage.clear();
      setSessionId("");
      setConfirmation("");
    } catch {
      setMsg("Data deletion could not be completed. Please check your session ID.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-canvas text-text-primary flex flex-col font-body-md antialiased">
      <SanctuaryHeader />

      <main className="flex-1 flex flex-col relative w-full pt-20 pb-28 px-gutter-sm sm:px-gutter max-w-2xl mx-auto space-y-6">
        {/* Subtle Top Aura & Shield Badge */}
        <div className="w-full flex flex-col items-center text-center mt-2 mb-2">
          <div className="w-12 h-12 rounded-full bg-surface-container text-primary-container flex items-center justify-center mb-3 shadow-xs">
            <span
              className="material-symbols-outlined text-[24px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              verified_user
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-primary-container font-label-sm mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse" />
            Emotional Safety & Dignity First
          </span>
          <h1 className="font-headline-md sm:font-headline-lg text-text-primary tracking-tight">
            Privacy & Autonomy
          </h1>
          <p className="font-body-md text-text-secondary max-w-md mt-1">
            No legal walls, no deceptive tracking — just transparent choices and full control.
          </p>
        </div>

        {/* 5 Sanctuary Rights Card */}
        <div className="bg-surface-crisp rounded-3xl p-6 sm:p-7 shadow-whisper border border-border-subtle/60 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-border-subtle/50">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-container text-[20px]">
                lock
              </span>
              <span className="font-headline-sm text-text-primary">Your Sanctuary Rights</span>
            </div>
            <span className="font-label-sm text-primary-container bg-surface-container-low px-2.5 py-1 rounded-full">
              5 Core Protections
            </span>
          </div>

          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-surface-container text-primary-container flex items-center justify-center shrink-0 mt-0.5">
                <span
                  className="material-symbols-outlined text-[16px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check
                </span>
              </div>
              <div>
                <h2 className="font-label-lg text-text-primary font-medium">You can stop anytime.</h2>
                <p className="font-body-sm text-text-secondary mt-0.5 leading-relaxed">
                  Pause, exit, or clear your screen with a single tap. No explanations required.
                </p>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-surface-container text-primary-container flex items-center justify-center shrink-0 mt-0.5">
                <span
                  className="material-symbols-outlined text-[16px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check
                </span>
              </div>
              <div>
                <h2 className="font-label-lg text-text-primary font-medium">
                  You decide whether to share information.
                </h2>
                <p className="font-body-sm text-text-secondary mt-0.5 leading-relaxed">
                  You are never forced to provide your real name, phone number, or identifying details.
                </p>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-surface-container text-primary-container flex items-center justify-center shrink-0 mt-0.5">
                <span
                  className="material-symbols-outlined text-[16px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check
                </span>
              </div>
              <div>
                <h2 className="font-label-lg text-text-primary font-medium">
                  Voice, camera, and storage require separate consent.
                </h2>
                <p className="font-body-sm text-text-secondary mt-0.5 leading-relaxed">
                  You can chat purely in text without storing any persistent history on our servers.
                </p>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-surface-container text-primary-container flex items-center justify-center shrink-0 mt-0.5">
                <span
                  className="material-symbols-outlined text-[16px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check
                </span>
              </div>
              <div>
                <h2 className="font-label-lg text-text-primary font-medium">
                  Jolly AI does not provide a medical diagnosis.
                </h2>
                <p className="font-body-sm text-text-secondary mt-0.5 leading-relaxed">
                  We offer supportive triage, calm grounding, and direct connections to NHAA 14566.
                </p>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-surface-container text-primary-container flex items-center justify-center shrink-0 mt-0.5">
                <span
                  className="material-symbols-outlined text-[16px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check
                </span>
              </div>
              <div>
                <h2 className="font-label-lg text-text-primary font-medium">
                  Immediate, irrevocable data deletion.
                </h2>
                <p className="font-body-sm text-text-secondary mt-0.5 leading-relaxed">
                  Permanently erase your active session data below with zero residual retention.
                </p>
              </div>
            </li>
          </ul>
        </div>

        {/* Technical Safeguards Card */}
        <div className="bg-surface-crisp rounded-3xl p-6 sm:p-7 shadow-whisper border border-border-subtle/60 space-y-4">
          <h2 className="font-headline-sm text-text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-container text-[20px]">
              shield
            </span>
            Safety & Algorithmic Guardrails
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-2xl bg-bg-canvas border border-border-subtle/50">
              <span className="font-label-md font-medium text-text-primary block">
                Encrypted at rest
              </span>
              <p className="font-body-sm text-text-secondary mt-1">
                Any saved text is strongly encrypted using modern cryptographic standards.
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-bg-canvas border border-border-subtle/50">
              <span className="font-label-md font-medium text-text-primary block">
                30-day auto-purge
              </span>
              <p className="font-body-sm text-text-secondary mt-1">
                Stored session logs expire automatically after 30 days unless deleted sooner.
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-bg-canvas border border-border-subtle/50">
              <span className="font-label-md font-medium text-text-primary block">
                No identity profiling
              </span>
              <p className="font-body-sm text-text-secondary mt-1">
                Caste, religion, gender, disability, and location are never used as risk predictors.
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-bg-canvas border border-border-subtle/50">
              <span className="font-label-md font-medium text-text-primary block">
                Aggregated staff metrics
              </span>
              <p className="font-body-sm text-text-secondary mt-1">
                Internal analytics are strictly anonymized aggregates without personal identifiers.
              </p>
            </div>
          </div>
        </div>

        {/* Immediate Data Deletion Card */}
        <div className="bg-surface-crisp rounded-3xl p-6 sm:p-7 shadow-whisper border border-border-subtle/60 space-y-4">
          <div className="flex items-center gap-2 text-safety-emergency">
            <span className="material-symbols-outlined text-[20px]">delete_forever</span>
            <h2 className="font-headline-sm font-semibold">Instant Data Erasure</h2>
          </div>
          <p className="font-body-sm text-text-secondary leading-relaxed">
            Enter your current session ID and type <strong>DELETE</strong> below to immediately purge
            your conversation records from both our servers and your local browser.
          </p>

          <div className="space-y-3 pt-1">
            <div>
              <label className="block font-label-sm text-text-secondary mb-1">
                Session ID (from this browser session)
              </label>
              <input
                className="w-full rounded-xl bg-bg-canvas border border-border-subtle/60 p-3 font-mono text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-container"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="Paste session ID or auto-fill"
                onFocus={() => {
                  if (!sessionId) setSessionId(sessionStorage.getItem("jolly_session") || "");
                }}
              />
            </div>

            <div>
              <label className="block font-label-sm text-text-secondary mb-1">
                Type DELETE to confirm
              </label>
              <input
                className="w-full rounded-xl bg-bg-canvas border border-border-subtle/60 p-3 font-mono text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-safety-emergency"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="DELETE"
              />
            </div>

            <button
              className="mt-2 w-full min-h-[46px] rounded-xl bg-safety-emergency text-surface-crisp font-label-md font-medium hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
              onClick={del}
              disabled={!sessionId || confirmation !== "DELETE" || isDeleting}
            >
              {isDeleting ? (
                <span className="material-symbols-outlined text-[18px] animate-spin">
                  progress_activity
                </span>
              ) : (
                <span className="material-symbols-outlined text-[18px]">delete</span>
              )}
              <span>Purge all my data now</span>
            </button>

            {msg && (
              <div className="mt-3 p-3.5 rounded-xl bg-surface-container text-primary-container font-body-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span>{msg}</span>
              </div>
            )}
          </div>
        </div>

        {/* 24/7 Crisis Help Notice */}
        <div className="p-4 rounded-2xl bg-safety-emergency-subtle border border-safety-emergency/30 text-safety-emergency flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-safety-emergency/15 flex items-center justify-center shrink-0 mt-0.5">
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              shield_with_heart
            </span>
          </div>
          <div>
            <p className="font-label-md font-semibold text-safety-emergency">
              Need immediate crisis assistance?
            </p>
            <p className="font-body-sm text-text-primary mt-0.5">
              Call NHAA helpline{" "}
              <a
                className="font-semibold text-safety-emergency underline underline-offset-2"
                href="tel:14566"
              >
                14566
              </a>{" "}
              or National Emergency{" "}
              <a
                className="font-semibold text-safety-emergency underline underline-offset-2"
                href="tel:112"
              >
                112
              </a>
              , or access the official{" "}
              <a
                className="font-semibold text-primary underline underline-offset-2"
                href="https://www.dosje.gov.in/organisation/national-helpline-against-atrocities/"
                target="_blank"
                rel="noopener noreferrer"
              >
                NHAA Digital Portal
              </a>{" "}
              anytime.
            </p>
          </div>
        </div>
      </main>

      <SanctuaryNav activePath="privacy-language" />
    </div>
  );
}

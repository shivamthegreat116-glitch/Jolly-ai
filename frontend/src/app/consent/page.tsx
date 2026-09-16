"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { SanctuaryHeader } from "@/components/SanctuaryHeader";
import { SanctuaryNav } from "@/components/SanctuaryNav";

const LANGUAGES = [
  { id: "en", label: "English" },
  { id: "hi", label: "हिन्दी" },
  { id: "hinglish", label: "Hinglish" },
  { id: "mr", label: "मराठी" },
  { id: "bn", label: "বাংলা" },
  { id: "ta", label: "தமிழ்" },
  { id: "te", label: "తెలుగు" },
];

export default function ConsentPage() {
  const router = useRouter();
  const [language, setLanguage] = useState("en");
  const [mode, setMode] = useState("text");
  const [agreeText, setAgreeText] = useState(true); // default true so user can start easily
  const [voiceOptIn, setVoiceOptIn] = useState(false);
  const [storageOptIn, setStorageOptIn] = useState(false);
  const [shareSummary, setShareSummary] = useState(false);
  const [humanReview, setHumanReview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("jolly_lang");
      if (stored) setLanguage(stored);
    }
  }, []);

  async function start() {
    setErr("");
    setLoading(true);
    try {
      const r = await api<{ session_id: string }>("/api/session", {
        method: "POST",
        body: JSON.stringify({
          language,
          interaction_mode: mode,
          consent_text: agreeText,
          consent_voice: voiceOptIn,
          consent_storage: storageOptIn,
          consent_share_summary: shareSummary,
          consent_human_review: humanReview,
        }),
      });
      sessionStorage.setItem("jolly_session", r.session_id);
      sessionStorage.setItem("jolly_lang", language);
      sessionStorage.setItem("jolly_voice", voiceOptIn ? "1" : "0");
      sessionStorage.setItem("jolly_storage", storageOptIn ? "1" : "0");
      sessionStorage.setItem("jolly_mode", mode);
      router.push("/chat");
    } catch (e) {
      setErr(
        e instanceof Error
          ? e.message
          : "Unable to start session. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-bg-canvas min-h-screen flex flex-col antialiased text-text-primary">
      <SanctuaryHeader />

      <main className="flex-1 flex flex-col relative w-full pt-16 pb-24 bg-bg-canvas">
        <div className="flex flex-col w-full px-4 sm:px-6 max-w-xl mx-auto pb-10">
          {/* Subtle Top Ambient Aura & Shield Badge */}
          <div className="w-full flex flex-col items-center text-center mt-6 mb-5">
            <div className="w-12 h-12 rounded-full bg-secondary-container text-primary-container flex items-center justify-center mb-3 shadow-xs border border-border-subtle">
              <span className="material-symbols-outlined text-[24px]">verified_user</span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-on-primary-fixed-variant font-label-sm text-label-sm mb-2 border border-border-subtle font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
              Emotional Safety & Dignity First
            </span>
            <h1 className="font-headline-lg-mobile sm:font-display-lg text-headline-lg-mobile sm:text-display-lg text-text-primary tracking-tight font-medium">
              Before we begin
            </h1>
            <p className="font-body-md text-body-md text-text-secondary max-w-sm mt-1">
              Here&apos;s what you should know — no legal walls, just clear human choices.
            </p>
          </div>

          {/* Warm Calming Visual Prompt Banner */}
          <div className="relative w-full rounded-2xl overflow-hidden mb-6 shadow-xs bg-surface-container border border-border-subtle">
            <div className="w-full h-32 bg-gradient-to-tr from-surface-container via-surface-container-high to-secondary-container/40 flex items-center justify-center">
              <span className="material-symbols-outlined text-[48px] text-primary/30 animate-pulse">spa</span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-surface-crisp/95 via-surface-crisp/40 to-transparent flex items-end p-4">
              <p className="font-body-sm text-body-sm text-text-primary flex items-center gap-1.5 font-medium">
                <span className="material-symbols-outlined text-[18px] text-primary">spa</span>
                Take your time. You are fully in control of this conversation.
              </p>
            </div>
          </div>

          {/* Core Principles Card: 5 Protections */}
          <div className="bg-surface-crisp rounded-2xl p-5 border border-border-subtle shadow-xs mb-5">
            <div className="flex items-center justify-between pb-3 mb-3 bg-surface-container-low rounded-xl px-3.5 py-2.5 border border-border-subtle">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">lock</span>
                <span className="font-label-md text-label-md text-text-primary font-semibold">Your Sanctuary Rights</span>
              </div>
              <span className="font-label-sm text-label-sm text-secondary bg-surface-crisp px-2.5 py-0.5 rounded-full border border-border-subtle font-medium">
                5 Core Protections
              </span>
            </div>

            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-secondary-container text-primary-container flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[16px]">check</span>
                </div>
                <div className="min-w-0">
                  <h2 className="font-label-lg text-label-lg text-text-primary font-semibold">You can stop anytime.</h2>
                  <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                    Pause, exit, or clear your screen with a single tap. No questions asked.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-secondary-container text-primary-container flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[16px]">check</span>
                </div>
                <div className="min-w-0">
                  <h2 className="font-label-lg text-label-lg text-text-primary font-semibold">You decide whether to share information.</h2>
                  <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                    You are never required to give your name or identifying details.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-secondary-container text-primary-container flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[16px]">check</span>
                </div>
                <div className="min-w-0">
                  <h2 className="font-label-lg text-label-lg text-text-primary font-semibold">Voice and storage require separate consent.</h2>
                  <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                    You can chat in text completely anonymously without persistent storage.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-secondary-container text-primary-container flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[16px]">check</span>
                </div>
                <div className="min-w-0">
                  <h2 className="font-label-lg text-label-lg text-text-primary font-semibold">Jolly AI does not provide a medical diagnosis.</h2>
                  <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                    We offer compassionate triage, emotional grounding, and direct NHAA guidance.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-secondary-container text-primary-container flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[16px]">check</span>
                </div>
                <div className="min-w-0">
                  <h2 className="font-label-lg text-label-lg text-text-primary font-semibold">You can request immediate deletion.</h2>
                  <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                    One-tap wipe of conversation data at any point from inside the chat window.
                  </p>
                </div>
              </li>
            </ul>
          </div>

          {/* Language & Interaction Preferences Card */}
          <div className="bg-surface-crisp rounded-2xl p-5 border border-border-subtle shadow-xs mb-5 space-y-4">
            <div>
              <label className="font-label-lg text-label-lg text-text-primary font-semibold block mb-1.5">
                Language
              </label>
              <select
                className="w-full rounded-xl border border-border-subtle bg-bg-canvas p-3 font-body-md text-body-md text-text-primary focus:border-primary focus:outline-none"
                value={language}
                onChange={(e) => {
                  setLanguage(e.target.value);
                  sessionStorage.setItem("jolly_lang", e.target.value);
                }}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-label-lg text-label-lg text-text-primary font-semibold block mb-1.5">
                How would you like to talk?
              </label>
              <select
                className="w-full rounded-xl border border-border-subtle bg-bg-canvas p-3 font-body-md text-body-md text-text-primary focus:border-primary focus:outline-none"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                <option value="text">Text only</option>
                <option value="voice">Voice (microphone, after consent)</option>
                <option value="both">Text and voice</option>
              </select>
            </div>

            {/* Granular Toggles */}
            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-low border border-border-subtle cursor-pointer hover:bg-surface-container transition-colors">
                <input
                  type="checkbox"
                  checked={agreeText}
                  onChange={(e) => setAgreeText(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-border-subtle text-primary-container focus:ring-primary-container"
                />
                <span className="font-body-sm text-body-sm text-text-primary">
                  I agree to type (or paste a corrected transcript) and receive supportive replies. <strong className="font-semibold text-primary">Required to begin.</strong>
                </span>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-low border border-border-subtle cursor-pointer hover:bg-surface-container transition-colors">
                <input
                  type="checkbox"
                  checked={voiceOptIn}
                  onChange={(e) => setVoiceOptIn(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-border-subtle text-primary-container focus:ring-primary-container"
                />
                <span className="font-body-sm text-body-sm text-text-secondary">
                  I opt in to microphone recording and privacy-safe voice features (rate, pauses, volume variability). Raw audio is never kept.
                </span>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-low border border-border-subtle cursor-pointer hover:bg-surface-container transition-colors">
                <input
                  type="checkbox"
                  checked={storageOptIn}
                  onChange={(e) => setStorageOptIn(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-border-subtle text-primary-container focus:ring-primary-container"
                />
                <span className="font-body-sm text-body-sm text-text-secondary">
                  Allow encrypted storage of this conversation until retention date (default 30 days) to keep context safe if you refresh.
                </span>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-low border border-border-subtle cursor-pointer hover:bg-surface-container transition-colors">
                <input
                  type="checkbox"
                  checked={shareSummary}
                  onChange={(e) => setShareSummary(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-border-subtle text-primary-container focus:ring-primary-container"
                />
                <span className="font-body-sm text-body-sm text-text-secondary">
                  I may later share an approved, anonymized summary with a designated caseworker.
                </span>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-low border border-border-subtle cursor-pointer hover:bg-surface-container transition-colors">
                <input
                  type="checkbox"
                  checked={humanReview}
                  onChange={(e) => setHumanReview(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-border-subtle text-primary-container focus:ring-primary-container"
                />
                <span className="font-body-sm text-body-sm text-text-secondary">
                  I am willing for a trained human counselor to review my consented summary if risk may be high.
                </span>
              </label>
            </div>
          </div>

          {err && (
            <div className="mb-4 rounded-xl border border-safety-emergency/30 bg-safety-emergency-subtle p-3.5 text-body-sm text-safety-emergency flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
              <span>{err}</span>
            </div>
          )}

          {/* Action CTAs */}
          <div className="flex flex-col gap-2.5 mb-6">
            <button
              onClick={start}
              disabled={!agreeText || loading}
              className="w-full min-h-[52px] rounded-xl bg-primary-container text-on-primary font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-xs active:scale-[0.99] transition-all hover:bg-primary disabled:opacity-40 disabled:cursor-not-allowed font-medium"
              type="button"
            >
              <span>{loading ? "Preparing quiet room..." : "I understand, start talking"}</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>

            <Link
              href="/privacy"
              className="w-full min-h-[46px] rounded-xl bg-surface-crisp border border-border-subtle text-primary-container font-label-md text-label-md flex items-center justify-center gap-2 transition-colors hover:bg-bg-subtle"
            >
              <span className="material-symbols-outlined text-[18px]">menu_book</span>
              <span>Read detailed privacy policy</span>
            </Link>
          </div>

          {/* Crisis Banner Support Line */}
          <div className="p-4 rounded-2xl bg-safety-emergency-subtle text-safety-emergency flex items-start gap-3 border border-safety-emergency/20">
            <div className="w-8 h-8 rounded-full bg-safety-emergency/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-[20px] text-safety-emergency">shield_with_heart</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-label-md text-label-md font-semibold text-safety-emergency">Need immediate protection?</h3>
              <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                Dial <a href="tel:14566" className="font-semibold text-safety-emergency underline">14566</a> (NHAA 24/7) or <a href="tel:112" className="font-semibold text-safety-emergency underline">112</a> (Emergency).
              </p>
            </div>
          </div>
        </div>
      </main>

      <SanctuaryNav />
    </div>
  );
}

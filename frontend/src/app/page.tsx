"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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

export default function LandingPage() {
  const [selectedLang, setSelectedLang] = useState("English");
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [isBreathing, setIsBreathing] = useState(false);
  const [breathState, setBreathState] = useState<"inhale" | "exhale">("inhale");

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isBreathing) {
      interval = setInterval(() => {
        setBreathState((prev) => (prev === "inhale" ? "exhale" : "inhale"));
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [isBreathing]);

  function handleLanguageSelect(lang: { id: string; label: string }) {
    setSelectedLang(lang.label);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("jolly_lang", lang.id);
    }
  }

  return (
    <div className="bg-bg-canvas min-h-screen flex flex-col antialiased text-text-primary">
      <SanctuaryHeader />

      <main className="flex-1 flex flex-col relative w-full pt-16 pb-24 bg-bg-canvas">
        {/* Emergency Subtle Top Bar */}
        <aside aria-label="Urgent crisis support banner" className="w-full bg-safety-emergency-subtle px-4 py-2.5 flex items-center justify-between border-b border-border-subtle">
          <div className="flex items-center gap-2 min-w-0 max-w-5xl mx-auto w-full justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-safety-emergency text-[18px] shrink-0">
                shield_with_heart
              </span>
              <p className="font-body-sm text-body-sm text-safety-emergency truncate">
                If you or someone is in immediate danger, dial <strong className="font-semibold">14566</strong> or <strong className="font-semibold">112</strong>
              </p>
            </div>
            <a
              className="shrink-0 inline-flex items-center gap-1 text-safety-emergency font-label-sm text-label-sm font-semibold pl-2 hover:opacity-80 transition-opacity"
              href="tel:14566"
            >
              <span>Call 14566</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </a>
          </div>
        </aside>

        {/* Main Hero Sanctuary Section */}
        <section className="w-full px-4 sm:px-6 pt-6 sm:pt-10 pb-6 flex flex-col items-center text-center max-w-2xl mx-auto">
          {/* Safe Triage Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container text-primary-container mb-4 border border-border-subtle">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
            <span className="font-label-sm text-label-sm tracking-wider uppercase font-semibold">
              NHAA 14566 · SUPPORT & TRIAGE
            </span>
          </div>

          {/* Main Calm Heading */}
          <h1 className="font-headline-lg-mobile sm:font-display-lg text-headline-lg-mobile sm:text-display-lg text-text-primary tracking-tight max-w-md mb-2 font-medium">
            A quiet place to be heard.
          </h1>

          {/* Organic Grounding Waveform Artwork */}
          <div className="relative w-full max-w-[360px] my-3 rounded-full overflow-hidden shadow-xs border border-border-subtle">
            <svg
              aria-hidden="true"
              className="w-full h-auto drop-shadow-2xs"
              fill="none"
              viewBox="0 0 420 180"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect fill="#EAF2EE" height="180" rx="90" width="420" />
              <circle cx="210" cy="90" fill="#DCECE8" opacity="0.65" r="82" />
              <path d="M20 120C80 80 150 140 210 100C270 60 340 125 400 95V180H20V120Z" fill="#C0ECDB" opacity="0.7" />
              <path d="M0 135C75 105 140 155 210 125C280 95 345 138 420 115V180H0V135Z" fill="#3E6659" opacity="0.25" />
              <path d="M40 148C110 130 160 162 220 142C280 122 330 146 390 138V180H40V148Z" fill="#245B5A" opacity="0.38" />
              <circle cx="210" cy="88" fill="#024343" opacity="0.85" r="9" />
              <circle cx="210" cy="88" opacity="0.45" r="22" stroke="#245B5A" strokeDasharray="3 3" strokeWidth="1.5" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-crisp/95 backdrop-blur-md shadow-xs text-primary font-label-sm text-label-sm border border-border-subtle">
                <span className="material-symbols-outlined text-[15px]">nest_eco_leaf</span>
                Safe · Private · Unhurried
              </span>
            </div>
          </div>

          {/* Narrative Supporting Text */}
          <p className="font-body-md text-body-md text-text-secondary max-w-md mb-5 text-balance leading-relaxed">
            Talk about what you&apos;re going through, at your own pace. Jolly AI can listen, help you make sense of what you&apos;re feeling, and guide you toward the next step when you&apos;re ready.
          </p>

          {/* Multilingual Quick-Switch Bar */}
          <div className="w-full max-w-[420px] mb-5">
            <div className="flex items-center justify-between px-2 mb-1.5">
              <span className="font-label-sm text-label-sm text-text-secondary uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">translate</span>
                Select preferred language
              </span>
              <span className="font-label-sm text-label-sm text-primary-container font-semibold">
                {selectedLang}
              </span>
            </div>
            <div
              aria-label="Select preferred language"
              className="flex items-center gap-1.5 overflow-x-auto pb-1 px-1 no-scrollbar"
              role="tablist"
            >
              {LANGUAGES.map((lang) => {
                const isActive = selectedLang === lang.label;
                return (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => handleLanguageSelect(lang)}
                    className={`shrink-0 px-3 py-1.5 rounded-full font-label-md text-label-md transition-all active:scale-95 border ${
                      isActive
                        ? "bg-primary-container text-on-primary border-primary-container shadow-xs font-semibold"
                        : "bg-surface-crisp text-text-primary border-border-subtle hover:bg-surface-container shadow-2xs"
                    }`}
                  >
                    {lang.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary & Secondary Intent CTA Cluster */}
          <div className="w-full max-w-[380px] flex flex-col gap-2.5 mb-4">
            {/* Primary Action */}
            <Link
              href="/consent"
              className="w-full min-h-[52px] rounded-xl bg-primary-container text-on-primary px-4 flex items-center justify-center gap-2 shadow-xs hover:bg-primary active:scale-[0.99] transition-all font-label-lg text-label-lg font-medium"
            >
              <span className="material-symbols-outlined text-[20px]">forum</span>
              <span>Start talking</span>
            </Link>

            {/* Secondary Action: How It Works */}
            <button
              type="button"
              onClick={() => setHowItWorksOpen(!howItWorksOpen)}
              className="w-full min-h-[48px] rounded-xl bg-surface-crisp text-primary-container px-4 flex items-center justify-center gap-2 border border-border-subtle shadow-2xs hover:bg-bg-subtle active:scale-[0.99] transition-all font-label-lg text-label-lg font-medium"
            >
              <span className="material-symbols-outlined text-[19px]">help_outline</span>
              <span>{howItWorksOpen ? "Hide steps" : "How it works"}</span>
            </button>

            {/* Low-Alarm Crisis Access */}
            <a
              className="w-full min-h-[46px] rounded-xl bg-safety-emergency-subtle text-safety-emergency px-4 flex items-center justify-center gap-2 transition-opacity hover:opacity-90 active:scale-[0.99] font-label-md text-label-md font-medium border border-safety-emergency/20"
              href="tel:14566"
            >
              <span className="material-symbols-outlined text-[18px]">phone_in_talk</span>
              <span>Emergency help (14566 direct dial)</span>
            </a>
          </div>

          {/* Safe Pace Human Reassurance Note */}
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-bg-subtle text-text-secondary max-w-sm text-left border border-border-subtle">
            <span className="material-symbols-outlined text-secondary text-[18px] shrink-0">hourglass_empty</span>
            <p className="font-body-sm text-body-sm">
              You do not have to rush. Everything here moves at your speed.
            </p>
          </div>
        </section>

        {/* Interactive "How It Works" Accordion Drawer */}
        {howItWorksOpen && (
          <section className="w-full px-4 pb-6 max-w-md mx-auto animate-fade-in">
            <div className="w-full bg-surface-crisp rounded-2xl p-5 border border-border-subtle shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-border-subtle">
                <h3 className="font-headline-sm text-headline-sm text-text-primary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary-container text-[20px]">psychology_alt</span>
                  <span>Simple, Gentle Steps</span>
                </h3>
                <button
                  onClick={() => setHowItWorksOpen(false)}
                  className="w-7 h-7 rounded-full bg-bg-canvas flex items-center justify-center text-text-secondary hover:text-text-primary"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
              <div className="space-y-3.5 text-left">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-label-md text-label-md font-semibold text-text-primary">Share in your words</p>
                    <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                      Type or speak freely without worrying about structure, pressure, or grammar.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-label-md text-label-md font-semibold text-text-primary">Clarify your feelings</p>
                    <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                      Jolly reflects with kindness and maps your situation to NHAA support options.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-label-md text-label-md font-semibold text-text-primary">Choose your next step</p>
                    <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                      You decide whether to review a summary, connect with a counselor, or simply pause.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Privacy, Trust & Boundaries Section */}
        <section className="w-full px-4 py-4 flex flex-col items-center max-w-md mx-auto">
          <div className="w-full flex items-center justify-between mb-3 px-1">
            <h2 className="font-headline-sm text-headline-sm text-text-primary">Designed for your safety</h2>
            <span className="material-symbols-outlined text-secondary text-[20px]">verified_user</span>
          </div>

          {/* 3 Core Trust Cards */}
          <div className="w-full flex flex-col gap-3">
            {/* Card 1: Privacy */}
            <article className="w-full bg-surface-crisp rounded-2xl p-4 border border-border-subtle shadow-xs text-left">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center shrink-0 text-primary-container">
                  <span className="material-symbols-outlined text-[22px]">lock</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-label-lg text-label-lg font-semibold text-text-primary mb-0.5">
                    Private by design
                  </h3>
                  <p className="font-body-sm text-body-sm text-text-secondary leading-relaxed">
                    Your conversations and personal information are handled with care. We operate on strict confidentiality standards designed for sensitive reporting.
                  </p>
                </div>
              </div>
            </article>

            {/* Card 2: Autonomy */}
            <article className="w-full bg-surface-crisp rounded-2xl p-4 border border-border-subtle shadow-xs text-left">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center shrink-0 text-primary-container">
                  <span className="material-symbols-outlined text-[22px]">tune</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-label-lg text-label-lg font-semibold text-text-primary mb-0.5">
                    You stay in control
                  </h3>
                  <p className="font-body-sm text-body-sm text-text-secondary leading-relaxed">
                    No calls or escalation happen automatically without your confirmation, except where safety protocol requires immediate action.
                  </p>
                </div>
              </div>
            </article>

            {/* Card 3: Boundary Clarity */}
            <article className="w-full bg-surface-crisp rounded-2xl p-4 border border-border-subtle shadow-xs text-left">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center shrink-0 text-primary-container">
                  <span className="material-symbols-outlined text-[22px]">health_and_safety</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-label-lg text-label-lg font-semibold text-text-primary mb-0.5">
                    Not a diagnosis
                  </h3>
                  <p className="font-body-sm text-body-sm text-text-secondary leading-relaxed">
                    Jolly AI identifies reported stress and distress indicators. It does not diagnose mental-health conditions or replace professional medical care.
                  </p>
                </div>
              </div>
            </article>
          </div>
        </section>

        {/* Interactive Grounding Moment: Deep Breath Visual Micro-Intervention */}
        <section className="w-full px-4 pt-4 pb-8 flex flex-col items-center max-w-md mx-auto">
          <div className="w-full bg-surface-container rounded-2xl p-5 text-center flex flex-col items-center border border-border-subtle">
            <span className="font-label-sm text-label-sm text-primary uppercase tracking-wider mb-1 font-semibold">
              Pause for a breath
            </span>
            <p className="font-headline-sm text-headline-sm text-text-primary mb-2">Feeling overwhelmed right now?</p>

            {/* Tactile Breathing Pacer Bubble */}
            <button
              type="button"
              onClick={() => setIsBreathing(!isBreathing)}
              style={{
                transform: isBreathing ? (breathState === "inhale" ? "scale(1.22)" : "scale(0.92)") : "scale(1)",
                transition: "transform 3.5s ease-in-out",
              }}
              className="w-24 h-24 rounded-full bg-surface-crisp text-primary-container flex flex-col items-center justify-center shadow-xs cursor-pointer border border-border-subtle my-2"
            >
              <span className="material-symbols-outlined text-[24px]">air</span>
              <span className="font-label-sm text-label-sm font-semibold mt-1">
                {isBreathing ? (breathState === "inhale" ? "Breathe in..." : "Breathe out...") : "Tap to breathe"}
              </span>
            </button>

            <p className="font-body-sm text-body-sm text-text-secondary mt-1 max-w-xs">
              A single relaxed breath can help steady your heart rate before continuing.
            </p>
          </div>

          {/* Discreet Quick Exit Disengagement Link */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <a
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-surface-crisp text-text-secondary text-label-sm font-label-sm shadow-2xs hover:text-text-primary border border-border-subtle transition-colors"
              href="https://www.google.com"
              rel="noopener noreferrer"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span>Quick exit to Google</span>
            </a>
          </div>
        </section>
      </main>

      <SanctuaryNav />
    </div>
  );
}

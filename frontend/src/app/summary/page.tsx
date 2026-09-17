"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { SanctuaryHeader } from "@/components/SanctuaryHeader";
import { SanctuaryNav } from "@/components/SanctuaryNav";
import { ShareConfirmModal } from "@/components/ShareConfirmModal";
import type {
  AgeGroup,
  StressIndexBreakdown,
  TraumaTypology,
  MedicalHistoryContext,
  CameraFatigueData,
} from "@/types/session";

export default function SummaryPage() {
  const [sessionId, setSessionId] = useState("");
  const [summary, setSummary] = useState("");
  const [msg, setMsg] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [allowStorage, setAllowStorage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [ageGroup, setAgeGroup] = useState<string>("");
  const [stressIndex, setStressIndex] = useState<StressIndexBreakdown | null>(null);
  const [traumaTypology, setTraumaTypology] = useState<TraumaTypology | null>(null);
  const [medicalHistory, setMedicalHistory] = useState<MedicalHistoryContext | null>(null);
  const [cameraFatigue, setCameraFatigue] = useState<CameraFatigueData | null>(null);

  useEffect(() => {
    setSessionId(sessionStorage.getItem("jolly_session") || "");
    setSummary(sessionStorage.getItem("jolly_summary") || "");
    setAllowStorage(sessionStorage.getItem("jolly_storage") === "1");

    const rawAge = sessionStorage.getItem("jolly_age_group");
    if (rawAge) setAgeGroup(rawAge);

    const rawSVI = sessionStorage.getItem("jolly_stress_index");
    if (rawSVI) {
      try {
        setStressIndex(JSON.parse(rawSVI));
      } catch {}
    }

    const rawTypo = sessionStorage.getItem("jolly_trauma_typology");
    if (rawTypo) {
      try {
        setTraumaTypology(JSON.parse(rawTypo));
      } catch {}
    }

    const rawMed = sessionStorage.getItem("jolly_medical_history");
    if (rawMed) {
      try {
        setMedicalHistory(JSON.parse(rawMed));
      } catch {
        setMedicalHistory({
          chronic_conditions: [],
          current_treatments: [],
          mobility_or_sensory: [],
          substance_or_medication_considerations: [],
          self_reported_notes: rawMed,
        });
      }
    }

    const rawCF = sessionStorage.getItem("jolly_camera_fatigue");
    if (rawCF) {
      try {
        setCameraFatigue(JSON.parse(rawCF));
      } catch {}
    }
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

        {/* ========================================================
           SESSION TRIAGE & ASSESSMENT PROFILE
           ======================================================== */}
        {(ageGroup || stressIndex || traumaTypology || medicalHistory) && (
          <div className="mt-6 w-full bg-surface-crisp rounded-3xl shadow-whisper p-5 sm:p-7 border border-border-subtle/60 space-y-5">
            <div className="flex items-center justify-between border-b border-border-subtle/50 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container text-[20px]">
                  clinical_notes
                </span>
                <h2 className="font-headline-sm text-text-primary text-base font-semibold">
                  Intake & Triage Indicators (Self-Reported)
                </h2>
              </div>
              <span className="text-xs font-label-sm text-text-secondary bg-surface-container px-2.5 py-0.5 rounded-full">
                Non-diagnostic
              </span>
            </div>

            {/* Age Group & Health Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {ageGroup && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-primary-container font-label-sm border border-primary-container/20">
                  <span className="material-symbols-outlined text-[15px]">person</span>
                  <span>
                    Age:{" "}
                    {ageGroup === "under_18"
                      ? "Under 18 (Youth Protection Priority)"
                      : ageGroup === "18_24"
                      ? "18–24 years"
                      : ageGroup === "25_40"
                      ? "25–40 years"
                      : ageGroup === "41_60"
                      ? "41–60 years"
                      : ageGroup === "60_plus"
                      ? "60+ years (Senior Care)"
                      : "Protected / Undisclosed"}
                  </span>
                </span>
              )}
              {medicalHistory && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-text-secondary font-label-sm border border-border-subtle">
                  <span className="material-symbols-outlined text-[15px] text-primary-container">
                    medical_services
                  </span>
                  <span>
                    Health Context:{" "}
                    {medicalHistory.chronic_conditions?.length
                      ? medicalHistory.chronic_conditions.join(", ")
                      : medicalHistory.current_treatments?.length
                      ? medicalHistory.current_treatments.join(", ")
                      : "Recorded for calibrated triage"}
                  </span>
                </span>
              )}
            </div>

            {/* Identified Trauma Typology */}
            {traumaTypology && (
              <div className="p-4 rounded-2xl bg-surface-container-low/70 border border-primary-container/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-label-sm text-text-secondary flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-primary-container">
                      psychology_alt
                    </span>
                    Identified Distress / Trauma Pattern
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-surface-crisp text-text-secondary border border-border-subtle/60">
                    {traumaTypology.confidence}
                  </span>
                </div>
                <h3 className="font-headline-sm text-text-primary text-sm font-semibold">
                  {traumaTypology.display_name}
                </h3>
                {traumaTypology.primary_indicators && traumaTypology.primary_indicators.length > 0 && (
                  <ul className="space-y-1 pl-1 pt-1">
                    {traumaTypology.primary_indicators.map((ind, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-container mt-1.5 shrink-0" />
                        <span>{ind}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Multi-Dimensional Stress Vulnerability Index Breakdown */}
            {stressIndex && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <span className="font-label-md font-semibold text-text-primary text-xs flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-primary-container">
                      analytics
                    </span>
                    Stress Vulnerability Index (SVI)
                  </span>
                  <span className="text-xs font-semibold text-primary-container">
                    Score: {stressIndex.composite_svi ?? stressIndex.overall_score ?? 0}/100 ({((stressIndex.severity_level || stressIndex.risk_category) ?? "").toUpperCase()})
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
                  <div className="p-2.5 rounded-xl bg-bg-canvas border border-border-subtle/40 space-y-1">
                    <div className="flex justify-between font-label-sm text-text-secondary">
                      <span>🧠 Emotional Strain</span>
                      <span className="font-medium text-text-primary">{stressIndex.emotional_strain}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-surface-container overflow-hidden">
                      <div
                        className="h-full bg-primary-container rounded-full"
                        style={{ width: `${stressIndex.emotional_strain}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-bg-canvas border border-border-subtle/40 space-y-1">
                    <div className="flex justify-between font-label-sm text-text-secondary">
                      <span>⚡ Cognitive Overwhelm</span>
                      <span className="font-medium text-text-primary">
                        {stressIndex.cognitive_overwhelm ?? stressIndex.cognitive_strain ?? 0}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-surface-container overflow-hidden">
                      <div
                        className="h-full bg-primary-container/90 rounded-full"
                        style={{ width: `${stressIndex.cognitive_overwhelm ?? stressIndex.cognitive_strain ?? 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-bg-canvas border border-border-subtle/40 space-y-1">
                    <div className="flex justify-between font-label-sm text-text-secondary">
                      <span>🫀 Somatic Load</span>
                      <span className="font-medium text-text-primary">{stressIndex.somatic_load}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-surface-container overflow-hidden">
                      <div
                        className="h-full bg-amber-500/80 rounded-full"
                        style={{ width: `${stressIndex.somatic_load}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-bg-canvas border border-border-subtle/40 space-y-1">
                    <div className="flex justify-between font-label-sm text-text-secondary">
                      <span>🤝 Relational Isolation</span>
                      <span className="font-medium text-text-primary">{stressIndex.relational_isolation}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-surface-container overflow-hidden">
                      <div
                        className="h-full bg-indigo-500/80 rounded-full"
                        style={{ width: `${stressIndex.relational_isolation}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-bg-canvas border border-border-subtle/40 space-y-1 sm:col-span-2">
                    <div className="flex justify-between font-label-sm text-text-secondary">
                      <span>🛡️ Environmental Safety Risk</span>
                      <span className="font-medium text-text-primary">{stressIndex.environmental_risk}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-surface-container overflow-hidden">
                      <div
                        className="h-full bg-rose-500/80 rounded-full"
                        style={{ width: `${stressIndex.environmental_risk}%` }}
                      />
                    </div>
                  </div>

                  {/* Camera Fatigue Sensor Telemetry */}
                  {(cameraFatigue || stressIndex.camera_fatigue) && (
                    <div className="p-2.5 rounded-xl bg-bg-canvas border border-primary-container/30 sm:col-span-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary-container text-[18px]">
                          videocam
                        </span>
                        <div>
                          <span className="font-label-sm font-semibold text-text-primary block text-xs">
                            Camera Fatigue Sensor Recorded
                          </span>
                          <span className="text-[11px] text-text-secondary">
                            Blinks: {(cameraFatigue || stressIndex.camera_fatigue)?.blinks_per_min} bpm • {(cameraFatigue || stressIndex.camera_fatigue)?.status_message}
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-primary-container/15 text-primary-container">
                        {(cameraFatigue || stressIndex.camera_fatigue)?.score}% ({(cameraFatigue || stressIndex.camera_fatigue)?.level_label})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Official NHAA Helpline & Portal Card */}
        <div className="mt-6 p-4 rounded-2xl bg-surface-container/60 border border-primary-container/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="font-label-md font-semibold text-text-primary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary-container text-[18px]">
                account_balance
              </span>
              National Helpline Against Atrocities (NHAA)
            </p>
            <p className="text-xs text-text-secondary">
              24/7 toll-free emergency phone triage and official national complaint portal.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <a
              href="tel:14566"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary-container text-surface-crisp font-label-sm font-medium shadow-xs hover:opacity-95 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">call</span>
              <span>Call 14566</span>
            </a>
            <a
              href="https://www.dosje.gov.in/organisation/national-helpline-against-atrocities/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-crisp text-primary-container border border-primary-container/30 font-label-sm font-medium shadow-xs hover:bg-surface-container transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              <span>dosje.gov.in</span>
            </a>
          </div>
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

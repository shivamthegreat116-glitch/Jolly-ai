"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { SanctuaryHeader } from "@/components/SanctuaryHeader";
import { SanctuaryNav } from "@/components/SanctuaryNav";
import { FatigueCameraWidget } from "@/components/FatigueCameraWidget";
import type {
  AgeGroup,
  StressIndexBreakdown,
  TraumaTypology,
  MedicalHistoryContext,
  CameraFatigueData,
} from "@/types/session";

type Assessment = {
  svi_score: number;
  risk_category: string;
  confidence: string;
  risk_reasons: string[];
  recommended_action: string;
  human_review_recommended: boolean;
  voice_signal_status: string;
  disclaimer: string;
  crisis_mode: boolean;
  stress_index?: StressIndexBreakdown;
  trauma_typology?: TraumaTypology;
  age_group?: AgeGroup;
  medical_history?: MedicalHistoryContext;
};

type CheckInQuestion = {
  category: string;
  icon: string;
  question: string;
  helper: string;
  options: {
    value: string;
    label: string;
    sublabel: string;
    isUrgent?: boolean;
  }[];
};

const CHECK_IN_QUESTIONS: CheckInQuestion[] = [
  {
    category: "Current Physical Space",
    icon: "home_pin",
    question: "Do you feel safe in the place where you are right now?",
    helper:
      "It's okay if the answer is complicated. We are here to help you find quiet reassurance or link to a safer space whenever you're ready.",
    options: [
      {
        value: "safe",
        label: "Yes, I am in a safe space right now",
        sublabel: "I can read, reflect, and continue without immediate disturbance.",
      },
      {
        value: "uneasy",
        label: "Not entirely, I feel uneasy or watched",
        sublabel: "My surroundings feel tense, monitored, or unsettled.",
      },
      {
        value: "immediate_need",
        label: "No, I need immediate assistance or a safe contact",
        sublabel: "We can instantly connect you to NHAA 14566 or secure guidance.",
        isUrgent: true,
      },
      {
        value: "prefer_not",
        label: "I prefer not to answer this question",
        sublabel: "You can proceed smoothly without sharing any further details.",
      },
    ],
  },
  {
    category: "Emotional & Mental Strain",
    icon: "favorite",
    question: "How heavy does your emotional stress feel today?",
    helper:
      "Stress manifests differently in all of us. Honoring how you feel right now is the first step toward relief.",
    options: [
      {
        value: "mild",
        label: "Manageable right now",
        sublabel: "I feel capable of navigating what comes next.",
      },
      {
        value: "moderate",
        label: "Moderately heavy, feeling anxious or burdened",
        sublabel: "Things are taking a toll, but I am holding together.",
      },
      {
        value: "severe",
        label: "Intense, exhausting, or overwhelming",
        sublabel: "I am feeling numb, panicky, or on the brink of breaking down.",
        isUrgent: true,
      },
      {
        value: "prefer_not",
        label: "I'd rather keep this private",
        sublabel: "Skip to the next question anytime.",
      },
    ],
  },
  {
    category: "Privacy & Social Support",
    icon: "group",
    question: "Does anyone close to you know about what you are dealing with?",
    helper:
      "Having or lacking support shapes what steps feel safe for you. Your disclosure is completely protected here.",
    options: [
      {
        value: "alone",
        label: "No one knows yet, this is my first time reaching out",
        sublabel: "I need complete confidentiality and space to think.",
      },
      {
        value: "some",
        label: "A trusted friend, coworker, or family member knows",
        sublabel: "I have limited personal support, but need more guidance.",
      },
      {
        value: "official",
        label: "Authorities, HR, or legal counsel are aware",
        sublabel: "Formal processes may already be in motion.",
      },
      {
        value: "prefer_not",
        label: "I prefer not to discuss this",
        sublabel: "Proceed directly without details.",
      },
    ],
  },
  {
    category: "Coping & Physical Health",
    icon: "bedtime",
    question: "Have you noticed disruptions in sleep, appetite, or focus?",
    helper:
      "Physical symptoms are natural responses to emotional strain. Understanding them helps guide self-care suggestions.",
    options: [
      {
        value: "normal",
        label: "Everything has been mostly normal",
        sublabel: "Routine and physical rhythms remain intact.",
      },
      {
        value: "minor",
        label: "Disrupted sleep patterns or frequent fatigue",
        sublabel: "Trouble falling asleep or feeling drained during the day.",
      },
      {
        value: "severe",
        label: "Substantial disruption in everyday functioning",
        sublabel: "Difficulty eating, sleeping, or maintaining composure.",
      },
      {
        value: "prefer_not",
        label: "Skip this question",
        sublabel: "Move forward at your pace.",
      },
    ],
  },
  {
    category: "Medical & Health Context",
    icon: "medical_services",
    question: "Are there any physical health conditions or medical treatments affecting you?",
    helper:
      "Physical health, chronic pain, or medications can intensify emotional strain. Sharing this helps calibrate your stress assessment safely.",
    options: [
      {
        value: "none",
        label: "No significant physical or chronic conditions",
        sublabel: "Physical health is relatively stable right now.",
      },
      {
        value: "chronic_pain",
        label: "Chronic pain, fatigue, or ongoing illness",
        sublabel: "Physical discomfort adds noticeably to the daily strain.",
      },
      {
        value: "mental_health_care",
        label: "Currently receiving psychological or psychiatric care",
        sublabel: "Under regular care, medication, or counseling support.",
      },
      {
        value: "prefer_not",
        label: "I prefer not to share medical details",
        sublabel: "Proceed without sharing any health history.",
      },
    ],
  },
  {
    category: "Desired Support Pathways",
    icon: "volunteer_activism",
    question: "What type of support would bring the most relief right now?",
    helper:
      "You are in complete control of which resources you wish to access. We never mandate any specific path.",
    options: [
      {
        value: "listening",
        label: "A safe, private space to be heard without judgment",
        sublabel: "Conversational reflection and grounding tools.",
      },
      {
        value: "counselor",
        label: "Confidential connection to a certified human advocate",
        sublabel: "Speaking with an experienced trauma counselor.",
      },
      {
        value: "legal",
        label: "Clear legal and institutional pathways under NHAA 14566 & Digital Portal",
        sublabel: "Know your rights, filing procedures, and protections (nhaa.gov.in).",
      },
      {
        value: "grounding",
        label: "Immediate stress de-escalation and calming techniques",
        sublabel: "Somatic breathing and grounding exercises.",
      },
    ],
  },
  {
    category: "Next Step Preferences",
    icon: "verified_user",
    question: "Would you like us to prepare a confidential summary for review?",
    helper:
      "You inspect and approve every single word before anything is ever saved or shared with a case worker.",
    options: [
      {
        value: "draft",
        label: "Yes, prepare a draft summary I can review and edit",
        sublabel: "You inspect every word before anything is saved or shared.",
      },
      {
        value: "self",
        label: "No summary needed, I just want self-guided tools",
        sublabel: "Keep everything strictly ephemeral in this session.",
      },
      {
        value: "escalate",
        label: "I would like immediate referral or helpline connection",
        sublabel: "Connect to verified 24/7 Indian helpline resources.",
      },
      {
        value: "decide_later",
        label: "I will decide later",
        sublabel: "Explore options at your own pace.",
      },
    ],
  },
];

export default function ResultsPage() {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [showUrgentDrawer, setShowUrgentDrawer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<"checkin" | "results">("checkin");

  // Real-time Fatigue Camera Sensor State
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [liveFatigue, setLiveFatigue] = useState<CameraFatigueData | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((t) => t.stop());
        cameraStreamRef.current = null;
      }
    };
  }, []);

  async function startCamera(mode: "user" | "environment" = facingMode) {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      cameraStreamRef.current = stream;
      setFacingMode(mode);
      setCameraActive(true);
    } catch {
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        cameraStreamRef.current = fallbackStream;
        setCameraActive(true);
      } catch {
        setCameraActive(false);
      }
    }
  }

  function stopCamera() {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    setCameraActive(false);
  }

  async function flipCamera() {
    const nextMode = facingMode === "user" ? "environment" : "user";
    await startCamera(nextMode);
  }

  useEffect(() => {
    const raw = sessionStorage.getItem("jolly_assessment");
    if (raw && raw !== "null") {
      try {
        const parsed = JSON.parse(raw) as Assessment;
        if (!parsed.stress_index) {
          const rawSVI = sessionStorage.getItem("jolly_stress_index");
          if (rawSVI) parsed.stress_index = JSON.parse(rawSVI);
        }
        if (!parsed.trauma_typology) {
          const rawTypo = sessionStorage.getItem("jolly_trauma_typology");
          if (rawTypo) parsed.trauma_typology = JSON.parse(rawTypo);
        }
        if (!parsed.age_group) {
          const rawAge = sessionStorage.getItem("jolly_age_group");
          if (rawAge) parsed.age_group = rawAge as AgeGroup;
        }
        if (!parsed.medical_history) {
          const rawMed = sessionStorage.getItem("jolly_medical_history");
          if (rawMed) {
            try {
              parsed.medical_history = JSON.parse(rawMed);
            } catch {
              parsed.medical_history = {
                chronic_conditions: [],
                current_treatments: [],
                mobility_or_sensory: [],
                substance_or_medication_considerations: [],
                self_reported_notes: rawMed,
              };
            }
          }
        }
        setAssessment(parsed);
        setViewMode("results");
      } catch {
        // keep checkin
      }
    }
  }, []);

  const q = CHECK_IN_QUESTIONS[currentStep];
  const progressPercent = Math.round(((currentStep + 1) / CHECK_IN_QUESTIONS.length) * 100);

  function handleSelectOption(val: string, isUrgent?: boolean) {
    setAnswers((prev) => ({ ...prev, [currentStep]: val }));
    if (isUrgent || val === "immediate_need") {
      setShowUrgentDrawer(true);
    } else {
      setShowUrgentDrawer(false);
    }
  }

  function handleSkip() {
    setShowUrgentDrawer(false);
    if (currentStep < CHECK_IN_QUESTIONS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      finishCheckIn();
    }
  }

  function handleNext() {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      if (currentStep < CHECK_IN_QUESTIONS.length - 1) {
        setCurrentStep((prev) => prev + 1);
        setShowUrgentDrawer(false);
      } else {
        finishCheckIn();
      }
    }, 400);
  }

  function handlePrev() {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      setShowUrgentDrawer(false);
    }
  }

  function finishCheckIn() {
    let score = 25;
    const reasons: string[] = [];

    // 0: Physical Space
    if (answers[0] === "immediate_need" || answers[0] === "uneasy") {
      score += 35;
      reasons.push("Safety concerns reported in current physical surroundings");
    }
    // 1: Emotional & Mental Strain
    if (answers[1] === "severe") {
      score += 25;
      reasons.push("Elevated emotional strain and feelings of overwhelm");
    } else if (answers[1] === "moderate") {
      score += 15;
      reasons.push("Moderate emotional stress and anxiety reported");
    }
    // 2: Privacy & Social Support
    if (answers[2] === "alone") {
      score += 10;
      reasons.push("First-time disclosure with limited existing support network");
    }
    // 3: Coping & Physical Health
    if (answers[3] === "severe") {
      score += 15;
      reasons.push("Physical functioning, sleep patterns, or appetite significantly disrupted");
    } else if (answers[3] === "minor") {
      score += 8;
      reasons.push("Sleep fatigue or daily composure strain reported");
    }
    // 4: Medical & Health Context
    if (answers[4] === "chronic_pain") {
      score += 12;
      reasons.push("Chronic physical discomfort or fatigue compounding psychological stress");
    } else if (answers[4] === "mental_health_care") {
      score += 8;
      reasons.push("Current psychological or psychiatric treatment history noted for sensitive care");
    }

    score = Math.min(100, Math.max(10, score));

    // Calculate 5-Dimension Stress Vulnerability Index Breakdown
    const emotional_strain =
      answers[1] === "severe" ? 90 : answers[1] === "moderate" ? 62 : answers[1] === "mild" ? 22 : 40;
    const cognitive_overwhelm =
      answers[3] === "severe" ? 85 : answers[3] === "minor" ? 55 : 25;
    let somatic_load =
      answers[3] === "severe" ? 80 : answers[3] === "minor" ? 50 : 20;
    if (answers[4] === "chronic_pain") somatic_load = Math.min(100, somatic_load + 25);
    if (answers[4] === "mental_health_care") somatic_load = Math.min(100, somatic_load + 15);

    // Calibrate somatic load with live camera fatigue sensor if active
    let cameraFatigue: CameraFatigueData | undefined = liveFatigue || undefined;
    if (!cameraFatigue) {
      try {
        const rawCF = sessionStorage.getItem("jolly_camera_fatigue");
        if (rawCF) cameraFatigue = JSON.parse(rawCF);
      } catch {}
    }
    if (cameraFatigue && typeof cameraFatigue.score === "number") {
      somatic_load = Math.min(100, Math.round(somatic_load * 0.45 + cameraFatigue.score * 0.55));
      if (cameraFatigue.score >= 50) {
        reasons.push(
          `Camera Fatigue Sensor: ${cameraFatigue.score}% (${cameraFatigue.level_label}) detected during assessment`
        );
      }
    }

    const relational_isolation =
      answers[2] === "alone" ? 85 : answers[2] === "some" ? 45 : answers[2] === "official" ? 30 : 50;
    const environmental_risk =
      answers[0] === "immediate_need" ? 95 : answers[0] === "uneasy" ? 65 : 15;

    const composite_svi = Math.min(
      100,
      Math.max(
        10,
        Math.round(
          emotional_strain * 0.3 +
            cognitive_overwhelm * 0.2 +
            somatic_load * 0.15 +
            relational_isolation * 0.15 +
            environmental_risk * 0.2
        )
      )
    );

    const severity_level: StressIndexBreakdown["severity_level"] =
      composite_svi >= 80 ? "acute" : composite_svi >= 65 ? "high" : composite_svi >= 40 ? "moderate" : "mild";

    let riskCat = "Mild Strain";
    let recommended = "Grounding exercises, peer listening, and self-care resources.";
    let humanReview = false;
    let crisisMode = false;

    if (composite_svi >= 70) {
      riskCat = "High Strain / Acute Support";
      recommended =
        "Direct connection to an NHAA 14566 counselor or specialized trauma advocate is recommended (Helpline: 14566 | Digital Portal: https://nhaa.gov.in).";
      humanReview = true;
      crisisMode = true;
    } else if (composite_svi >= 40) {
      riskCat = "Moderate Strain";
      recommended =
        "Trauma-informed guidance, confidential counseling referral (14566 & nhaa.gov.in), and reflective drafting.";
      humanReview = true;
    }

    const stress_index: StressIndexBreakdown = {
      overall_score: composite_svi,
      risk_category: riskCat,
      emotional_strain,
      cognitive_overwhelm,
      somatic_load,
      relational_isolation,
      environmental_risk,
      composite_svi,
      severity_level,
      camera_fatigue: cameraFatigue,
    };

    const compiledNotes = Object.values(notes).filter(Boolean).join("\n\n");
    if (compiledNotes) {
      sessionStorage.setItem("jolly_summary", compiledNotes);
    }

    // Determine / infer trauma typology
    let trauma_typology: TraumaTypology | undefined;
    try {
      const rawTypo = sessionStorage.getItem("jolly_trauma_typology");
      if (rawTypo) trauma_typology = JSON.parse(rawTypo);
    } catch {}

    if (!trauma_typology) {
      const notesLower = compiledNotes.toLowerCase();
      let category: TraumaTypology["category"] = "cumulative_distress";
      let display_name = "Cumulative Distress & Chronic Exhaustion Pattern";
      const primary_indicators: string[] = [];

      if (answers[0] === "immediate_need" || answers[0] === "uneasy") {
        category = "acute_situational_shock";
        display_name = "Acute Situational Shock & Threat Exposure";
        primary_indicators.push("Environmental tension or fear reported in immediate surroundings");
      }
      if (
        notesLower.includes("work") ||
        notesLower.includes("boss") ||
        notesLower.includes("office") ||
        notesLower.includes("job") ||
        notesLower.includes("colleague")
      ) {
        category = "workplace_harassment";
        display_name = "Workplace Harassment & Professional Intimidation";
        primary_indicators.push("Workplace power dynamics or professional hostility indicated");
      } else if (
        notesLower.includes("partner") ||
        notesLower.includes("husband") ||
        notesLower.includes("home") ||
        notesLower.includes("family") ||
        answers[2] === "alone"
      ) {
        if (category !== "acute_situational_shock") {
          category = "domestic_interpersonal";
          display_name = "Domestic & Interpersonal Trauma Pattern";
          primary_indicators.push("Interpersonal isolation or household relationship tension reported");
        }
      }

      if (primary_indicators.length === 0) {
        primary_indicators.push("Reported high emotional load, disrupted sleep patterns, and stress burden");
      }

      trauma_typology = {
        category,
        display_name,
        primary_indicators,
        confidence: "preliminary",
        disclaimer:
          "Non-diagnostic situational classification based on self-reported check-in indicators to facilitate human counselor triage.",
      };
    }

    // Medical history context
    let medical_history: MedicalHistoryContext | undefined;
    if (answers[4] && answers[4] !== "prefer_not") {
      medical_history = {
        chronic_conditions: answers[4] === "chronic_pain" ? ["Chronic pain / fatigue reported"] : [],
        current_treatments: answers[4] === "mental_health_care" ? ["Ongoing psychological / psychiatric care"] : [],
        mobility_or_sensory: [],
        substance_or_medication_considerations: [],
        self_reported_notes: notes[4] || "",
      };
      sessionStorage.setItem("jolly_medical_history", JSON.stringify(medical_history));
    }

    // Retrieve age group
    const age_group = (sessionStorage.getItem("jolly_age_group") as AgeGroup) || undefined;

    const calculatedAssessment: Assessment = {
      svi_score: composite_svi,
      risk_category: riskCat,
      confidence: "High (Self-reported check-in)",
      risk_reasons: reasons.length > 0 ? reasons : ["General proactive wellness check completed."],
      recommended_action: recommended,
      human_review_recommended: humanReview,
      voice_signal_status: "Normal / Not active",
      disclaimer:
        "This assessment is non-diagnostic and designed solely to connect you with appropriate NHAA (14566 / https://nhaa.gov.in) and wellness resources.",
      crisis_mode: crisisMode,
      stress_index,
      trauma_typology,
      age_group,
      medical_history,
    };

    sessionStorage.setItem("jolly_assessment", JSON.stringify(calculatedAssessment));
    sessionStorage.setItem("jolly_stress_index", JSON.stringify(stress_index));
    sessionStorage.setItem("jolly_trauma_typology", JSON.stringify(trauma_typology));

    setAssessment(calculatedAssessment);
    setViewMode("results");
  }

  return (
    <div className="min-h-screen bg-bg-canvas text-text-primary flex flex-col font-body-md antialiased">
      <SanctuaryHeader />

      <main className="flex-1 flex flex-col relative w-full pt-20 pb-28 px-gutter-sm sm:px-gutter max-w-2xl mx-auto">
        {/* Urgent Quick Exit Bar */}
        <aside
          aria-label="Urgent safety notice"
          className="w-full mb-4 rounded-2xl bg-safety-emergency-subtle p-3.5 flex items-center justify-between gap-space-sm border border-safety-emergency/20"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="material-symbols-outlined text-safety-emergency text-[20px] shrink-0"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              shield_with_heart
            </span>
            <p className="font-body-sm text-safety-emergency truncate">
              Need rapid privacy or crisis dispatch?
            </p>
          </div>
          <a
            className="shrink-0 px-3 py-1 rounded-full bg-surface-crisp text-safety-emergency font-label-sm font-semibold shadow-xs hover:bg-safety-emergency-subtle active:scale-95 transition-all inline-flex items-center gap-1 min-h-[36px]"
            href="https://weather.com"
            rel="noopener noreferrer"
          >
            <span>Quick Exit</span>
            <span className="material-symbols-outlined text-[14px]">logout</span>
          </a>
        </aside>

        {viewMode === "checkin" ? (
          /* ========================================================
             CHECK-IN QUESTIONNAIRE (from jolly_ai_conversational_check_in)
             ======================================================== */
          <div className="flex flex-col w-full">
            <section className="w-full flex flex-col mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-primary-container">
                  <span className="material-symbols-outlined text-[20px]">spa</span>
                  <h1 className="font-headline-sm text-text-primary tracking-tight">
                    Stress & Needs Check-in
                  </h1>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={cameraActive ? stopCamera : () => void startCamera()}
                    className={`text-xs font-label-sm font-medium py-1 px-2.5 rounded-lg border transition-all inline-flex items-center gap-1.5 shadow-2xs ${
                      cameraActive
                        ? "bg-secondary-container text-primary font-semibold border-primary/30"
                        : "bg-surface-container text-text-secondary hover:text-text-primary border-border-subtle"
                    }`}
                    title="Toggle Real-Time Camera Fatigue Sensor"
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      {cameraActive ? "videocam" : "videocam_off"}
                    </span>
                    <span>{cameraActive ? "Fatigue Sensor Active" : "Fatigue Camera"}</span>
                  </button>
                  <button
                    className="font-label-md text-text-secondary hover:text-primary-container transition-colors py-1 px-2.5 rounded-lg"
                    id="skip-btn"
                    type="button"
                    onClick={handleSkip}
                  >
                    Skip question
                  </button>
                </div>
              </div>
              <p className="font-body-sm text-text-secondary mb-3">
                You are always in control here. Take as many pauses as you need.
              </p>
              <div
                aria-label={`Assessment progress: Step ${currentStep + 1} of ${CHECK_IN_QUESTIONS.length}`}
                className="w-full flex flex-col gap-1.5"
              >
                <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-container transition-all duration-500 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-text-secondary font-label-sm">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
                    Step {currentStep + 1} of {CHECK_IN_QUESTIONS.length}
                  </span>
                  <span className="italic text-text-secondary/80">Take your time</span>
                </div>
              </div>
            </section>

            {/* Question Card */}
            <div className="w-full bg-surface-crisp rounded-3xl shadow-whisper p-6 sm:p-8 flex flex-col relative overflow-hidden border border-border-subtle/50 transition-all duration-300">
              <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-surface-container-low/40 pointer-events-none -z-0" />

              <div className="relative z-10 flex flex-col">
                <div className="inline-flex items-center gap-1.5 mb-3 px-3 py-1 rounded-full bg-surface-container-low text-primary-container w-fit">
                  <span className="material-symbols-outlined text-[16px]">{q.icon}</span>
                  <span className="font-label-sm font-medium">{q.category}</span>
                </div>

                <h2 className="font-headline-sm sm:font-headline-md text-text-primary mb-2.5 font-medium leading-snug">
                  {q.question}
                </h2>
                <p className="font-body-md text-text-secondary mb-6 leading-relaxed">
                  {q.helper}
                </p>

                {/* Option Choices */}
                <div
                  aria-label="Check-in choices"
                  className="flex flex-col gap-3"
                  role="radiogroup"
                >
                  {q.options.map((opt) => {
                    const isSelected = answers[currentStep] === opt.value;
                    return (
                      <label
                        key={opt.value}
                        onClick={() => handleSelectOption(opt.value, opt.isUrgent)}
                        className={`group relative flex items-start gap-3.5 p-4 rounded-2xl cursor-pointer transition-all duration-200 border ${
                          isSelected
                            ? "bg-surface-container-low border-primary-container/40 shadow-xs"
                            : "bg-bg-canvas border-transparent hover:bg-surface-container-low/70"
                        }`}
                      >
                        <input
                          className="sr-only"
                          name={`q_${currentStep}`}
                          type="radio"
                          value={opt.value}
                          checked={isSelected}
                          onChange={() => handleSelectOption(opt.value, opt.isUrgent)}
                        />
                        <div
                          className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? "bg-primary-container text-surface-crisp"
                              : "bg-surface-container text-transparent"
                          }`}
                        >
                          <span
                            className={`material-symbols-outlined text-[16px] ${
                              isSelected ? "opacity-100" : "opacity-0"
                            }`}
                          >
                            check
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-body-md text-text-primary font-medium block leading-snug">
                            {opt.label}
                          </span>
                          <span
                            className={`font-body-sm mt-0.5 block ${
                              opt.isUrgent ? "text-safety-emergency font-medium" : "text-text-secondary"
                            }`}
                          >
                            {opt.sublabel}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Urgent Assistance Drawer */}
                {showUrgentDrawer && (
                  <div className="mt-4 p-4 rounded-2xl bg-safety-emergency-subtle border border-safety-emergency/30 transition-all duration-300">
                    <div className="flex items-start gap-3">
                      <span
                        className="material-symbols-outlined text-safety-emergency text-[22px] mt-0.5 shrink-0"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        phone_in_talk
                      </span>
                      <div className="flex-1">
                        <h3 className="font-headline-sm text-safety-emergency font-semibold">
                          Immediate 24/7 Helpline
                        </h3>
                        <p className="font-body-sm text-text-primary mt-1">
                          Trauma counselors and confidential advocates are standing by right now.
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <a
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-safety-emergency text-surface-crisp font-label-md font-medium shadow-sm hover:opacity-95 active:scale-95 transition-all min-h-[44px]"
                            href="tel:14566"
                          >
                            <span className="material-symbols-outlined text-[18px]">call</span>
                            <span>Call NHAA 14566 Now</span>
                          </a>
                          <a
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-crisp text-safety-emergency border border-safety-emergency/30 font-label-md font-medium shadow-xs hover:bg-safety-emergency-subtle active:scale-95 transition-all min-h-[44px]"
                            href="https://nhaa.gov.in"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                            <span>NHAA Digital Portal</span>
                          </a>
                          <button
                            className="px-3 py-2 rounded-xl bg-surface-crisp text-text-secondary font-label-md hover:text-text-primary transition-colors min-h-[44px]"
                            onClick={() => setShowUrgentDrawer(false)}
                            type="button"
                          >
                            Continue check-in
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reflection Notes */}
                <div className="mt-6 pt-4 border-t border-border-subtle/50">
                  <div className="flex items-center justify-between mb-2">
                    <label
                      className="font-label-md text-text-primary font-medium inline-flex items-center gap-1.5"
                      htmlFor="reflection-notes"
                    >
                      <span className="material-symbols-outlined text-[16px] text-text-secondary">
                        edit_note
                      </span>
                      Add any thoughts or details (optional)
                    </label>
                    <span className="font-label-sm text-text-secondary">Encrypted & private</span>
                  </div>
                  <div className="relative rounded-2xl bg-bg-canvas p-1 focus-within:bg-surface-container-low border border-border-subtle/40 transition-colors">
                    <textarea
                      className="w-full bg-transparent p-3 text-text-primary font-body-md placeholder:text-text-secondary/50 focus:outline-none resize-none"
                      id="reflection-notes"
                      placeholder="Write what feels comfortable, or leave this blank..."
                      rows={3}
                      value={notes[currentStep] || ""}
                      onChange={(e) =>
                        setNotes((prev) => ({ ...prev, [currentStep]: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <section className="w-full mt-6 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <button
                  aria-label="Return to previous step"
                  className="min-h-[48px] px-5 rounded-xl bg-surface-container text-primary-container font-label-lg font-medium hover:bg-surface-container-high transition-all active:scale-95 flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-40"
                  disabled={currentStep === 0}
                  onClick={handlePrev}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                  <span>Previous</span>
                </button>
                <button
                  className="flex-1 min-h-[48px] px-6 rounded-xl bg-primary-container text-surface-crisp font-label-lg font-medium shadow-sm hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  id="btn-next"
                  onClick={handleNext}
                  type="button"
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">
                        progress_activity
                      </span>
                      <span>Saving gently...</span>
                    </>
                  ) : currentStep === CHECK_IN_QUESTIONS.length - 1 ? (
                    <>
                      <span>Complete check-in</span>
                      <span className="material-symbols-outlined text-[18px]">check</span>
                    </>
                  ) : (
                    <>
                      <span>Continue at your pace</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </>
                  )}
                </button>
              </div>
              <div className="flex items-center justify-center gap-2 text-center px-4 py-2 text-text-secondary font-label-sm">
                <span className="material-symbols-outlined text-[16px] text-primary-container shrink-0">
                  verified_user
                </span>
                <p className="leading-relaxed">
                  This assessment is non-diagnostic and helps connect you with appropriate NHAA 14566 resources.
                </p>
              </div>
            </section>
          </div>
        ) : (
          /* ========================================================
             ASSESSMENT RESULTS VIEW
             ======================================================== */
          <div className="flex flex-col w-full space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-primary-container font-label-sm mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
                  Support & Wellbeing Overview
                </span>
                <h1 className="font-headline-md text-text-primary">Your Suggested Pathways</h1>
              </div>
              <button
                onClick={() => {
                  setCurrentStep(0);
                  setViewMode("checkin");
                }}
                className="font-label-md text-primary-container hover:underline px-3 py-1.5 rounded-xl bg-surface-container-low transition-colors"
              >
                Retake check-in
              </button>
            </div>

            {assessment ? (
              <div className="rounded-3xl bg-surface-crisp p-6 sm:p-8 shadow-whisper border border-border-subtle/60 space-y-6">
                {/* Non-diagnostic Alert */}
                <div className="flex items-start gap-3 rounded-2xl bg-surface-container-low p-4 text-text-secondary font-body-sm">
                  <span className="material-symbols-outlined text-primary-container text-[20px] shrink-0">
                    info
                  </span>
                  <p>{assessment.disclaimer}</p>
                </div>

                {/* Intake Context Badges (Age & Medical) */}
                {(assessment.age_group || assessment.medical_history) && (
                  <div className="flex flex-wrap items-center gap-2 pb-1">
                    {assessment.age_group && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-primary-container font-label-sm border border-primary-container/20">
                        <span className="material-symbols-outlined text-[15px]">person</span>
                        <span>
                          Age:{" "}
                          {assessment.age_group === "under_18"
                            ? "Under 18 (Youth Protection Priority)"
                            : assessment.age_group === "18_24"
                            ? "18–24 years"
                            : assessment.age_group === "25_40"
                            ? "25–40 years"
                            : assessment.age_group === "41_60"
                            ? "41–60 years"
                            : assessment.age_group === "60_plus"
                            ? "60+ years (Senior Care)"
                            : "Protected / Undisclosed"}
                        </span>
                      </span>
                    )}
                    {assessment.medical_history && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-text-secondary font-label-sm border border-border-subtle">
                        <span className="material-symbols-outlined text-[15px] text-primary-container">
                          medical_services
                        </span>
                        <span>
                          Health Context:{" "}
                          {assessment.medical_history.chronic_conditions?.length
                            ? assessment.medical_history.chronic_conditions.join(", ")
                            : assessment.medical_history.current_treatments?.length
                            ? assessment.medical_history.current_treatments.join(", ")
                            : "Recorded for calibrated triage"}
                        </span>
                      </span>
                    )}
                  </div>
                )}

                {/* Core Badges Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-bg-canvas border border-border-subtle/50 text-center">
                    <span className="block font-label-sm text-text-secondary">SVI Composite</span>
                    <span className="font-headline-sm font-semibold text-primary-container mt-1 block">
                      {assessment.svi_score}
                      <span className="text-xs font-normal text-text-secondary">/100</span>
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-bg-canvas border border-border-subtle/50 text-center">
                    <span className="block font-label-sm text-text-secondary">Category</span>
                    <span className="font-label-md font-semibold text-primary-container mt-1 block truncate">
                      {assessment.risk_category}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-bg-canvas border border-border-subtle/50 text-center">
                    <span className="block font-label-sm text-text-secondary">Confidence</span>
                    <span className="font-label-md font-medium text-text-primary mt-1 block truncate">
                      {assessment.confidence}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-bg-canvas border border-border-subtle/50 text-center">
                    <span className="block font-label-sm text-text-secondary">Voice Signal</span>
                    <span className="font-label-md font-medium text-text-primary mt-1 block truncate">
                      {assessment.voice_signal_status}
                    </span>
                  </div>
                </div>

                {/* Multi-Dimensional Stress Index (SVI) Breakdown */}
                {assessment.stress_index && (
                  <div className="p-5 rounded-2xl bg-surface-container-low/80 border border-primary-container/20 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-headline-sm text-text-primary flex items-center gap-2 text-base font-semibold">
                        <span className="material-symbols-outlined text-[18px] text-primary-container">
                          analytics
                        </span>
                        Stress Vulnerability Index (5 Dimensions)
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-primary-container/10 text-primary-container">
                        Level: {assessment.stress_index.severity_level}
                      </span>
                    </div>

                    <div className="space-y-3 pt-1">
                      {/* Emotional Strain */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-label-sm text-text-secondary">
                          <span className="flex items-center gap-1 font-medium text-text-primary">
                            <span>🧠</span> Emotional Strain
                          </span>
                          <span className="font-semibold">{assessment.stress_index.emotional_strain}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                          <div
                            className="h-full bg-primary-container rounded-full transition-all duration-500"
                            style={{ width: `${assessment.stress_index.emotional_strain}%` }}
                          />
                        </div>
                      </div>

                      {/* Cognitive Overwhelm */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-label-sm text-text-secondary">
                          <span className="flex items-center gap-1 font-medium text-text-primary">
                            <span>⚡</span> Cognitive Overwhelm
                          </span>
                          <span className="font-semibold">{assessment.stress_index.cognitive_overwhelm}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                          <div
                            className="h-full bg-primary-container/90 rounded-full transition-all duration-500"
                            style={{ width: `${assessment.stress_index.cognitive_overwhelm}%` }}
                          />
                        </div>
                      </div>

                      {/* Somatic Load */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-label-sm text-text-secondary">
                          <span className="flex items-center gap-1 font-medium text-text-primary">
                            <span>🫀</span> Somatic & Physical Load
                          </span>
                          <span className="font-semibold">{assessment.stress_index.somatic_load}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                          <div
                            className="h-full bg-amber-500/80 rounded-full transition-all duration-500"
                            style={{ width: `${assessment.stress_index.somatic_load}%` }}
                          />
                        </div>
                      </div>

                      {/* Relational Isolation */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-label-sm text-text-secondary">
                          <span className="flex items-center gap-1 font-medium text-text-primary">
                            <span>🤝</span> Relational Isolation
                          </span>
                          <span className="font-semibold">{assessment.stress_index.relational_isolation}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                          <div
                            className="h-full bg-indigo-500/80 rounded-full transition-all duration-500"
                            style={{ width: `${assessment.stress_index.relational_isolation}%` }}
                          />
                        </div>
                      </div>

                      {/* Environmental Risk */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-label-sm text-text-secondary">
                          <span className="flex items-center gap-1 font-medium text-text-primary">
                            <span>🛡️</span> Environmental Safety Risk
                          </span>
                          <span className="font-semibold">{assessment.stress_index.environmental_risk}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                          <div
                            className="h-full bg-rose-500/80 rounded-full transition-all duration-500"
                            style={{ width: `${assessment.stress_index.environmental_risk}%` }}
                          />
                        </div>
                      </div>

                      {/* Live Camera Fatigue Sensor Telemetry */}
                      {assessment.stress_index.camera_fatigue && (
                        <div className="pt-2 border-t border-border-subtle/50 mt-2">
                          <div className="p-3 rounded-xl bg-bg-canvas border border-primary-container/30 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-primary-container text-[18px]">
                                videocam
                              </span>
                              <div>
                                <span className="font-label-sm font-semibold text-text-primary block text-xs">
                                  Camera Fatigue Sensor Telemetry
                                </span>
                                <span className="text-[11px] text-text-secondary">
                                  Blinks: {assessment.stress_index.camera_fatigue.blinks_per_min} bpm • {assessment.stress_index.camera_fatigue.status_message}
                                </span>
                              </div>
                            </div>
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-primary-container/15 text-primary-container">
                              {assessment.stress_index.camera_fatigue.score}% ({assessment.stress_index.camera_fatigue.level_label})
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Identified Trauma & Distress Typology Profile */}
                {assessment.trauma_typology && (
                  <div className="p-5 rounded-2xl bg-surface-crisp border border-border-subtle/80 space-y-3 shadow-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary-container text-[20px]">
                          psychology_alt
                        </span>
                        <div>
                          <span className="text-xs font-label-sm text-text-secondary block">
                            Identified Trauma / Distress Pattern
                          </span>
                          <h3 className="font-headline-sm text-text-primary font-semibold text-base">
                            {assessment.trauma_typology.display_name}
                          </h3>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-surface-container text-text-secondary shrink-0">
                        {assessment.trauma_typology.confidence}
                      </span>
                    </div>

                    <ul className="space-y-1.5 pl-2 pt-1">
                      {assessment.trauma_typology.primary_indicators?.map((ind, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs font-body-sm text-text-secondary">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary-container mt-1.5 shrink-0" />
                          <span>{ind}</span>
                        </li>
                      ))}
                    </ul>

                    <p className="text-[11px] text-text-secondary/75 italic pt-1 border-t border-border-subtle/40">
                      {assessment.trauma_typology.disclaimer}
                    </p>
                  </div>
                )}

                {/* Why this was suggested */}
                <div className="space-y-2">
                  <h2 className="font-headline-sm text-text-primary flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary-container">
                      psychology
                    </span>
                    Why this was suggested
                  </h2>
                  <ul className="space-y-2 pl-2">
                    {assessment.risk_reasons.map((r, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-body-md text-text-secondary">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-container mt-2.5 shrink-0" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Suggested Next Step */}
                <div className="p-5 rounded-2xl bg-surface-container-low border border-primary-container/20 space-y-2">
                  <h3 className="font-label-lg font-semibold text-primary-container flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">navigation</span>
                    Suggested Next Step
                  </h3>
                  <p className="font-body-md text-text-primary">{assessment.recommended_action}</p>
                </div>

                {/* Official NHAA Helpline & Portal Card */}
                <div className="p-4 rounded-2xl bg-surface-container/60 border border-primary-container/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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
                      href="https://nhaa.gov.in"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-crisp text-primary-container border border-primary-container/30 font-label-sm font-medium shadow-xs hover:bg-surface-container transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                      <span>nhaa.gov.in</span>
                    </a>
                  </div>
                </div>

                {/* Human Review Advisory */}
                {assessment.human_review_recommended && (
                  <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/60 flex items-start gap-3">
                    <span className="material-symbols-outlined text-amber-700 text-[20px] shrink-0">
                      assignment_ind
                    </span>
                    <p className="font-body-sm text-amber-900">
                      Human review is gently recommended. Please note that nothing is sent or shared
                      unless you explicitly inspect a summary and approve the sharing request.
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/summary"
                    className="flex-1 min-h-[48px] rounded-xl bg-primary-container text-surface-crisp font-label-lg font-medium flex items-center justify-center gap-2 shadow-sm hover:opacity-95 transition-all"
                  >
                    <span>Review my summary</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </Link>
                  <Link
                    href="/chat"
                    className="min-h-[48px] px-5 rounded-xl bg-surface-container text-primary-container font-label-lg font-medium flex items-center justify-center gap-2 hover:bg-surface-container-high transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">forum</span>
                    <span>Return to conversation</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl bg-surface-crisp p-8 text-center border border-border-subtle/60 shadow-whisper space-y-4">
                <p className="font-body-md text-text-secondary">
                  No previous assessment found in this session.
                </p>
                <button
                  onClick={() => setViewMode("checkin")}
                  className="px-6 py-2.5 rounded-xl bg-primary-container text-surface-crisp font-label-md"
                >
                  Start Stress & Needs Check-in
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Bottom-Left Real-Time Fatigue Camera HUD */}
      {cameraActive && (
        <FatigueCameraWidget
          stream={cameraStreamRef.current}
          facingMode={facingMode}
          onClose={stopCamera}
          onFlip={() => void flipCamera()}
          onFatigueUpdate={(data) => {
            setLiveFatigue(data);
            sessionStorage.setItem("jolly_camera_fatigue", JSON.stringify(data));
          }}
        />
      )}

      <SanctuaryNav activePath="assessment" />
    </div>
  );
}

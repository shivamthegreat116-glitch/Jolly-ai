"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmergencyButton } from "@/components/EmergencyButton";
import { ShareConfirmModal } from "@/components/ShareConfirmModal";
import { SanctuaryHeader } from "@/components/SanctuaryHeader";
import { api } from "@/lib/api";
import { STRINGS, type Lang } from "@/lib/i18n";
import { estimateFeaturesFromAnalyser, getSpeechRecognitionLang, speak, type VoiceFeatures } from "@/lib/voice";

type Msg = { role: "user" | "assistant"; text: string; time?: string };

const LANGUAGES: { id: Lang; label: string }[] = [
  { id: "en", label: "English" },
  { id: "hi", label: "हिन्दी" },
  { id: "hinglish", label: "Hinglish" },
  { id: "mr", label: "मराठी" },
  { id: "bn", label: "বাংলা" },
  { id: "ta", label: "தமிழ்" },
  { id: "te", label: "తెలుగు" },
];

export default function ChatPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState("");
  const [lang, setLang] = useState<Lang>("en");
  const [phase, setPhase] = useState("start");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [crisis, setCrisis] = useState(false);
  const [busy, setBusy] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const [tts, setTts] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcriptDraft, setTranscriptDraft] = useState("");
  const [showTranscript, setShowTranscript] = useState(false);
  const [shareDest, setShareDest] = useState<string | null>(null);
  const [unsafe, setUnsafe] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [currentQuestionId, setCurrentQuestionId] = useState<string>("Q01_SAFETY");
  const [clarificationCount, setClarificationCount] = useState<number>(0);
  const [conversationMode, setConversationMode] = useState<string>("assessment");
  const [crisisLevel, setCrisisLevel] = useState<string>("none");
  const [videoRoomUrl, setVideoRoomUrl] = useState<string | null>(null);
  const [escalationLoading, setEscalationLoading] = useState(false);

  // Redesign state: Breathing Overlay & Voice Sanctuary Mode
  const [showGrounding, setShowGrounding] = useState(false);
  const [voiceSanctuaryOpen, setVoiceSanctuaryOpen] = useState(false);
  const [voicePaused, setVoicePaused] = useState(false);

  // Save & End Chat state
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [endChatModalOpen, setEndChatModalOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Camera & Video state
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraStream = useRef<MediaStream | null>(null);

  const volumes = useRef<number[]>([]);
  const recStart = useRef(0);
  const mediaStream = useRef<MediaStream | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const levelFrame = useRef<number | null>(null);
  const speechActive = useRef(false);
  const activeRecognizer = useRef<SpeechRecognition | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const loc = STRINGS[lang] || STRINGS.en;

  useEffect(() => {
    const sid = sessionStorage.getItem("jolly_session");
    if (!sid) {
      router.replace("/consent");
      return;
    }
    setSessionId(sid);
    const storedLang = (sessionStorage.getItem("jolly_lang") as Lang) || "en";
    setLang(storedLang);
    setVoiceOn(sessionStorage.getItem("jolly_voice") === "1");
    void boot(sid);
  }, [router]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function boot(sid: string) {
    try {
      const r = await api<{
        reply: string;
        next_phase: string;
        question_id?: string;
        next_question_id?: string;
      }>("/api/chat", {
        method: "POST",
        body: JSON.stringify({ session_id: sid, message: "", phase: "start" }),
      });
      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setMessages([{ role: "assistant", text: r.reply, time: now }]);
      setPhase(r.next_phase);
      if (r.next_question_id) {
        setCurrentQuestionId(r.next_question_id);
      }
    } catch {
      setError("We could not start this chat. Please check your connection and try again.");
    }
  }

  useEffect(() => {
    return () => {
      if (cameraStream.current) {
        cameraStream.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (cameraOn && videoRef.current && cameraStream.current) {
      videoRef.current.srcObject = cameraStream.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraOn]);

  async function startCamera(mode: "user" | "environment" = facingMode) {
    if (typeof window === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Camera is not supported on this browser or device.");
      return;
    }
    try {
      setCameraLoading(true);
      setError("");
      if (cameraStream.current) {
        cameraStream.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });
      cameraStream.current = stream;
      setFacingMode(mode);
      setCameraOn(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
        setError("Camera permission was denied. Please allow camera access in your device settings.");
      } else {
        setError("Could not open camera: " + (e.message || "Device or browser error"));
      }
      setCameraOn(false);
    } finally {
      setCameraLoading(false);
    }
  }

  function stopCamera() {
    if (cameraStream.current) {
      cameraStream.current.getTracks().forEach((t) => t.stop());
      cameraStream.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOn(false);
  }

  async function flipCamera() {
    const nextMode = facingMode === "user" ? "environment" : "user";
    await startCamera(nextMode);
  }

  function captureCameraFrame(): string | null {
    if (!cameraOn || !videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return null;
    canvas.width = Math.min(video.videoWidth, 640);
    canvas.height = Math.min(video.videoHeight, 480);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.6);
  }

  async function send(text: string, voice?: VoiceFeatures) {
    if (!text.trim() || busy) return;
    setError("");
    setBusy(true);
    const timeNow = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((m) => [...m, { role: "user", text, time: timeNow }]);
    setInput("");
    const snapshot = captureCameraFrame();
    try {
      const r = await api<{
        reply: string;
        next_phase: string;
        question_id?: string;
        next_question_id?: string | null;
        interpretation?: unknown;
        crisis_mode: boolean;
        assessment: unknown;
        draft_summary: string;
        voice_signal_status: string;
        conversation_mode?: string;
        crisis_level?: string;
        video_room_url?: string;
        escalation_event_id?: string;
      }>("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          session_id: sessionId,
          message: text,
          phase,
          question_id: currentQuestionId,
          clarification_count: clarificationCount,
          voice: voice || undefined,
          user_says_unsafe: unsafe,
          image_base64: snapshot || undefined,
        }),
      });
      const aiTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setMessages((m) => [...m, { role: "assistant", text: r.reply, time: aiTime }]);
      setPhase(r.next_phase);
      if (r.next_question_id) {
        if (r.next_question_id === currentQuestionId) {
          setClarificationCount((c) => c + 1);
        } else {
          setCurrentQuestionId(r.next_question_id);
          setClarificationCount(0);
        }
      }
      setCrisis(Boolean(r.crisis_mode));
      if (r.conversation_mode) setConversationMode(r.conversation_mode);
      if (r.crisis_level) setCrisisLevel(r.crisis_level);
      if (r.video_room_url) setVideoRoomUrl(r.video_room_url);
      sessionStorage.setItem("jolly_assessment", JSON.stringify(r.assessment));
      sessionStorage.setItem("jolly_summary", r.draft_summary || "");
      sessionStorage.setItem("jolly_voice_status", r.voice_signal_status);
      if (tts) speak(r.reply, lang);
      if (r.next_phase === "summary") {
        router.push("/results");
      }
    } catch {
      setError("Your message was not sent. You can try again, or use the emergency-help button if you need immediate resources.");
    } finally {
      setBusy(false);
    }
  }

  async function connectWithCounselor() {
    setEscalationLoading(true);
    try {
      const res = await api<{
        escalation_id: string;
        room_url: string;
        message: string;
      }>("/api/video/escalate", {
        method: "POST",
        body: JSON.stringify({
          session_id: sessionId,
          reason: "User requested human counselor video consultation",
        }),
      });
      setVideoRoomUrl(res.room_url);
      window.open(res.room_url, "_blank", "noopener,noreferrer");
    } catch {
      setError("Unable to initialize counselor room. Please call Tele-MANAS (14416) or Emergency (112) directly.");
    } finally {
      setEscalationLoading(false);
    }
  }

  function startBrowserStt() {
    const SR =
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition ||
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition;
    if (!SR) {
      alert("Browser speech recognition is unavailable in this browser. You can type instead — that never lowers your support.");
      return;
    }
    volumes.current = [];
    recStart.current = Date.now();
    speechActive.current = true;
    setIsRecording(true);
    const rec = new SR();
    activeRecognizer.current = rec;
    rec.lang = getSpeechRecognitionLang(lang);
    rec.interimResults = true;

    void startLevelSampling();

    rec.onresult = (ev: SpeechRecognitionEvent) => {
      let t = "";
      for (let i = 0; i < ev.results.length; ++i) {
        t += ev.results[i][0].transcript;
      }
      setTranscriptDraft(t);
    };
    rec.onend = () => {
      stopLevelSampling();
      setIsRecording(false);
      activeRecognizer.current = null;
      if (transcriptDraft.trim()) {
        setShowTranscript(true);
      }
    };
    rec.onerror = () => {
      stopLevelSampling();
      setIsRecording(false);
      activeRecognizer.current = null;
    };
    try {
      rec.start();
    } catch {
      setIsRecording(false);
    }
  }

  function stopBrowserStt() {
    speechActive.current = false;
    activeRecognizer.current?.stop();
    stopLevelSampling();
    setIsRecording(false);
  }

  async function startLevelSampling() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStream.current = stream;
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContext.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const samples = new Uint8Array(analyser.frequencyBinCount);
      const sampleLevel = () => {
        if (!speechActive.current) return;
        analyser.getByteTimeDomainData(samples);
        const mean = samples.reduce((sum, value) => sum + Math.abs(value - 128), 0) / samples.length;
        volumes.current.push(mean);
        setAudioLevel(Math.min(100, Math.round((mean / 30) * 100)));
        levelFrame.current = requestAnimationFrame(sampleLevel);
      };
      sampleLevel();
    } catch {
      // Audio level sampling failed gracefully. Speech recognition proceeds.
    }
  }

  function stopLevelSampling() {
    speechActive.current = false;
    setAudioLevel(0);
    if (levelFrame.current !== null) cancelAnimationFrame(levelFrame.current);
    levelFrame.current = null;
    mediaStream.current?.getTracks().forEach((track) => track.stop());
    mediaStream.current = null;
    if (audioContext.current) void audioContext.current.close();
    audioContext.current = null;
  }

  function submitTranscript() {
    const dur = Math.max(1, (Date.now() - recStart.current) / 1000);
    const wordCount = transcriptDraft.trim().split(/\s+/).filter(Boolean).length;
    const feats = estimateFeaturesFromAnalyser(volumes.current, dur, wordCount);
    setShowTranscript(false);
    const textToSend = transcriptDraft;
    setTranscriptDraft("");
    void send(textToSend, voiceOn ? feats : undefined);
  }

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3200);
  }

  async function copyMessage(text: string, index: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      showToast("Response copied to clipboard");
      setTimeout(() => {
        setCopiedIndex((current) => (current === index ? null : current));
      }, 2000);
    } catch {
      showToast("Unable to copy response to clipboard");
    }
  }

  function generateTranscriptText(): string {
    const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    let content = `=======================================================\n`;
    content += `JOLLY AI - CONFIDENTIAL CONVERSATION & SUPPORT RECORD\n`;
    content += `Session ID: ${sessionId || "Local Session"}\n`;
    content += `Date & Time: ${now} (IST)\n`;
    content += `Language: ${lang.toUpperCase()}\n`;
    content += `=======================================================\n\n`;

    content += `--- CONVERSATION TRANSCRIPT ---\n\n`;
    messages.forEach((m, idx) => {
      const speaker = m.role === "user" ? "YOU" : "JOLLY AI";
      content += `[${idx + 1}] ${speaker} (${m.time || ""}):\n${m.text}\n\n`;
    });

    content += `=======================================================\n`;
    content += `EMERGENCY & CRISIS HELPLINES (INDIA - 24/7 FREE):\n`;
    content += `- Tele-MANAS (Mental Health & Distress): 14416 / 1800-891-4416\n`;
    content += `- Pan-India National Emergency: 112 (Police, Fire, Ambulance)\n`;
    content += `- National Helpline Against Atrocities (NHAA): 14566\n`;
    content += `- KIRAN Psychosocial Support: 1800-599-0019\n`;
    content += `\nPRIVACY NOTICE:\n`;
    content += `This transcript was generated locally on your device.\n`;
    content += `No surveillance data is transmitted without your explicit consent.\n`;
    content += `=======================================================\n`;
    return content;
  }

  function downloadTranscript() {
    if (messages.length === 0) {
      showToast("No messages to download yet");
      return;
    }
    const text = generateTranscriptText();
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `jolly_ai_conversation_${dateStr}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setSaveModalOpen(false);
    showToast("Conversation transcript downloaded (.txt)");
  }

  async function copyAllMessages() {
    if (messages.length === 0) {
      showToast("No messages to copy yet");
      return;
    }
    const text = generateTranscriptText();
    try {
      await navigator.clipboard.writeText(text);
      setSaveModalOpen(false);
      showToast("Full conversation transcript copied to clipboard");
    } catch {
      showToast("Could not copy full transcript");
    }
  }

  function saveToSessionSummary() {
    const currentSummary = sessionStorage.getItem("jolly_summary") || "";
    const conversationSummaryText = messages
      .map((m) => `${m.role === "user" ? "User" : "Jolly AI"}: ${m.text}`)
      .join("\n\n");

    const combined = currentSummary
      ? `${currentSummary}\n\n--- Conversation Record ---\n${conversationSummaryText}`
      : conversationSummaryText;

    sessionStorage.setItem("jolly_summary", combined);
    setSaveModalOpen(false);
    showToast("Conversation saved to your review summary");
  }

  function handleEndChatAndReview() {
    saveToSessionSummary();
    setEndChatModalOpen(false);
    stopCamera();
    router.push("/summary");
  }

  function handleQuickExit() {
    stopCamera();
    sessionStorage.clear();
    window.location.replace("https://www.google.com");
  }

  return (
    <div className="bg-bg-canvas min-h-screen flex flex-col antialiased text-text-primary">
      {/* Top Header */}
      <SanctuaryHeader
        rightContent={
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setSaveModalOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border-subtle bg-surface-crisp text-text-primary text-label-sm font-label-sm shadow-2xs hover:bg-surface-container transition-colors"
              title="Save chat or download transcript"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">save</span>
              <span className="hidden sm:inline">Save</span>
            </button>
            <button
              type="button"
              onClick={() => setEndChatModalOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-safety-emergency/20 bg-safety-emergency-subtle text-safety-emergency text-label-sm font-label-sm shadow-2xs hover:bg-safety-emergency/15 transition-colors"
              title="End conversation safely"
            >
              <span className="material-symbols-outlined text-[16px]">power_settings_new</span>
              <span className="hidden sm:inline">End</span>
            </button>
          </div>
        }
      />

      <main className="flex-1 flex flex-col relative w-full pt-16 pb-24 bg-bg-canvas">
        <div className="flex flex-col w-full px-4 sm:px-6 max-w-2xl mx-auto space-y-4 pt-3">
          {/* Sub-bar: Language Pill & Quick Exit */}
          <div className="flex items-center justify-between pt-1">
            <div className="inline-flex p-0.5 rounded-full bg-surface-container border border-border-subtle items-center">
              <select
                value={lang}
                onChange={(e) => {
                  const newLang = e.target.value as Lang;
                  setLang(newLang);
                  sessionStorage.setItem("jolly_lang", newLang);
                }}
                className="bg-transparent px-3 py-1 text-label-sm font-label-sm text-primary font-medium focus:outline-none cursor-pointer"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="hidden sm:flex items-center gap-1.5 text-label-sm font-label-sm text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-border-subtle text-primary focus:ring-primary"
                  checked={tts}
                  onChange={(e) => setTts(e.target.checked)}
                />
                <span>Speak replies</span>
              </label>

              <button
                type="button"
                onClick={handleQuickExit}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-crisp text-text-secondary hover:text-safety-emergency hover:bg-safety-emergency-subtle border border-border-subtle shadow-2xs transition-colors"
                title="Immediately leave and redirect to Google"
              >
                <span className="material-symbols-outlined text-[15px]">logout</span>
                <span className="font-label-sm text-label-sm">Quick Exit</span>
              </button>
            </div>
          </div>

          {/* Ambient Safety & Confidentiality Card */}
          <div className="bg-surface-crisp rounded-2xl p-4 border border-border-subtle shadow-xs flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-secondary-container text-secondary flex items-center justify-center shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[20px]">nature_people</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-headline-sm text-headline-sm text-text-primary">Quiet Space</h2>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container text-secondary font-label-sm text-label-sm border border-border-subtle">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                    Confidential
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-text-secondary mt-0.5 leading-snug">
                  Responses are encrypted. Take gentle pauses whenever you need.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGrounding(!showGrounding)}
              className="shrink-0 flex flex-col items-center justify-center px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary-container border border-border-subtle transition-colors shadow-2xs"
              title="Open grounding breathing tool"
            >
              <span className="material-symbols-outlined text-[20px] animate-pulse text-primary">air</span>
              <span className="font-label-sm text-label-sm font-medium mt-0.5">Breathe</span>
            </button>
          </div>

          {/* Interactive Breathing Overlay Box */}
          {showGrounding && (
            <div className="bg-surface-container rounded-2xl p-5 border border-border-subtle shadow-xs flex flex-col items-center text-center animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-primary-container/10 flex items-center justify-center relative mb-3">
                <div className="w-12 h-12 rounded-full bg-primary-container/20 animate-ping absolute"></div>
                <span className="material-symbols-outlined text-primary-container text-[28px]">self_improvement</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-text-primary">Inhale peace, exhale tension</h3>
              <p className="font-body-sm text-body-sm text-text-secondary mt-1 max-w-xs leading-relaxed">
                Follow the soft rhythm. Inhale for 4 seconds, hold gently for 2, let go for 4.
              </p>
              <button
                onClick={() => setShowGrounding(false)}
                className="mt-4 px-4 py-1.5 rounded-full bg-surface-crisp text-primary-container font-label-sm text-label-sm shadow-2xs border border-border-subtle hover:bg-bg-subtle transition-colors"
                type="button"
              >
                Return to conversation
              </button>
            </div>
          )}

          {/* Active Listening Mode Badge */}
          {conversationMode === "listening" && (
            <div className="flex items-center justify-between rounded-2xl border border-secondary-container bg-surface-container-low px-4 py-2.5 text-body-sm text-primary shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-primary">hearing</span>
                <div>
                  <strong className="font-semibold">Active Listening:</strong> Holding space for you. No advice, no checklists. Speak freely.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConversationMode("assessment")}
                className="rounded-lg bg-surface-crisp px-2.5 py-1 text-label-sm text-primary border border-border-subtle hover:bg-bg-subtle"
              >
                Resume Assessment
              </button>
            </div>
          )}

          {/* Crisis Banner */}
          {(conversationMode === "crisis_support" ||
            conversationMode === "human_escalation" ||
            crisis ||
            crisisLevel === "suicidal_ideation" ||
            crisisLevel === "imminent_danger") && (
            <div className="rounded-2xl border border-safety-emergency/40 bg-safety-emergency-subtle p-4 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-safety-emergency text-[22px]">shield_with_heart</span>
                <p className="font-headline-sm text-headline-sm text-safety-emergency font-semibold">
                  Safety & Immediate Helplines (24/7 Free)
                </p>
              </div>
              <p className="mt-1 font-body-sm text-body-sm text-text-primary">
                Your safety comes first. Confidential, professional help is standing by right now:
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <a
                  href="tel:14416"
                  className="flex flex-col items-center justify-center rounded-xl bg-surface-crisp border border-border-subtle p-2.5 text-center shadow-2xs hover:bg-bg-subtle active:scale-95 transition"
                >
                  <span className="font-label-md text-label-md font-bold text-safety-emergency">📞 14416</span>
                  <span className="font-label-sm text-label-sm text-text-secondary mt-0.5">Tele-MANAS</span>
                </a>
                <a
                  href="tel:112"
                  className="flex flex-col items-center justify-center rounded-xl bg-surface-crisp border border-border-subtle p-2.5 text-center shadow-2xs hover:bg-bg-subtle active:scale-95 transition"
                >
                  <span className="font-label-md text-label-md font-bold text-safety-emergency">🚨 112</span>
                  <span className="font-label-sm text-label-sm text-text-secondary mt-0.5">Emergency</span>
                </a>
                <a
                  href="tel:14566"
                  className="flex flex-col items-center justify-center rounded-xl bg-surface-crisp border border-border-subtle p-2.5 text-center shadow-2xs hover:bg-bg-subtle active:scale-95 transition"
                >
                  <span className="font-label-md text-label-md font-bold text-safety-emergency">🛡️ 14566</span>
                  <span className="font-label-sm text-label-sm text-text-secondary mt-0.5">NHAA Helpline</span>
                </a>
                <a
                  href="tel:18005990019"
                  className="flex flex-col items-center justify-center rounded-xl bg-surface-crisp border border-border-subtle p-2.5 text-center shadow-2xs hover:bg-bg-subtle active:scale-95 transition"
                >
                  <span className="font-label-md text-label-md font-bold text-safety-emergency">💙 1800-599-0019</span>
                  <span className="font-label-sm text-label-sm text-text-secondary mt-0.5">KIRAN</span>
                </a>
              </div>

              <div className="mt-3.5 flex flex-wrap items-center gap-2 pt-2 border-t border-border-subtle">
                <button
                  type="button"
                  disabled={escalationLoading}
                  onClick={() => void connectWithCounselor()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-safety-emergency px-4 py-2 text-label-md font-label-md font-semibold text-white shadow-xs hover:opacity-90 active:scale-95 transition"
                >
                  <span className="material-symbols-outlined text-[18px]">video_camera_front</span>
                  <span>{escalationLoading ? "Connecting..." : "Connect with Human Counselor"}</span>
                </button>
                {videoRoomUrl && (
                  <a
                    href={videoRoomUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl border border-border-subtle bg-surface-crisp px-3 py-2 text-label-sm font-label-sm text-primary font-medium hover:bg-surface-container"
                  >
                    👉 Re-enter Consultation Room
                  </a>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-safety-emergency/30 bg-safety-emergency-subtle p-3 text-body-sm text-safety-emergency flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Floating Camera Vision HUD */}
          {cameraOn && (
            <div className="overflow-hidden rounded-2xl border border-border-subtle bg-text-primary p-3.5 text-white shadow-md">
              <div className="flex items-center justify-between pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary-container opacity-75"></span>
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-secondary"></span>
                  </span>
                  <span className="font-label-sm text-label-sm font-semibold tracking-wider text-secondary-container uppercase">
                    Live Video & Camera Connected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void flipCamera()}
                    className="rounded-lg bg-surface-crisp/10 px-2.5 py-1 text-label-sm font-label-sm text-white hover:bg-surface-crisp/20 active:scale-95"
                    title="Flip camera"
                  >
                    🔄 Flip
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="rounded-lg bg-surface-crisp/10 px-2.5 py-1 text-label-sm font-label-sm text-safety-emergency hover:bg-safety-emergency/20"
                    title="Close camera"
                  >
                    ✖ Close
                  </button>
                </div>
              </div>
              <div className="relative aspect-video max-h-56 w-full overflow-hidden rounded-xl bg-black">
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className="h-full w-full object-cover"
                  style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
                />
                <div className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-1 text-[11px] text-white backdrop-blur-xs">
                  AI Vision Active
                </div>
              </div>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />

          {/* Chat Stream Canvas */}
          <div className="flex flex-col space-y-4 pb-2" id="chat-stream">
            <div className="flex items-center justify-center py-1">
              <span className="px-3 py-1 rounded-full bg-surface-container font-label-sm text-label-sm text-text-secondary border border-border-subtle">
                Today • Sanctuary Mode
              </span>
            </div>

            {messages.map((m, i) =>
              m.role === "assistant" ? (
                <div key={i} className="flex items-end gap-2.5 max-w-[92%] sm:max-w-[85%] self-start group">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary shrink-0 mb-1 shadow-2xs">
                    <span className="material-symbols-outlined text-[16px]">spa</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <div className="bg-surface-container rounded-2xl rounded-bl-xs p-4 shadow-2xs border border-border-subtle text-text-primary">
                      <p className="font-body-md text-body-md leading-relaxed whitespace-pre-line">{m.text}</p>
                      <div className="mt-2.5 flex items-center justify-between pt-1.5 border-t border-border-subtle/80 text-[11px] text-text-secondary">
                        <span className="font-label-sm text-label-sm text-text-secondary">
                          Jolly AI {m.time ? `• ${m.time}` : ""}
                        </span>
                        <button
                          type="button"
                          onClick={() => void copyMessage(m.text, i)}
                          className="inline-flex items-center gap-1 rounded px-2 py-0.5 font-label-sm text-label-sm text-primary bg-surface-crisp/80 border border-border-subtle hover:bg-surface-crisp shadow-2xs transition"
                          title="Copy response"
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            {copiedIndex === i ? "check" : "content_copy"}
                          </span>
                          <span>{copiedIndex === i ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div key={i} className="flex items-end gap-2 max-w-[88%] sm:max-w-[80%] self-end">
                  <div className="flex flex-col space-y-1 items-end">
                    <div className="bg-secondary-container rounded-2xl rounded-br-xs p-4 shadow-2xs border border-border-subtle text-on-secondary-container">
                      <p className="font-body-md text-body-md leading-relaxed whitespace-pre-line">{m.text}</p>
                    </div>
                    <div className="flex items-center gap-1 pr-1.5 text-text-secondary font-label-sm text-label-sm">
                      <span>{m.time || "Sent"}</span>
                      <span className="material-symbols-outlined text-primary text-[14px]">done_all</span>
                    </div>
                  </div>
                </div>
              )
            )}

            {busy && (
              <div className="flex items-center gap-2 pl-3 py-1">
                <div className="flex space-x-1 items-center">
                  <span className="w-2 h-2 rounded-full bg-primary-container/80 animate-ping"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-container/60"></span>
                  <span className="w-1 h-1 rounded-full bg-primary-container/40"></span>
                </div>
                <span className="font-label-sm text-label-sm text-text-secondary italic">
                  Taking a moment to listen...
                </span>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Quick Supportive Prompt Chips */}
          <div className="flex flex-col space-y-2 pt-1">
            <div className="flex items-center justify-between px-1">
              <span className="font-label-sm text-label-sm text-text-secondary uppercase tracking-wider">
                Helpful prompts
              </span>
              <span className="font-label-sm text-label-sm text-primary-container">Tap to send</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void send("I'm feeling overwhelmed right now")}
                className="px-3.5 py-1.5 rounded-full bg-surface-crisp border border-border-subtle shadow-2xs hover:bg-surface-container text-text-primary font-body-sm text-body-sm transition-all active:scale-95 text-left"
              >
                I&apos;m feeling overwhelmed
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void send("I don't know where to start")}
                className="px-3.5 py-1.5 rounded-full bg-surface-crisp border border-border-subtle shadow-2xs hover:bg-surface-container text-text-primary font-body-sm text-body-sm transition-all active:scale-95 text-left"
              >
                I don&apos;t know where to start
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void send("Stop giving me solutions. I just want someone to listen.")}
                className="px-3.5 py-1.5 rounded-full bg-surface-crisp border border-border-subtle shadow-2xs hover:bg-surface-container text-text-primary font-body-sm text-body-sm transition-all active:scale-95 text-left"
              >
                🎧 Just listen (no advice)
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void send("Can you just stay here and talk to me for a while?")}
                className="px-3.5 py-1.5 rounded-full bg-surface-crisp border border-border-subtle shadow-2xs hover:bg-surface-container text-text-primary font-body-sm text-body-sm transition-all active:scale-95 text-left"
              >
                💙 Stay &amp; talk with me
              </button>
            </div>
          </div>

          {/* Floating Composer Bar */}
          <div className="sticky bottom-20 z-30 bg-surface-crisp rounded-2xl shadow-whisper border border-border-subtle p-2 flex items-center gap-2">
            {/* Microphone Button */}
            <button
              type="button"
              onClick={() => {
                setVoiceSanctuaryOpen(true);
                startBrowserStt();
              }}
              disabled={busy}
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                isRecording
                  ? "bg-safety-emergency text-white animate-pulse"
                  : "bg-surface-container text-primary-container hover:bg-surface-container-high"
              }`}
              title="Open Voice Sanctuary"
            >
              <span className="material-symbols-outlined text-[22px]">mic</span>
            </button>

            {/* Camera Toggle Button */}
            <button
              type="button"
              onClick={cameraOn ? stopCamera : () => void startCamera()}
              disabled={cameraLoading || busy}
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                cameraOn
                  ? "bg-secondary-container text-primary font-bold"
                  : "bg-surface-container text-primary-container hover:bg-surface-container-high"
              }`}
              title="Toggle Camera for Face-to-Face Interaction"
            >
              <span className="material-symbols-outlined text-[20px]">
                {cameraOn ? "videocam" : "videocam_off"}
              </span>
            </button>

            {/* Text Input */}
            <input
              className="flex-1 bg-transparent px-3 py-2 text-text-primary placeholder:text-text-secondary/60 font-body-md text-body-md focus:outline-none"
              placeholder="Write what's on your mind..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              disabled={busy}
            />

            {/* Send Button */}
            <button
              type="button"
              onClick={() => void send(input)}
              disabled={busy || !input.trim()}
              className="w-11 h-11 rounded-xl bg-primary-container text-on-primary hover:bg-primary flex items-center justify-center shrink-0 transition-all active:scale-95 shadow-2xs disabled:opacity-40"
              title="Send message"
            >
              <span className="material-symbols-outlined text-[20px]">send</span>
            </button>
          </div>

          <div className="text-center pb-2">
            <p className="font-label-sm text-label-sm text-text-secondary">
              NHAA Helpline 14566 is available 24/7. Your conversations are anonymous.
            </p>
          </div>
        </div>
      </main>

      {/* Voice Sanctuary Fullscreen Overlay */}
      {voiceSanctuaryOpen && (
        <div className="fixed inset-0 z-50 bg-bg-canvas/98 backdrop-blur-md flex flex-col p-4 sm:p-6 animate-fade-in select-none">
          {/* Top Bar */}
          <div className="w-full flex items-center justify-between py-2 px-4 rounded-xl bg-surface-container border border-border-subtle max-w-lg mx-auto">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-container opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
              </span>
              <span className="font-headline-sm text-headline-sm text-primary">Voice Sanctuary</span>
              <span className="px-2 py-0.5 rounded-full bg-surface-crisp text-secondary font-label-sm text-label-sm border border-border-subtle">
                Encrypted
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                stopBrowserStt();
                setVoiceSanctuaryOpen(false);
              }}
              className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary px-2.5 py-1 rounded-lg bg-surface-crisp border border-border-subtle text-label-sm font-label-sm"
            >
              <span className="material-symbols-outlined text-[16px]">chat</span>
              <span>Switch to text</span>
            </button>
          </div>

          {/* Concentric Breathing Sphere Orb */}
          <div className="flex-1 flex flex-col items-center justify-center py-6 max-w-lg mx-auto w-full">
            <div className="relative flex items-center justify-center w-64 h-64 my-auto">
              {/* Outermost soft aura layer */}
              <div
                className="absolute w-60 h-60 rounded-full bg-surface-container-high/60 transition-transform duration-1000 ease-in-out"
                style={{
                  transform: isRecording && !voicePaused ? `scale(${1 + audioLevel / 150})` : "scale(0.95)",
                }}
              />
              {/* Intermediate soothing sage ripple */}
              <div
                className="absolute w-48 h-48 rounded-full bg-secondary-container/50 transition-transform duration-700 ease-out"
                style={{
                  transform: isRecording && !voicePaused ? `scale(${0.9 + audioLevel / 180})` : "scale(0.9)",
                }}
              />
              {/* Central Organic Breathing Sphere */}
              <div className="relative w-36 h-36 rounded-full bg-gradient-to-tr from-primary-container via-surface-tint to-secondary flex flex-col items-center justify-center shadow-xl shadow-primary/10">
                <span className="material-symbols-outlined text-on-primary text-[38px]">
                  {voicePaused ? "pause" : isRecording ? "graphic_eq" : "mic"}
                </span>
                <span className="font-label-sm text-label-sm text-primary-fixed mt-1 tracking-wider uppercase">
                  {voicePaused ? "Paused" : isRecording ? "Listening" : "Ready"}
                </span>
              </div>
            </div>

            {/* Status Title */}
            <div className="text-center mt-4">
              <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-text-primary">
                {voicePaused ? "Quiet pause" : isRecording ? "Listening gently" : "Ready to listen"}
              </h2>
              <p className="font-body-md text-body-md text-text-secondary mt-1 max-w-xs mx-auto">
                Take all the time you need. Speak whenever you feel ready.
              </p>
            </div>

            {/* Audio Waveform Sparklines */}
            <div className="flex items-center gap-1.5 mt-4 h-8 px-4 py-1.5 rounded-full bg-surface-container shadow-xs border border-border-subtle">
              <span className="w-1 bg-primary-container rounded-full animate-bounce h-3"></span>
              <span className="w-1 bg-primary rounded-full animate-bounce h-5" style={{ animationDelay: "0.2s" }}></span>
              <span className="w-1 bg-surface-tint rounded-full animate-bounce h-6" style={{ animationDelay: "0.1s" }}></span>
              <span className="w-1 bg-secondary rounded-full animate-bounce h-4" style={{ animationDelay: "0.3s" }}></span>
              <span className="w-1 bg-primary rounded-full animate-bounce h-5" style={{ animationDelay: "0.15s" }}></span>
              <span className="font-label-sm text-label-sm text-primary ml-2 font-medium">Safe voice space</span>
            </div>

            {/* Live Transcript Preview */}
            {transcriptDraft && (
              <div className="w-full mt-4 bg-surface-crisp p-4 rounded-xl border border-border-subtle shadow-xs">
                <span className="font-label-sm text-label-sm text-text-secondary block mb-1">Transcribing softly:</span>
                <p className="font-body-md text-body-md text-text-primary italic">&quot;{transcriptDraft}&quot;</p>
              </div>
            )}
          </div>

          {/* Bottom Voice Controls */}
          <div className="w-full max-w-lg mx-auto flex flex-col gap-3 pb-4">
            <div className="grid grid-cols-3 gap-2.5 items-center">
              <button
                type="button"
                onClick={() => {
                  if (isRecording) {
                    stopBrowserStt();
                  } else {
                    startBrowserStt();
                  }
                }}
                className="flex flex-col items-center justify-center py-2.5 px-2 rounded-xl bg-surface-crisp border border-border-subtle shadow-2xs hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[24px] text-primary">
                  {isRecording ? "mic_off" : "mic"}
                </span>
                <span className="font-label-sm text-label-sm mt-1">{isRecording ? "Stop mic" : "Start mic"}</span>
              </button>

              <button
                type="button"
                onClick={() => setVoicePaused(!voicePaused)}
                className="flex flex-col items-center justify-center py-2.5 px-2 rounded-xl bg-surface-crisp border border-border-subtle shadow-2xs hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[24px] text-secondary">
                  {voicePaused ? "play_arrow" : "pause"}
                </span>
                <span className="font-label-sm text-label-sm mt-1">{voicePaused ? "Resume" : "Quiet pause"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  stopBrowserStt();
                  setVoiceSanctuaryOpen(false);
                }}
                className="flex flex-col items-center justify-center py-2.5 px-2 rounded-xl bg-surface-crisp border border-border-subtle shadow-2xs hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[24px] text-primary">keyboard</span>
                <span className="font-label-sm text-label-sm mt-1">Type instead</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                if (transcriptDraft.trim()) {
                  submitTranscript();
                }
                stopBrowserStt();
                setVoiceSanctuaryOpen(false);
              }}
              className="w-full py-3 px-4 rounded-xl bg-primary-container text-on-primary font-label-md text-label-md flex items-center justify-center gap-2 hover:bg-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">check</span>
              <span>{transcriptDraft.trim() ? "Submit Spoken Message" : "Close Voice Room"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Transcript Review Modal */}
      {showTranscript && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-surface-crisp p-6 shadow-xl border border-border-subtle">
            <h2 className="font-headline-sm text-headline-sm text-text-primary">{loc.correctTranscript}</h2>
            <p className="mt-1 font-body-sm text-body-sm text-text-secondary">
              You can edit any words that speech recognition misheard before submitting for supportive response.
            </p>
            <textarea
              className="mt-3.5 h-32 w-full rounded-xl border border-border-subtle bg-bg-canvas p-3 font-body-md text-body-md text-text-primary focus:border-primary focus:outline-none"
              value={transcriptDraft}
              onChange={(e) => setTranscriptDraft(e.target.value)}
            />
            <div className="mt-4 flex gap-2">
              <button
                className="rounded-xl bg-primary-container px-4 py-2 text-label-md font-label-md font-medium text-white shadow-2xs hover:bg-primary"
                onClick={submitTranscript}
              >
                {loc.useThisText}
              </button>
              <button
                className="rounded-xl border border-border-subtle px-4 py-2 text-label-md font-label-md text-text-secondary hover:bg-bg-subtle"
                onClick={() => setShowTranscript(false)}
              >
                {loc.discard}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Responses & Transcript Modal */}
      {saveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-surface-crisp p-6 shadow-xl border border-border-subtle">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">save</span>
                <h2 className="font-headline-sm text-headline-sm text-text-primary font-semibold">Save Your Responses</h2>
              </div>
              <button
                type="button"
                onClick={() => setSaveModalOpen(false)}
                className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-text-secondary hover:text-text-primary"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
            <p className="mt-3 font-body-sm text-body-sm text-text-secondary leading-relaxed">
              Save or download your conversation for your personal records, for legal support, or to review with a counselor.
            </p>

            <div className="mt-4 space-y-2.5">
              <button
                type="button"
                onClick={downloadTranscript}
                className="flex w-full items-center justify-between rounded-xl border border-border-subtle bg-bg-subtle/70 p-3.5 text-left font-label-md text-label-md font-semibold text-text-primary hover:bg-bg-subtle transition"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[22px] text-primary">description</span>
                  <div>
                    <div className="font-semibold text-text-primary">Download Transcript (.txt)</div>
                    <div className="font-normal text-text-secondary text-xs">Dated record with timestamps and helplines</div>
                  </div>
                </div>
                <span className="text-primary text-xs font-bold">Download ↓</span>
              </button>

              <button
                type="button"
                onClick={() => void copyAllMessages()}
                className="flex w-full items-center justify-between rounded-xl border border-border-subtle bg-bg-subtle/70 p-3.5 text-left font-label-md text-label-md font-semibold text-text-primary hover:bg-bg-subtle transition"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[22px] text-primary">content_copy</span>
                  <div>
                    <div className="font-semibold text-text-primary">Copy Entire Conversation</div>
                    <div className="font-normal text-text-secondary text-xs">Copy full dialogue to clipboard</div>
                  </div>
                </div>
                <span className="text-primary text-xs font-bold">Copy 📋</span>
              </button>

              <button
                type="button"
                onClick={saveToSessionSummary}
                className="flex w-full items-center justify-between rounded-xl border border-border-subtle bg-bg-subtle/70 p-3.5 text-left font-label-md text-label-md font-semibold text-text-primary hover:bg-bg-subtle transition"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[22px] text-primary">assignment</span>
                  <div>
                    <div className="font-semibold text-text-primary">Save to My Summary</div>
                    <div className="font-normal text-text-secondary text-xs">Stores responses for review at /summary</div>
                  </div>
                </div>
                <span className="text-primary text-xs font-bold">Save 💾</span>
              </button>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSaveModalOpen(false)}
                className="rounded-xl border border-border-subtle px-4 py-2 font-label-md text-label-md text-text-secondary hover:bg-bg-subtle"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Chat Confirmation Modal */}
      {endChatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-surface-crisp p-6 shadow-xl border border-border-subtle">
            <div className="flex items-center gap-2 border-b border-border-subtle pb-3">
              <span className="material-symbols-outlined text-safety-emergency text-[24px]">power_settings_new</span>
              <h2 className="font-headline-sm text-headline-sm text-text-primary font-semibold">End Conversation</h2>
            </div>
            <p className="mt-3 font-body-sm text-body-sm text-text-secondary leading-relaxed">
              You are in control. You can end this conversation at any moment. Would you like to save your responses before ending, or exit quickly for privacy?
            </p>

            <div className="mt-5 space-y-2.5">
              <button
                type="button"
                onClick={handleEndChatAndReview}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-container p-3 text-center font-label-md text-label-md font-semibold text-white shadow-xs hover:bg-primary active:scale-95 transition"
              >
                <span className="material-symbols-outlined text-[18px]">save</span>
                <span>Save Responses &amp; Review Summary</span>
              </button>

              <button
                type="button"
                onClick={handleQuickExit}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-safety-emergency/30 bg-safety-emergency-subtle p-3 text-center font-label-md text-label-md font-semibold text-safety-emergency hover:bg-safety-emergency/15 active:scale-95 transition"
              >
                <span className="material-symbols-outlined text-[18px]">bolt</span>
                <span>Quick Privacy Exit (Clear History)</span>
              </button>

              <button
                type="button"
                onClick={() => setEndChatModalOpen(false)}
                className="w-full rounded-xl border border-border-subtle p-2.5 text-center font-label-md text-label-md font-medium text-text-secondary hover:bg-bg-subtle transition"
              >
                Continue Chatting
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-text-primary px-4 py-2.5 text-label-md font-label-md font-medium text-white shadow-lg animate-fade-in">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {shareDest && sessionId && (
        <ShareConfirmModal sessionId={sessionId} destination={shareDest} onClose={() => setShareDest(null)} />
      )}
    </div>
  );
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}
interface SpeechRecognitionEvent {
  results: { [index: number]: { [index: number]: { transcript: string } }; length: number };
}

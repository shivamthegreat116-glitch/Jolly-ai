"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmergencyButton } from "@/components/EmergencyButton";
import { ShareConfirmModal } from "@/components/ShareConfirmModal";
import { api } from "@/lib/api";
import { STRINGS, type Lang } from "@/lib/i18n";
import { estimateFeaturesFromAnalyser, getSpeechRecognitionLang, speak, type VoiceFeatures } from "@/lib/voice";

type Msg = { role: "user" | "assistant"; text: string };

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
      setMessages([{ role: "assistant", text: r.reply }]);
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
      setCameraOn(true);
      setFacingMode(mode);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      console.error("Camera access error:", e);
      if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
        setError("Camera permission was denied. Please allow camera access in your browser/device settings.");
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
    setMessages((m) => [...m, { role: "user", text }]);
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
      setMessages((m) => [...m, { role: "assistant", text: r.reply }]);
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
    const SR = (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition
      || (window as unknown as { SpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition;
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
    rec.interimResults = false;
    
    void startLevelSampling();
    
    rec.onresult = (ev: SpeechRecognitionEvent) => {
      const t = ev.results[0][0].transcript;
      setTranscriptDraft(t);
      setShowTranscript(true);
    };
    rec.onend = () => {
      stopLevelSampling();
      setIsRecording(false);
      activeRecognizer.current = null;
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
    if (activeRecognizer.current) {
      try {
        activeRecognizer.current.stop();
      } catch {
        // pass
      }
    }
    stopLevelSampling();
    setIsRecording(false);
  }

  async function startLevelSampling() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!speechActive.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      mediaStream.current = stream;
      const context = new AudioContext();
      audioContext.current = context;
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      context.createMediaStreamSource(stream).connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
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
    void send(transcriptDraft, voiceOn ? feats : undefined);
  }

  const quickSafetyChips = [
    { label: "Yes, I am safe here", text: "Yes, I am safe where I am right now." },
    { label: "I am in immediate danger", text: "No, I am not safe and need help." },
    { label: "I am not sure", text: "I am not completely sure if I am safe." },
  ];

  const quickNeedChips = [
    { label: "Emotional support", text: "I need emotional support and someone to listen." },
    { label: "Legal guidance", text: "I need legal advice and information about filing a complaint." },
    { label: "Medical assistance", text: "I need medical help or healthcare support." },
    { label: "NHAA 14566 pathway", text: "I want to understand the NHAA 14566 complaint process." },
  ];

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-6">
      <header className="flex items-center justify-between gap-2 border-b border-sand-200 pb-4">
        <div>
          <h1 className="text-2xl font-serif text-sage-800">Jolly AI</h1>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs text-stone-500">Language:</span>
            <select
              className="rounded-lg border border-sand-300 bg-white px-2 py-1 text-xs font-medium text-stone-700 shadow-sm"
              value={lang}
              onChange={(e) => {
                const newLang = e.target.value as Lang;
                setLang(newLang);
                sessionStorage.setItem("jolly_lang", newLang);
              }}
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="hinglish">Hinglish</option>
              <option value="mr">मराठी (Marathi)</option>
              <option value="bn">বাংলা (Bengali)</option>
              <option value="ta">தமிழ் (Tamil)</option>
              <option value="te">తెలుగు (Telugu)</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-stone-600">
            <input
              type="checkbox"
              className="rounded text-sage-700"
              checked={tts}
              onChange={(e) => setTts(e.target.checked)}
            />
            <span>Speak replies</span>
          </label>
          <EmergencyButton />
        </div>
      </header>

      {/* Dynamic Conversational Mode Indicator */}
      {conversationMode === "listening" && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs text-emerald-900 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-base">🎧</span>
            <div>
              <strong>Active Listening Mode:</strong> Holding space for you. No advice, no checklists. Speak freely.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setConversationMode("assessment")}
            className="rounded bg-white px-2 py-0.5 text-xs text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
          >
            Resume Assessment
          </button>
        </div>
      )}

      {conversationMode === "emotional_support" && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-sky-300 bg-sky-50 px-3.5 py-2 text-xs text-sky-900 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-base">💙</span>
            <div>
              <strong>Empathetic Support:</strong> We are here with you. You don't have to figure everything out at once.
            </div>
          </div>
        </div>
      )}

      {(conversationMode === "crisis_support" || conversationMode === "human_escalation" || crisis || crisisLevel === "suicidal_ideation" || crisisLevel === "imminent_danger") && (
        <div className="mt-4 rounded-2xl border-2 border-rose-500 bg-rose-50/95 p-4 shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚨</span>
            <p className="font-bold text-rose-900">Safety & Immediate Indian Helplines (24/7 Free)</p>
          </div>
          <p className="mt-1 text-sm text-rose-800">
            Your safety comes first. Confidential, professional help is available right now:
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <a
              href="tel:14416"
              className="flex flex-col items-center justify-center rounded-xl bg-white border border-rose-200 p-2.5 text-center shadow-sm hover:bg-rose-100/70 active:scale-95 transition"
            >
              <span className="text-sm font-bold text-rose-900">📞 14416</span>
              <span className="text-[10px] text-stone-600">Tele-MANAS (Mental Health)</span>
            </a>
            <a
              href="tel:112"
              className="flex flex-col items-center justify-center rounded-xl bg-white border border-rose-200 p-2.5 text-center shadow-sm hover:bg-rose-100/70 active:scale-95 transition"
            >
              <span className="text-sm font-bold text-rose-900">🚨 112</span>
              <span className="text-[10px] text-stone-600">Emergency (Police / Med)</span>
            </a>
            <a
              href="tel:14566"
              className="flex flex-col items-center justify-center rounded-xl bg-white border border-rose-200 p-2.5 text-center shadow-sm hover:bg-rose-100/70 active:scale-95 transition"
            >
              <span className="text-sm font-bold text-rose-900">🛡️ 14566</span>
              <span className="text-[10px] text-stone-600">NHAA (Atrocities Helpline)</span>
            </a>
            <a
              href="tel:18005990019"
              className="flex flex-col items-center justify-center rounded-xl bg-white border border-rose-200 p-2.5 text-center shadow-sm hover:bg-rose-100/70 active:scale-95 transition"
            >
              <span className="text-sm font-bold text-rose-900">💙 1800-599-0019</span>
              <span className="text-[10px] text-stone-600">KIRAN (Psychosocial)</span>
            </a>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-rose-200">
            <button
              type="button"
              disabled={escalationLoading}
              onClick={() => void connectWithCounselor()}
              className="flex items-center gap-1.5 rounded-lg bg-rose-700 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-rose-800 active:scale-95 transition"
            >
              <span>🎥</span>
              <span>{escalationLoading ? "Connecting..." : "Connect with Human Counselor (Video/Audio)"}</span>
            </button>
            {videoRoomUrl && (
              <a
                href={videoRoomUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-rose-400 bg-white px-3 py-2 text-xs font-medium text-rose-800 hover:bg-rose-50"
              >
                👉 Re-enter Consultation Room
              </a>
            )}
            <p className="text-[11px] text-stone-600 italic">
              Zero AI surveillance: Counselor video calls are 100% confidential. AI does not listen or record.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-stone-800">
          {error}
        </div>
      )}

      {/* Live Floating Camera HUD (Cross-platform: iOS / Android / Windows) */}
      {cameraOn && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-emerald-600/30 bg-stone-900 p-3 text-white shadow-xl">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
              </span>
              <span className="text-xs font-semibold tracking-wider text-emerald-400 uppercase">
                Live Video & Camera Connected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void flipCamera()}
                className="rounded-lg bg-stone-800 px-2.5 py-1 text-xs text-stone-200 hover:bg-stone-700 active:scale-95"
                title="Switch Front / Rear Camera"
              >
                🔄 Flip Camera
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="rounded-lg bg-stone-800 px-2.5 py-1 text-xs text-stone-400 hover:bg-red-900/50 hover:text-red-300"
                title="Turn Off Camera"
              >
                ✖ Close
              </button>
            </div>
          </div>
          <div className="relative aspect-video max-h-60 w-full overflow-hidden rounded-xl bg-black">
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className="h-full w-full object-cover"
              style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
            />
            <div className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-1 text-[11px] text-white backdrop-blur-sm">
              AI Vision & Video Active
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-stone-400">
            Jolly AI can see and talk with you face-to-face. Speak or type your message below.
          </p>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />

      {/* Message Flow */}
      <div className="mt-4 flex-1 space-y-3 overflow-y-auto rounded-2xl bg-white p-4 shadow-sm">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-8 whitespace-pre-line rounded-2xl bg-sage-700 px-4 py-3 leading-relaxed text-white shadow-sm"
                : "mr-8 whitespace-pre-line rounded-2xl bg-sand-100 px-4 py-3 leading-relaxed text-stone-800"
            }
          >
            {m.text}
          </div>
        ))}
      </div>

      {/* Quick Suggestion Chips */}
      {phase === "safety" && (
        <div className="mt-2 flex flex-wrap gap-2">
          {quickSafetyChips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              className="rounded-full border border-sand-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 shadow-sm hover:border-sage-500 hover:bg-sage-50"
              onClick={() => void send(chip.text)}
              disabled={busy}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {phase === "need" && (
        <div className="mt-2 flex flex-wrap gap-2">
          {quickNeedChips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              className="rounded-full border border-sand-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 shadow-sm hover:border-sage-500 hover:bg-sage-50"
              onClick={() => void send(chip.text)}
              disabled={busy}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Voice Recording Visualizer Indicator */}
      {isRecording && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-sage-300 bg-sage-50 p-3">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-clay-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-clay-500"></span>
            </span>
            <div>
              <p className="text-xs font-medium text-sage-900">{loc.voiceRecording}</p>
              <div className="mt-1 h-1.5 w-32 overflow-hidden rounded-full bg-sand-200">
                <div
                  className="h-full bg-sage-600 transition-all duration-75"
                  style={{ width: `${Math.max(10, audioLevel)}%` }}
                ></div>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg bg-sage-700 px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-sage-600"
            onClick={stopBrowserStt}
          >
            {loc.stopRecording}
          </button>
        </div>
      )}

      {/* Supportive Intent Quick Chips */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-stone-600">
        <span className="text-[11px] font-medium text-stone-400">Quick needs:</span>
        <button
          type="button"
          disabled={busy}
          onClick={() => void send("Stop giving me solutions. I just want someone to listen.")}
          className="rounded-full border border-sand-300 bg-white px-2.5 py-1 text-xs text-stone-700 shadow-sm hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-800 transition"
        >
          🎧 Just listen (no advice)
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void send("Can you just stay here and talk to me for a while?")}
          className="rounded-full border border-sand-300 bg-white px-2.5 py-1 text-xs text-stone-700 shadow-sm hover:border-sky-400 hover:bg-sky-50 hover:text-sky-800 transition"
        >
          💙 Stay & talk with me
        </button>
        <button
          type="button"
          disabled={busy || escalationLoading}
          onClick={() => void connectWithCounselor()}
          className="rounded-full border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-800 shadow-sm hover:bg-rose-100 transition"
        >
          🎥 Counselor Video
        </button>
      </div>

      {/* Input Form */}
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <input
          className="flex-1 rounded-full border border-sand-300 px-4 py-3 text-stone-800 shadow-sm focus:border-sage-600 focus:outline-none focus:ring-1 focus:ring-sage-600"
          placeholder="Share only what you want to..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
        />
        <button
          className="rounded-full bg-sage-700 px-5 py-3 font-medium text-white shadow hover:bg-sage-600 disabled:opacity-50 active:scale-95"
          disabled={busy || !input.trim()}
        >
          Send
        </button>
        <button
          type="button"
          onClick={cameraOn ? stopCamera : () => void startCamera()}
          disabled={cameraLoading || busy}
          className={`flex items-center gap-1.5 rounded-full border px-4 py-3 text-sm font-medium shadow-sm transition active:scale-95 ${
            cameraOn
              ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-semibold"
              : "border-sand-300 bg-white text-stone-700 hover:bg-sand-50"
          }`}
          title="Toggle Camera for Video Interaction (iOS / Android / Windows)"
        >
          <span>{cameraOn ? "🟢" : "📷"}</span>
          <span className="hidden sm:inline">{cameraLoading ? "Opening..." : cameraOn ? "Camera On" : "Camera"}</span>
        </button>
        <button
          type="button"
          className={`flex items-center gap-1.5 rounded-full border px-4 py-3 text-sm font-medium shadow-sm transition active:scale-95 ${
            isRecording
              ? "border-clay-500 bg-clay-50 text-clay-700 font-semibold"
              : "border-sand-300 bg-white text-stone-700 hover:bg-sand-50"
          }`}
          onClick={isRecording ? stopBrowserStt : startBrowserStt}
          disabled={busy}
          title="Voice Conversation"
        >
          <span>🎙️</span>
          <span className="hidden sm:inline">{isRecording ? "Stop" : "Voice"}</span>
        </button>
      </form>

      <p className="mt-2 text-xs text-stone-500">
        Voice analysis is optional. Silence, accent, disability, connection, or language choice never reduce your access to support.
      </p>

      <div className="mt-3 flex items-center justify-between text-xs text-stone-600">
        <div className="flex gap-4">
          <Link href="/results" className="underline hover:text-stone-900">
            View support suggestion
          </Link>
          <Link href="/privacy" className="underline hover:text-stone-900">
            Privacy & deletion
          </Link>
        </div>
        <Link href="/summary" className="underline hover:text-stone-900">
          Review summary
        </Link>
      </div>

      {/* Transcript Correction Modal */}
      {showTranscript && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-stone-800">{loc.correctTranscript}</h2>
            <p className="mt-1 text-xs text-stone-500">
              You can edit any words that speech recognition misheard before submitting for supportive response.
            </p>
            <textarea
              className="mt-3 h-32 w-full rounded-xl border border-sand-300 p-3 text-sm text-stone-800 focus:border-sage-600 focus:outline-none"
              value={transcriptDraft}
              onChange={(e) => setTranscriptDraft(e.target.value)}
            />
            <div className="mt-2 text-xs text-stone-400">
              Words: {transcriptDraft.trim().split(/\s+/).filter(Boolean).length}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                className="rounded-lg bg-sage-700 px-4 py-2 text-sm font-medium text-white shadow hover:bg-sage-600"
                onClick={submitTranscript}
              >
                {loc.useThisText}
              </button>
              <button
                className="rounded-lg border border-sand-300 px-4 py-2 text-sm text-stone-700 hover:bg-sand-50"
                onClick={() => setShowTranscript(false)}
              >
                {loc.discard}
              </button>
            </div>
          </div>
        </div>
      )}

      {shareDest && sessionId && (
        <ShareConfirmModal sessionId={sessionId} destination={shareDest} onClose={() => setShareDest(null)} />
      )}
    </main>
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
  results: { [index: number]: { [index: number]: { transcript: string } } };
}

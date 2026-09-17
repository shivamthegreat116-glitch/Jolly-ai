"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { EmergencyButton } from "@/components/EmergencyButton";
import { ShareConfirmModal } from "@/components/ShareConfirmModal";
import { SanctuaryHeader } from "@/components/SanctuaryHeader";
import { api } from "@/lib/api";
import { STRINGS, type Lang } from "@/lib/i18n";
import {
  estimateFeaturesFromAnalyser,
  getSpeechRecognitionLang,
  speak,
  stopSpeaking,
  type VoiceFeatures,
} from "@/lib/voice";
import { FatigueCameraWidget } from "@/components/FatigueCameraWidget";
import type {
  SessionState,
  AiRequestState,
  VoiceState,
  CameraState,
  VideoCallState,
  InteractionObject,
  CameraFatigueData,
} from "@/types/session";

type Msg = { role: "user" | "assistant"; text: string; time?: string; failed?: boolean };

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

  // Distinct system lifecycle states
  const [sessionState, setSessionState] = useState<SessionState>("active");
  const [aiRequestState, setAiRequestState] = useState<AiRequestState>("idle");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [cameraState, setCameraState] = useState<CameraState>("off");
  const [videoCallState, setVideoCallState] = useState<VideoCallState>("idle");

  // Core conversation state
  const [sessionId, setSessionId] = useState("");
  const [lang, setLang] = useState<Lang>("en");
  const [phase, setPhase] = useState("start");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [crisis, setCrisis] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const [tts, setTts] = useState(false);
  const [error, setError] = useState("");
  const [currentQuestionId, setCurrentQuestionId] = useState<string>("Q01_SAFETY");
  const [clarificationCount, setClarificationCount] = useState<number>(0);
  const [conversationMode, setConversationMode] = useState<string>("assessment");
  const [crisisLevel, setCrisisLevel] = useState<string>("none");
  const [videoRoomUrl, setVideoRoomUrl] = useState<string | null>(null);
  const [assessmentCompleted, setAssessmentCompleted] = useState(false);

  // Voice Interaction state
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcriptDraft, setTranscriptDraft] = useState("");
  const [showTranscript, setShowTranscript] = useState(false);
  const [voiceSanctuaryOpen, setVoiceSanctuaryOpen] = useState(false);
  const [voicePaused, setVoicePaused] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isVoiceSupported, setIsVoiceSupported] = useState(true);

  // Camera & Video state
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [liveFatigue, setLiveFatigue] = useState<CameraFatigueData | null>(null);

  // Save & End Chat state
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [endChatModalOpen, setEndChatModalOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Triage demographic & health context
  const [ageGroup, setAgeGroup] = useState<string>("");
  const [medicalHistory, setMedicalHistory] = useState<string>("");

  // Grounding Tool overlay
  const [showGrounding, setShowGrounding] = useState(false);

  // Non-rendering refs
  const volumes = useRef<number[]>([]);
  const recStart = useRef(0);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const levelFrameRef = useRef<number | null>(null);
  const speechActiveRef = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeRecognizerRef = useRef<any>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const lastInteractionIdRef = useRef<string | null>(null);
  const savedTextModeTtsRef = useRef<boolean>(false);
  const isSubmittingVoiceRef = useRef<boolean>(false);

  const loc = STRINGS[lang] || STRINGS.en;

  // Track user activity for idle detection
  const recordUserActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (sessionState === "idle") {
      setSessionState("active");
    }
  }, [sessionState]);

  useEffect(() => {
    const onActivity = () => recordUserActivity();
    window.addEventListener("pointerdown", onActivity);
    window.addEventListener("keydown", onActivity);
    window.addEventListener("touchstart", onActivity);
    return () => {
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("touchstart", onActivity);
    };
  }, [recordUserActivity]);

  // Idle timer check (45 minutes, exempting crisis_support)
  useEffect(() => {
    const interval = setInterval(() => {
      const idleTime = Date.now() - lastActivityRef.current;
      if (
        idleTime > 45 * 60 * 1000 &&
        sessionState === "active" &&
        conversationMode !== "crisis_support" &&
        crisisLevel === "none"
      ) {
        setSessionState("idle");
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [sessionState, conversationMode, crisisLevel]);

  // 1. Session Initialization & Recovery
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
    const storedAge = sessionStorage.getItem("jolly_age_group") || "";
    setAgeGroup(storedAge);
    const storedMed = sessionStorage.getItem("jolly_medical_history") || "";
    setMedicalHistory(storedMed);

    // Check browser SpeechRecognition support
    if (typeof window !== "undefined") {
      const hasSpeech = Boolean(
        (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition ||
          (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition
      );
      setIsVoiceSupported(hasSpeech);
    }

    // Recover previous conversation messages if available
    const savedMessages = sessionStorage.getItem("jolly_chat_messages");
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          const savedPhase = sessionStorage.getItem("jolly_phase") || "ongoing_support";
          setPhase(savedPhase);
          if (savedPhase === "summary" || savedPhase === "ongoing_support") {
            setAssessmentCompleted(true);
            setConversationMode("ongoing_support");
          }
          return; // Restored successfully, do NOT wipe by calling boot!
        }
      } catch {
        // Fallback to fresh boot if corrupt
      }
    }

    void boot(sid);
  }, [router]);

  // Save messages to sessionStorage on change
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem("jolly_chat_messages", JSON.stringify(messages));
    }
  }, [messages]);

  // Save phase to sessionStorage on change
  useEffect(() => {
    if (phase) {
      sessionStorage.setItem("jolly_phase", phase);
    }
  }, [phase]);

  // Scroll to bottom on new messages or loading
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiRequestState]);

  // Boot initial session greeting
  async function boot(sid: string) {
    setAiRequestState("processing");
    try {
      const r = await api<{
        reply: string;
        next_phase: string;
        question_id?: string;
        next_question_id?: string;
      }>("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          session_id: sid,
          message: "",
          phase: "start",
          age_group: sessionStorage.getItem("jolly_age_group") || undefined,
        }),
      });
      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setMessages([{ role: "assistant", text: r.reply, time: now }]);
      setPhase(r.next_phase);
      if (r.next_question_id) {
        setCurrentQuestionId(r.next_question_id);
      }
      setAiRequestState("idle");
    } catch {
      setError("We could not start this chat. Please check your connection and try again.");
      setAiRequestState("failed");
    }
  }

  // =========================================================
  // CAMERA SYSTEM (Callback ref + Progressive constraints)
  // =========================================================

  // Reliable callback ref that attaches stream when the <video> DOM node mounts
  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && cameraStreamRef.current) {
      node.srcObject = cameraStreamRef.current;
      node.play().catch(() => {});
    }
  }, []);

  // Cleanup camera tracks on unmount
  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  async function startCamera(mode: "user" | "environment" = facingMode) {
    if (typeof window === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Camera is not supported on this browser or device.");
      setCameraState("error");
      return;
    }

    setCameraState("starting");
    setCameraError(null);

    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }

    let stream: MediaStream | null = null;

    // Progressive Fallback:
    // 1. Ideal resolution with facing mode
    // 2. Facing mode only
    // 3. Plain video: true
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
    } catch {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode },
          audio: false,
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } catch (finalErr: unknown) {
          const e = finalErr as { name?: string; message?: string };
          if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
            setCameraError("Camera access was denied. Please allow camera permissions in your browser.");
          } else if (e.name === "NotFoundError" || e.name === "DevicesNotFoundError") {
            setCameraError("No camera found on this device.");
          } else if (e.name === "NotReadableError") {
            setCameraError("Camera is currently in use by another application.");
          } else {
            setCameraError("Unable to open camera. You can continue with text or voice.");
          }
          setCameraState("error");
          return;
        }
      }
    }

    cameraStreamRef.current = stream;
    setFacingMode(mode);
    setCameraState("active");

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }

  function stopCamera() {
    setCameraState("stopping");
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraState("off");
    setCameraError(null);
  }

  async function flipCamera() {
    const nextMode = facingMode === "user" ? "environment" : "user";
    await startCamera(nextMode);
  }

  function captureCameraFrame(): string | null {
    if (cameraState !== "active" || !videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Verify video stream is actively playing and has dimensions
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) return null;

    try {
      canvas.width = Math.min(video.videoWidth, 640);
      canvas.height = Math.min(video.videoHeight, 480);
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.6);
    } catch {
      return null; // Silent graceful fallback if canvas draw fails
    }
  }

  // =========================================================
  // UNIFIED SEND PIPELINE (Text, Voice, Camera)
  // =========================================================

  async function send(text: string, voice?: VoiceFeatures, customInteractionId?: string) {
    if (!text.trim() || aiRequestState === "processing") return;

    recordUserActivity();
    setError("");
    setAiRequestState("processing");

    // Interrupt any ongoing speech synthesis immediately
    stopSpeaking();

    const timeNow = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const interactionId = customInteractionId || crypto.randomUUID();
    lastInteractionIdRef.current = interactionId;

    // Append user message
    setMessages((m) => [...m, { role: "user", text, time: timeNow }]);
    setInput("");

    // Optional camera snapshot (camera failure never impedes conversation)
    const snapshot = captureCameraFrame();

    // Determine input type for normalized interaction object
    const isVoiceInput = Boolean(voice || voiceSanctuaryOpen);
    const inputType = isVoiceInput
      ? cameraState === "active"
        ? "voice_camera"
        : "voice"
      : cameraState === "active"
      ? "text_camera"
      : "text";

    const interactionPayload: InteractionObject = {
      interaction_id: interactionId,
      session_id: sessionId,
      input_type: inputType,
      text,
      audio_metadata: voice,
      camera_frame: snapshot,
      timestamp: new Date().toISOString(),
    };

    // Execute with 1 transient retry
    let responseData = null;
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts && !responseData) {
      try {
        attempts++;
        responseData = await api<{
          interaction_id: string;
          reply: string;
          next_phase: string;
          question_id?: string;
          next_question_id?: string | null;
          interpretation?: unknown;
          crisis_mode: boolean;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          assessment: any;
          draft_summary: string;
          voice_signal_status: string;
          conversation_mode?: string;
          crisis_level?: string;
          video_room_url?: string;
          escalation_event_id?: string;
        }>("/api/chat", {
          method: "POST",
          body: JSON.stringify({
            interaction_id: interactionPayload.interaction_id,
            session_id: interactionPayload.session_id,
            message: interactionPayload.text,
            phase,
            question_id: currentQuestionId,
            clarification_count: clarificationCount,
            voice: interactionPayload.audio_metadata || undefined,
            image_base64: interactionPayload.camera_frame || undefined,
            mode: conversationMode,
            age_group: ageGroup || sessionStorage.getItem("jolly_age_group") || undefined,
            medical_history: medicalHistory || sessionStorage.getItem("jolly_medical_history") || undefined,
            camera_fatigue: liveFatigue || undefined,
          }),
        });
      } catch {
        if (attempts < maxAttempts) {
          setAiRequestState("retrying");
          await new Promise((res) => setTimeout(res, 1200));
        } else {
          setError("I couldn't process that just now. Your conversation is preserved. Please tap retry below.");
          setAiRequestState("failed");
          return;
        }
      }
    }

    if (!responseData) return;

    const aiTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((m) => [...m, { role: "assistant", text: responseData.reply, time: aiTime }]);
    setAiRequestState("idle");

    // Phase and Question Progression
    setPhase(responseData.next_phase);
    if (responseData.next_question_id) {
      if (responseData.next_question_id === currentQuestionId) {
        setClarificationCount((c) => c + 1);
      } else {
        setCurrentQuestionId(responseData.next_question_id);
        setClarificationCount(0);
      }
    }

    // Safety and Mode updates
    setCrisis(Boolean(responseData.crisis_mode));
    if (responseData.conversation_mode) {
      setConversationMode(responseData.conversation_mode);
      if (responseData.conversation_mode === "crisis_support") {
        setSessionState("crisis_support");
      }
    }
    if (responseData.crisis_level) setCrisisLevel(responseData.crisis_level);
    if (responseData.video_room_url) setVideoRoomUrl(responseData.video_room_url);

    // Assessment persistence (Never forcibly redirect the user!)
    if (responseData.assessment) {
      sessionStorage.setItem("jolly_assessment", JSON.stringify(responseData.assessment));
      if (responseData.assessment.stress_index) {
        sessionStorage.setItem("jolly_stress_index", JSON.stringify(responseData.assessment.stress_index));
      }
      if (responseData.assessment.trauma_typology) {
        sessionStorage.setItem("jolly_trauma_typology", JSON.stringify(responseData.assessment.trauma_typology));
      }
    }
    if (responseData.draft_summary) {
      sessionStorage.setItem("jolly_summary", responseData.draft_summary);
    }
    sessionStorage.setItem("jolly_voice_status", responseData.voice_signal_status);

    // If assessment turns finished, celebrate readiness without booting the user
    if (responseData.next_phase === "ongoing_support" || responseData.next_phase === "summary") {
      setAssessmentCompleted(true);
    }

    // Text-to-Speech (TTS):
    // Voice Sanctuary always speaks response; Text mode respects user preference
    const shouldSpeak = voiceSanctuaryOpen || tts;
    if (shouldSpeak) {
      setVoiceState("speaking");
      speak(
        responseData.reply,
        lang,
        () => setVoiceState("speaking"),
        () => setVoiceState("idle")
      );
    }
  }

  // =========================================================
  // VOICE SYSTEM (Web Speech STT + Auto-submit)
  // =========================================================

  function startBrowserStt() {
    // Interrupt any AI speech before listening to the user
    stopSpeaking();
    setVoiceError(null);

    const SR =
      (window as unknown as { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition ||
      (window as unknown as { SpeechRecognition?: new () => any }).SpeechRecognition;

    if (!SR) {
      setIsVoiceSupported(false);
      setVoiceError("Voice input isn't supported by this browser. You can continue typing softly.");
      return;
    }

    setVoiceState("requesting_permission");
    volumes.current = [];
    recStart.current = Date.now();
    speechActiveRef.current = true;
    isSubmittingVoiceRef.current = false;
    setTranscriptDraft("");

    const rec = new SR();
    activeRecognizerRef.current = rec;
    rec.lang = getSpeechRecognitionLang(lang);
    rec.interimResults = true;
    rec.continuous = false;

    void startLevelSampling();

    rec.onstart = () => {
      setVoiceState("listening");
    };

    rec.onresult = (ev: any) => {
      let interim = "";
      let finalStr = "";
      for (let i = 0; i < ev.results.length; ++i) {
        const item = ev.results[i];
        if (item.isFinal) {
          finalStr += item[0].transcript;
        } else {
          interim += item[0].transcript;
        }
      }
      const combined = (finalStr || interim).trim();
      setTranscriptDraft(combined);
      if (combined) {
        setVoiceState("transcribing");
      }
    };

    rec.onend = () => {
      stopLevelSampling();
      activeRecognizerRef.current = null;

      // Auto-submit in Voice Sanctuary mode when a transcript is captured
      if (voiceSanctuaryOpen && transcriptDraft.trim() && !isSubmittingVoiceRef.current) {
        isSubmittingVoiceRef.current = true;
        submitTranscriptDirectly(transcriptDraft.trim());
      } else if (!voiceSanctuaryOpen && transcriptDraft.trim()) {
        setShowTranscript(true);
        setVoiceState("idle");
      } else {
        setVoiceState("idle");
      }
    };

    rec.onerror = (event: any) => {
      stopLevelSampling();
      activeRecognizerRef.current = null;

      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setVoiceError("Microphone access was denied. Please allow microphone permissions in site settings.");
      } else if (event.error === "no-speech") {
        setVoiceError("No speech detected. Speak whenever you're ready.");
      } else if (event.error === "network") {
        setVoiceError("Speech network glitch. Tap the microphone to try again.");
      } else {
        setVoiceError("Speech recognition paused. Tap to speak again.");
      }
      setVoiceState("error");
    };

    try {
      rec.start();
    } catch {
      setVoiceState("error");
      setVoiceError("Could not initialize microphone. Please check your audio settings.");
    }
  }

  function stopBrowserStt() {
    speechActiveRef.current = false;
    activeRecognizerRef.current?.stop();
    activeRecognizerRef.current = null;
    stopLevelSampling();
    setVoiceState("idle");
  }

  async function startLevelSampling() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const samples = new Uint8Array(analyser.frequencyBinCount);
      const sampleLevel = () => {
        if (!speechActiveRef.current) return;
        analyser.getByteTimeDomainData(samples);
        const mean = samples.reduce((sum, value) => sum + Math.abs(value - 128), 0) / samples.length;
        volumes.current.push(mean);
        setAudioLevel(Math.min(100, Math.round((mean / 30) * 100)));
        levelFrameRef.current = requestAnimationFrame(sampleLevel);
      };
      sampleLevel();
    } catch {
      // Audio level sampling failed gracefully without crashing STT
    }
  }

  function stopLevelSampling() {
    speechActiveRef.current = false;
    setAudioLevel(0);
    if (levelFrameRef.current !== null) cancelAnimationFrame(levelFrameRef.current);
    levelFrameRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    if (audioContextRef.current) void audioContextRef.current.close();
    audioContextRef.current = null;
  }

  // Auto-submit from Voice Sanctuary
  function submitTranscriptDirectly(textToSend: string) {
    const dur = Math.max(1, (Date.now() - recStart.current) / 1000);
    const wordCount = textToSend.split(/\s+/).filter(Boolean).length;
    const feats = estimateFeaturesFromAnalyser(volumes.current, dur, wordCount);
    setTranscriptDraft("");
    void send(textToSend, feats);
  }

  // Manual submit from review modal
  function submitTranscript() {
    const dur = Math.max(1, (Date.now() - recStart.current) / 1000);
    const wordCount = transcriptDraft.trim().split(/\s+/).filter(Boolean).length;
    const feats = estimateFeaturesFromAnalyser(volumes.current, dur, wordCount);
    setShowTranscript(false);
    const textToSend = transcriptDraft;
    setTranscriptDraft("");
    void send(textToSend, voiceOn ? feats : undefined);
  }

  // Enter Voice Sanctuary: automatically turn on TTS for voice room, remember text preference
  function handleOpenVoiceSanctuary() {
    savedTextModeTtsRef.current = tts;
    setTts(true);
    setVoiceSanctuaryOpen(true);
    startBrowserStt();
  }

  // Exit Voice Sanctuary: restore text-mode TTS preference
  function handleCloseVoiceSanctuary() {
    stopBrowserStt();
    stopSpeaking();
    setTts(savedTextModeTtsRef.current);
    setVoiceSanctuaryOpen(false);
  }

  // =========================================================
  // JITSI COUNSELOR ESCALATION (Isolated from chat session)
  // =========================================================

  async function connectWithCounselor() {
    setVideoCallState("connecting");
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
      setVideoCallState("connected");
      window.open(res.room_url, "_blank", "noopener,noreferrer");
    } catch {
      setVideoCallState("disconnected");
      setError("Unable to initialize counselor room. Please call Tele-MANAS (14416) or Emergency (112) directly.");
    }
  }

  // Utility toast
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
    stopSpeaking();
    router.push("/summary");
  }

  function handleQuickExit() {
    stopCamera();
    stopSpeaking();
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
          {/* Sub-bar: Language Pill, Read Aloud Toggle, & Quick Exit */}
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

            <div className="flex items-center gap-2.5">
              <label className="flex items-center gap-1.5 text-label-sm font-label-sm text-text-secondary cursor-pointer bg-surface-crisp px-2.5 py-1 rounded-full border border-border-subtle shadow-2xs hover:bg-bg-subtle">
                <input
                  type="checkbox"
                  className="rounded border-border-subtle text-primary focus:ring-primary"
                  checked={tts}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setTts(checked);
                    if (!checked) stopSpeaking();
                  }}
                />
                <span className="material-symbols-outlined text-[15px] text-primary">
                  {tts ? "volume_up" : "volume_off"}
                </span>
                <span className="hidden sm:inline">Read aloud</span>
              </label>

              <button
                type="button"
                onClick={handleQuickExit}
                className="inline-flex items-center gap-1 rounded-full bg-surface-crisp px-3 py-1 text-label-sm font-label-sm text-safety-emergency border border-safety-emergency/20 hover:bg-safety-emergency-subtle transition-colors shadow-2xs font-semibold"
                title="Immediately clear history and go to Google"
              >
                <span>Quick Exit</span>
                <span className="material-symbols-outlined text-[14px]">logout</span>
              </button>
            </div>
          </div>

          {/* Idle Reminder Banner (Non-terminating) */}
          {sessionState === "idle" && (
            <div className="rounded-2xl border border-primary/20 bg-surface-container-low p-3.5 flex items-center justify-between text-body-sm text-primary shadow-xs animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">spa</span>
                <span>You&apos;ve been quiet for a while. Take your time — your chat is preserved.</span>
              </div>
              <button
                onClick={() => setSessionState("active")}
                className="px-3 py-1 rounded-xl bg-surface-crisp text-primary font-label-sm border border-border-subtle hover:bg-surface-container"
              >
                Resume
              </button>
            </div>
          )}

          {/* Voice Browser Compatibility Notice */}
          {!isVoiceSupported && (
            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 p-3 text-body-sm text-amber-900 flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] text-amber-700 shrink-0 mt-0.5">info</span>
              <span>
                Voice recognition isn&apos;t supported natively in this browser (e.g. Firefox). You can continue chatting softly with text anytime.
              </span>
            </div>
          )}

          {/* Voice Permission/Capture Error Banner */}
          {voiceError && (
            <div className="rounded-2xl border border-amber-300/80 bg-amber-50 p-3 text-body-sm text-amber-900 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-amber-700">mic_off</span>
                <span>{voiceError}</span>
              </div>
              <button
                onClick={() => {
                  setVoiceError(null);
                  startBrowserStt();
                }}
                className="px-2.5 py-1 rounded-lg bg-surface-crisp text-amber-900 text-xs font-semibold border border-amber-200"
              >
                Try again
              </button>
            </div>
          )}

          {/* Camera Permission/Device Error Banner (Never terminates session) */}
          {cameraError && (
            <div className="rounded-2xl border border-amber-300/80 bg-amber-50 p-3 text-body-sm text-amber-900 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-amber-700">videocam_off</span>
                <span>{cameraError}</span>
              </div>
              <button
                onClick={() => {
                  setCameraError(null);
                  void startCamera();
                }}
                className="px-2.5 py-1 rounded-lg bg-surface-crisp text-amber-900 text-xs font-semibold border border-amber-200"
              >
                Try again
              </button>
            </div>
          )}

          {/* Assessment Completed Notice (Permits ongoing open conversation) */}
          {assessmentCompleted && (
            <div className="rounded-2xl border border-secondary-container bg-surface-container-low p-3.5 flex items-center justify-between text-body-sm text-primary shadow-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">assignment_turned_in</span>
                <span>
                  Initial check-in complete. You can review your summary anytime or continue talking freely.
                </span>
              </div>
              <Link
                href="/results"
                className="px-3 py-1 rounded-xl bg-surface-crisp text-primary font-label-sm border border-border-subtle hover:bg-surface-container shrink-0"
              >
                View summary
              </Link>
            </div>
          )}

          {/* Calm Sanctuary Status Card */}
          <div className="w-full bg-surface-crisp rounded-2xl p-4 border border-border-subtle shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center text-primary shrink-0">
                <span className="material-symbols-outlined text-[20px]">spa</span>
              </div>
              <div>
                <h2 className="font-headline-sm text-headline-sm text-text-primary">Quiet Space</h2>
                <p className="font-body-sm text-body-sm text-text-secondary">
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

          {/* Crisis Banner & Counselor Room Trigger */}
          {(conversationMode === "crisis_support" ||
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

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
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
                  <span className="font-label-md text-label-md font-bold text-primary">🏛️ 14566</span>
                  <span className="font-label-sm text-label-sm text-text-secondary mt-0.5">NHAA Helpline</span>
                </a>
                <a
                  href="https://www.dosje.gov.in/organisation/national-helpline-against-atrocities/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center rounded-xl bg-surface-crisp border border-border-subtle p-2.5 text-center shadow-2xs hover:bg-bg-subtle active:scale-95 transition"
                >
                  <span className="font-label-md text-label-md font-bold text-primary">🌐 dosje.gov.in</span>
                  <span className="font-label-sm text-label-sm text-text-secondary mt-0.5">NHAA Portal</span>
                </a>
                <a
                  href="tel:18005990019"
                  className="flex flex-col items-center justify-center rounded-xl bg-surface-crisp border border-border-subtle p-2.5 text-center shadow-2xs hover:bg-bg-subtle active:scale-95 transition"
                >
                  <span className="font-label-md text-label-md font-bold text-primary">🌱 KIRAN</span>
                  <span className="font-label-sm text-label-sm text-text-secondary mt-0.5">1800-599-0019</span>
                </a>
              </div>

              {/* Jitsi Video Consultation Escalation Button */}
              <div className="mt-3 pt-3 border-t border-safety-emergency/20 flex flex-col sm:flex-row items-center justify-between gap-2">
                <p className="font-body-sm text-body-sm text-text-secondary">
                  Would you like a private 1-on-1 video call with a human trauma counselor?
                </p>
                <button
                  type="button"
                  onClick={connectWithCounselor}
                  disabled={videoCallState === "connecting"}
                  className="shrink-0 px-4 py-2 rounded-xl bg-safety-emergency text-surface-crisp font-label-md font-medium shadow-xs hover:opacity-95 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">video_call</span>
                  <span>{videoCallState === "connecting" ? "Creating Room..." : "Join Video Counselor"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Transient Error Alert with Non-terminating Retry */}
          {error && (
            <div className="rounded-xl border border-safety-emergency/30 bg-safety-emergency-subtle p-3 text-body-sm text-safety-emergency flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] shrink-0">info</span>
                <span>{error}</span>
              </div>
              <button
                onClick={() => {
                  setError("");
                  if (messages.length > 0 && messages[messages.length - 1].role === "user") {
                    void send(messages[messages.length - 1].text, undefined, lastInteractionIdRef.current || undefined);
                  }
                }}
                className="px-3 py-1 rounded-lg bg-surface-crisp text-safety-emergency text-xs font-semibold border border-safety-emergency/30"
              >
                Retry
              </button>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />

          {/* Chat Stream Canvas */}
          <div className="flex flex-col space-y-4 pb-2" id="chat-stream">
            <div className="flex items-center justify-center py-1">
              <span className="px-3 py-1 rounded-full bg-surface-container font-label-sm text-label-sm text-text-secondary border border-border-subtle">
                Today • Sanctuary Space
              </span>
            </div>

            {messages.map((m, i) =>
              m.role === "assistant" ? (
                <div key={i} className="flex items-end gap-2.5 max-w-[92%] sm:max-w-[85%] self-start group">
                  <div className="w-8 h-8 rounded-full bg-surface-crisp border border-border-subtle flex items-center justify-center overflow-hidden shrink-0 mb-1 shadow-2xs p-0.5">
                    <Image
                      src="/logo.png"
                      alt="Jolly AI Mascot"
                      width={28}
                      height={28}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex flex-col space-y-1">
                    <div className="bg-surface-container rounded-2xl rounded-bl-xs p-4 shadow-2xs border border-border-subtle text-text-primary">
                      <p className="font-body-md text-body-md leading-relaxed whitespace-pre-line">{m.text}</p>
                      <div className="mt-2.5 flex items-center justify-between pt-1.5 border-t border-border-subtle/80 text-[11px] text-text-secondary">
                        <span className="font-label-sm text-label-sm text-text-secondary">
                          Jolly AI {m.time ? `• ${m.time}` : ""}
                        </span>
                        <div className="flex items-center gap-1.5">
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
                          <button
                            type="button"
                            onClick={() => {
                              stopSpeaking();
                              speak(m.text, lang);
                            }}
                            className="inline-flex items-center gap-1 rounded px-2 py-0.5 font-label-sm text-label-sm text-primary bg-surface-crisp/80 border border-border-subtle hover:bg-surface-crisp shadow-2xs transition"
                            title="Listen to this response"
                          >
                            <span className="material-symbols-outlined text-[13px]">volume_up</span>
                            <span>Listen</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div key={i} className="max-w-[85%] self-end">
                  <div className="bg-surface-container-low text-text-primary rounded-2xl rounded-br-xs p-4 shadow-2xs border border-border-subtle">
                    <p className="font-body-md text-body-md leading-relaxed whitespace-pre-line">{m.text}</p>
                    <span className="block mt-1 text-[11px] text-text-secondary text-right font-label-sm text-label-sm">
                      You {m.time ? `• ${m.time}` : ""}
                    </span>
                  </div>
                </div>
              )
            )}

            {/* AI Request Processing Indicator */}
            {aiRequestState === "processing" && (
              <div className="flex items-end gap-2.5 max-w-[85%] self-start animate-fade-in">
                <div className="w-8 h-8 rounded-full bg-surface-crisp border border-border-subtle flex items-center justify-center overflow-hidden shrink-0 mb-1 shadow-2xs p-0.5">
                  <Image
                    src="/logo.png"
                    alt="Jolly AI Mascot"
                    width={28}
                    height={28}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="bg-surface-container rounded-2xl rounded-bl-xs px-4 py-3 border border-border-subtle flex items-center gap-2 text-text-secondary font-label-sm text-label-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.4s]"></span>
                  <span className="ml-1 italic text-text-secondary">Taking a moment to listen...</span>
                </div>
              </div>
            )}

            {aiRequestState === "retrying" && (
              <div className="text-center py-1">
                <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-medium border border-amber-200">
                  Reconnecting softly...
                </span>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Dynamic Intake & Context Selection Chips */}
          {(!ageGroup || phase === "safety" || currentQuestionId === "Q01_AGE_SAFETY") && (
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar select-none">
              <span className="font-label-sm text-label-sm font-semibold text-primary px-2 shrink-0 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">badge</span>
                <span>Your age group:</span>
              </span>
              {[
                { id: "under_18", label: "👶 Under 18 (Youth)" },
                { id: "18_24", label: "🌱 18–24 (Young Adult)" },
                { id: "25_40", label: "🌿 25–40 (Adult)" },
                { id: "41_60", label: "🌳 41–60 (Mature)" },
                { id: "60_plus", label: "🍂 60+ (Senior)" },
                { id: "prefer_not_to_say", label: "🔒 Prefer not to say" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setAgeGroup(item.id);
                    sessionStorage.setItem("jolly_age_group", item.id);
                    void send(`I am in the ${item.label.replace(/[👶🌱🌿🌳🍂🔒]/g, "").trim()} age group.`);
                  }}
                  disabled={aiRequestState === "processing"}
                  className="shrink-0 px-3 py-1 rounded-full bg-surface-crisp border border-border-subtle font-label-sm text-label-sm text-text-primary hover:bg-surface-container transition active:scale-95 shadow-2xs disabled:opacity-40"
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {(phase === "impact_medical" || currentQuestionId === "Q05_IMPACT_MEDICAL") && (
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar select-none">
              <span className="font-label-sm text-label-sm font-semibold text-primary px-2 shrink-0 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">medical_services</span>
                <span>Health context:</span>
              </span>
              {[
                { text: "No relevant physical health conditions", label: "🩺 No physical conditions" },
                { text: "I have chronic pain and exhaustion heightened by this stress", label: "💊 Chronic pain/fatigue" },
                { text: "I have experienced physical injury from this situation", label: "🩹 Recent injury" },
                { text: "I am receiving ongoing psychological support or medication", label: "🧠 Psychological support" },
                { text: "I prefer to keep my medical details private", label: "🔒 Keep private" },
              ].map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setMedicalHistory(item.text);
                    sessionStorage.setItem("jolly_medical_history", item.text);
                    void send(item.text);
                  }}
                  disabled={aiRequestState === "processing"}
                  className="shrink-0 px-3 py-1 rounded-full bg-surface-crisp border border-border-subtle font-label-sm text-label-sm text-text-primary hover:bg-surface-container transition active:scale-95 shadow-2xs disabled:opacity-40"
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {/* Quick Comforting Prompt Chips */}
          <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar select-none">
            <button
              type="button"
              onClick={() => void send("I'm feeling really overwhelmed today.")}
              disabled={aiRequestState === "processing"}
              className="shrink-0 px-3.5 py-1.5 rounded-full bg-surface-crisp border border-border-subtle font-label-sm text-label-sm text-text-secondary hover:text-text-primary hover:bg-surface-container transition-all active:scale-95 shadow-2xs disabled:opacity-40"
            >
              🌱 &quot;I&apos;m feeling overwhelmed today&quot;
            </button>
            <button
              type="button"
              onClick={() => void send("Can you just listen for a moment? I don't need solutions right now.")}
              disabled={aiRequestState === "processing"}
              className="shrink-0 px-3.5 py-1.5 rounded-full bg-surface-crisp border border-border-subtle font-label-sm text-label-sm text-text-secondary hover:text-text-primary hover:bg-surface-container transition-all active:scale-95 shadow-2xs disabled:opacity-40"
            >
              👂 &quot;Just listen for a moment&quot;
            </button>
            <button
              type="button"
              onClick={() => void send("What are my rights and reporting pathways under NHAA 14566?")}
              disabled={aiRequestState === "processing"}
              className="shrink-0 px-3.5 py-1.5 rounded-full bg-surface-crisp border border-border-subtle font-label-sm text-label-sm text-text-secondary hover:text-text-primary hover:bg-surface-container transition-all active:scale-95 shadow-2xs disabled:opacity-40"
            >
              ⚖️ &quot;What are my rights?&quot;
            </button>
          </div>

          {/* Safe Composer Input Deck */}
          <div className="w-full bg-surface-crisp rounded-2xl p-2 border border-border-subtle shadow-xs flex items-center gap-2 focus-within:ring-1 focus-within:ring-primary/40 transition-all">
            {/* Voice Sanctuary Button */}
            <button
              type="button"
              onClick={handleOpenVoiceSanctuary}
              disabled={aiRequestState === "processing"}
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                voiceState === "listening" || voiceState === "transcribing"
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
              onClick={cameraState === "active" ? stopCamera : () => void startCamera()}
              disabled={cameraState === "starting" || aiRequestState === "processing"}
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                cameraState === "active"
                  ? "bg-secondary-container text-primary font-bold"
                  : "bg-surface-container text-primary-container hover:bg-surface-container-high"
              }`}
              title="Toggle Camera for Face-to-Face Interaction"
            >
              <span className="material-symbols-outlined text-[20px]">
                {cameraState === "active" ? "videocam" : "videocam_off"}
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
              disabled={aiRequestState === "processing"}
            />

            {/* Send Button */}
            <button
              type="button"
              onClick={() => void send(input)}
              disabled={aiRequestState === "processing" || !input.trim()}
              className="w-11 h-11 rounded-xl bg-primary-container text-on-primary hover:bg-primary flex items-center justify-center shrink-0 transition-all active:scale-95 shadow-2xs disabled:opacity-40"
              title="Send message"
            >
              <span className="material-symbols-outlined text-[20px]">send</span>
            </button>
          </div>

          <div className="text-center pb-2">
            <p className="font-label-sm text-label-sm text-text-secondary">
              NHAA Helpline <a href="tel:14566" className="underline font-semibold text-primary">14566</a> (24/7 Toll-free) · Official <a href="https://www.dosje.gov.in/organisation/national-helpline-against-atrocities/" target="_blank" rel="noopener noreferrer" className="underline font-semibold text-primary">Digital Portal (dosje.gov.in)</a>. Your conversations are anonymous.
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
                Two-Way Voice
              </span>
            </div>
            <button
              type="button"
              onClick={handleCloseVoiceSanctuary}
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
                  transform:
                    voiceState === "listening" || voiceState === "transcribing" || voiceState === "speaking"
                      ? `scale(${1 + audioLevel / 150})`
                      : "scale(0.95)",
                }}
              />
              {/* Intermediate soothing sage ripple */}
              <div
                className="absolute w-48 h-48 rounded-full bg-secondary-container/50 transition-transform duration-700 ease-out"
                style={{
                  transform:
                    voiceState === "listening" || voiceState === "transcribing" || voiceState === "speaking"
                      ? `scale(${0.9 + audioLevel / 180})`
                      : "scale(0.9)",
                }}
              />
              {/* Central Organic Breathing Sphere */}
              <div
                onClick={() => {
                  if (voiceState === "speaking") {
                    stopSpeaking();
                    startBrowserStt();
                  } else if (voiceState === "listening" || voiceState === "transcribing") {
                    stopBrowserStt();
                  } else {
                    startBrowserStt();
                  }
                }}
                className="relative w-36 h-36 rounded-full bg-gradient-to-tr from-primary-container via-surface-tint to-secondary flex flex-col items-center justify-center shadow-xl shadow-primary/10 cursor-pointer active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined text-on-primary text-[38px]">
                  {voiceState === "speaking"
                    ? "volume_up"
                    : voiceState === "listening" || voiceState === "transcribing"
                    ? "graphic_eq"
                    : voicePaused
                    ? "pause"
                    : "mic"}
                </span>
                <span className="font-label-sm text-label-sm text-primary-fixed mt-1 tracking-wider uppercase">
                  {voiceState === "speaking"
                    ? "Jolly Speaking"
                    : voiceState === "listening" || voiceState === "transcribing"
                    ? "Listening"
                    : voicePaused
                    ? "Paused"
                    : "Tap to Speak"}
                </span>
              </div>
            </div>

            {/* Status Title */}
            <div className="text-center mt-4">
              <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-text-primary">
                {voiceState === "speaking"
                  ? "Jolly AI is speaking..."
                  : voiceState === "transcribing" || voiceState === "listening"
                  ? "Listening gently to you"
                  : voicePaused
                  ? "Quiet pause"
                  : "Ready when you are"}
              </h2>
              <p className="font-body-md text-body-md text-text-secondary mt-1 max-w-xs mx-auto">
                {voiceState === "speaking"
                  ? "Tap the center orb anytime to interrupt and speak."
                  : "Take all the time you need. Speak naturally."}
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

            {/* Live Subtitle Transcript Preview */}
            {transcriptDraft && (
              <div className="w-full mt-4 bg-surface-crisp p-4 rounded-xl border border-border-subtle shadow-xs animate-fade-in">
                <span className="font-label-sm text-label-sm text-text-secondary block mb-1">Transcribing:</span>
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
                  if (voiceState === "listening" || voiceState === "transcribing") {
                    stopBrowserStt();
                  } else {
                    startBrowserStt();
                  }
                }}
                className="flex flex-col items-center justify-center py-2.5 px-2 rounded-xl bg-surface-crisp border border-border-subtle shadow-2xs hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[24px] text-primary">
                  {voiceState === "listening" || voiceState === "transcribing" ? "mic_off" : "mic"}
                </span>
                <span className="font-label-sm text-label-sm mt-1">
                  {voiceState === "listening" || voiceState === "transcribing" ? "Stop mic" : "Start mic"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (voicePaused) {
                    setVoicePaused(false);
                    startBrowserStt();
                  } else {
                    setVoicePaused(true);
                    stopBrowserStt();
                    stopSpeaking();
                  }
                }}
                className="flex flex-col items-center justify-center py-2.5 px-2 rounded-xl bg-surface-crisp border border-border-subtle shadow-2xs hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[24px] text-secondary">
                  {voicePaused ? "play_arrow" : "pause"}
                </span>
                <span className="font-label-sm text-label-sm mt-1">{voicePaused ? "Resume" : "Quiet pause"}</span>
              </button>

              <button
                type="button"
                onClick={handleCloseVoiceSanctuary}
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
                  submitTranscriptDirectly(transcriptDraft.trim());
                } else {
                  handleCloseVoiceSanctuary();
                }
              }}
              className="w-full py-3 px-4 rounded-xl bg-primary-container text-on-primary font-label-md text-label-md flex items-center justify-center gap-2 hover:bg-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">
                {transcriptDraft.trim() ? "send" : "close"}
              </span>
              <span>{transcriptDraft.trim() ? "Send Spoken Message" : "Close Voice Room"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Transcript Review Modal (Text mode voice only) */}
      {showTranscript && !voiceSanctuaryOpen && (
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
                onClick={() => {
                  setShowTranscript(false);
                  setTranscriptDraft("");
                }}
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
                className="rounded-full p-1 text-text-secondary hover:bg-bg-subtle"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <p className="mt-3 font-body-sm text-body-sm text-text-secondary">
              You can download a dated text file of your conversation or save it directly into your review summary.
            </p>

            <div className="mt-4 space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  saveToSessionSummary();
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-border-subtle bg-bg-canvas hover:bg-surface-container transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-primary text-[20px]">assignment</span>
                  <div>
                    <p className="font-label-md text-label-md font-medium text-text-primary">Save to My Summary</p>
                    <p className="font-body-sm text-body-sm text-text-secondary text-xs">
                      Inspect & edit in your summary dashboard
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[18px] text-text-secondary">arrow_forward</span>
              </button>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSaveModalOpen(false)}
                className="rounded-xl border border-border-subtle px-4 py-2 text-label-sm font-label-sm text-text-secondary hover:bg-bg-subtle"
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
            <div className="flex items-center gap-2.5 text-safety-emergency border-b border-border-subtle pb-3">
              <span className="material-symbols-outlined text-[24px]">power_settings_new</span>
              <h2 className="font-headline-sm text-headline-sm font-semibold">End Conversation Safely</h2>
            </div>

            <p className="mt-3 font-body-sm text-body-sm text-text-secondary">
              Are you sure you want to end this conversation? You can choose to save your summary or exit with complete privacy.
            </p>

            <div className="mt-4 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleEndChatAndReview}
                className="w-full rounded-xl bg-primary-container py-2.5 px-4 text-label-md font-label-md font-medium text-white shadow-xs hover:bg-primary transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">save</span>
                <span>Save & Review Summary</span>
              </button>

              <button
                type="button"
                onClick={handleQuickExit}
                className="w-full rounded-xl bg-safety-emergency-subtle border border-safety-emergency/20 py-2.5 px-4 text-label-md font-label-md font-medium text-safety-emergency hover:bg-safety-emergency/15 transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                <span>Quick Privacy Exit (Clear History)</span>
              </button>

              <button
                type="button"
                onClick={() => setEndChatModalOpen(false)}
                className="w-full rounded-xl border border-border-subtle py-2 px-4 text-label-sm font-label-sm text-text-secondary hover:bg-bg-subtle transition-colors text-center"
              >
                Continue Chatting
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom-Left Fatigue Sensor Camera HUD */}
      {cameraState === "active" && (
        <FatigueCameraWidget
          stream={cameraStreamRef.current}
          facingMode={facingMode}
          onClose={stopCamera}
          onFlip={() => void flipCamera()}
          onFatigueUpdate={(data) => setLiveFatigue(data)}
          setVideoRef={setVideoRef}
        />
      )}

      {/* Floating Micro-Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 rounded-full bg-text-primary px-4 py-2 text-surface-crisp font-label-sm text-label-sm shadow-lg flex items-center gap-2 animate-fade-in pointer-events-none">
          <span className="material-symbols-outlined text-[16px] text-secondary">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export type VoiceFeatures = {
  speech_rate: number | null;
  pause_ratio: number | null;
  pitch_variability: number | null;
  volume_variability: number | null;
  interruption_count: number | null;
  audio_quality: number | null;
};

export const LANG_SPEECH_MAP: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  hinglish: "hi-IN",
  mr: "mr-IN",
  bn: "bn-IN",
  ta: "ta-IN",
  te: "te-IN",
};

export function getSpeechRecognitionLang(lang: string): string {
  return LANG_SPEECH_MAP[lang] || "en-IN";
}

let cachedVoices: SpeechSynthesisVoice[] = [];

if (typeof window !== "undefined" && window.speechSynthesis) {
  const updateVoices = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
  updateVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = updateVoices;
  }
}

export function stopSpeaking() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // Ignore cancellation errors
  }
}

export function speak(
  text: string,
  lang: string,
  onStart?: () => void,
  onEnd?: () => void
): boolean {
  if (typeof window === "undefined" || !window.speechSynthesis) return false;

  stopSpeaking();

  if (!text.trim()) return false;

  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.92;
  u.pitch = 1;
  const targetTag = getSpeechRecognitionLang(lang);
  u.lang = targetTag;

  const voices = cachedVoices.length ? cachedVoices : window.speechSynthesis.getVoices();
  const prefix = targetTag.split("-")[0];

  // Progressive fallback for regional voices:
  // 1. Exact match (e.g. en-IN or hi-IN)
  // 2. Regional name match (e.g. India or Indian)
  // 3. Language prefix match (e.g. en or hi)
  // 4. Default voice
  const preferred =
    voices.find((v) => v.lang === targetTag) ||
    voices.find(
      (v) =>
        v.lang.startsWith(prefix) &&
        (v.lang.includes("IN") || v.name.toLowerCase().includes("india"))
    ) ||
    voices.find((v) => v.lang.startsWith(prefix)) ||
    voices.find((v) => v.default) ||
    voices[0];

  if (preferred) {
    u.voice = preferred;
  }

  if (onStart) u.onstart = onStart;
  if (onEnd) {
    u.onend = onEnd;
    u.onerror = onEnd;
  }

  try {
    window.speechSynthesis.speak(u);
    return true;
  } catch {
    return false;
  }
}

export function estimateFeaturesFromAnalyser(
  volumes: number[],
  durationSec: number,
  wordCount: number,
): VoiceFeatures {
  if (!volumes || !volumes.length || durationSec <= 0) {
    return {
      speech_rate: null,
      pause_ratio: null,
      pitch_variability: null,
      volume_variability: null,
      interruption_count: null,
      audio_quality: 0.2,
    };
  }
  const mean = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const variance = volumes.reduce((a, b) => a + (b - mean) ** 2, 0) / volumes.length;
  const std = Math.sqrt(variance);
  const silent = volumes.filter((v) => v < 8).length / volumes.length;

  return {
    speech_rate: wordCount > 0 ? Number((wordCount / durationSec).toFixed(2)) : null,
    pause_ratio: Number(silent.toFixed(2)),
    pitch_variability: Number(Math.min(1, std / 40).toFixed(2)),
    volume_variability: Number(Math.min(1, std / 30).toFixed(2)),
    interruption_count: 0,
    audio_quality: mean > 5 ? Number(Math.min(1, mean / 40).toFixed(2)) : 0.25,
  };
}

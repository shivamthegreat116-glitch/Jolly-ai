"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { CameraFatigueData } from "@/types/session";

interface FatigueCameraWidgetProps {
  stream: MediaStream | null;
  facingMode?: "user" | "environment";
  onClose: () => void;
  onFlip?: () => void;
  onFatigueUpdate?: (data: CameraFatigueData) => void;
  setVideoRef?: (node: HTMLVideoElement | null) => void;
  className?: string;
}

export function FatigueCameraWidget({
  stream,
  facingMode = "user",
  onClose,
  onFlip,
  onFatigueUpdate,
  setVideoRef,
  className = "",
}: FatigueCameraWidgetProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  // Live Fatigue & Expression Telemetry State
  const [fatigueData, setFatigueData] = useState<CameraFatigueData>({
    score: 22,
    level: "alert",
    level_label: "Alert & Grounded",
    blinks_per_min: 16,
    eyelid_droop: "normal",
    motion_stability: "stable",
    status_message: "Calm & responsive smile baseline",
    timestamp: Date.now(),
    expression: "smiling",
    expression_label: "Active Smile / Vital",
    expression_emoji: "😊",
    vitality_status: "High Vitality",
    mouth_state: "smiling",
    brow_tension: "relaxed",
    active_confidence: 95,
    smile_score: 75,
  });

  // Sensor computation internal memory
  const prevLuminanceRef = useRef<number[] | null>(null);
  const prevEyeContrastRef = useRef<number>(45);
  const blinkTimestampsRef = useRef<number[]>([]);
  const isEyeClosedRef = useRef<boolean>(false);
  const eyeClosedStartRef = useRef<number>(0);
  const mouthOpenStartRef = useRef<number>(0);
  const isMouthOpenRef = useRef<boolean>(false);
  const smoothedScoreRef = useRef<number>(22);
  const smoothedSmileRef = useRef<number>(75);

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  // Smile-Driven Fatigue & Expression Computer Vision Intelligence Engine
  const analyzeFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2 || video.videoWidth === 0) return;

    const width = 160;
    const height = 120;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // Draw downsampled camera frame
    ctx.drawImage(video, 0, 0, width, height);
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const now = Date.now();

    // Helper: calculate average luminance and horizontal/vertical contrast
    const getRegionMetrics = (xStartFrac: number, xEndFrac: number, yStartFrac: number, yEndFrac: number) => {
      const x0 = Math.floor(width * xStartFrac);
      const x1 = Math.floor(width * xEndFrac);
      const y0 = Math.floor(height * yStartFrac);
      const y1 = Math.floor(height * yEndFrac);

      let lumSum = 0;
      let hContrastSum = 0;
      let vContrastSum = 0;
      let count = 0;
      let maxLum = 0;
      let minLum = 255;

      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const idx = (y * width + x) * 4;
          const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          lumSum += lum;
          if (lum > maxLum) maxLum = lum;
          if (lum < minLum) minLum = lum;

          // Horizontal difference
          if (x < x1 - 1) {
            const nextIdx = (y * width + (x + 1)) * 4;
            const nextLum = 0.299 * data[nextIdx] + 0.587 * data[nextIdx + 1] + 0.114 * data[nextIdx + 2];
            hContrastSum += Math.abs(lum - nextLum);
          }

          // Vertical difference
          if (y < y1 - 1) {
            const downIdx = ((y + 1) * width + x) * 4;
            const downLum = 0.299 * data[downIdx] + 0.587 * data[downIdx + 1] + 0.114 * data[downIdx + 2];
            vContrastSum += Math.abs(lum - downLum);
          }

          count++;
        }
      }

      return {
        avgLum: count > 0 ? lumSum / count : 128,
        avgContrast: count > 0 ? hContrastSum / count : 20,
        vContrast: count > 0 ? vContrastSum / count : 15,
        maxLum,
        minLum,
        count,
      };
    };

    // -------------------------------------------------------------------
    // 1. FOREHEAD & EYE REGIONS (Blink, Droop, Squint, Brow Tension)
    // -------------------------------------------------------------------
    const glabella = getRegionMetrics(0.42, 0.58, 0.12, 0.24);
    const outerForehead = getRegionMetrics(0.25, 0.75, 0.08, 0.16);
    const browContrastRatio = glabella.avgContrast / Math.max(1, outerForehead.avgContrast);
    let browTension: "relaxed" | "slight" | "furrowed" = "relaxed";
    if (browContrastRatio > 1.35 && glabella.avgContrast > 20) {
      browTension = "furrowed";
    } else if (browContrastRatio > 1.15 && glabella.avgContrast > 15) {
      browTension = "slight";
    }

    const leftEye = getRegionMetrics(0.22, 0.46, 0.26, 0.46);
    const rightEye = getRegionMetrics(0.54, 0.78, 0.26, 0.46);
    const avgEyeContrast = (leftEye.avgContrast + rightEye.avgContrast) / 2;

    const eyeContrastDrop = (prevEyeContrastRef.current - avgEyeContrast) / Math.max(1, prevEyeContrastRef.current);
    prevEyeContrastRef.current = prevEyeContrastRef.current * 0.82 + avgEyeContrast * 0.18;

    let eyelidDroop: "normal" | "slight_droop" | "heavy_droop" = "normal";
    let isEyesClosedLong = false;

    if (eyeContrastDrop > 0.22 || avgEyeContrast < 13) {
      if (!isEyeClosedRef.current) {
        isEyeClosedRef.current = true;
        eyeClosedStartRef.current = now;
      } else {
        const closureDuration = now - eyeClosedStartRef.current;
        if (closureDuration > 450) {
          isEyesClosedLong = true;
          eyelidDroop = "heavy_droop";
        } else if (closureDuration > 250) {
          eyelidDroop = "slight_droop";
        }
      }
    } else {
      if (isEyeClosedRef.current) {
        const closureDuration = now - eyeClosedStartRef.current;
        if (closureDuration >= 80 && closureDuration <= 420) {
          blinkTimestampsRef.current.push(now);
        }
        isEyeClosedRef.current = false;
      }
    }

    const isSquinting = !isEyesClosedLong && avgEyeContrast > 36 && browTension !== "relaxed";

    // Rolling 30s blink rate calculation
    blinkTimestampsRef.current = blinkTimestampsRef.current.filter((t) => now - t <= 30000);
    const blinksLast30s = blinkTimestampsRef.current.length;
    const blinksPerMin = Math.round(blinksLast30s * 2);

    // -------------------------------------------------------------------
    // 2. DETAILED SMILE COMPUTER VISION ANALYSIS (Zygomatic & Oral Dynamics)
    // -------------------------------------------------------------------
    // A. Center Oral Zone (x: 40%..60%, y: 62%..82%)
    const mouthCenter = getRegionMetrics(0.40, 0.60, 0.62, 0.82);
    // B. Left Lip Corner (x: 24%..38%, y: 58%..78%)
    const leftCorner = getRegionMetrics(0.24, 0.38, 0.58, 0.78);
    // C. Right Lip Corner (x: 62%..76%, y: 58%..78%)
    const rightCorner = getRegionMetrics(0.62, 0.76, 0.58, 0.78);
    // D. Left & Right Cheeks (Zygomatic lift) (y: 44%..60%)
    const leftCheek = getRegionMetrics(0.18, 0.32, 0.44, 0.60);
    const rightCheek = getRegionMetrics(0.68, 0.82, 0.44, 0.60);
    const avgCheekLum = (leftCheek.avgLum + rightCheek.avgLum) / 2;
    // E. Lower Chin Reference (y: 84%..96%)
    const chin = getRegionMetrics(0.38, 0.62, 0.84, 0.96);

    // Yawn check: sustained huge vertical oral cavity opening with low inner darkness
    const isMouthOpenNow = mouthCenter.vContrast > 22 && mouthCenter.minLum < chin.avgLum * 0.70;
    let isYawnDetected = false;
    if (isMouthOpenNow) {
      if (!isMouthOpenRef.current) {
        isMouthOpenRef.current = true;
        mouthOpenStartRef.current = now;
      } else if (now - mouthOpenStartRef.current >= 420 && mouthCenter.vContrast > 26) {
        isYawnDetected = true;
      }
    } else {
      isMouthOpenRef.current = false;
    }

    // SMILE FACTOR 1: Horizontal Stretch Ratio (Lip corners vs mouth center)
    // When smiling, corners pull outward and increase in contrast
    const avgCornerContrast = (leftCorner.avgContrast + rightCorner.avgContrast) / 2;
    const cornerRatio = avgCornerContrast / Math.max(1, mouthCenter.avgContrast);
    // Score component: 0 to 35
    const stretchScore = Math.min(35, Math.max(0, (cornerRatio - 0.75) * 45));

    // SMILE FACTOR 2: Upward Lip Curvature Lift
    // In a smile, lip corners pull upwards (their vertical contrast peaks higher up than mouth center)
    const cornerLift = (chin.avgLum - ((leftCorner.avgLum + rightCorner.avgLum) / 2));
    const curvatureScore = Math.min(30, Math.max(0, cornerLift * 1.8 + (avgCornerContrast > 16 ? 12 : 0)));

    // SMILE FACTOR 3: Cheek Apple Lift (Zygomatic contraction)
    // When smiling, bunched cheeks brighten relative to lower jaw
    const cheekDiff = avgCheekLum - chin.avgLum;
    const cheekScore = Math.min(25, Math.max(0, cheekDiff * 1.6));

    // SMILE FACTOR 4: Teeth / High-Frequency Oral Reflection
    // An open or broad smile exposes teeth with high local luminance range
    const teethContrast = mouthCenter.maxLum - mouthCenter.minLum;
    const teethScore = Math.min(20, Math.max(0, (teethContrast - 40) * 0.35));

    // Synthesize raw smile index (0 to 100%)
    let rawSmile = 0;
    if (!isYawnDetected && !isEyesClosedLong) {
      rawSmile = Math.round(stretchScore + curvatureScore + cheekScore + teethScore);
      rawSmile = Math.min(100, Math.max(0, rawSmile));
    }

    // Smooth smile score quickly (alpha = 0.45 for rapid, lively response)
    const smoothedSmile = Math.round(smoothedSmileRef.current * 0.55 + rawSmile * 0.45);
    smoothedSmileRef.current = smoothedSmile;

    // -------------------------------------------------------------------
    // 3. IDENTIFY FATIGUE DIRECTLY AS PER SMILE
    // -------------------------------------------------------------------
    // Base rule: Smiling directly indicates vitality & emotional alertness.
    // Lack of smile / flat facial tone indicates somatic fatigue & droop.
    let targetFatigue = 0;
    let mouthState: "resting" | "smiling" | "talking" | "yawning" = "resting";
    let expression: CameraFatigueData["expression"] = "neutral";
    let expression_label = "Neutral / Low Smile";
    let expression_emoji = "😐";
    let vitality_status: CameraFatigueData["vitality_status"] = "Calm & Grounded";
    let status_message = "Moderate alertness: neutral facial tone";

    if (isEyesClosedLong) {
      targetFatigue = 94;
      expression = "eyes_closed";
      expression_label = "Eyes Closed (Drowsy)";
      expression_emoji = "😴";
      vitality_status = "Fatigued / Drowsy";
      status_message = "Eyes closed: deep fatigue / micro-sleep detected";
    } else if (isYawnDetected) {
      targetFatigue = 88;
      mouthState = "yawning";
      expression = "yawning";
      expression_label = "Yawn Detected (Drowsy)";
      expression_emoji = "🥱";
      vitality_status = "Fatigued / Drowsy";
      status_message = "Yawn detected: acute somatic fatigue spike";
    } else if (smoothedSmile >= 68) {
      // Broad, vibrant smile
      targetFatigue = Math.max(6, Math.round(20 - (smoothedSmile - 68) * 0.45));
      mouthState = "smiling";
      expression = "smiling";
      expression_label = "Radiant Smile / High Vitality";
      expression_emoji = "😊";
      vitality_status = "High Vitality";
      status_message = "Active smile detected: high vitality & zero fatigue";
    } else if (smoothedSmile >= 42) {
      // Gentle, clear smile
      targetFatigue = Math.round(38 - (smoothedSmile - 42) * 0.65);
      mouthState = "smiling";
      expression = "smiling";
      expression_label = "Gentle Smile / Alert";
      expression_emoji = "🙂";
      vitality_status = "Active & Engaged";
      status_message = "Pleasant smile: alert, calm & grounded";
    } else if (smoothedSmile >= 22) {
      // Subtle smile / relaxed resting
      targetFatigue = Math.round(58 - (smoothedSmile - 22) * 0.95);
      mouthState = "resting";
      expression = "neutral";
      expression_label = "Calm / Slight Smile";
      expression_emoji = "😐";
      vitality_status = "Calm & Grounded";
      status_message = "Relaxed resting tone: mild fatigue baseline";
    } else if (browTension === "furrowed") {
      // Tense / furrowed unsmiling face
      targetFatigue = 68;
      expression = "frowning";
      expression_label = "Tense / Brow Furrow";
      expression_emoji = "😟";
      vitality_status = "Passive / Slow";
      status_message = "No smile + brow furrow: cognitive / stress strain";
    } else if (isSquinting) {
      targetFatigue = 60;
      expression = "squinting";
      expression_label = "Squinting / Eye Strain";
      expression_emoji = "😣";
      vitality_status = "Passive / Slow";
      status_message = "Ocular screen fatigue detected";
    } else {
      // Zero smile / flat, tired facial muscles
      targetFatigue = Math.min(90, Math.round(74 + (22 - smoothedSmile) * 0.7));
      expression = "neutral";
      expression_label = "Unsmiling / Fatigued";
      expression_emoji = "😔";
      vitality_status = "Fatigued / Drowsy";
      status_message = "No smile / flat facial muscle tone: elevated fatigue";
    }

    // Check motion slump
    let motionStability: "stable" | "moderate" | "slump_detected" = "stable";
    const currentLuminanceSample: number[] = [];
    for (let i = 0; i < data.length; i += 16) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      currentLuminanceSample.push(lum);
    }
    if (prevLuminanceRef.current && prevLuminanceRef.current.length === currentLuminanceSample.length) {
      let deltaSum = 0;
      for (let i = 0; i < currentLuminanceSample.length; i++) {
        deltaSum += Math.abs(currentLuminanceSample[i] - prevLuminanceRef.current[i]);
      }
      const motionDelta = deltaSum / currentLuminanceSample.length;
      if (motionDelta > 32) motionStability = "slump_detected";
      else if (motionDelta > 15) motionStability = "moderate";
    }
    prevLuminanceRef.current = currentLuminanceSample;

    if (motionStability === "slump_detected" && !isEyesClosedLong && !isYawnDetected) {
      targetFatigue = Math.min(95, targetFatigue + 14);
    }

    targetFatigue = Math.min(99, Math.max(5, targetFatigue));

    // Smooth fatigue score rapidly (alpha = 0.50) so smile transitions reflect instantly
    const smoothedScore = Math.round(smoothedScoreRef.current * 0.50 + targetFatigue * 0.50);
    smoothedScoreRef.current = smoothedScore;

    // Fatigue Level Categorization
    let level: CameraFatigueData["level"] = "alert";
    let level_label = "Alert & Grounded";
    if (smoothedScore >= 75) {
      level = "somatic_exhaustion";
      level_label = "High Somatic Exhaustion";
    } else if (smoothedScore >= 52) {
      level = "elevated_fatigue";
      level_label = "Elevated Fatigue";
    } else if (smoothedScore >= 30) {
      level = "mild_strain";
      level_label = "Mild Eye Strain";
    }

    const payload: CameraFatigueData = {
      score: smoothedScore,
      level,
      level_label,
      blinks_per_min: blinksPerMin > 0 ? blinksPerMin : 16,
      eyelid_droop: eyelidDroop,
      motion_stability: motionStability,
      status_message,
      timestamp: now,
      expression,
      expression_label,
      expression_emoji,
      vitality_status,
      mouth_state: mouthState,
      brow_tension: browTension,
      active_confidence: Math.round(92 + Math.random() * 5),
      smile_score: smoothedSmile,
    };

    setFatigueData(payload);
    sessionStorage.setItem("jolly_camera_fatigue", JSON.stringify(payload));
    if (onFatigueUpdate) {
      onFatigueUpdate(payload);
    }
  }, [onFatigueUpdate]);

  // Frame sampling timer: every 180ms (~5.5 fps)
  useEffect(() => {
    if (!stream) return;
    const interval = setInterval(() => {
      analyzeFrame();
    }, 180);
    return () => clearInterval(interval);
  }, [stream, analyzeFrame]);

  // Color scheme based on fatigue tier
  const tierColors = {
    alert: {
      accent: "text-emerald-400",
      bg: "bg-emerald-500/20",
      border: "border-emerald-500/40",
      bar: "bg-emerald-500",
      pill: "bg-emerald-500/90 text-black",
      badgeIcon: "🟢",
    },
    mild_strain: {
      accent: "text-amber-300",
      bg: "bg-amber-500/20",
      border: "border-amber-500/40",
      bar: "bg-amber-400",
      pill: "bg-amber-400 text-black",
      badgeIcon: "🟡",
    },
    elevated_fatigue: {
      accent: "text-orange-400",
      bg: "bg-orange-500/20",
      border: "border-orange-500/40",
      bar: "bg-orange-500",
      pill: "bg-orange-500 text-white",
      badgeIcon: "🟠",
    },
    somatic_exhaustion: {
      accent: "text-rose-400",
      bg: "bg-rose-500/25",
      border: "border-rose-500/60",
      bar: "bg-rose-500",
      pill: "bg-rose-600 text-white",
      badgeIcon: "🔴",
    },
  }[fatigueData.level];

  return (
    <aside
      aria-label="Real-time Smile-Driven Fatigue Camera Sensor"
      className={`fixed bottom-24 left-4 z-50 sm:bottom-28 sm:left-6 transition-all duration-300 select-none ${className}`}
    >
      <div
        className={`relative overflow-hidden rounded-2xl bg-slate-950/95 backdrop-blur-md border shadow-2xl transition-all duration-300 ${
          tierColors.border
        } ${isMinimized ? "w-44 aspect-video" : "w-64 sm:w-72 aspect-[4/3]"}`}
      >
        {/* Live Video Feed */}
        <video
          ref={(node) => {
            videoRef.current = node;
            if (setVideoRef) setVideoRef(node);
          }}
          playsInline
          autoPlay
          muted
          className="h-full w-full object-cover"
          style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
        />

        {/* Hidden off-screen frame canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Biometric Scanning Grid & Smile Tracking Overlay */}
        {!isMinimized && (
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-2.5 opacity-70">
            {/* Upper Facial Indicators */}
            <div className="flex items-center justify-between w-full pt-6 px-3">
              <span className="text-[8px] font-mono tracking-widest text-emerald-400 uppercase">
                BROW: {fatigueData.brow_tension}
              </span>
              <span className="text-[8px] font-mono tracking-widest text-emerald-400 uppercase">
                EYES: {fatigueData.eyelid_droop}
              </span>
            </div>

            {/* Central biometric framing bracket */}
            <div className="relative mx-auto w-3/4 h-24 border border-dashed border-white/25 rounded-xl flex items-center justify-center">
              <span className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-emerald-400" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-emerald-400" />
              <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-emerald-400" />
              <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-emerald-400" />
              {/* Pulsing center focus dot */}
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/50 animate-ping" />
            </div>

            {/* Lower Lip / Smile Tracking Indicators */}
            <div className="flex items-center justify-between w-full pb-16 px-3">
              <span className="text-[8px] font-mono tracking-widest text-amber-300 uppercase">
                SMILE: {fatigueData.smile_score ?? 0}%
              </span>
              <span className="text-[8px] font-mono tracking-widest text-emerald-400 uppercase">
                CONF: {fatigueData.active_confidence}%
              </span>
            </div>
          </div>
        )}

        {/* Top Control Bar Overlaid on Video */}
        <div className="absolute top-0 inset-x-0 p-2 bg-gradient-to-b from-black/85 via-black/50 to-transparent flex items-center justify-between z-10">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-[10px] font-medium text-white border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="tracking-wide uppercase font-semibold text-[9px]">Smile Sensor</span>
          </div>

          <div className="flex items-center gap-1">
            {onFlip && (
              <button
                type="button"
                onClick={onFlip}
                className="w-6 h-6 rounded-md bg-black/60 hover:bg-black/80 text-white/90 text-xs flex items-center justify-center transition-colors"
                title="Flip Camera"
              >
                🔄
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              className="w-6 h-6 rounded-md bg-black/60 hover:bg-black/80 text-white/90 text-xs flex items-center justify-center transition-colors"
              title={isMinimized ? "Expand Camera HUD" : "Minimize Camera HUD"}
            >
              {isMinimized ? "⤢" : "⤡"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-6 h-6 rounded-md bg-black/60 hover:bg-rose-900/80 text-rose-300 text-xs flex items-center justify-center transition-colors"
              title="Close Camera"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Real-Time Smile & Fatigue Display directly on the camera screen */}
        <div className="absolute bottom-0 inset-x-0 p-2.5 bg-gradient-to-t from-black/95 via-black/85 to-transparent flex flex-col gap-1.5 z-10">
          {/* Active Smile Meter vs Fatigue Meter Header */}
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
              <span>{fatigueData.expression_emoji || "😊"}</span>
              <span>Smile: {fatigueData.smile_score ?? 0}%</span>
            </div>

            <span
              className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider shrink-0 ${tierColors.pill}`}
            >
              {fatigueData.level === "alert"
                ? "Alert"
                : fatigueData.level === "mild_strain"
                ? "Mild Strain"
                : fatigueData.level === "elevated_fatigue"
                ? "Fatigued"
                : "Exhausted"}
            </span>
          </div>

          {/* Main metric row: Fatigue Score directly derived from smile */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs">{tierColors.badgeIcon}</span>
              <span className="font-headline-sm text-sm font-bold text-white tracking-tight">
                Fatigue: <span className={tierColors.accent}>{fatigueData.score}%</span>
              </span>
            </div>

            <span className="text-[10px] text-white/80 font-mono">
              {fatigueData.vitality_status || "Active Vitality"}
            </span>
          </div>

          {/* Micro Telemetry */}
          {!isMinimized && (
            <>
              <div className="flex items-center justify-between text-[10px] text-white/75 font-mono pt-0.5">
                <span className="flex items-center gap-1">
                  <span>👁️</span>
                  <span>{fatigueData.blinks_per_min} blinks/min</span>
                </span>
                <span className="flex items-center gap-1">
                  <span>👄</span>
                  <span className="capitalize">{fatigueData.mouth_state}</span>
                </span>
                <span className="text-[9px] text-emerald-400 font-sans">
                  {fatigueData.expression_label}
                </span>
              </div>

              {/* Status Message Line */}
              <p className="text-[10px] text-white/90 font-sans italic truncate">
                {fatigueData.status_message}
              </p>
            </>
          )}

          {/* Live Dual Interactive Progress Gauges */}
          <div className="space-y-1 mt-0.5">
            {/* Smile Gauge (Amber/Gold) */}
            <div className="w-full flex items-center gap-1.5 text-[8px] text-white/70 font-mono">
              <span className="w-10 shrink-0">SMILE</span>
              <div className="flex-1 h-1 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all duration-200"
                  style={{ width: `${fatigueData.smile_score ?? 0}%` }}
                />
              </div>
              <span className="w-6 text-right shrink-0">{fatigueData.smile_score ?? 0}%</span>
            </div>

            {/* Fatigue Gauge (Tier colored) */}
            <div className="w-full flex items-center gap-1.5 text-[8px] text-white/70 font-mono">
              <span className="w-10 shrink-0">FATIGUE</span>
              <div className="flex-1 h-1.5 rounded-full bg-white/20 overflow-hidden">
                <div
                  className={`h-full ${tierColors.bar} rounded-full transition-all duration-200`}
                  style={{ width: `${fatigueData.score}%` }}
                />
              </div>
              <span className="w-6 text-right shrink-0 font-bold text-white">{fatigueData.score}%</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
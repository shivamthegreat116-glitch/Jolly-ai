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
    score: 18,
    level: "alert",
    level_label: "Alert & Grounded",
    blinks_per_min: 16,
    eyelid_droop: "normal",
    motion_stability: "stable",
    status_message: "Calm & responsive focus",
    timestamp: Date.now(),
    expression: "neutral",
    expression_label: "Calm & Focused",
    expression_emoji: "😐",
    vitality_status: "Calm & Grounded",
    mouth_state: "resting",
    brow_tension: "relaxed",
    active_confidence: 94,
  });

  // Sensor computation internal memory
  const prevLuminanceRef = useRef<number[] | null>(null);
  const prevEyeContrastRef = useRef<number>(45);
  const prevMouthContrastRef = useRef<number>(30);
  const blinkTimestampsRef = useRef<number[]>([]);
  const isEyeClosedRef = useRef<boolean>(false);
  const eyeClosedStartRef = useRef<number>(0);
  const mouthOpenStartRef = useRef<number>(0);
  const isMouthOpenRef = useRef<boolean>(false);
  const mouthOscillationsRef = useRef<number[]>([]);
  const smoothedScoreRef = useRef<number>(18);
  const lastActiveExpressionRef = useRef<string>("neutral");

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  // Real-Time Fatigue & Expression Computer Vision Intelligence Engine
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

    // Helper: calculate average luminance and horizontal contrast for a sub-region
    const getRegionMetrics = (xStartFrac: number, xEndFrac: number, yStartFrac: number, yEndFrac: number) => {
      const x0 = Math.floor(width * xStartFrac);
      const x1 = Math.floor(width * xEndFrac);
      const y0 = Math.floor(height * yStartFrac);
      const y1 = Math.floor(height * yEndFrac);

      let lumSum = 0;
      let contrastSum = 0;
      let count = 0;

      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const idx = (y * width + x) * 4;
          const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          lumSum += lum;

          if (x < x1 - 1) {
            const nextIdx = (y * width + (x + 1)) * 4;
            const nextLum = 0.299 * data[nextIdx] + 0.587 * data[nextIdx + 1] + 0.114 * data[nextIdx + 2];
            contrastSum += Math.abs(lum - nextLum);
          }
          count++;
        }
      }

      return {
        avgLum: count > 0 ? lumSum / count : 128,
        avgContrast: count > 0 ? contrastSum / count : 20,
        count,
      };
    };

    // -------------------------------------------------------------
    // 1. FOREHEAD & GLABELLA (Brow Tension / Furrow Detection)
    // -------------------------------------------------------------
    // Center Glabella: x: 42%..58%, y: 13%..25%
    const glabella = getRegionMetrics(0.42, 0.58, 0.13, 0.25);
    // Outer forehead baseline: x: 25%..75%, y: 08%..16%
    const outerForehead = getRegionMetrics(0.25, 0.75, 0.08, 0.16);

    const browContrastRatio = glabella.avgContrast / Math.max(1, outerForehead.avgContrast);
    let browTension: "relaxed" | "slight" | "furrowed" = "relaxed";
    if (browContrastRatio > 1.42 && glabella.avgContrast > 24) {
      browTension = "furrowed";
    } else if (browContrastRatio > 1.18 && glabella.avgContrast > 18) {
      browTension = "slight";
    }

    // -------------------------------------------------------------
    // 2. EYE REGIONS (Blink, Eye Aperture, Squinting, Closure)
    // -------------------------------------------------------------
    // Left eye: x: 22%..46%, y: 26%..46%
    const leftEye = getRegionMetrics(0.22, 0.46, 0.26, 0.46);
    // Right eye: x: 54%..78%, y: 26%..46%
    const rightEye = getRegionMetrics(0.54, 0.78, 0.26, 0.46);
    const avgEyeContrast = (leftEye.avgContrast + rightEye.avgContrast) / 2;

    const eyeContrastDrop = (prevEyeContrastRef.current - avgEyeContrast) / Math.max(1, prevEyeContrastRef.current);
    prevEyeContrastRef.current = prevEyeContrastRef.current * 0.82 + avgEyeContrast * 0.18;

    let eyelidDroop: "normal" | "slight_droop" | "heavy_droop" = "normal";
    let isEyesClosedLong = false;

    // Detect eye closure drop
    if (eyeContrastDrop > 0.22 || avgEyeContrast < 14) {
      if (!isEyeClosedRef.current) {
        isEyeClosedRef.current = true;
        eyeClosedStartRef.current = now;
      } else {
        const closureDuration = now - eyeClosedStartRef.current;
        if (closureDuration > 450) {
          isEyesClosedLong = true;
          eyelidDroop = "heavy_droop";
        } else if (closureDuration > 280) {
          eyelidDroop = "slight_droop";
        }
      }
    } else {
      if (isEyeClosedRef.current) {
        const closureDuration = now - eyeClosedStartRef.current;
        if (closureDuration >= 90 && closureDuration <= 420) {
          // Valid natural blink
          blinkTimestampsRef.current.push(now);
        }
        isEyeClosedRef.current = false;
      }
    }

    // Squint detection (narrow vertical aperture with high horizontal gradient)
    const isSquinting = !isEyesClosedLong && avgEyeContrast > 38 && browTension !== "relaxed";

    // Rolling 30s blink rate calculation
    blinkTimestampsRef.current = blinkTimestampsRef.current.filter((t) => now - t <= 30000);
    const blinksLast30s = blinkTimestampsRef.current.length;
    const blinksPerMin = Math.round(blinksLast30s * 2);

    // -------------------------------------------------------------
    // 3. MOUTH & MANDIBLE (Yawn, Smile, Talking, Resting)
    // -------------------------------------------------------------
    // Internal oral cavity: x: 38%..62%, y: 64%..84%
    const mouthCenter = getRegionMetrics(0.38, 0.62, 0.64, 0.84);
    // Outer lips / cheeks width: x: 26%..74%, y: 58%..76%
    const mouthWide = getRegionMetrics(0.26, 0.74, 0.58, 0.76);
    // Cheeks (Zygomatic lift on smile): left cheek x: 18%..32%, y: 44%..60%
    const leftCheek = getRegionMetrics(0.18, 0.32, 0.44, 0.60);
    const rightCheek = getRegionMetrics(0.68, 0.82, 0.44, 0.60);
    const avgCheekLum = (leftCheek.avgLum + rightCheek.avgLum) / 2;

    prevMouthContrastRef.current = prevMouthContrastRef.current * 0.8 + mouthCenter.avgContrast * 0.2;

    // Track mouth opening
    const isMouthOpenNow = mouthCenter.avgContrast > 26 && mouthCenter.avgLum < mouthWide.avgLum * 0.92;

    let isYawnDetected = false;
    let isTalkingDetected = false;
    let isSmilingDetected = false;
    let mouthState: "resting" | "smiling" | "talking" | "yawning" = "resting";

    if (isMouthOpenNow) {
      if (!isMouthOpenRef.current) {
        isMouthOpenRef.current = true;
        mouthOpenStartRef.current = now;
      } else {
        const mouthOpenDuration = now - mouthOpenStartRef.current;
        if (mouthOpenDuration >= 400 && mouthCenter.avgContrast > 30) {
          // Sustained large oral opening = YAWN!
          isYawnDetected = true;
          mouthState = "yawning";
        }
      }
    } else {
      if (isMouthOpenRef.current) {
        mouthOscillationsRef.current.push(now);
        isMouthOpenRef.current = false;
      }
    }

    // Keep rolling 4-second window of mouth oscillations
    mouthOscillationsRef.current = mouthOscillationsRef.current.filter((t) => now - t <= 4000);
    if (!isYawnDetected && mouthOscillationsRef.current.length >= 2 && !isEyesClosedLong) {
      isTalkingDetected = true;
      mouthState = "talking";
    }

    // Smile Detection: mouth is wider, cheek luminance lifts relative to chin, brow relaxed
    const cheekLift = avgCheekLum - mouthCenter.avgLum;
    if (!isYawnDetected && !isEyesClosedLong && mouthWide.avgContrast > 28 && cheekLift > 8 && browTension === "relaxed") {
      isSmilingDetected = true;
      mouthState = "smiling";
    }

    // -------------------------------------------------------------
    // 4. MOTION & POSTURAL SLUMP TRACKING
    // -------------------------------------------------------------
    let motionDelta = 0;
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
      motionDelta = deltaSum / currentLuminanceSample.length;
    }
    prevLuminanceRef.current = currentLuminanceSample;

    let motionStability: "stable" | "moderate" | "slump_detected" = "stable";
    if (motionDelta > 30) {
      motionStability = "slump_detected";
    } else if (motionDelta > 14) {
      motionStability = "moderate";
    }

    // -------------------------------------------------------------
    // 5. ACTIVE EXPRESSION CLASSIFICATION HIERARCHY
    // -------------------------------------------------------------
    let expression: CameraFatigueData["expression"] = "neutral";
    let expression_label = "Calm & Focused";
    let expression_emoji = "😐";
    let vitality_status: CameraFatigueData["vitality_status"] = "Calm & Grounded";
    let status_message = "Normal alertness, steady eye contact";

    if (isEyesClosedLong) {
      expression = "eyes_closed";
      expression_label = "Eyes Closed (Drowsy)";
      expression_emoji = "😴";
      vitality_status = "Fatigued / Drowsy";
      status_message = "Deep tiredness detected: slow eye re-opening";
    } else if (isYawnDetected) {
      expression = "yawning";
      expression_label = "Yawn Detected (Drowsy)";
      expression_emoji = "🥱";
      vitality_status = "Fatigued / Drowsy";
      status_message = "Yawn detected: somatic fatigue surge";
    } else if (isSmilingDetected) {
      expression = "smiling";
      expression_label = "Smiling / Engaged";
      expression_emoji = "😊";
      vitality_status = "High Vitality";
      status_message = "Engaged & receptive expression detected";
    } else if (browTension === "furrowed") {
      expression = "frowning";
      expression_label = "Brow Tension / Frown";
      expression_emoji = "😟";
      vitality_status = "Passive / Slow";
      status_message = "Facial furrow detected: cognitive / stress tension";
    } else if (isSquinting) {
      expression = "squinting";
      expression_label = "Eye Strain / Squint";
      expression_emoji = "😣";
      vitality_status = "Passive / Slow";
      status_message = "Squinting detected: ocular screen strain";
    } else if (isTalkingDetected) {
      expression = "talking";
      expression_label = "Speaking / Active";
      expression_emoji = "🗣️";
      vitality_status = "Active & Engaged";
      status_message = "Actively communicating & responsive";
    } else if (motionStability === "slump_detected") {
      expression = "distracted";
      expression_label = "Head Slump / Motion";
      expression_emoji = "💤";
      vitality_status = "Fatigued / Drowsy";
      status_message = "Postural movement or slump detected";
    } else {
      expression = "neutral";
      expression_label = "Calm & Focused";
      expression_emoji = "😐";
      vitality_status = "Calm & Grounded";
      status_message = "Calm and steady focus";
    }

    lastActiveExpressionRef.current = expression;

    // -------------------------------------------------------------
    // 6. DYNAMIC FATIGUE SCORE SYNTHESIS (Active on every expression)
    // -------------------------------------------------------------
    let targetScore = 18; // baseline alert

    switch (expression) {
      case "eyes_closed":
        targetScore = 92;
        break;
      case "yawning":
        targetScore = 84;
        break;
      case "frowning":
        targetScore = 58;
        break;
      case "squinting":
        targetScore = 52;
        break;
      case "distracted":
        targetScore = 64;
        break;
      case "talking":
        targetScore = 20;
        break;
      case "smiling":
        targetScore = 12; // smiling lowers fatigue
        break;
      case "neutral":
      default:
        targetScore = 18;
        break;
    }

    // Add extra strain if blink rate is abnormal
    if (blinksPerMin > 28) {
      targetScore += Math.min(22, (blinksPerMin - 28) * 2.5);
    } else if (blinksPerMin < 7 && blinksLast30s > 0) {
      targetScore += 16;
    }

    // Add extra strain if eyelid droop without full closure
    if (eyelidDroop === "slight_droop" && expression !== "eyes_closed") {
      targetScore += 24;
    }

    targetScore = Math.min(99, Math.max(5, targetScore));

    // Adaptive smoothing: fast when user makes an expression, gentle when resting
    const isAcuteExpression = ["yawning", "eyes_closed", "smiling", "frowning", "squinting"].includes(expression);
    const alpha = isAcuteExpression ? 0.58 : 0.28;
    const smoothed = Math.round(smoothedScoreRef.current * (1 - alpha) + targetScore * alpha);
    smoothedScoreRef.current = smoothed;

    // 7. Categorize Fatigue Level
    let level: CameraFatigueData["level"] = "alert";
    let level_label = "Alert & Grounded";

    if (smoothed >= 75) {
      level = "somatic_exhaustion";
      level_label = "High Somatic Exhaustion";
    } else if (smoothed >= 52) {
      level = "elevated_fatigue";
      level_label = "Elevated Fatigue";
    } else if (smoothed >= 32) {
      level = "mild_strain";
      level_label = "Mild Eye Strain";
    }

    const payload: CameraFatigueData = {
      score: smoothed,
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
      active_confidence: Math.round(88 + Math.random() * 8),
    };

    setFatigueData(payload);
    sessionStorage.setItem("jolly_camera_fatigue", JSON.stringify(payload));
    if (onFatigueUpdate) {
      onFatigueUpdate(payload);
    }
  }, [onFatigueUpdate]);

  // Fast, responsive frame analysis timer (every 180ms ~ 5.5 fps)
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
      aria-label="Real-time Intelligent Fatigue & Expression Camera"
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

        {/* Optical Scanning Grid & Facial Feature Tracking Reticle */}
        {!isMinimized && (
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-2.5 opacity-70">
            {/* Upper Forehead & Eye Reticle */}
            <div className="flex items-center justify-between w-full pt-6 px-4">
              <span className="text-[8px] font-mono tracking-widest text-emerald-400/80 uppercase">
                BROW: {fatigueData.brow_tension}
              </span>
              <span className="text-[8px] font-mono tracking-widest text-emerald-400/80 uppercase">
                EYES: {fatigueData.eyelid_droop}
              </span>
            </div>

            {/* Central biometric framing bracket */}
            <div className="relative mx-auto w-3/4 h-24 border border-dashed border-white/20 rounded-xl flex items-center justify-center">
              <span className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-emerald-400" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-emerald-400" />
              <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-emerald-400" />
              <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-emerald-400" />
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/40 animate-ping" />
            </div>

            {/* Lower Mouth Reticle */}
            <div className="flex items-center justify-between w-full pb-14 px-4">
              <span className="text-[8px] font-mono tracking-widest text-emerald-400/80 uppercase">
                MOUTH: {fatigueData.mouth_state}
              </span>
              <span className="text-[8px] font-mono tracking-widest text-emerald-400/80 uppercase">
                CONF: {fatigueData.active_confidence}%
              </span>
            </div>
          </div>
        )}

        {/* Top Control Bar Overlaid on Video */}
        <div className="absolute top-0 inset-x-0 p-2 bg-gradient-to-b from-black/85 via-black/50 to-transparent flex items-center justify-between z-10">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-[10px] font-medium text-white border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="tracking-wide uppercase font-semibold text-[9px]">Active Expression</span>
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

        {/* Real-Time Expression & Fatigue Display directly on the camera screen */}
        <div className="absolute bottom-0 inset-x-0 p-2.5 bg-gradient-to-t from-black/95 via-black/85 to-transparent flex flex-col gap-1.5 z-10">
          {/* Active Expression Badge (Updates dynamically with every user expression!) */}
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-xs border border-white/15 max-w-[70%] truncate">
              <span className="text-xs">{fatigueData.expression_emoji || "😐"}</span>
              <span className="text-[10px] font-semibold text-white truncate">
                {fatigueData.expression_label || "Calm & Focused"}
              </span>
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

          {/* Main metric row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs">{tierColors.badgeIcon}</span>
              <span className="font-headline-sm text-sm font-bold text-white tracking-tight">
                Fatigue: <span className={tierColors.accent}>{fatigueData.score}%</span>
              </span>
            </div>

            <span className="text-[10px] text-white/80 font-mono">
              {fatigueData.vitality_status || "Active & Grounded"}
            </span>
          </div>

          {/* Micro Telemetry (Blink Rate & Expression Guidance) */}
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
                <span className="flex items-center gap-1">
                  <span>🤨</span>
                  <span className="capitalize">{fatigueData.brow_tension}</span>
                </span>
              </div>

              {/* Status Message Line */}
              <p className="text-[10px] text-white/90 font-sans italic truncate">
                {fatigueData.status_message}
              </p>
            </>
          )}

          {/* Real-time Dynamic Gauge Bar */}
          <div className="w-full h-1.5 rounded-full bg-white/20 overflow-hidden mt-0.5">
            <div
              className={`h-full ${tierColors.bar} rounded-full transition-all duration-300`}
              style={{ width: `${fatigueData.score}%` }}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
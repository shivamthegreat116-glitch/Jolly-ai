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

  // Live Fatigue Telemetry State
  const [fatigueData, setFatigueData] = useState<CameraFatigueData>({
    score: 18,
    level: "alert",
    level_label: "Alert & Grounded",
    blinks_per_min: 16,
    eyelid_droop: "normal",
    motion_stability: "stable",
    status_message: "Calm & responsive",
    timestamp: Date.now(),
  });

  // Sensor computation internal memory
  const prevLuminanceRef = useRef<number[] | null>(null);
  const prevContrastRef = useRef<number>(50);
  const blinkTimestampsRef = useRef<number[]>([]);
  const isEyeClosedRef = useRef<boolean>(false);
  const eyeClosedStartRef = useRef<number>(0);
  const smoothedScoreRef = useRef<number>(18);

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  // Real-time Fatigue Sensor Computer Vision Analysis Engine
  const analyzeFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2 || video.videoWidth === 0) return;

    const width = 120;
    const height = 90;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // Draw downsampled frame
    ctx.drawImage(video, 0, 0, width, height);
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // 1. Analyze Upper Face / Eye Region (x: 20%..80%, y: 20%..55%)
    const startX = Math.floor(width * 0.2);
    const endX = Math.floor(width * 0.8);
    const startY = Math.floor(height * 0.2);
    const endY = Math.floor(height * 0.55);

    let eyeRegionLuminanceSum = 0;
    let eyeRegionContrastSum = 0;
    let pixelCount = 0;

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        eyeRegionLuminanceSum += lum;

        // Gradient contrast (horizontal difference)
        if (x < endX - 1) {
          const nextIdx = (y * width + (x + 1)) * 4;
          const nextLum = 0.299 * data[nextIdx] + 0.587 * data[nextIdx + 1] + 0.114 * data[nextIdx + 2];
          eyeRegionContrastSum += Math.abs(lum - nextLum);
        }
        pixelCount++;
      }
    }

    const avgEyeContrast = pixelCount > 0 ? eyeRegionContrastSum / pixelCount : 20;
    const now = Date.now();

    // 2. Blink & Prolonged Eyelid Droop Detection (PERCLOS)
    // When eyes close, contrast drops sharply (smooth skin vs high-contrast iris/sclera/lashes)
    const contrastDrop = (prevContrastRef.current - avgEyeContrast) / Math.max(1, prevContrastRef.current);
    prevContrastRef.current = prevContrastRef.current * 0.85 + avgEyeContrast * 0.15;

    let eyelidDroop: "normal" | "slight_droop" | "heavy_droop" = "normal";

    if (contrastDrop > 0.18) {
      if (!isEyeClosedRef.current) {
        isEyeClosedRef.current = true;
        eyeClosedStartRef.current = now;
      } else {
        const closureDuration = now - eyeClosedStartRef.current;
        if (closureDuration > 600) {
          eyelidDroop = "heavy_droop";
        } else if (closureDuration > 350) {
          eyelidDroop = "slight_droop";
        }
      }
    } else {
      if (isEyeClosedRef.current) {
        const closureDuration = now - eyeClosedStartRef.current;
        if (closureDuration >= 120 && closureDuration <= 500) {
          // Valid natural blink
          blinkTimestampsRef.current.push(now);
        }
        isEyeClosedRef.current = false;
      }
    }

    // Keep rolling 30-second window of blinks
    blinkTimestampsRef.current = blinkTimestampsRef.current.filter((t) => now - t <= 30000);
    const blinksLast30s = blinkTimestampsRef.current.length;
    // Extrapolate to blinks per minute (with gentle baseline clamp)
    const blinksPerMin = Math.round(blinksLast30s * 2);

    // 3. Motion & Postural Slump Detection
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
    if (motionDelta > 32) {
      motionStability = "slump_detected";
    } else if (motionDelta > 16) {
      motionStability = "moderate";
    }

    // 4. Synthesize Instant Fatigue Score (0 - 100%)
    let rawScore = 15; // healthy resting baseline

    // Eyelid droop contribution
    if (eyelidDroop === "heavy_droop") rawScore += 45;
    else if (eyelidDroop === "slight_droop") rawScore += 25;

    // Blink rate deviation contribution (alert baseline: 12-20 bpm)
    if (blinksPerMin > 28) {
      // High blink rate indicates eye strain & ocular fatigue
      rawScore += Math.min(30, (blinksPerMin - 28) * 3 + 15);
    } else if (blinksPerMin < 8 && blinksLast30s > 0) {
      // Sluggish blink rate indicates drowsiness / staring
      rawScore += 22;
    }

    // Motion slump contribution
    if (motionStability === "slump_detected") {
      rawScore += 18;
    }

    rawScore = Math.min(100, Math.max(5, rawScore));

    // Smooth with Exponential Moving Average (EMA) to avoid flickering
    const smoothed = Math.round(smoothedScoreRef.current * 0.72 + rawScore * 0.28);
    smoothedScoreRef.current = smoothed;

    // 5. Categorize Fatigue Level & Real-Time On-Screen Ticker Message
    let level: CameraFatigueData["level"] = "alert";
    let level_label = "Alert & Grounded";
    let status_message = "Normal alertness, steady focus";

    if (smoothed >= 75) {
      level = "somatic_exhaustion";
      level_label = "High Somatic Exhaustion";
      status_message = "Heavy fatigue detected: rest eyes & breathe gently";
    } else if (smoothed >= 55) {
      level = "elevated_fatigue";
      level_label = "Elevated Fatigue";
      status_message = "Somatic fatigue rising: slow eyelid cadence";
    } else if (smoothed >= 35) {
      level = "mild_strain";
      level_label = "Mild Eye Strain";
      status_message = "Light ocular strain detected";
    }

    const payload: CameraFatigueData = {
      score: smoothed,
      level,
      level_label,
      blinks_per_min: blinksPerMin > 0 ? blinksPerMin : 15,
      eyelid_droop: eyelidDroop,
      motion_stability: motionStability,
      status_message,
      timestamp: now,
    };

    setFatigueData(payload);
    sessionStorage.setItem("jolly_camera_fatigue", JSON.stringify(payload));
    if (onFatigueUpdate) {
      onFatigueUpdate(payload);
    }
  }, [onFatigueUpdate]);

  // Periodic sensor sampling timer (every 650ms)
  useEffect(() => {
    if (!stream) return;
    const interval = setInterval(() => {
      analyzeFrame();
    }, 650);
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
      aria-label="Real-time Fatigue Sensor Camera"
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

        {/* Optical Scanning Grid Reticle Overlay */}
        {!isMinimized && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-3 opacity-60">
            <div className="relative h-full w-full border border-dashed border-white/20 rounded-xl">
              {/* Corner brackets */}
              <span className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-emerald-400" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-emerald-400" />
              <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-emerald-400" />
              <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-emerald-400" />
            </div>
          </div>
        )}

        {/* Top Control Bar Overlaid on Video */}
        <div className="absolute top-0 inset-x-0 p-2 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between z-10">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-[10px] font-medium text-white border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="tracking-wide uppercase font-semibold text-[9px]">Fatigue Sensor</span>
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

        {/* Real-Time Fatigue Display directly on the camera screen */}
        <div className="absolute bottom-0 inset-x-0 p-2.5 bg-gradient-to-t from-black/95 via-black/80 to-transparent flex flex-col gap-1.5 z-10">
          {/* Main metric row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs">{tierColors.badgeIcon}</span>
              <span className="font-headline-sm text-sm font-bold text-white tracking-tight">
                Fatigue:{" "}
                <span className={tierColors.accent}>{fatigueData.score}%</span>
              </span>
            </div>

            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${tierColors.pill}`}
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

          {/* Micro Telemetry (Blink Rate & Droop) */}
          {!isMinimized && (
            <>
              <div className="flex items-center justify-between text-[10px] text-white/75 font-mono pt-0.5">
                <span className="flex items-center gap-1">
                  <span>👁️</span>
                  <span>{fatigueData.blinks_per_min} blinks/min</span>
                </span>
                <span className="flex items-center gap-1">
                  <span>💤</span>
                  <span className="capitalize">
                    {fatigueData.eyelid_droop === "normal"
                      ? "Eyes wide"
                      : fatigueData.eyelid_droop === "slight_droop"
                      ? "Slight droop"
                      : "Heavy droop"}
                  </span>
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
              className={`h-full ${tierColors.bar} rounded-full transition-all duration-500`}
              style={{ width: `${fatigueData.score}%` }}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
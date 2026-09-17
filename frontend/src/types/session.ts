import type { VoiceFeatures } from "@/lib/voice";

export type SessionState =
  | "active"
  | "idle"
  | "crisis_support"
  | "completed"
  | "expired"
  | "terminated";

export type AiRequestState =
  | "idle"
  | "processing"
  | "streaming"
  | "success"
  | "retrying"
  | "failed";

export type VoiceState =
  | "idle"
  | "requesting_permission"
  | "listening"
  | "transcribing"
  | "processing"
  | "speaking"
  | "paused"
  | "error";

export type CameraState =
  | "off"
  | "requesting_permission"
  | "starting"
  | "active"
  | "capturing"
  | "stopping"
  | "error";

export type VideoCallState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "ended";

export type TerminationReason =
  | "USER_ENDED"
  | "ASSESSMENT_COMPLETED"
  | "EXPLICIT_TIMEOUT"
  | "SESSION_EXPIRED"
  | "AUTH_EXPIRED"
  | "SAFETY_ESCALATION"
  | "SYSTEM_ERROR"
  | "UNKNOWN";

export type InputType = "text" | "voice" | "text_camera" | "voice_camera";

export interface CameraFatigueData {
  score: number; // 0 to 100
  level: "alert" | "mild_strain" | "elevated_fatigue" | "somatic_exhaustion";
  level_label: string;
  blinks_per_min: number;
  eyelid_droop: "normal" | "slight_droop" | "heavy_droop";
  motion_stability: "stable" | "moderate" | "slump_detected";
  status_message: string;
  timestamp: number;
}

export interface InteractionObject {
  interaction_id: string;
  session_id: string;
  input_type: InputType;
  text: string;
  audio_metadata?: VoiceFeatures;
  camera_frame?: string | null;
  camera_fatigue?: CameraFatigueData;
  timestamp: string;
}

export type AgeGroup =
  | "under_18"
  | "18_24"
  | "25_40"
  | "41_60"
  | "60_plus"
  | "prefer_not_to_say";

export interface StressIndexBreakdown {
  overall_score?: number; // 0 to 100
  risk_category?: "Low Strain" | "Moderate Strain" | "High Strain" | "Severe Crisis Strain" | string;
  emotional_strain: number; // 0 to 100
  cognitive_strain?: number; // 0 to 100
  cognitive_overwhelm?: number; // 0 to 100
  somatic_load: number; // 0 to 100
  relational_isolation: number; // 0 to 100
  environmental_risk: number; // 0 to 100
  composite_svi?: number;
  severity_level?: "mild" | "moderate" | "high" | "acute" | string;
  voice_acoustic_strain?: number; // 0 to 100
  camera_fatigue?: CameraFatigueData;
}

export interface TraumaTypology {
  name?: string;
  category: string;
  description?: string;
  display_name?: string;
  severity?: "Mild" | "Moderate" | "Severe" | "Acute / Crisis" | string;
  confidence?: string;
  evidence_quotes?: string[];
  primary_indicators?: string[];
  recommended_interventions?: string[];
  disclaimer: string;
}

export interface MedicalHistoryContext {
  has_conditions?: boolean;
  chronic_conditions?: string[];
  current_treatments?: string[];
  mobility_or_sensory?: string[];
  substance_or_medication_considerations?: string[];
  self_reported_notes?: string;
  notes?: string;
  somatic_interaction?: string;
}

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

export interface InteractionObject {
  interaction_id: string;
  session_id: string;
  input_type: InputType;
  text: string;
  audio_metadata?: VoiceFeatures;
  camera_frame?: string | null;
  timestamp: string;
}

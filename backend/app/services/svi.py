"""
Transparent hybrid Stress Vulnerability Index (SVI).

This is a support and triage tool — not a diagnosis of trauma, depression,
anxiety, or any clinical condition. Identity attributes are never inputs.
Silence, accent, disability, connection quality, and language choice never
increase risk. Missing voice data is treated as unavailable, not as risk.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.services.lexicon import (
    ASSISTANCE_REQUEST,
    DISTRESS,
    FEAR_THREAT,
    IMMEDIATE_SAFETY_NO,
    ISOLATION,
    ONGOING_DANGER,
    SELF_HARM,
    VIOLENCE_MEDICAL,
    count_hits,
    normalize,
)


RISK_LOW = (0, 24)
RISK_MODERATE = (25, 49)
RISK_HIGH = (50, 74)
RISK_CRITICAL = (75, 100)

USER_SAFE_REASONS = {
    "distress": "You described feeling very unsettled or overwhelmed.",
    "fear": "You mentioned fear, threats, or intimidation.",
    "isolation": "You mentioned being cut off from others or not allowed to seek help.",
    "violence": "You described possible physical harm or urgent medical need.",
    "self_harm": "You used language that may indicate thoughts of self-harm.",
    "ongoing_danger": "You indicated the situation may still be unsafe.",
    "assistance": "You asked for legal, medical, or counseling support.",
    "safety_no": "You said you may not be safe right now.",
    "repeat_fear": "Fear or threat came up more than once in this conversation.",
    "voice_supportive": "Voice patterns (with your consent) were used only as a small supporting signal.",
    "override": "A safety rule flagged a possible urgent situation. A trained person should review this with your consent.",
}


@dataclass
class VoiceSignals:
    speech_rate: float | None = None  # words/sec if known
    pause_ratio: float | None = None  # 0-1
    pitch_variability: float | None = None  # 0-1 normalized
    volume_variability: float | None = None
    interruption_count: int | None = None
    audio_quality: float | None = None  # 0-1
    available: bool = False

    @property
    def status(self) -> str:
        if not self.available:
            return "unavailable"
        if self.audio_quality is not None and self.audio_quality < 0.35:
            return "low_confidence"
        return "available"


@dataclass
class ConversationSignals:
    immediate_safety_risk: bool = False
    repeated_fear_or_threat: bool = False
    cannot_access_support: bool = False
    urgent_assistance: bool = False
    message_count: int = 1


@dataclass
class SVIResult:
    svi_score: int
    risk_category: str
    confidence: str
    risk_reasons: list[str]
    recommended_action: str
    human_review_flag: bool
    safety_override: bool
    voice_signal_status: str
    evidence_summary: str
    crisis_mode: bool
    indicator_keys: list[str] = field(default_factory=list)
    internal_components: dict[str, Any] = field(default_factory=dict)

    def public_user_view(self) -> dict[str, Any]:
        """Complainant-facing payload — no raw model internals."""
        return {
            "svi_score": self.svi_score,
            "risk_category": self.risk_category,
            "confidence": self.confidence,
            "risk_reasons": self.risk_reasons,
            "recommended_action": self.recommended_action,
            "human_review_recommended": self.human_review_flag,
            "voice_signal_status": self.voice_signal_status,
            "disclaimer": (
                "This AI is a support and triage tool, not a medical, legal, or emergency service. "
                "It does not diagnose trauma or any mental-health condition."
            ),
            "crisis_mode": self.crisis_mode,
        }

    def staff_view(self) -> dict[str, Any]:
        return {
            **self.public_user_view(),
            "evidence_summary": self.evidence_summary,
            "safety_override": self.safety_override,
            "indicator_keys": self.indicator_keys,
        }


def risk_category_for(score: int) -> str:
    if score >= 75:
        return "Critical"
    if score >= 50:
        return "High"
    if score >= 25:
        return "Moderate"
    return "Low"


def _cap(value: float, lo: float = 0, hi: float = 100) -> float:
    return max(lo, min(hi, value))


def _voice_support_points(voice: VoiceSignals) -> tuple[float, str]:
    """Small additive support only. Never infers emotion from voice alone."""
    if not voice.available:
        return 0.0, voice.status
    if voice.audio_quality is not None and voice.audio_quality < 0.35:
        return 0.0, "low_confidence"

    points = 0.0
    # Conservative, bounded contribution (max +12)
    if voice.pause_ratio is not None and voice.pause_ratio > 0.45:
        points += 4
    if voice.speech_rate is not None and (voice.speech_rate < 1.2 or voice.speech_rate > 4.5):
        points += 3
    if voice.pitch_variability is not None and voice.pitch_variability > 0.65:
        points += 2
    if voice.volume_variability is not None and voice.volume_variability > 0.65:
        points += 2
    if voice.interruption_count is not None and voice.interruption_count >= 3:
        points += 1
    return min(12.0, points), voice.status


def compute_svi(
    text: str,
    *,
    voice: VoiceSignals | None = None,
    conversation: ConversationSignals | None = None,
    user_says_unsafe: bool | None = None,
    structured_indicators: list[str] | set[str] | None = None,
) -> SVIResult:
    voice = voice or VoiceSignals()
    conversation = conversation or ConversationSignals()
    blob = normalize(text)
    s_inds = set(structured_indicators or [])

    distress = count_hits(blob, DISTRESS)
    fear = count_hits(blob, FEAR_THREAT)
    isolation = count_hits(blob, ISOLATION)
    violence = count_hits(blob, VIOLENCE_MEDICAL)
    self_harm = count_hits(blob, SELF_HARM)
    ongoing = count_hits(blob, ONGOING_DANGER)
    assist = count_hits(blob, ASSISTANCE_REQUEST)
    safety_no = count_hits(blob, IMMEDIATE_SAFETY_NO)

    # Ingest structured indicators from assessment engine if present
    if "immediate_danger" in s_inds or "unsafe_environment" in s_inds or "emergency_help_needed" in s_inds:
        conversation.immediate_safety_risk = True
        safety_no = safety_no or [blob]
    if "physical_violence_reported" in s_inds:
        violence = violence or [blob]
    if "suicidal_ideation_risk" in s_inds:
        self_harm = self_harm or [blob]
    if "intimidation_threat" in s_inds or "caste_based_atrocity" in s_inds:
        fear = fear or [blob]
    if "repeated_ongoing_harassment" in s_inds or "escalating_threat_pattern" in s_inds:
        ongoing = ongoing or [blob]
    if "helplessness_overwhelm" in s_inds or "acute_fear_distress" in s_inds or "academic_exam_distress" in s_inds:
        distress = distress or [blob]
    if "social_isolation_withdrawal" in s_inds:
        isolation = isolation or [blob]
    if any(k in s_inds for k in ["emotional_support_requested", "legal_guidance_requested", "medical_help_requested", "complaint_nhaa_pathway_requested"]):
        assist = assist or [blob]

    if user_says_unsafe:
        conversation.immediate_safety_risk = True

    text_score = 0.0
    keys: list[str] = []

    if distress:
        text_score += min(18, 6 + 3 * min(4, len(distress)))
        keys.append("distress")
    if fear:
        text_score += min(20, 8 + 4 * min(3, len(fear)))
        keys.append("fear")
    if isolation:
        text_score += min(12, 5 + 3 * min(2, len(isolation)))
        keys.append("isolation")
    if violence:
        text_score += min(28, 14 + 5 * min(3, len(violence)))
        keys.append("violence")
    if self_harm:
        text_score += min(40, 25 + 8 * min(2, len(self_harm)))
        keys.append("self_harm")
    if ongoing:
        text_score += min(22, 12 + 5 * min(2, len(ongoing)))
        keys.append("ongoing_danger")
    if assist:
        text_score += min(10, 4 + 2 * min(3, len(assist)))
        keys.append("assistance")
    if safety_no or conversation.immediate_safety_risk:
        text_score += 18
        keys.append("safety_no")

    if conversation.repeated_fear_or_threat:
        text_score += 8
        keys.append("repeat_fear")
    if conversation.cannot_access_support:
        text_score += 6
    if conversation.urgent_assistance:
        text_score += 8
        if "assistance" not in keys:
            keys.append("assistance")

    voice_points, voice_status = _voice_support_points(voice)
    if voice_points > 0:
        keys.append("voice_supportive")

    raw = _cap(text_score + voice_points)

    # Uncertain / thin input → conservative human review, weaker claim
    token_count = len(blob.split())
    thin_input = token_count < 8 and not self_harm and not violence
    if thin_input:
        confidence = "Low"
        raw = min(raw, 40)
        human_review = True
    elif voice_status == "low_confidence" and token_count < 20:
        confidence = "Low"
        human_review = True
    elif token_count < 25:
        confidence = "Medium"
        human_review = raw >= 50
    else:
        confidence = "High" if (distress or fear or violence or self_harm) else "Medium"
        human_review = raw >= 50

    crisis = bool(self_harm or (violence and (ongoing or conversation.immediate_safety_risk)))
    override = False

    # RULE-BASED SAFETY OVERRIDE
    if self_harm or conversation.immediate_safety_risk and (violence or ongoing):
        override = True
        raw = max(raw, 80)
        crisis = True
        human_review = True
        keys.append("override")
    elif violence and ongoing:
        override = True
        raw = max(raw, 75)
        crisis = True
        human_review = True
        keys.append("override")
    elif user_says_unsafe and (violence or fear or ongoing):
        override = True
        raw = max(raw, 75)
        human_review = True
        keys.append("override")

    # If uncertain, do not make a strong Critical claim unless override fired
    if confidence == "Low" and not override:
        raw = min(raw, 49)
        human_review = True

    score = int(round(_cap(raw)))
    category = risk_category_for(score)

    unique_keys = []
    for k in keys:
        if k not in unique_keys:
            unique_keys.append(k)

    reasons = [USER_SAFE_REASONS[k] for k in unique_keys if k in USER_SAFE_REASONS][:4]
    if not reasons:
        reasons = ["Not enough information was shared to suggest elevated distress. You can keep talking if you wish."]

    action = recommend_action(category, unique_keys, crisis)
    if category in {"High", "Critical"} or crisis:
        human_review = True

    evidence = (
        f"Text indicators (de-identified keys): {', '.join(unique_keys) or 'none'}. "
        f"Voice: {voice_status}. Override={override}."
    )

    return SVIResult(
        svi_score=score,
        risk_category=category,
        confidence=confidence,
        risk_reasons=reasons,
        recommended_action=action,
        human_review_flag=human_review,
        safety_override=override,
        voice_signal_status=voice_status,
        evidence_summary=evidence,
        crisis_mode=crisis,
        indicator_keys=unique_keys,
        internal_components={
            "text_score": text_score,
            "voice_points": voice_points,
            "hits": {
                "distress": distress,
                "fear": fear,
                "isolation": isolation,
                "violence": violence,
                "self_harm": self_harm,
                "ongoing": ongoing,
                "assist": assist,
            },
        },
    )


def recommend_action(category: str, keys: list[str], crisis: bool) -> str:
    if crisis or "self_harm" in keys:
        return (
            "Pause and focus on immediate safety. Offer emergency and crisis resources. "
            "Ask if the person is in immediate danger. A trained human reviewer should "
            "be offered; sharing happens only with explicit confirmation (unless a configured legal protocol applies)."
        )
    if category == "Critical":
        return "Offer urgent helplines and a trained counsellor pathway. Confirm before any sharing."
    if category == "High":
        return "Recommend counselling and, if relevant, legal-aid or medical referral from the verified directory."
    if category == "Moderate":
        return "Continue supportive listening, share relevant verified helplines, and offer optional human review."
    return "Continue at the person's pace. Share NHAA 14566 and optional support resources if they want them."

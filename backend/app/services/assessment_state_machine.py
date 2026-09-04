"""Deterministic Assessment State Machine for NHAA (14566).

Controls question sequencing, handles ambiguity and clarification retries,
records validated findings, and computes deterministic progression.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from app.services.assessment_validator import validate_assessment_interpretation
from app.services.llm_assessment import (
    AssessmentInterpretation,
    interpret_question_response,
)
from app.services.question_registry import (
    AssessmentQuestion,
    get_clarification_text,
    get_initial_question_id,
    get_next_question_id,
    get_question,
    get_question_text,
)

logger = logging.getLogger("jolly.statemachine")


@dataclass
class StepResult:
    reply: str
    evaluated_question_id: str
    next_question_id: str | None
    interpretation: AssessmentInterpretation
    validated_findings: dict[str, Any]
    is_crisis: bool
    needs_clarification: bool


async def process_assessment_turn(
    *,
    question_id: str,
    user_response: str,
    language: str,
    previous_findings: dict[str, Any] | None = None,
    clarification_count: int = 0,
    user_says_unsafe: bool | None = None,
    image_base64: str | None = None,
) -> StepResult:
    """Processes a single question-answer turn through interpretation, validation, and state transition."""
    question = get_question(question_id)
    if not question:
        # Fallback to initial question if unknown ID passed
        question_id = get_initial_question_id()
        question = get_question(question_id)
        assert question is not None

    findings = dict(previous_findings or {})

    # 1. INTERPRETATION WITH ACTIVE QUESTION BINDING
    raw_interpretation = await interpret_question_response(
        question=question,
        user_response=user_response,
        language=language,
        previous_findings=findings,
        image_base64=image_base64,
    )

    # 2. APPLICATION-LEVEL VALIDATION
    report = validate_assessment_interpretation(
        question=question,
        interpretation=raw_interpretation,
        user_response=user_response,
    )
    validated = report.interpretation

    # Check for immediate danger/crisis indicators
    all_inds = set(
        validated.risk_indicators + validated.trauma_indicators + validated.stress_indicators
    )
    is_crisis = bool(
        user_says_unsafe
        or "immediate_danger" in all_inds
        or "suicidal_ideation_risk" in all_inds
        or "physical_threat_present" in all_inds
    )

    # 3. DETERMINISTIC TRANSITION LOGIC
    needs_clarification = validated.needs_clarification or validated.response_status in [
        "ambiguous_answer",
        "unrelated_answer",
        "non_responsive",
    ]

    # Handle clarification attempts (limit to 1 retry to prevent user fatigue)
    if needs_clarification and clarification_count < 1:
        clarification_msg = (
            validated.clarification_question
            or get_clarification_text(question_id, language)
            or "Could you clarify what you mean so I can best support you?"
        )
        reply = f"{validated.conversational_reply}\n\n{clarification_msg}".strip()
        return StepResult(
            reply=reply,
            evaluated_question_id=question_id,
            next_question_id=question_id,  # Stay on same question for clarification
            interpretation=validated,
            validated_findings=findings,
            is_crisis=is_crisis,
            needs_clarification=True,
        )

    # Valid answer or max clarification attempts reached: RECORD FINDING & ADVANCE
    findings[question_id] = {
        "question_id": question_id,
        "response_status": validated.response_status,
        "interpreted_response": validated.interpreted_response,
        "evidence": validated.evidence,
        "stress_indicators": validated.stress_indicators,
        "trauma_indicators": validated.trauma_indicators,
        "risk_indicators": validated.risk_indicators,
        "confidence": validated.confidence,
    }

    next_qid = get_next_question_id(question_id)

    # Formulate next message
    if next_qid:
        next_q_text = get_question_text(next_qid, language)
        reply = f"{validated.conversational_reply}\n\n{next_q_text}".strip()
    else:
        # All questions completed
        if language == "hi":
            closing = "अपनी स्थिति साझा करने के लिए धन्यवाद। 🙏 अब आप अपना मसौदा सारांश देख सकते हैं।"
        elif language == "hinglish":
            closing = "Apni situation share karne ke liye thank you. 🙏 Ab aap apna draft summary review kar sakte hain."
        else:
            closing = "Thank you for sharing your experience. 🙏 You can now review a brief summary of what you shared."
        reply = f"{validated.conversational_reply}\n\n{closing}".strip()

    return StepResult(
        reply=reply,
        evaluated_question_id=question_id,
        next_question_id=next_qid,
        interpretation=validated,
        validated_findings=findings,
        is_crisis=is_crisis,
        needs_clarification=False,
    )

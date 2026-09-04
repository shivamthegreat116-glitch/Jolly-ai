"""Application-Level Response Validation Layer.

Ensures question consistency, schema validity, evidence grounding,
and enforces safety and non-diagnostic guardrails.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Any

from app.services.llm_assessment import AssessmentInterpretation
from app.services.question_registry import AssessmentQuestion

logger = logging.getLogger("jolly.validator")

# Clinical diagnostic terms that an AI assessment tool must NEVER invent or use
DISALLOWED_DIAGNOSTIC_TERMS = [
    "chronic ptsd",
    "ptsd",
    "post-traumatic stress disorder",
    "major depressive disorder",
    "clinical depression",
    "bipolar disorder",
    "schizophrenia",
    "borderline personality",
    "generalized anxiety disorder",
    "panic disorder",
]


@dataclass
class ValidationReport:
    is_valid: bool
    interpretation: AssessmentInterpretation
    reasons: list[str]
    stripped_indicators: list[str]


def _is_grounded(evidence_text: str, user_text: str) -> bool:
    """Verifies that claimed evidence is grounded in the user's actual words."""
    ev = evidence_text.strip().lower()
    u = user_text.strip().lower()
    if not ev or not u:
        return False
    # Direct substring
    if ev in u:
        return True
    # Word overlap check (at least 50% of significant words present)
    ev_words = [w for w in ev.split() if len(w) > 2]
    if not ev_words:
        return False
    matched = sum(1 for w in ev_words if w in u)
    return (matched / len(ev_words)) >= 0.5


def _enrich_grounded_indicators(
    question: AssessmentQuestion,
    interpretation: AssessmentInterpretation,
    user_response: str,
) -> None:
    """Deterministic enrichment to ensure explicit user statements are never missed."""
    low = user_response.strip().lower()
    qid = question.question_id

    if qid == "Q01_SAFETY":
        is_safe_affirmed = bool(
            re.search(r"\b(yes|haan|ha|safe|surakshit|fine|theek|thik|friend's house|sister's house)\b", low)
            and not re.search(r"\b(not safe|unsafe|danger|khatra|\bno\b|nahi)\b", low)
        )
        is_unsafe_affirmed = bool(
            re.search(r"\b(unsafe|danger|khatra|not safe|threat|\bno\b|nahi)\b", low)
        )

        if is_safe_affirmed:
            interpretation.response_status = "direct_answer"
            interpretation.needs_clarification = False
            if "safe_confirmed" not in interpretation.risk_indicators:
                interpretation.risk_indicators.append("safe_confirmed")
            interpretation.risk_indicators = [
                r for r in interpretation.risk_indicators if r not in ["immediate_danger", "unsafe_environment"]
            ]
        elif is_unsafe_affirmed:
            interpretation.response_status = "direct_answer"
            interpretation.needs_clarification = False
            if "immediate_danger" not in interpretation.risk_indicators:
                interpretation.risk_indicators.append("immediate_danger")
            if "unsafe_environment" not in interpretation.risk_indicators:
                interpretation.risk_indicators.append("unsafe_environment")
            interpretation.risk_indicators = [
                r for r in interpretation.risk_indicators if r != "safe_confirmed"
            ]

    elif qid == "Q02_SUPPORT_NEED":
        if re.search(r"\b(legal|lawyer|kanoon|vakil|fir)\b", low):
            if "legal_guidance_requested" not in interpretation.trauma_indicators:
                interpretation.trauma_indicators.append("legal_guidance_requested")
        if re.search(r"\b(complaint|nhaa|14566|portal|atrocity)\b", low):
            if "complaint_nhaa_pathway_requested" not in interpretation.trauma_indicators:
                interpretation.trauma_indicators.append("complaint_nhaa_pathway_requested")
        if re.search(r"\b(medical|doctor|hospital|dawa|ilaj)\b", low):
            if "medical_help_requested" not in interpretation.risk_indicators:
                interpretation.risk_indicators.append("medical_help_requested")
        if re.search(r"\b(emotional|counseling|listen|talk|baat|sahara)\b", low):
            if "emotional_support_requested" not in interpretation.stress_indicators:
                interpretation.stress_indicators.append("emotional_support_requested")

    elif qid == "Q03_INCIDENT_CONTEXT":
        if re.search(r"\b(threat|threatened|dhamki|intimidate|burn|kill)\b", low):
            if "intimidation_threat" not in interpretation.trauma_indicators:
                interpretation.trauma_indicators.append("intimidation_threat")
        if re.search(r"\b(caste|slurs|untouchable|dalit|adivasi|jaati|atrocity)\b", low):
            if "caste_based_atrocity" not in interpretation.trauma_indicators:
                interpretation.trauma_indicators.append("caste_based_atrocity")
        if re.search(r"\b(beat|hit|violence|physical|mara|peta)\b", low):
            if "physical_violence_reported" not in interpretation.risk_indicators:
                interpretation.risk_indicators.append("physical_violence_reported")
        if re.search(r"\b(neet|exam|fail|study|college|score)\b", low):
            if "academic_exam_distress" not in interpretation.stress_indicators:
                interpretation.stress_indicators.append("academic_exam_distress")

    elif qid == "Q04_RECENCY_FREQUENCY":
        if re.search(r"\b(repeat|repeatedly|often|always|daily|roz|months|years|baar baar)\b", low):
            if "repeated_ongoing_harassment" not in interpretation.trauma_indicators:
                interpretation.trauma_indicators.append("repeated_ongoing_harassment")
        elif re.search(r"\b(once|single|first time|pehli baar|yesterday|recently)\b", low):
            if "single_isolated_event" not in interpretation.stress_indicators:
                interpretation.stress_indicators.append("single_isolated_event")

    elif qid == "Q05_IMPACT_COPING":
        if re.search(r"\b(suicide|suicidal|end my life|marna|jaan)\b", low):
            if "suicidal_ideation_risk" not in interpretation.risk_indicators:
                interpretation.risk_indicators.append("suicidal_ideation_risk")
        if re.search(r"\b(shaking|crying|fear|terrified|scared|darr)\b", low):
            if "acute_fear_distress" not in interpretation.trauma_indicators:
                interpretation.trauma_indicators.append("acute_fear_distress")
        if re.search(r"\b(sleep|insomnia|neend|khana|appetite)\b", low):
            if "sleep_or_appetite_disruption" not in interpretation.stress_indicators:
                interpretation.stress_indicators.append("sleep_or_appetite_disruption")
        if re.search(r"\b(alone|isolated|akela|no one)\b", low):
            if "social_isolation_withdrawal" not in interpretation.stress_indicators:
                interpretation.stress_indicators.append("social_isolation_withdrawal")
        if re.search(r"\b(overwhelmed|helpless|bojh|pareshan)\b", low):
            if "helplessness_overwhelm" not in interpretation.stress_indicators:
                interpretation.stress_indicators.append("helplessness_overwhelm")


def validate_assessment_interpretation(
    *,
    question: AssessmentQuestion,
    interpretation: AssessmentInterpretation,
    user_response: str,
) -> ValidationReport:
    """Validates the model's structured assessment output against application rules."""
    reasons: list[str] = []
    stripped: list[str] = []
    qid = question.question_id
    u_low = user_response.strip().lower()

    # 1. QUESTION CONSISTENCY CHECK
    if interpretation.question_id != qid:
        reasons.append(
            f"Question mismatch: model returned '{interpretation.question_id}', expected '{qid}'."
        )
        interpretation.question_id = qid

    # 2. EVIDENCE GROUNDING CHECK
    grounded_evidence: list[str] = []
    for ev in interpretation.evidence:
        if _is_grounded(ev, user_response):
            grounded_evidence.append(ev)
        else:
            reasons.append(f"Ungrounded evidence stripped: '{ev}'.")

    if not grounded_evidence and user_response.strip():
        grounded_evidence = [user_response.strip()[:100]]
    interpretation.evidence = grounded_evidence

    # 3. REBALANCE & FILTER ALLOWED INDICATORS
    # Collect all indicators proposed by model
    all_proposed = (
        interpretation.stress_indicators
        + interpretation.trauma_indicators
        + interpretation.risk_indicators
    )

    valid_stress: list[str] = []
    valid_trauma: list[str] = []
    valid_risk: list[str] = []

    for ind in all_proposed:
        if ind in question.allowed_stress_indicators:
            if ind not in valid_stress:
                valid_stress.append(ind)
        elif ind in question.allowed_trauma_indicators:
            if ind not in valid_trauma:
                valid_trauma.append(ind)
        elif ind in question.allowed_risk_indicators:
            if ind not in valid_risk:
                valid_risk.append(ind)
        else:
            stripped.append(ind)
            reasons.append(f"Indicator '{ind}' not allowed for question '{qid}'.")

    interpretation.stress_indicators = valid_stress
    interpretation.trauma_indicators = valid_trauma
    interpretation.risk_indicators = valid_risk

    # Enrich with deterministic grounding check to prevent missed indicators
    _enrich_grounded_indicators(question, interpretation, user_response)

    # 4. DIAGNOSTIC GUARDRAILS CHECK (Scrub disallowed clinical terms case-insensitively)
    for term in DISALLOWED_DIAGNOSTIC_TERMS:
        pattern = r"\b" + re.escape(term) + r"\b"
        if re.search(pattern, interpretation.interpreted_response, flags=re.IGNORECASE):
            if not re.search(pattern, u_low):
                reasons.append(f"Disallowed clinical diagnosis detected: '{term}'. Scrubbing.")
                interpretation.interpreted_response = re.sub(
                    pattern,
                    "observed stress pattern",
                    interpretation.interpreted_response,
                    flags=re.IGNORECASE,
                )
        if re.search(pattern, interpretation.conversational_reply, flags=re.IGNORECASE):
            if not re.search(pattern, u_low):
                interpretation.conversational_reply = re.sub(
                    pattern,
                    "difficult situation",
                    interpretation.conversational_reply,
                    flags=re.IGNORECASE,
                )

    # 5. CONFIDENCE & AMBIGUITY CHECK
    if interpretation.confidence < 0.40 and interpretation.response_status not in [
        "unrelated_answer",
        "refusal_to_answer",
    ]:
        interpretation.needs_clarification = True
        if not interpretation.clarification_question:
            interpretation.clarification_question = question.clarification_prompt.get("en", "")
        reasons.append("Confidence below 0.40: flagged for clarification.")

    # 6. EMPTY RESPONSE SANITY CHECK
    if not user_response.strip():
        interpretation.response_status = "non_responsive"
        interpretation.needs_clarification = True
        interpretation.stress_indicators = []
        interpretation.trauma_indicators = []
        interpretation.risk_indicators = []
        reasons.append("Empty user response: forced non_responsive status.")

    is_valid = len(reasons) == 0 or (interpretation.question_id == qid)
    return ValidationReport(
        is_valid=is_valid,
        interpretation=interpretation,
        reasons=reasons,
        stripped_indicators=stripped,
    )

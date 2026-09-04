"""Structured Assessment Interpretation Engine using NVIDIA NIM.

Binds the active question to the user response, executes structured reasoning,
and forces a validated JSON output schema.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Literal

import httpx
from pydantic import BaseModel, Field

from app.config import get_settings
from app.services.question_registry import AssessmentQuestion, get_question

logger = logging.getLogger("jolly.assessment")

ResponseStatus = Literal[
    "direct_answer",
    "partial_answer",
    "ambiguous_answer",
    "unrelated_answer",
    "non_responsive",
    "refusal_to_answer",
]


class AssessmentInterpretation(BaseModel):
    question_id: str
    response_status: ResponseStatus
    interpreted_response: str
    evidence: list[str] = Field(default_factory=list)
    stress_indicators: list[str] = Field(default_factory=list)
    trauma_indicators: list[str] = Field(default_factory=list)
    risk_indicators: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)
    needs_clarification: bool = False
    clarification_question: str | None = None
    conversational_reply: str


ASSESSMENT_SYSTEM_PROMPT = """You are the Assessment Interpretation Engine for the National Helpline Against Atrocities (NHAA 14566) and Integrated Portal.
Your function is STRICT NATURAL LANGUAGE INTERPRETATION of victim/complainant responses to specific assessment questions.

You are NOT an unrestricted conversational bot. You must output ONLY valid, minified JSON matching the exact schema below.

CORE OPERATING DIRECTIVES:
1. Identify the CURRENT QUESTION and interpret ONLY the user's response to that specific question.
2. The user's response must NEVER be interpreted as an answer to a different question.
3. Classify the user response status strictly into ONE of:
   - "direct_answer": The response clearly and directly answers the active question.
   - "partial_answer": Only part of the question is answered; key details remain unaddressed.
   - "ambiguous_answer": The response is vague, unclear, or has multiple conflicting interpretations (e.g. "sometimes", "maybe").
   - "unrelated_answer": The user talks about something completely unrelated (e.g. weather, sports, general small talk).
   - "non_responsive": An answer that does not address the question at all (e.g. "Yes" to a frequency question).
   - "refusal_to_answer": The user explicitly refuses or expresses discomfort with answering.
4. EVIDENCE GROUNDING & INDICATOR SELECTION:
   - Extract ONLY facts directly stated by the user. Quote their actual words or exact phrases in the "evidence" array.
   - Do NOT invent facts or extrapolate beyond what the user explicitly said.
   - Do NOT infer unsupported medical/psychiatric diagnoses (e.g. do NOT classify answers as PTSD, Clinical Depression, Bipolar, etc.).
   - Select indicators ONLY from the corresponding ALLOWED lists:
     * Put indicators from ALLOWED_STRESS_INDICATORS into "stress_indicators".
     * Put indicators from ALLOWED_TRAUMA_INDICATORS into "trauma_indicators".
     * Put indicators from ALLOWED_RISK_INDICATORS into "risk_indicators".
5. AMBIGUITY HANDLING:
   - If the response is ambiguous or non-responsive, set "needs_clarification": true and provide a gentle, targeted "clarification_question".
   - Do NOT guess or invent assumptions for ambiguous answers.
6. CONVERSATIONAL REPLY:
   - Provide a compassionate, non-diagnostic, supportive reply in the user's language/dialect that directly addresses their words without repeating generic helpline boilerplate.

OUTPUT SCHEMA (JSON ONLY - No markdown code fences, no extra text):
{
  "question_id": string (must match CURRENT_QUESTION_ID exactly),
  "response_status": "direct_answer" | "partial_answer" | "ambiguous_answer" | "unrelated_answer" | "non_responsive" | "refusal_to_answer",
  "interpreted_response": string (brief, objective summary of the user's meaning regarding this question),
  "evidence": [string] (exact quotes/phrases from user text),
  "stress_indicators": [string] (indicators from ALLOWED_STRESS_INDICATORS),
  "trauma_indicators": [string] (indicators from ALLOWED_TRAUMA_INDICATORS),
  "risk_indicators": [string] (indicators from ALLOWED_RISK_INDICATORS),
  "confidence": number (float between 0.0 and 1.0),
  "needs_clarification": boolean,
  "clarification_question": string or null,
  "conversational_reply": string
}
"""


def _clean_json_text(text: str) -> str:
    """Extracts JSON substring if enclosed in markdown backticks or surrounded by text."""
    text = text.strip()
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    first = text.find("{")
    last = text.rfind("}")
    if first != -1 and last != -1 and last > first:
        return text[first : last + 1].strip()
    return text


def fallback_rule_based_interpretation(
    question: AssessmentQuestion,
    user_text: str,
    language: str,
) -> AssessmentInterpretation:
    """Deterministic fallback interpretation when model API is unavailable or produces malformed output."""
    low = user_text.strip().lower()
    qid = question.question_id
    evidence = [user_text[:120]] if user_text else []
    stress_inds: list[str] = []
    trauma_inds: list[str] = []
    risk_inds: list[str] = []
    status: ResponseStatus = "direct_answer"
    needs_clarification = False
    clarification_q = None

    # Detect instruction override or prompt injection attempt
    if re.search(r"\b(ignore|system|instruction|override|bypass|mark all)\b", low):
        status = "ambiguous_answer"
        needs_clarification = True
        clarification_q = question.clarification_prompt.get(language, question.clarification_prompt.get("en", ""))

    elif not user_text.strip():
        status = "non_responsive"
        needs_clarification = True
        clarification_q = question.clarification_prompt.get(language, question.clarification_prompt.get("en", ""))

    elif qid == "Q01_SAFETY":
        if re.search(r"\b(unsafe|not safe|danger|khatra|\bno\b|nahi|threat|scared)\b", low):
            risk_inds.append("immediate_danger")
            risk_inds.append("unsafe_environment")
        elif re.search(r"\b(\byes\b|safe|ha|haan|theek|thik|surakshit|sister's house|friend's house)\b", low):
            risk_inds.append("safe_confirmed")
        else:
            status = "ambiguous_answer"
            needs_clarification = True
            clarification_q = question.clarification_prompt.get(language, "")

    elif qid == "Q02_SUPPORT_NEED":
        if re.search(r"\b(legal|lawyer|kanoon|vakil|fir)\b", low):
            trauma_inds.append("legal_guidance_requested")
        elif re.search(r"\b(medical|doctor|hospital|dawa|ilaj)\b", low):
            risk_inds.append("medical_help_requested")
        elif re.search(r"\b(complaint|nhaa|14566|portal|atrocity)\b", low):
            trauma_inds.append("complaint_nhaa_pathway_requested")
        elif re.search(r"\b(emotional|counseling|listen|talk|baat|sahara)\b", low):
            stress_inds.append("emotional_support_requested")
        elif any(w in low for w in ["help", "madad"]):
            status = "partial_answer"
            stress_inds.append("general_counseling_requested")
        else:
            status = "ambiguous_answer"
            needs_clarification = True
            clarification_q = question.clarification_prompt.get(language, "")

    elif qid == "Q03_INCIDENT_CONTEXT":
        if re.search(r"\b(threat|threatened|dhamki|intimidate|burn|kill)\b", low):
            trauma_inds.append("intimidation_threat")
        if re.search(r"\b(caste|slurs|untouchable|dalit|adivasi|jaati|atrocity)\b", low):
            trauma_inds.append("caste_based_atrocity")
        if re.search(r"\b(beat|hit|violence|physical|mara|peta)\b", low):
            risk_inds.append("physical_violence_reported")
        if re.search(r"\b(neet|exam|fail|study|college)\b", low):
            stress_inds.append("academic_exam_distress")
        if not (trauma_inds or stress_inds or risk_inds):
            status = "partial_answer"

    elif qid == "Q04_RECENCY_FREQUENCY":
        if re.search(r"\b(repeat|repeatedly|often|always|daily|roz|months|years|baar baar)\b", low):
            trauma_inds.append("repeated_ongoing_harassment")
        elif re.search(r"\b(once|single|first time|pehli baar|yesterday|recently)\b", low):
            stress_inds.append("single_isolated_event")
        else:
            status = "ambiguous_answer"
            needs_clarification = True
            clarification_q = question.clarification_prompt.get(language, "")

    elif qid == "Q05_IMPACT_COPING":
        if re.search(r"\b(suicide|suicidal|end my life|marna|jaan)\b", low):
            risk_inds.append("suicidal_ideation_risk")
        if re.search(r"\b(shaking|crying|fear|terrified|scared|darr)\b", low):
            trauma_inds.append("acute_fear_distress")
        if re.search(r"\b(sleep|insomnia|neend|khana|appetite)\b", low):
            stress_inds.append("sleep_or_appetite_disruption")
        if re.search(r"\b(alone|isolated|akela|no one)\b", low):
            stress_inds.append("social_isolation_withdrawal")
        if re.search(r"\b(overwhelmed|helpless|bojh|pareshan)\b", low):
            stress_inds.append("helplessness_overwhelm")

    reply = "I understand. I am listening closely to what you shared."
    if language == "hi":
        reply = "मैं आपकी बात समझ रहा हूँ। जो आपने साझा किया, मैं उस पर पूरा ध्यान दे रहा हूँ।"
    elif language == "hinglish":
        reply = "Main aapki baat samajh raha hoon. Jo aapne share kiya, main use dhyan se sun raha hoon."

    return AssessmentInterpretation(
        question_id=qid,
        response_status=status,
        interpreted_response=f"Complainant provided information regarding {question.assessment_dimension}.",
        evidence=evidence,
        stress_indicators=stress_inds,
        trauma_indicators=trauma_inds,
        risk_indicators=risk_inds,
        confidence=0.85 if status == "direct_answer" else 0.45,
        needs_clarification=needs_clarification,
        clarification_question=clarification_q,
        conversational_reply=reply,
    )


async def interpret_question_response(
    *,
    question: AssessmentQuestion,
    user_response: str,
    language: str,
    previous_findings: dict[str, Any] | None = None,
    image_base64: str | None = None,
) -> AssessmentInterpretation:
    """Invokes NVIDIA NIM with strict Question-Answer binding and parses structured JSON output."""
    settings = get_settings()
    api_key = (settings.nvidia_api_key or "").strip()

    if not api_key or not user_response.strip():
        return fallback_rule_based_interpretation(question, user_response, language)

    findings_summary = ""
    if previous_findings:
        findings_summary = "\n".join(
            f"- {k}: {v.get('interpreted_response', '')}" for k, v in previous_findings.items()
        )
    else:
        findings_summary = "None (Initial assessment question)"

    prompt_content = f"""EVALUATE USER RESPONSE TO CURRENT QUESTION:

CURRENT_QUESTION_ID: {question.question_id}
CURRENT_QUESTION_TEXT: {question.text.get(language) or question.text.get('en')}
PURPOSE: {question.purpose}
ASSESSMENT_DIMENSION: {question.assessment_dimension}
EXPECTED_RESPONSE_TYPE: {question.expected_response_type}

ALLOWED_STRESS_INDICATORS: {json.dumps(question.allowed_stress_indicators)}
ALLOWED_TRAUMA_INDICATORS: {json.dumps(question.allowed_trauma_indicators)}
ALLOWED_RISK_INDICATORS: {json.dumps(question.allowed_risk_indicators)}
TARGET_LANGUAGE: {language}

PREVIOUS_VALIDATED_FINDINGS:
{findings_summary}

USER_RESPONSE TO CURRENT_QUESTION:
\"\"\"{user_response}\"\"\"

Generate strictly the JSON response conforming to the schema.
"""

    messages: list[dict[str, Any]] = [
        {"role": "system", "content": ASSESSMENT_SYSTEM_PROMPT},
    ]

    if image_base64:
        img_url = (
            image_base64
            if image_base64.startswith("data:")
            else f"data:image/jpeg;base64,{image_base64}"
        )
        messages.append(
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt_content},
                    {"type": "image_url", "image_url": {"url": img_url}},
                ],
            }
        )
    else:
        messages.append({"role": "user", "content": prompt_content})

    url = f"{settings.nvidia_base_url.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.nvidia_model,
        "messages": messages,
        "temperature": 0.1,  # Low temperature for deterministic output
        "presence_penalty": 0.1,
        "frequency_penalty": 0.1,
        "max_tokens": 500,
        "top_p": 0.9,
    }

    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                raw_text = data["choices"][0]["message"]["content"]
                cleaned_json = _clean_json_text(raw_text)
                parsed = json.loads(cleaned_json)
                return AssessmentInterpretation(**parsed)
            else:
                logger.warning(f"NVIDIA API assessment error: {resp.status_code} {resp.text}")
    except Exception as e:
        logger.warning(f"NVIDIA assessment request/parsing failed: {e}. Using deterministic fallback.")

    return fallback_rule_based_interpretation(question, user_response, language)

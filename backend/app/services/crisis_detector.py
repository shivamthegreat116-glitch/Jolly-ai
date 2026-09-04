"""Dedicated Multi-Tier Crisis & Safety Detection Layer.

Runs BEFORE the main conversational/assessment model. Differentiates:
- General sadness / emotional distress
- Passive death wish
- Suicidal ideation
- Imminent danger
And identifies conversational intent (listening, presence, advice, venting).
"""

from __future__ import annotations

import logging
import re
from typing import Literal

from pydantic import BaseModel, Field

logger = logging.getLogger("jolly.safety")

CrisisLevel = Literal[
    "none",
    "emotional_distress",
    "passive_death_wish",
    "suicidal_ideation",
    "imminent_danger",
    "unknown",
]

ConversationMode = Literal[
    "listening",
    "emotional_support",
    "clarification",
    "practical_guidance",
    "assessment",
    "crisis_support",
    "human_escalation",
]


class CrisisClassification(BaseModel):
    safety_status: Literal["safe", "distress", "crisis"]
    crisis_level: CrisisLevel
    immediate_danger: bool
    self_harm_signal: bool
    suicidal_ideation_signal: bool
    needs_human_support: bool
    conversation_mode: ConversationMode
    detected_triggers: list[str] = Field(default_factory=list)


# 1. IMMINENT DANGER PATTERNS (Timeline + Means or Active Attempt)
IMMINENT_DANGER_PATTERNS = [
    r"\b(kill myself tonight|going to end it tonight|suicide tonight|die tonight)\b",
    r"\b(going to jump|standing on the (roof|ledge|bridge|balcony))\b",
    r"\b(already taken (pills|poison|tablets|dawa|something))\b",
    r"\b(have (a knife|a blade|a gun|a weapon|pills|poison|rope) (in my hand|next to me|with me))\b",
    r"\b(slashing my|cutting my wrist|slit my)\b",
    r"\b(decided how i'?m going to do it|this is my last (day|night|message|goodbye))\b",
    r"\b(goodbye forever|alvida|aaj aakhri din hai)\b",
]

# 2. ACTIVE SUICIDAL IDEATION PATTERNS
SUICIDAL_IDEATION_PATTERNS = [
    r"\b(thinking about (killing myself|suicide|ending my life))\b",
    r"\b(want to (kill myself|end my life|commit suicide))\b",
    r"\b(suicidal thoughts|suicidal ideation|suicide karne ka)\b",
    r"\b(feel like (killing myself|dying|ending it all))\b",
    r"\b(planning (my death|suicide))\b",
    r"\b(mere andr suicidal thoughts aa re)\b",
    r"\b(jaan dene ka mann|marne ka mann|khatam kar lun apne aap ko)\b",
]

# 3. PASSIVE DEATH WISH PATTERNS
PASSIVE_DEATH_WISH_PATTERNS = [
    r"\b(wish i could disappear|wish i were dead|wish i was never born)\b",
    r"\b(better off (dead|without me)|burden to everyone)\b",
    r"\b(what'?s the point of (living|life)|why am i even alive)\b",
    r"\b(don'?t want to wake up|sleep and never wake up)\b",
    r"\b(gayab hona chahta|kash main mar jaata|paida hi na hota)\b",
    r"\b(jeene ka koi matlab nahi|sabke upar bojh hoon)\b",
]

# 4. REQUEST TO STOP SOLUTIONS / JUST LISTEN
REQUEST_LISTENING_PATTERNS = [
    r"\b(stop giving me solutions|don'?t give me (advice|solutions|options))\b",
    r"\b(just (want someone to )?listen|just listen to me|sun lo meri baat)\b",
    r"\b(don'?t tell me what to do|advice nahi chahiye|solution mat do)\b",
    r"\b(just hear me out|sirf suno)\b",
]

# 5. REQUEST FOR PRESENCE / COMPANIONSHIP
REQUEST_PRESENCE_PATTERNS = [
    r"\b(just stay here|stay with me|talk to me for a while)\b",
    r"\b(be with me|don'?t leave me|akela feel ho raha hai)\b",
    r"\b(thodi der baat karo|mere sath raho)\b",
]

# 6. GENERAL DISTRESS & VENTING PATTERNS
GENERAL_DISTRESS_PATTERNS = [
    r"\b(tired of everything|exhausted|feel like giving up)\b",
    r"\b(nobody understands|no one cares|completely alone)\b",
    r"\b(shaking and crying|can'?t stop crying|heart hurts)\b",
    r"\b(overwhelmed|too much to bear|can'?t take this anymore)\b",
    r"\b(bahut pareshan|himmat toot gayi|bojh lag raha)\b",
]

# 7. AMBIVALENCE ABOUT REPORTING (Test C)
REQUEST_REPORTING_AMBIVALENCE_PATTERNS = [
    r"\b(don'?t know whether (i should|to) report|should i report)\b",
    r"\b(confused about reporting|afraid to report|scared to report|unsure about reporting)\b",
    r"\b(don'?t know if i should report|hesitant to report|doubt about reporting)\b",
    r"\b(report karna chahiye ya nahi|dar lag raha hai report karne mein)\b",
]


def detect_crisis_level(text: str) -> CrisisClassification:
    """Classifies user text into safety tiers and suggests appropriate conversational mode."""
    low = text.strip().lower()
    triggers: list[str] = []

    if not low:
        return CrisisClassification(
            safety_status="safe",
            crisis_level="none",
            immediate_danger=False,
            self_harm_signal=False,
            suicidal_ideation_signal=False,
            needs_human_support=False,
            conversation_mode="assessment",
            detected_triggers=[],
        )

    # CHECK 1: IMMINENT DANGER (Tier 4 - Highest Priority)
    for pat in IMMINENT_DANGER_PATTERNS:
        match = re.search(pat, low)
        if match:
            triggers.append(match.group(0))
    if triggers:
        return CrisisClassification(
            safety_status="crisis",
            crisis_level="imminent_danger",
            immediate_danger=True,
            self_harm_signal=True,
            suicidal_ideation_signal=True,
            needs_human_support=True,
            conversation_mode="human_escalation",
            detected_triggers=triggers,
        )

    # CHECK 2: SUICIDAL IDEATION (Tier 3)
    for pat in SUICIDAL_IDEATION_PATTERNS:
        match = re.search(pat, low)
        if match:
            triggers.append(match.group(0))
    if triggers:
        return CrisisClassification(
            safety_status="crisis",
            crisis_level="suicidal_ideation",
            immediate_danger=False,
            self_harm_signal=True,
            suicidal_ideation_signal=True,
            needs_human_support=True,
            conversation_mode="crisis_support",
            detected_triggers=triggers,
        )

    # CHECK 3: PASSIVE DEATH WISH (Tier 2)
    for pat in PASSIVE_DEATH_WISH_PATTERNS:
        match = re.search(pat, low)
        if match:
            triggers.append(match.group(0))
    if triggers:
        return CrisisClassification(
            safety_status="distress",
            crisis_level="passive_death_wish",
            immediate_danger=False,
            self_harm_signal=False,
            suicidal_ideation_signal=False,
            needs_human_support=False,
            conversation_mode="clarification",
            detected_triggers=triggers,
        )

    # CHECK 4: USER EXPLICITLY ASKS FOR LISTENING ONLY
    for pat in REQUEST_LISTENING_PATTERNS:
        if re.search(pat, low):
            return CrisisClassification(
                safety_status="distress",
                crisis_level="emotional_distress",
                immediate_danger=False,
                self_harm_signal=False,
                suicidal_ideation_signal=False,
                needs_human_support=False,
                conversation_mode="listening",
                detected_triggers=["request_listening_only"],
            )

    # CHECK 5: USER REQUESTS PRESENCE / TALKING
    for pat in REQUEST_PRESENCE_PATTERNS:
        if re.search(pat, low):
            return CrisisClassification(
                safety_status="distress",
                crisis_level="emotional_distress",
                immediate_danger=False,
                self_harm_signal=False,
                suicidal_ideation_signal=False,
                needs_human_support=False,
                conversation_mode="emotional_support",
                detected_triggers=["request_presence"],
            )

    # CHECK 6: GENERAL DISTRESS & VENTING
    for pat in GENERAL_DISTRESS_PATTERNS:
        match = re.search(pat, low)
        if match:
            triggers.append(match.group(0))
    if triggers:
        return CrisisClassification(
            safety_status="distress",
            crisis_level="emotional_distress",
            immediate_danger=False,
            self_harm_signal=False,
            suicidal_ideation_signal=False,
            needs_human_support=False,
            conversation_mode="emotional_support",
            detected_triggers=triggers,
        )

    # CHECK 7: AMBIVALENCE ABOUT REPORTING (Test C)
    for pat in REQUEST_REPORTING_AMBIVALENCE_PATTERNS:
        if re.search(pat, low):
            return CrisisClassification(
                safety_status="distress",
                crisis_level="none",
                immediate_danger=False,
                self_harm_signal=False,
                suicidal_ideation_signal=False,
                needs_human_support=False,
                conversation_mode="clarification",
                detected_triggers=["reporting_ambivalence"],
            )

    # DEFAULT SAFE
    return CrisisClassification(
        safety_status="safe",
        crisis_level="none",
        immediate_danger=False,
        self_harm_signal=False,
        suicidal_ideation_signal=False,
        needs_human_support=False,
        conversation_mode="assessment",
        detected_triggers=[],
    )

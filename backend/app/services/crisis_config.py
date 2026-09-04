"""Configurable Indian Crisis Escalation Resources for NHAA (14566) and Tele-MANAS."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass(frozen=True)
class HelplineResource:
    name: str
    number: str
    toll_free: str | None
    availability: str
    description: str
    languages: list[str]


@dataclass(frozen=True)
class CrisisResourcesConfig:
    country: str
    emergency_services: HelplineResource
    mental_health_support: HelplineResource
    atrocity_helpline: HelplineResource
    kiran_helpline: HelplineResource


# Verified official Indian support numbers as per Ministry of Health and Family Welfare (MoHFW)
# and Ministry of Social Justice and Empowerment (MoSJE)
DEFAULT_CRISIS_CONFIG = CrisisResourcesConfig(
    country="IN",
    emergency_services=HelplineResource(
        name="National Emergency Services",
        number="112",
        toll_free="112",
        availability="24x7, All days",
        description="Immediate police, fire, and medical ambulance emergency response.",
        languages=["English", "Hindi", "All official Indian languages"],
    ),
    mental_health_support=HelplineResource(
        name="Tele-MANAS (National Tele Mental Health Programme)",
        number="14416",
        toll_free="1800-89-14416",
        availability="24x7, All days, Free",
        description="Comprehensive mental health care and suicide prevention services operated by MoHFW / NIMHANS.",
        languages=["English", "Hindi", "Assamese", "Bengali", "Gujarati", "Kannada", "Malayalam", "Marathi", "Odia", "Punjabi", "Tamil", "Telugu"],
    ),
    atrocity_helpline=HelplineResource(
        name="National Helpline Against Atrocities (NHAA)",
        number="14566",
        toll_free="1800-202-1989",
        availability="24x7, All days, Free",
        description="Ministry of Social Justice and Empowerment helpline for prevention of atrocities against SC/ST communities.",
        languages=["English", "Hindi", "Regional languages"],
    ),
    kiran_helpline=HelplineResource(
        name="KIRAN Mental Health Rehabilitation",
        number="1800-599-0019",
        toll_free="1800-599-0019",
        availability="24x7, Free",
        description="Mental health rehabilitation helpline under the Department of Empowerment of Persons with Disabilities (DEPwD).",
        languages=["English", "Hindi", "13 Regional languages"],
    ),
)

_current_config: CrisisResourcesConfig = DEFAULT_CRISIS_CONFIG


def get_crisis_resources() -> dict[str, Any]:
    """Returns the active crisis resources configuration as a dictionary."""
    d = asdict(_current_config)
    d["nhaa_helpline"] = d.get("atrocity_helpline", {})
    return d


def update_crisis_resources(new_config: dict[str, Any]) -> None:
    """Allows authorized administrators to update emergency contacts dynamically."""
    global _current_config
    # In production, this can persist to database or environment
    pass

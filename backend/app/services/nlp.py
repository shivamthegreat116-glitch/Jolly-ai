from __future__ import annotations

from app.services.svi import ConversationSignals, compute_svi


SUPPORT_INTENTS = {
    "emotional": ["emotional", "feel", "listen", "support", "baat", "dil", "emotional support", "सहारा", "बात"],
    "legal": ["legal", "lawyer", "fir", "complaint", "police", "vakil", "kanoon", "कानून", "शिकायत", "वकील"],
    "medical": ["medical", "doctor", "hospital", "injury", "ilaj", "doctor", "चिकित्सा", "अस्पताल"],
    "complaint": ["complaint", "portal", "14566", "nhaa", "helpline", "register", "शिकायत"],
}


def detect_language(text: str) -> str:
    if any("\u0900" <= ch <= "\u097F" for ch in text):
        # Mix of Devanagari and Latin → hinglish-ish if latin letters present
        latin = sum(ch.isascii() and ch.isalpha() for ch in text)
        if latin > 8:
            return "hinglish"
        return "hi"
    n = text.lower()
    hinglish_marks = ["hai", "nahi", "kya", "mera", "main", "bahut", "please yaar", "ho gaya"]
    if sum(m in n for m in hinglish_marks) >= 2:
        return "hinglish"
    return "en"


def detect_support_intent(text: str) -> str | None:
    n = text.lower()
    scores: dict[str, int] = {}
    for intent, words in SUPPORT_INTENTS.items():
        scores[intent] = sum(1 for w in words if w in n)
    best = max(scores, key=scores.get)
    return best if scores[best] else None


def conversation_signals_from_messages(messages: list[str]) -> ConversationSignals:
    joined = "\n".join(messages)
    result = compute_svi(joined)
    fear_mentions = result.indicator_keys.count("fear") + joined.lower().count("threat")
    return ConversationSignals(
        immediate_safety_risk="safety_no" in result.indicator_keys,
        repeated_fear_or_threat=fear_mentions >= 2 or joined.lower().count("dhamki") >= 2,
        cannot_access_support=any(
            p in joined.lower() for p in ["cannot call", "no phone", "phone nahi", "madad nahi", "help nahi mil"]
        ),
        urgent_assistance="assistance" in result.indicator_keys,
        message_count=len(messages),
    )

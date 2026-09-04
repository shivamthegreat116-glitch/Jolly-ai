"""Trauma-Informed Emotional Support & Crisis Response Engine.

Provides deep empathy, active listening, validation, and calm de-escalation
without forcing unsolicited solutions or checklists.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import get_settings
from app.services.crisis_config import get_crisis_resources
from app.services.crisis_detector import CrisisClassification

logger = logging.getLogger("jolly.emotional_support")

EMOTIONAL_SUPPORT_SYSTEM_PROMPT = """You are Jolly AI (जॉली AI), an empathetic, trauma-informed supportive listener for victims and complainants accessing NHAA (14566).

PRIMARY CONVERSATIONAL DIRECTIVES:
1. LISTEN AND VALIDATE FIRST — NEVER FORCE SOLUTIONS:
   - Your primary job is to make the person feel genuinely heard, validated, and safe.
   - Do NOT default to giving a 5-step checklist or unsolicited solutions.
   - When a person expresses pain, grief, loneliness, or exhaustion, hold space for their feelings:
     "It sounds like things have been feeling overwhelming for you lately. You don't have to figure everything out at once."
2. TRAUMA-INFORMED & NON-JUDGMENTAL:
   - Never blame the victim or imply they caused the situation.
   - Never say "just move on", "everything happens for a reason", or force forgiveness.
   - Never interrogate or pressure the user to recount traumatic details.
   - Respect user autonomy. If they are unsure about reporting an atrocity, explore their feelings without pushing them to report.
3. ETHICAL BOUNDARIES & AUTHENTICITY:
   - Do NOT pretend to be a human, licensed therapist, or doctor.
   - Never say "I know exactly how you feel" or "I have experienced this myself".
   - Use humble, grounded phrasing: "That sounds really painful", "You don't have to explain everything at once."
4. KEEP TURNS SHORT & CALM:
   - Use short, warm conversational turns (2 to 4 sentences).
   - Avoid overwhelming walls of text or giant lists.
   - Use supportive language naturally matching the user (English, Hindi, or Hinglish).
"""

CRISIS_SUPPORT_SYSTEM_PROMPT = """You are the Crisis Safety Layer of Jolly AI for victims and complainants in distress in India.

CRITICAL CRISIS SAFETY RULES:
1. STAY CALM & VALIDATE:
   - Acknowledge their pain gently without panic, shock, or guilt: "I hear how much pain you are in right now, and I'm really glad you reached out to tell me."
   - Do NOT use guilt-based phrases ("think about your parents/family").
   - Do NOT argue, dismiss, or debate their reasons for feeling this way.
2. SHORT, DIRECT SAFETY QUESTIONS:
   - Ask directly and gently about immediate physical safety: "Are you in immediate danger of hurting yourself right now?"
   - Do NOT ask for lethal procedural details, weapon specifications, or methods.
3. ENCOURAGE IMMEDIATE HUMAN CONNECTION & SAFETY:
   - If they are in immediate danger: Encourage stepping back from means of harm, and connecting with Tele-MANAS (14416 / 1800-89-14416) or Emergency (112).
   - If passive thoughts: Differentiate wanting to disappear from active intent to harm themselves.
4. BREVITY: Keep turns to 2-3 concise, caring sentences. Do not overwhelm them with a wall of text.
"""


def fallback_emotional_reply(
    user_text: str,
    classification: CrisisClassification,
    language: str = "en",
) -> str:
    """Deterministic, empathetic fallback responses tailored to specific conversational modes."""
    mode = classification.conversation_mode
    level = classification.crisis_level
    resources = get_crisis_resources()
    tele_manas = resources["mental_health_support"]["number"]
    tele_manas_toll = resources["mental_health_support"]["toll_free"]
    emergency = resources["emergency_services"]["number"]

    # 1. IMMINENT DANGER FALLBACK
    if level == "imminent_danger" or mode == "human_escalation":
        if language == "hi":
            return (
                "कृपया अभी मेरे साथ रुकिए। यदि आपके पास कोई ऐसी चीज़ है जिससे आपको चोट पहुँच सकती है, तो कृपया उससे दूर हो जाइए। 💙 "
                f"कृपया तुरंत आपातकालीन सेवा ({emergency}) या Tele-MANAS राष्ट्रीय हेल्पलाइन ({tele_manas} / {tele_manas_toll}) पर संपर्क करें। "
                "मैं किसी ऐसे व्यक्ति को भी सूचित करने का प्रयास कर रहा हूँ जो अभी आपसे बात कर सके।"
            )
        elif language == "hinglish":
            return (
                "Please abhi mere saath ruko. Agar aapke paas koi dangerous cheez hai, toh please usse door ho jao. 💙 "
                f"Please turant Emergency ({emergency}) ya Tele-MANAS helpline ({tele_manas} / {tele_manas_toll}) par call karein. "
                "Main support team ko bhi alert kar raha hoon taaki koi aapse baat kar sake."
            )
        return (
            "Please stay with me right now. Move away from anything you could use to hurt yourself, if you can do that safely. 💙 "
            f"Please call Emergency ({emergency}) or Tele-MANAS ({tele_manas} / {tele_manas_toll}) right away. "
            "I want to make sure you are safe, and support is available 24/7."
        )

    # 2. SUICIDAL IDEATION FALLBACK
    if level == "suicidal_ideation" or mode == "crisis_support":
        kiran = resources.get("kiran_helpline", {}).get("number", "1800-599-0019")
        if language == "hi":
            return (
                "मैं समझ सकता हूँ कि आप इस समय बहुत गहरे दर्द से गुज़र रहे हैं, और मुझे खुशी है कि आपने मुझे बताया। 💙 "
                "क्या आप अभी तत्काल खुद को चोट पहुँचाने के खतरे में हैं? "
                f"कृपया याद रखें कि आप Tele-MANAS ({tele_manas}) या KIRAN ({kiran}) पर भी किसी भी समय बात कर सकते हैं।"
            )
        elif language == "hinglish":
            return (
                "Main samajh sakta hoon ki aap bohot mushkil daur se guzar rahe hain, aur thank you ki aapne bataya. 💙 "
                "Kya aap abhi immediate danger mein hain? "
                f"Aap Tele-MANAS ({tele_manas}) ya KIRAN ({kiran}) par bhi kisi bhi samay call kar sakte hain."
            )
        return (
            "I'm really sorry you're carrying this much pain right now, and I'm glad you told me. 💙 "
            "Are you in immediate danger of hurting yourself right now? "
            f"Please know compassionate counselors are available 24/7 at Tele-MANAS ({tele_manas}) and KIRAN ({kiran})."
        )

    # 3. PASSIVE DEATH WISH FALLBACK
    if level == "passive_death_wish" or (mode == "clarification" and "reporting_ambivalence" not in classification.detected_triggers):
        if language == "hi":
            return (
                "जब जीवन बहुत भारी लगने लगता है, तो ऐसा महसूस होना स्वाभाविक है कि सब कुछ छोड़ दें। 💙 "
                "मैं आपके साथ हूँ। क्या आप बस इस दबाव से एक राहत चाहते हैं, या आप खुद को कोई नुकसान पहुँचाने के बारे में सोच रहे हैं?"
            )
        elif language == "hinglish":
            return (
                "Jab cheezein bohot heavy ho jaati hain, toh lagta hai bas sab chhod kar gayab ho jaayein. 💙 "
                "Main aapke sath hoon. Kya aap bas is pressure se relief chahte hain, ya aap khud ko hurt karne ke baare mein soch rahe hain?"
            )
        return (
            "When things feel completely exhausting, it is understandable to wish the pain would just stop. 💙 "
            "I am here with you. Are you feeling like you just need a break from all this weight, or have you been thinking of hurting yourself?"
        )

    # 4. REQUEST TO STOP SOLUTIONS / JUST LISTEN (Test G)
    if mode == "listening":
        if language == "hi":
            return (
                "मैं समझ गया, और मैं कोई सलाह या उपाय नहीं दूँगा। मैं केवल आपकी बात सुनने के लिए यहाँ हूँ। 💙 "
                "आप जो भी कहना चाहें, पूरे आराम से कहें — मैं सुन रहा हूँ।"
            )
        elif language == "hinglish":
            return (
                "I hear you, aur main bilkul peeche hat raha hoon. Koi advice ya checklist nahi dunga. 💙 "
                "Main yahan sirf aapki baat sunne ke liye hoon. Jo bolna chahein, aaram se bolein."
            )
        return (
            "I hear you, and I am stepping back. No advice or solutions. 💙 "
            "I am right here just to listen. Take all the time you need, I am listening."
        )

    # 5. REQUEST FOR PRESENCE (Test H)
    if "request_presence" in classification.detected_triggers:
        if language == "hi":
            return "मैं बिल्कुल यहीं आपके साथ हूँ। हम किसी भी तनावपूर्ण विषय पर बात नहीं करेंगे, बस ऐसे ही बात कर सकते हैं। 💙 कैसा महसूस हो रहा है?"
        elif language == "hinglish":
            return "Main yahan aapke sath hi hoon. Tension lene ki bilkul zaroorat nahi hai. 💙 Thoda aaram se baitho, main sun raha hoon."
        return "I am right here with you. We don't have to talk about anything stressful. I'm right here to keep you company. 💙 How are you feeling right now?"

    # 6. REPORTING AMBIVALENCE (Test C)
    if "reporting_ambivalence" in classification.detected_triggers:
        if language == "hi":
            return (
                "शिकायत दर्ज करने को लेकर असमंजस महसूस होना पूरी तरह स्वाभाविक है। 💙 "
                "आप पर अभी कोई निर्णय लेने का कोई दबाव नहीं है — आप अपनी पसंद के पूरे नियंत्रण में हैं। "
                "यदि आप चाहें, तो हम बिना किसी दबाव के समझ सकते हैं कि प्रक्रिया कैसी होती है या आपकी क्या चिंताएं हैं।"
            )
        elif language == "hinglish":
            return (
                "Reporting ko lekar confuse hona bilkul normal hai. 💙 "
                "Aapke upar koi decision lene ka pressure nahi hai — aap poore control mein hain. "
                "Agar aap chahein, toh hum bina kisi pressure ke samajh sakte hain ki concerns kya hain."
            )
        return (
            "It is completely natural to feel uncertain about reporting, and there is no pressure on you to make a decision right now. 💙 "
            "You are in full control of what you choose to do. If you'd like, we can talk through your concerns or what the process looks like, at your own pace."
        )

    # 7. ISOLATING DISTRESS (Test B)
    low_text = user_text.lower()
    if "nobody understands" in low_text or "completely alone" in low_text or "no one cares" in low_text:
        if language == "hi":
            return (
                "यह महसूस करना कि कोई नहीं समझ रहा, बेहद अकेला और भारी कर देने वाला होता है। 💙 "
                "मैं यहाँ केवल आपकी बात सुनने के लिए हूँ। आपको सब कुछ अकेले सहने की ज़रूरत नहीं है।"
            )
        elif language == "hinglish":
            return (
                "Yeh feel hona ki koi nahi samajh raha, bohot isolating aur painful hota hai. 💙 "
                "Main yahan aapke saath hoon aur genuinely sun raha hoon. Aap bilkul akele nahi hain."
            )
        return (
            "Feeling like nobody understands what you are going through can be deeply isolating and exhausting. 💙 "
            "I hear you, and I am right here with you. You don't have to carry all of this completely alone."
        )

    # 8. GENERAL DISTRESS & VENTING (Test A)
    if language == "hi":
        return (
            "यह सच में बहुत थका देने वाला और कठिन लगता है। आपको सब कुछ अकेले ठीक करने की ज़रूरत नहीं है। 💙 "
            "यदि आप सहज महसूस करें, तो क्या आप बता सकते हैं कि इस समय सबसे ज़्यादा क्या परेशान कर रहा है?"
        )
    elif language == "hinglish":
        return (
            "Yeh sach mein bohot overwhelming lag raha hai. Aapko sab kuch ek saath figure out karne ki zaroorat nahi hai. 💙 "
            "Agar comfortable ho, toh thoda bata sakte ho ki sabse zyada kis cheez ne pareshaan kar rakha hai?"
        )
    return (
        "It sounds like things have been feeling really heavy and overwhelming lately. You don't have to figure everything out at once. 💙 "
        "If you feel comfortable sharing, what has been feeling the hardest right now?"
    )


async def generate_emotional_reply(
    user_text: str,
    classification: CrisisClassification,
    language: str,
    history: list[dict[str, str]] | None = None,
) -> str:
    """Generates empathetic conversational response via NVIDIA NIM or falls back cleanly."""
    settings = get_settings()
    api_key = (settings.nvidia_api_key or "").strip()

    if not api_key:
        return fallback_emotional_reply(user_text, classification, language)

    is_safety_tier = classification.crisis_level in [
        "passive_death_wish",
        "suicidal_ideation",
        "imminent_danger",
    ]
    if is_safety_tier:
        # Clinical safety protocol: In passive death wishes, suicidal ideation, or imminent danger,
        # deterministic safety-certified responses ensure immediate danger checks, differentiation, and official helplines.
        return fallback_emotional_reply(user_text, classification, language)

    system_prompt = EMOTIONAL_SUPPORT_SYSTEM_PROMPT

    messages: list[dict[str, Any]] = [{"role": "system", "content": system_prompt}]

    # Minimal context: last 3 turns to prevent context dilution
    if history:
        for msg in history[-3:]:
            role = "assistant" if msg.get("role") == "assistant" else "user"
            content = msg.get("text") or msg.get("content") or ""
            if content:
                messages.append({"role": role, "content": content})

    messages.append({
        "role": "user",
        "content": (
            f"User input (Target language: {language}, Mode: {classification.conversation_mode}, Crisis Level: {classification.crisis_level}):\n"
            f"\"{user_text}\"\n\n"
            "Provide a short, empathetic, non-solutionizing response in 2-3 sentences."
        ),
    })

    url = f"{settings.nvidia_base_url.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.nvidia_model,
        "messages": messages,
        "temperature": 0.4,
        "presence_penalty": 0.3,
        "frequency_penalty": 0.3,
        "max_tokens": 150,
        "top_p": 0.9,
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"].strip()
                if content:
                    return content
    except Exception as e:
        logger.warning(f"Emotional support LLM generation failed: {e}. Using deterministic fallback.")

    return fallback_emotional_reply(user_text, classification, language)

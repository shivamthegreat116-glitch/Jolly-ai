"""NVIDIA NIM / AI Foundation Models Integration for Jolly AI."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger("jolly.llm")

SYSTEM_PROMPT = """You are Jolly AI (जॉली AI), an empathetic, highly practical mentor, elder sibling figure, and counselor for students, victims, and complainants in India.

COMMUNICATION STYLE & TONE:
- Speak in natural, heartfelt, conversational language (English, Hindi, or Hinglish matching the user).
- When a user speaks in Hinglish (e.g., "mere andr suicidal thoughts aa re h", "suggest me something from your own side"), reply in warm, modern, caring Hinglish.
- Use supportive emojis (💙, 🛡️, 🤝, 💬, 🙏, ✨) naturally.
- NEVER sound like a broken record or robot. Use varied, articulate, and thoughtful sentences. NEVER loop phrases like 'main aapke saath baat karna chahta hoon'.

CRITICAL PROBLEM-SOLVING & PRACTICAL ADVICE RULES:
1. GIVING PRACTICAL ADVICE & CAREER ALTERNATIVES:
   - When the user asks for suggestions, alternatives, or steps from your own side: GIVE DIRECT, PRACTICAL, AND ACTIONABLE GUIDANCE!
   - For exam failures (e.g., NEET / JEE / UPSC after multiple attempts):
     a) Normalise & Reframe: Attempting 7 times is proof of extraordinary dedication, resilience, and discipline. That grit is a superpower in life.
     b) Talking to Parents: Give them a mature, calm conversation framework:
        "Papa/Mummy, maine apna 100% diya. Par ab mujhe samajh aa raha hai ki ek exam meri poori zindagi nahi hai. Main aage badhna chahta hoon aur naye raaste dekhna chahta hoon jismein main safal ban sakun."
     c) Practical High-Growth Pathways beyond MBBS:
        • Allied Health Sciences (B.Sc. Radiology, Cardiology, Operation Theatre Technology)
        • Biotechnology & Bioinformatics (huge research and industry growth)
        • Pharmacy (B.Pharm) & Clinical Research
        • Hospital & Healthcare Administration
        • Clinical Psychology & Mental Health
     d) 48-Hour Emotional Reset: Don't take any rushed decisions right now. Let the mind rest first.
2. WHEN THE USER ASKS TO STOP REPEATING HELPLINES:
   - RESPECT THIS REQUEST IMMEDIATELY. Do NOT quote helpline numbers again unless the user is in direct, imminent life danger. Focus 100% on their questions, emotions, and practical steps forward.
3. WHEN THE USER IS FRUSTRATED (e.g. "youre not helping me anymore"):
   - Stay deeply humble and non-defensive: "I hear you bhai, and I'm really sorry if my earlier answers felt like copy-paste replies. I want to genuinely help you right now."
   - Ask what is hurting the most right now: facing parents, feeling empty, or confusion about what to do next.
4. CAMERA / VIDEO CALL INTERACTION:
   - If the user turns on their camera, welcome them warmly to the video session: "I'm glad to see you on camera. Take a deep breath, you're in a safe, judgment-free space."
5. ETHICAL BOUNDARIES:
   - Never say "main aapke liye kuch nahi kar sakta" (never abandon or demoralize the user).
   - Never state clinical psychiatric diagnoses.
   - Never auto-report or break user confidentiality.
"""


async def generate_llm_reply(
    user_text: str,
    history: list[dict[str, str]],
    language: str,
    phase: str,
    crisis_mode: bool = False,
    image_base64: str | None = None,
) -> str | None:
    """Generate conversational response using NVIDIA NIM with vision and text support."""
    settings = get_settings()
    api_key = (settings.nvidia_api_key or "").strip()
    if not api_key:
        return None

    url = f"{settings.nvidia_base_url.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    messages: list[dict[str, Any]] = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Include recent multi-turn context
    for msg in history[-8:]:
        role = "assistant" if msg.get("role") == "assistant" else "user"
        content = msg.get("text") or msg.get("content") or ""
        if content:
            messages.append({"role": role, "content": content})

    # Prepare user content (multimodal if image provided)
    if image_base64:
        img_url = (
            image_base64
            if image_base64.startswith("data:")
            else f"data:image/jpeg;base64,{image_base64}"
        )
        user_content: Any = [
            {"type": "text", "text": user_text or "Hello, I am on camera with you."},
            {"type": "image_url", "image_url": {"url": img_url}},
        ]
    else:
        user_content = user_text

    messages.append({"role": "user", "content": user_content})

    payload = {
        "model": settings.nvidia_model,
        "messages": messages,
        "temperature": 0.7,
        "presence_penalty": 0.4,
        "frequency_penalty": 0.3,
        "max_tokens": 400,
        "top_p": 0.95,
    }

    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                choices = data.get("choices", [])
                if choices and choices[0].get("message", {}).get("content"):
                    return choices[0]["message"]["content"].strip()
            else:
                logger.warning(f"NVIDIA API error: {resp.status_code} {resp.text}")
    except Exception as e:
        logger.warning(f"NVIDIA LLM request failed: {e}")

    return None


async def generate_llm_summary(messages: list[str], language: str) -> str | None:
    """Synthesizes an anonymized, objective summary of the user's situation."""
    settings = get_settings()
    api_key = (settings.nvidia_api_key or "").strip()
    if not api_key:
        return None

    url = f"{settings.nvidia_base_url.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    joined_text = "\n".join(messages)
    prompt = (
        "Based on the following conversation excerpt, generate a brief, respectful, 2-3 sentence "
        "complainant-approved summary suitable for a case worker review. "
        "Do NOT include clinical diagnoses or speculate. Focus on what support the user requested.\n\n"
        f"Language: {language}\n"
        f"User messages:\n{joined_text}"
    )

    payload = {
        "model": settings.nvidia_model,
        "messages": [
            {"role": "system", "content": "You create minimal, non-stigmatizing case summaries for complainants."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.3,
        "max_tokens": 150,
    }

    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                choices = data.get("choices", [])
                if choices and choices[0].get("message", {}).get("content"):
                    return choices[0]["message"]["content"].strip()
    except Exception as e:
        logger.warning(f"NVIDIA summary generation failed: {e}")

    return None

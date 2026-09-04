"""Whisper-compatible STT and TTS provider abstractions. Fail open to text-only."""

from __future__ import annotations

import httpx

from app.config import get_settings


async def transcribe_whisper(file_bytes: bytes, filename: str, language_hint: str | None = None) -> dict:
    settings = get_settings()
    if not settings.whisper_api_url:
        return {
            "ok": False,
            "transcript": "",
            "language": language_hint or "unknown",
            "error": "stt_unavailable",
            "message": (
                "Server speech-to-text is not configured. You can type, use in-browser speech recognition, "
                "or set WHISPER_API_URL. Silence or missing audio never increases risk."
            ),
        }
    headers = {}
    if settings.whisper_api_key:
        headers["Authorization"] = f"Bearer {settings.whisper_api_key}"
    files = {"file": (filename or "audio.webm", file_bytes)}
    data = {}
    if language_hint:
        data["language"] = language_hint
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(settings.whisper_api_url, headers=headers, files=files, data=data)
        r.raise_for_status()
        payload = r.json()
    return {
        "ok": True,
        "transcript": payload.get("text") or payload.get("transcript") or "",
        "language": payload.get("language") or language_hint or "unknown",
        "error": None,
        "message": "ok",
    }


async def synthesize_speech(text: str, language: str) -> dict:
    settings = get_settings()
    if not settings.tts_api_url:
        return {
            "ok": False,
            "audio_b64": None,
            "fallback": "browser_speech_synthesis",
            "message": "Use the browser SpeechSynthesis fallback. No server TTS configured.",
        }
    headers = {"Content-Type": "application/json"}
    if settings.tts_api_key:
        headers["Authorization"] = f"Bearer {settings.tts_api_key}"
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            settings.tts_api_url,
            headers=headers,
            json={"text": text, "language": language, "style": "calm"},
        )
        r.raise_for_status()
        return {"ok": True, **r.json(), "fallback": None}

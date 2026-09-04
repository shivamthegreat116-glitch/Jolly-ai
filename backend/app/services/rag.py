"""Verified-directory RAG. Never invent contacts or laws — retrieve only seeded docs."""

from __future__ import annotations

import re
from pathlib import Path

from app.config import get_settings

_COLLECTION = None


def _docs() -> list[dict]:
    return [
        {
            "id": "nhaa-14566",
            "title": "NHAA Helpline 14566 (DEMO DATA — verify before sharing)",
            "category": "government",
            "text": (
                "National Helpline Against Atrocities (NHAA) number commonly cited as 14566. "
                "This entry is DEMO DATA for SIH 2026. Confirm the live number and hours on an official government source "
                "before advising a complainant. Jolly AI must not invent complaint procedures."
            ),
        },
        {
            "id": "emergency-112",
            "title": "Emergency 112 (DEMO DATA — verify)",
            "category": "emergency",
            "text": (
                "India's emergency number 112 may be used when there is immediate danger. "
                "Jolly AI never auto-dials. The user chooses. DEMO DATA — verify locally."
            ),
        },
        {
            "id": "women-181",
            "title": "Women helpline 181 (DEMO DATA — verify)",
            "category": "helpline",
            "text": "181 is often listed as a women helpline in many states. DEMO DATA — confirm for the relevant state.",
        },
        {
            "id": "child-1098",
            "title": "Childline 1098 (DEMO DATA — verify)",
            "category": "helpline",
            "text": "1098 is widely published as CHILDLINE. DEMO DATA — verify before sharing.",
        },
        {
            "id": "icall",
            "title": "iCall psychosocial support (DEMO DATA — verify)",
            "category": "counseling",
            "text": (
                "iCall (TISS) is a published counselling helpline. Do not invent hours or email. "
                "DEMO DATA — look up the current official contact before sharing."
            ),
        },
        {
            "id": "legal-nalsa",
            "title": "Legal aid — NALSA / DLSA (DEMO DATA)",
            "category": "legal",
            "text": (
                "Free legal aid may be available through Legal Services Authorities (NALSA / State / District). "
                "Jolly AI must not invent FIR steps, court procedures, or eligibility. DEMO DATA."
            ),
        },
        {
            "id": "medical-108",
            "title": "Ambulance 108 (DEMO DATA — verify)",
            "category": "medical",
            "text": "108 is commonly used for ambulance services in many Indian states. DEMO DATA — verify locally.",
        },
        {
            "id": "witness-protection",
            "title": "Witness protection — general (DEMO DATA)",
            "category": "protection",
            "text": (
                "Witness protection, if applicable, is handled by competent authorities under applicable schemes/laws. "
                "Do not invent scheme names or eligibility. Direct the user to verified legal aid. DEMO DATA."
            ),
        },
        {
            "id": "privacy-note",
            "title": "How Jolly AI uses information",
            "category": "privacy",
            "text": (
                "Jolly AI stores the minimum needed, encrypts conversation text, and does not share with case workers "
                "unless the user consents and approves a summary. Voice is analysed only with explicit consent. "
                "Raw audio is not kept by default."
            ),
        },
    ]


def _chroma():
    global _COLLECTION
    if _COLLECTION is not None:
        return _COLLECTION
    settings = get_settings()
    if not settings.use_chroma:
        return None
    try:
        import chromadb
        from chromadb.utils import embedding_functions
    except Exception:
        return None
    path = Path(settings.chroma_path)
    path.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=str(path))
    ef = embedding_functions.DefaultEmbeddingFunction()
    col = client.get_or_create_collection("jolly_kb", embedding_function=ef)
    existing = set(col.get()["ids"] or [])
    for d in _docs():
        if d["id"] not in existing:
            col.add(ids=[d["id"]], documents=[d["text"]], metadatas=[{"title": d["title"], "category": d["category"]}])
    _COLLECTION = col
    return col


def retrieve(query: str, k: int = 3) -> list[dict]:
    query = (query or "").strip()
    if not query:
        return []
    col = _chroma()
    if col is not None:
        try:
            res = col.query(query_texts=[query], n_results=k)
            out = []
            docs = res.get("documents") or [[]]
            metas = res.get("metadatas") or [[]]
            ids = res.get("ids") or [[]]
            for i, text in enumerate(docs[0]):
                meta = metas[0][i] if i < len(metas[0]) else {}
                out.append(
                    {
                        "id": ids[0][i] if i < len(ids[0]) else "",
                        "title": meta.get("title", ""),
                        "category": meta.get("category", ""),
                        "text": text,
                        "demo": True,
                    }
                )
            return out
        except Exception:
            pass
    return _keyword_fallback(query, k)


def _keyword_fallback(query: str, k: int) -> list[dict]:
    tokens = set(re.findall(r"[a-zA-Z0-9\u0900-\u097F]{3,}", query.lower()))
    scored = []
    for d in _docs():
        hay = (d["title"] + " " + d["text"]).lower()
        score = sum(1 for t in tokens if t in hay)
        scored.append((score, d))
    scored.sort(key=lambda x: x[0], reverse=True)
    out = []
    for score, d in scored[:k]:
        if score == 0 and len(out) == 0:
            # still return NHAA + privacy as safe defaults
            continue
        out.append({**d, "demo": True, "text": d["text"]})
    if not out:
        for d in _docs()[:2]:
            out.append({**d, "demo": True})
    return out[:k]

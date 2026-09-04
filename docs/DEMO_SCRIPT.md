# SaharaAI — 5-minute SIH 2026 demo script

**Do not** tell the jury the system diagnoses trauma. Open and close with the disclaimer.

## 0:00–0:40 — Problem and promise

“Complainants reaching NHAA 14566 may be in distress and may struggle to speak. SaharaAI is a privacy-first listener: Hindi, English, Hinglish; text or voice. It produces a **non-diagnostic** Stress Vulnerability Index and a suggested human pathway. It is **not** a hospital, court, or emergency service.”

Show the landing page banner.

## 0:40–1:20 — Consent

Open `/consent`. Tick **text** only first. Point out separate toggles for voice, storage, sharing. “We never score caste, religion, gender, or location.”

## 1:20–2:20 — Safe path (English)

Chat:

1. “Yes, I am safe.”
2. “Emotional support.”
3. “I feel scared after what happened. I do not want to give details.”

Show `/results`: Moderate/Low band, confidence, 2–4 plain reasons, **human review** if flagged. Emphasize no raw model dump.

## 2:20–3:20 — Crisis override (Hinglish, fictional)

New session (or continue carefully). Type a **fictional** line: “Mujhe bahut darr hai, unhone dhamki di, lekin main safe hoon doston ke ghar.”

Then a **clearly fictional** self-harm example only if the jury wants the override: skip live self-harm text if children are present; otherwise show the **unit test** `test_critical_override_self_harm` instead of typing it in the UI.

Show crisis pause, emergency button, confirmation modal: “We do not auto-dial 112.”

## 3:20–4:10 — Summary and staff

Edit `/summary`, approve, share. Sign in as counselor. Queue shows anonymized summary, SVI, confidence, **no audio**. Mark `reviewed`. Admin tab: DEMO DATA directory + audit log.

## 4:10–5:00 — Architecture and ethics

Mermaid in README: consent → SVI → RAG (no invented laws) → optional human. Close: “Text-only still works. Uncertainty means human review, not a stronger claim.”

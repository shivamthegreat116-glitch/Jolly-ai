# Limitations and ethical safeguards

Jolly AI is built for SIH 2026 problem SIH26093 as a **support and triage** module. It is not a substitute for trained counsellors, medical professionals, police, or courts.

## What the system must not claim

- It does **not** diagnose trauma, PTSD, depression, anxiety, or any mental-health condition.
- A Stress Vulnerability Index (SVI) is a **non-diagnostic** triage hint with a confidence level, not a clinical score.
- It does **not** guarantee safety, legal outcomes, or that a complaint will be registered.
- It must **not** invent laws, helpline numbers, eligibility rules, or FIR/portal steps. Directory rows are labelled **DEMO DATA** until an administrator marks them verified against an official source.

## Consent and data minimisation

- Text analysis, microphone use, storage, summary sharing, and human review are **separate** consents.
- Sessions are anonymous. Raw audio is not retained by default; only consented acoustic features may be stored.
- Conversation text is encrypted at rest. Default retention is 30 days. **Delete my data** removes session content; a content-free audit row remains.
- Caste, religion, gender, disability, location, and other sensitive identity attributes are **not** used as predictors of risk.

## Crisis handling

- Self-harm, imminent danger, ongoing violence, or urgent medical language triggers a **safety override** (Critical band) and pauses ordinary chat.
- Language stays calm and non-interrogative. The person is asked whether they are in immediate danger.
- Emergency resources are offered. **Nobody is contacted automatically.** A confirmation screen is required, except if an operator later sets a documented `LEGAL_SHARE_PROTOCOL` (default off) under applicable law — that flag is not a substitute for legal advice.

## Fairness and accessibility

- Missing voice, low audio quality, silence, accent, disability, poor connectivity, or language choice **do not** increase SVI.
- Voice is never used alone to infer emotion.
- If input is thin or confidence is low, the engine **caps** strong claims and recommends human review.
- Hindi, English, and Hinglish ship in the MVP; additional Indian languages are a locale/lexicon extension, not a new architecture.

## Human oversight

- High and Critical bands set `human_review_flag`.
- Case workers see only **user-approved** summaries after share consent.
- Access and status changes are written to an append-only audit log.
- Aggregate dashboards contain counts, not identities.

## Residual risk

Keyword and rule methods will **miss** some distress and **over-flag** some phrases. That is why confidence, explanations, and a human pathway exist. Deployments must keep the directory verified, rotate secrets, and place the service behind HTTPS with a real `SECRET_KEY` and `ENCRYPTION_KEY`.

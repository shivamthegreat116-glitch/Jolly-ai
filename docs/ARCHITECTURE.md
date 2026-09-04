# Architecture notes

Languages are a `language` string on the session (`en` | `hi` | `hinglish`) plus lexicon/locale tables. Adding Marathi, Bengali, Tamil, Telugu, Kannada, Malayalam, Gujarati, Punjabi, or Urdu means:

1. New locale strings in `chat_engine.COPY` and `frontend/src/lib/i18n.ts`
2. New lexicon phrases in `lexicon.py`
3. STT `lang` tags (for example `ta-IN`)
4. No change to SVI math or database schema

RAG uses Chroma when the embedding stack loads; otherwise a keyword fallback over the same verified documents. Both refuse to invent contacts.

Speech providers are URL adapters. Browser SpeechSynthesis is the default TTS so a hackathon laptop needs no paid key.

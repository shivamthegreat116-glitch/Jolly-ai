"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { EmergencyButton } from "@/components/EmergencyButton";

export default function ConsentPage() {
  const router = useRouter();
  const [language, setLanguage] = useState("en");
  const [mode, setMode] = useState("text");
  const [text, setText] = useState(false);
  const [voice, setVoice] = useState(false);
  const [storage, setStorage] = useState(false);
  const [share, setShare] = useState(false);
  const [review, setReview] = useState(false);
  const [err, setErr] = useState("");

  async function start() {
    setErr("");
    try {
      const r = await api<{ session_id: string }>("/api/session", {
        method: "POST",
        body: JSON.stringify({
          language,
          interaction_mode: mode,
          consent_text: text,
          consent_voice: voice,
          consent_storage: storage,
          consent_share_summary: share,
          consent_human_review: review,
        }),
      });
      sessionStorage.setItem("jolly_session", r.session_id);
      sessionStorage.setItem("jolly_lang", language);
      sessionStorage.setItem("jolly_voice", voice ? "1" : "0");
      sessionStorage.setItem("jolly_storage", storage ? "1" : "0");
      sessionStorage.setItem("jolly_mode", mode);
      router.push("/chat");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not start");
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="flex justify-between">
        <h1 className="text-3xl text-sage-800">Before we begin</h1>
        <EmergencyButton />
      </div>
      <p className="mt-3 text-stone-600">
        Please read this carefully. You can use Jolly AI without voice, without storage, and without
        sharing. Analysis of conversation text requires the first consent below.
      </p>

      <label className="mt-6 block text-sm font-medium">Language</label>
      <select
        className="mt-1 w-full rounded-xl border p-3"
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
      >
        <option value="en">English</option>
        <option value="hi">हिन्दी (Hindi)</option>
        <option value="hinglish">Hinglish</option>
        <option value="mr">मराठी (Marathi)</option>
        <option value="bn">বাংলা (Bengali)</option>
        <option value="ta">தமிழ் (Tamil)</option>
        <option value="te">తెలుగు (Telugu)</option>
      </select>
      <p className="mt-1 text-xs text-stone-500">
        Multilingual support across English, Hindi, Hinglish, Marathi, Bengali, Tamil, and Telugu.
      </p>

      <label className="mt-4 block text-sm font-medium">How would you like to talk?</label>
      <select className="mt-1 w-full rounded-xl border p-3" value={mode} onChange={(e) => setMode(e.target.value)}>
        <option value="text">Text only</option>
        <option value="voice">Voice (microphone, after consent)</option>
        <option value="both">Text and voice</option>
      </select>

      <fieldset className="mt-6 space-y-3">
        {[
          ["I agree to type (or paste a corrected transcript) and receive supportive replies. Required.", text, setText],
          ["I opt in to microphone recording and privacy-safe voice features (rate, pauses, volume variability). Raw audio is not kept by default.", voice, setVoice],
          ["I allow encrypted storage of this conversation until the retention date (default 30 days).", storage, setStorage],
          ["I may later share an approved, anonymized summary with a case worker.", share, setShare],
          ["I am willing for a trained human reviewer to look at my consented summary if risk may be high.", review, setReview],
        ].map(([label, val, setter]) => (
          <label key={String(label)} className="flex gap-3 rounded-xl bg-white p-3 shadow-sm">
            <input
              type="checkbox"
              checked={val as boolean}
              onChange={(e) => (setter as (v: boolean) => void)(e.target.checked)}
            />
            <span>{label as string}</span>
          </label>
        ))}
      </fieldset>

      {err && <p className="mt-4 text-clay-600">{err}</p>}

      <button
        onClick={start}
        className="mt-6 rounded-full bg-sage-700 px-6 py-3 text-white disabled:opacity-40"
        disabled={!text}
      >
        I understand — continue
      </button>
    </main>
  );
}

import Link from "next/link";
import { EmergencyButton } from "@/components/EmergencyButton";

export default function LandingPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-sage-700">SIH26093 · NHAA 14566</p>
          <h1 className="mt-2 font-serif text-5xl text-sage-800">Jolly AI</h1>
          <p className="mt-4 max-w-2xl text-xl text-stone-700">
            A quiet place to be heard — and to find the next human step.
          </p>
        </div>
        <EmergencyButton />
      </div>

      <p className="mt-6 max-w-2xl text-stone-600">
        Jolly AI is a multilingual chatbot and optional voice assistant for victims and complainants.
        It listens in English, Hindi, Hinglish, Marathi, Bengali, Tamil, or Telugu, looks for possible distress indicators, and offers a
        non-diagnostic Stress Vulnerability Index with a suggested support pathway. A trained person
        stays in the loop whenever risk may be high — and only with your consent.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {[
          ["Privacy first", "Separate consent for text, voice, storage, and sharing. Delete my data anytime."],
          ["You stay in control", "No automatic calls to police, family, or counsellors. You confirm first."],
          ["Not a diagnosis", "Results include confidence and plain-language reasons. Never a clinical label."],
        ].map(([t, d]) => (
          <div key={t} className="rounded-2xl border border-sand-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-sage-800">{t}</h2>
            <p className="mt-2 text-sm text-stone-600">{d}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/consent"
          className="rounded-full bg-sage-700 px-6 py-3 text-white shadow hover:bg-sage-600"
        >
          Get support
        </Link>
        <Link href="/privacy" className="rounded-full border border-stone-300 px-6 py-3">
          Privacy & delete my data
        </Link>
        <Link href="/staff/login" className="rounded-full px-6 py-3 text-sage-800 underline">
          Staff sign in
        </Link>
      </div>
    </main>
  );
}

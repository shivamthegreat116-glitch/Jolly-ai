"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export interface ReferralItem {
  id?: string;
  name: string;
  contact: string;
  notes: string;
  service_type: string;
  region?: string;
  availability?: string;
  verified?: boolean;
  demo_data?: boolean;
}

export function EmergencyButton() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ReferralItem[]>([]);

  async function load() {
    setOpen(true);
    try {
      const data = await api<ReferralItem[]>("/api/referrals");
      setItems(data.filter((d) => ["emergency", "helpline", "government"].includes(d.service_type)));
    } catch {
      setItems([]);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={load}
        className="rounded-full bg-clay-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-clay-500"
      >
        Emergency help
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold">Help resources</h2>
            <p className="mt-2 text-sm text-stone-600">
              Jolly AI will not call anyone for you. Numbers below are <strong>DEMO DATA</strong> until
              an administrator marks them verified. If you are in immediate danger, use local emergency
              services yourself.
            </p>
            <ul className="mt-4 space-y-3">
              {items.map((it) => (
                <li key={it.name} className="rounded-xl border border-sand-200 bg-sand-50 p-3">
                  <div className="font-medium">{it.name}</div>
                  <div className="text-sage-700">{it.contact}</div>
                  <div className="text-xs text-stone-500">{it.notes}</div>
                </li>
              ))}
            </ul>
            <button className="mt-4 text-sm underline" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

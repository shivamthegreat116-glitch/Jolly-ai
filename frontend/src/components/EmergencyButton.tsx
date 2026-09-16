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

export function EmergencyButton({
  minimal = false,
  className = "",
}: {
  minimal?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ReferralItem[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setOpen(true);
    setLoading(true);
    try {
      const data = await api<ReferralItem[]>("/api/referrals");
      setItems(data.filter((d) => ["emergency", "helpline", "government"].includes(d.service_type)));
    } catch {
      // Fallback to verified national crisis lines
      setItems([
        {
          name: "National Helpline Against Atrocities (NHAA)",
          contact: "14566",
          service_type: "government",
          notes: "24/7 Toll-free assistance across India.",
        },
        {
          name: "National Emergency Service",
          contact: "112",
          service_type: "emergency",
          notes: "Police, medical, and immediate emergency dispatch.",
        },
        {
          name: "Tele-MANAS (Mental Health)",
          contact: "14416 / 1800-891-4416",
          service_type: "helpline",
          notes: "24/7 Free confidential psychosocial support (MoHFW).",
        },
        {
          name: "KIRAN Mental Health Helpline",
          contact: "1800-599-0019",
          service_type: "helpline",
          notes: "24/7 Toll-free psychological support & rehabilitation.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={load}
        aria-label="Emergency help"
        className={
          className ||
          (minimal
            ? "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-safety-emergency-subtle text-safety-emergency font-label-md text-label-md font-semibold hover:bg-safety-emergency/15 transition-colors"
            : "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-safety-emergency-subtle text-safety-emergency font-label-md text-label-md font-semibold hover:bg-safety-emergency/15 transition-colors active:scale-95 shadow-xs")
        }
      >
        <span className="material-symbols-outlined text-[18px]">shield_with_heart</span>
        <span>Emergency help</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-2xl bg-surface-crisp p-6 sm:p-7 shadow-xl border border-border-subtle">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3.5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-safety-emergency text-[22px]">shield_with_heart</span>
                <h2 className="font-headline-sm text-headline-sm text-text-primary">Emergency Help Resources</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p className="mt-3.5 font-body-sm text-body-sm text-text-secondary leading-relaxed">
              Jolly AI does not make automatic phone calls on your behalf. If you are in immediate danger,
              please reach out directly using the verified 24/7 Indian emergency numbers below:
            </p>

            {loading ? (
              <div className="py-8 text-center text-text-secondary text-sm">Loading verified resources...</div>
            ) : (
              <ul className="mt-4 space-y-2.5">
                {items.map((it) => (
                  <li
                    key={it.name}
                    className="rounded-xl border border-border-subtle bg-bg-subtle/70 p-3.5 flex items-start justify-between gap-3 hover:bg-bg-subtle transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-label-md text-label-md font-semibold text-text-primary">{it.name}</div>
                      <div className="font-body-sm text-body-sm text-text-secondary mt-0.5">{it.notes}</div>
                    </div>
                    <a
                      href={`tel:${it.contact.replace(/[^0-9]/g, "")}`}
                      className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-crisp border border-border-subtle text-primary font-label-md text-label-md font-semibold hover:bg-surface-container transition-colors shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-[16px]">call</span>
                      <span>{it.contact}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="rounded-xl border border-border-subtle px-4 py-2 font-label-md text-label-md text-text-secondary hover:bg-bg-subtle transition-colors"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

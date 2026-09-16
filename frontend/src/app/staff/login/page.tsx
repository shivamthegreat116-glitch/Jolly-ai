"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { SanctuaryHeader } from "@/components/SanctuaryHeader";

export default function StaffLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("counselor@jolly.demo");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  async function login() {
    setErr("");
    setIsLoggingIn(true);
    try {
      const r = await api<{ access_token: string; role: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      sessionStorage.setItem("jolly_token", r.access_token);
      sessionStorage.setItem("jolly_role", r.role);
      router.push(r.role === "admin" ? "/admin" : "/staff/dashboard");
    } catch {
      setErr("Sign-in failed. Please verify demo credentials.");
    } finally {
      setIsLoggingIn(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-canvas text-text-primary flex flex-col font-body-md antialiased">
      <SanctuaryHeader />

      <main className="flex-1 flex flex-col items-center justify-center px-gutter-sm sm:px-gutter py-16">
        <div className="w-full max-w-md bg-surface-crisp rounded-3xl p-7 sm:p-8 shadow-whisper border border-border-subtle/60 space-y-5">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container text-primary-container font-label-sm">
              Staff Portal
            </span>
            <h1 className="font-headline-md text-text-primary">Authorized sign in</h1>
            <p className="font-body-sm text-text-secondary">
              Role-based access for verified counselors and triage officers.
            </p>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="block font-label-sm text-text-secondary mb-1">Email address</label>
              <input
                className="w-full rounded-xl bg-bg-canvas border border-border-subtle/60 p-3 text-text-primary font-body-md focus:outline-none focus:ring-1 focus:ring-primary-container"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@organization.demo"
              />
            </div>

            <div>
              <label className="block font-label-sm text-text-secondary mb-1">Password</label>
              <input
                className="w-full rounded-xl bg-bg-canvas border border-border-subtle/60 p-3 text-text-primary font-body-md focus:outline-none focus:ring-1 focus:ring-primary-container"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {err && (
              <div className="p-3 rounded-xl bg-safety-emergency-subtle text-safety-emergency font-body-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{err}</span>
              </div>
            )}

            <button
              className="mt-2 w-full min-h-[48px] rounded-xl bg-primary-container text-surface-crisp font-label-lg font-medium shadow-sm hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              onClick={login}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <span className="material-symbols-outlined text-[18px] animate-spin">
                  progress_activity
                </span>
              ) : (
                <span className="material-symbols-outlined text-[18px]">lock_open</span>
              )}
              <span>Sign in securely</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

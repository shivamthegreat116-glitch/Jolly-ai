"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";

export default function StaffLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("counselor@jolly.demo");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function login() {
    setErr("");
    try {
      const r = await api<{ access_token: string; role: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      sessionStorage.setItem("jolly_token", r.access_token);
      sessionStorage.setItem("jolly_role", r.role);
      router.push(r.role === "admin" ? "/admin" : "/staff/dashboard");
    } catch {
      setErr("Sign-in failed");
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-3xl text-sage-800">Staff sign in</h1>
      <p className="mt-2 text-sm text-stone-600">Role-based access. Demo accounts are in the README.</p>
      <input className="mt-6 w-full rounded-xl border p-3" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="mt-3 w-full rounded-xl border p-3" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {err && <p className="mt-2 text-clay-600">{err}</p>}
      <button className="mt-4 w-full rounded-full bg-sage-700 py-3 text-white" onClick={login}>
        Sign in
      </button>
    </main>
  );
}

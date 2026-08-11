"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not sign in.");
        setBusy(false);
        return;
      }
      await refresh();
      const next = params.get("next");
      router.replace(next && next.startsWith("/") ? next : "/");
    } catch {
      setError("Network error — please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="iris-auth-card">
      <div className="iris-auth-brand">
        <span className="iris-logo-mark">i</span>
        Iris
      </div>
      <h1 className="iris-h1" style={{ fontSize: 22 }}>Welcome back</h1>
      <p className="iris-sub" style={{ marginBottom: 22 }}>Sign in to your projects.</p>

      <form onSubmit={submit}>
        <div className="iris-field">
          <label className="iris-label">Email</label>
          <input
            className="iris-input"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            required
          />
        </div>
        <div className="iris-field">
          <label className="iris-label">Password</label>
          <input
            className="iris-input"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <div className="iris-warn" style={{ marginBottom: 14 }}>{error}</div>}

        <button className="iris-btn iris-btn-primary" type="submit" disabled={busy} style={{ width: "100%", justifyContent: "center" }}>
          {busy && <span className="iris-spinner" />}
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="iris-auth-alt">
        Don&apos;t have an account? <Link href="/signup">Create one</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

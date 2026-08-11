"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function SignupPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not create account.");
        setBusy(false);
        return;
      }
      await refresh();
      router.replace("/");
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
      <h1 className="iris-h1" style={{ fontSize: 22 }}>Create your account</h1>
      <p className="iris-sub" style={{ marginBottom: 22 }}>Start building unique pSEO sites.</p>

      <form onSubmit={submit}>
        <div className="iris-field">
          <label className="iris-label">Name</label>
          <input
            className="iris-input"
            type="text"
            autoComplete="name"
            placeholder="Jane Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
        <div className="iris-field">
          <label className="iris-label">Email</label>
          <input
            className="iris-input"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="iris-field">
          <label className="iris-label">Password</label>
          <input
            className="iris-input"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <span className="iris-hint">Use at least 8 characters.</span>
        </div>

        {error && <div className="iris-warn" style={{ marginBottom: 14 }}>{error}</div>}

        <button className="iris-btn iris-btn-primary" type="submit" disabled={busy} style={{ width: "100%", justifyContent: "center" }}>
          {busy && <span className="iris-spinner" />}
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="iris-auth-alt">
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </div>
  );
}

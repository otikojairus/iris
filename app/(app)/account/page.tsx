"use client";

import { useState } from "react";
import { Topbar } from "@/components/topbar";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/toast";

export default function AccountPage() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setError("New passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not change password.");
        setBusy(false);
        return;
      }
      toast("Password changed");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch {
      setError("Network error — please try again.");
    }
    setBusy(false);
  }

  return (
    <>
      <Topbar crumbs={[{ label: "Dashboard", href: "/" }, { label: "Account" }]} />
      <div className="iris-content" style={{ maxWidth: 620 }}>
        <div className="iris-page-head">
          <div>
            <h1 className="iris-h1">Account</h1>
            <p className="iris-sub">Manage your profile and password.</p>
          </div>
        </div>

        <section className="iris-card" style={{ marginBottom: 20 }}>
          <h2 className="iris-h2" style={{ marginBottom: 16 }}>Profile</h2>
          <div className="iris-row">
            <div>
              <div style={{ fontWeight: 600 }}>{user?.name || "—"}</div>
              <div className="iris-hint">{user?.email || "—"}</div>
            </div>
            <button className="iris-btn" onClick={() => void logout()}>Sign out</button>
          </div>
        </section>

        <section className="iris-card">
          <h2 className="iris-h2" style={{ marginBottom: 16 }}>Change password</h2>
          <form onSubmit={changePassword}>
            <div className="iris-field">
              <label className="iris-label">Current password</label>
              <input
                className="iris-input"
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
              />
            </div>
            <div className="iris-field">
              <label className="iris-label">New password</label>
              <input
                className="iris-input"
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                required
              />
              <span className="iris-hint">Use at least 8 characters.</span>
            </div>
            <div className="iris-field">
              <label className="iris-label">Confirm new password</label>
              <input
                className="iris-input"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>

            {error && <div className="iris-warn" style={{ marginBottom: 14 }}>{error}</div>}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="iris-btn iris-btn-primary" type="submit" disabled={busy}>
                {busy && <span className="iris-spinner" />}
                {busy ? "Saving…" : "Update password"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </>
  );
}

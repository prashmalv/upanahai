"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";

export function ChangePasswordForm() {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);

    if (newPassword !== confirm) {
      setError("New passwords don't match");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setError(data.error || "Could not change password");
      return;
    }
    setDone(true);
    setCurrent("");
    setNext("");
    setConfirm("");
  }

  return (
    <form onSubmit={submit} className="card space-y-3 p-5">
      <p className="flex items-center gap-2 font-bold text-slate-900">
        <KeyRound size={16} /> Change password
      </p>
      <input
        className="input"
        type="password"
        autoComplete="current-password"
        placeholder="Current password"
        value={currentPassword}
        onChange={(e) => setCurrent(e.target.value)}
        required
      />
      <input
        className="input"
        type="password"
        autoComplete="new-password"
        placeholder="New password (min 8 characters)"
        value={newPassword}
        onChange={(e) => setNext(e.target.value)}
        required
        minLength={8}
      />
      <input
        className="input"
        type="password"
        autoComplete="new-password"
        placeholder="Confirm new password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        required
        minLength={8}
      />
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {done && (
        <p className="text-sm font-medium text-emerald-600">
          Password updated. Your session has been refreshed.
        </p>
      )}
      <button className="btn-primary w-full" disabled={saving}>
        {saving ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}

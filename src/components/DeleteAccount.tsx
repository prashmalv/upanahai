"use client";

import { useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";

/**
 * Self-serve account deletion.
 *
 * Two deliberate frictions. The consequences are listed before the control is
 * shown, not in a confirm() dialog after — a dialog appears once the person has
 * already decided. And the confirmation is typed, because this is irreversible and
 * a mis-click should not be enough.
 */
export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setError(null);
    setBusy(true);
    const res = await fetch("/api/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: "DELETE" })
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setBusy(false);
      setError(d.error || "Could not delete the account");
      return;
    }
    window.location.href = "/";
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:underline"
      >
        <Trash2 size={13} /> Delete my account
      </button>
    );
  }

  return (
    <div className="rounded-xl bg-rose-50 p-4 ring-1 ring-rose-200">
      <p className="flex items-center gap-2 text-sm font-black text-rose-900">
        <AlertTriangle size={15} /> This cannot be undone
      </p>
      <p className="mt-2 text-xs leading-relaxed text-rose-900">
        Deleting your account removes your measurements, your health log and
        follow-ups, your wishlist, and — the part people don&apos;t expect — the
        questions and answers you posted publicly. Someone may be relying on an
        answer you wrote. Your page views stay in our totals with your name detached
        from them.
      </p>
      <label className="mt-3 block">
        <span className="text-xs font-semibold text-rose-900">
          Type DELETE to confirm
        </span>
        <input
          className="input mt-1"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="DELETE"
          autoComplete="off"
        />
      </label>
      {error && <p className="mt-2 text-xs font-semibold text-rose-700">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          onClick={remove}
          disabled={busy || typed !== "DELETE"}
          className="btn-primary bg-rose-600 hover:bg-rose-700 disabled:opacity-40"
        >
          {busy ? "Deleting…" : "Delete my account"}
        </button>
        <button
          onClick={() => {
            setOpen(false);
            setTyped("");
            setError(null);
          }}
          className="btn-ghost"
        >
          Keep my account
        </button>
      </div>
    </div>
  );
}

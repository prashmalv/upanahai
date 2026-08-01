"use client";

import { useState } from "react";
import { KeyRound, AlertTriangle, Copy, Check, X } from "lucide-react";

type Req = {
  id: string;
  email: string;
  note: string;
  at: string;
  hasAccount: boolean;
  name: string;
  isAdmin: boolean;
};

/**
 * The interim password-reset desk.
 *
 * Someone forgets their password, it lands here, the admin resets it and passes
 * the temporary one on. That only works while there are few enough users for a
 * person to keep up — the panel says so, because the moment it stops being true
 * this needs to become an email link and nobody will notice on their own.
 *
 * The generated password is shown once and never stored in the clear. There is no
 * "show it again": losing it means resetting again, which is the right trade.
 */
export function ResetRequests({ requests }: { requests: Req[] }) {
  const [rows, setRows] = useState(requests);
  const [issued, setIssued] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(r: Req, action: "reset" | "dismiss") {
    setError(null);
    setBusy(r.id);
    const res = await fetch("/api/admin/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        action === "dismiss"
          ? { action: "dismiss", requestId: r.id }
          : { email: r.email }
      )
    });
    const d = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setError(d.error || "That didn't work");
      return;
    }
    if (action === "dismiss") {
      setRows((x) => x.filter((y) => y.id !== r.id));
      return;
    }
    setIssued((m) => ({ ...m, [r.id]: d.password }));
  }

  if (rows.length === 0) {
    return (
      <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
        Nobody is locked out. Requests from the sign-in page appear here.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {error && (
        <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">
          {error}
        </p>
      )}

      {rows.map((r) => {
        const password = issued[r.id];
        return (
          <div key={r.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-slate-900">{r.email}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {r.name && <>{r.name} · </>}
                  asked {new Date(r.at).toLocaleString("en-IN", {
                    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                  })}
                </p>
                {r.note && (
                  <p className="mt-2 rounded-lg bg-slate-50 p-2 text-sm text-slate-600">
                    &ldquo;{r.note}&rdquo;
                  </p>
                )}
              </div>

              {!password && (
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => act(r, "reset")}
                    disabled={busy === r.id || !r.hasAccount || r.isAdmin}
                    className="btn-primary text-xs disabled:opacity-40"
                  >
                    <KeyRound size={13} /> {busy === r.id ? "Resetting…" : "Reset password"}
                  </button>
                  <button
                    onClick={() => act(r, "dismiss")}
                    disabled={busy === r.id}
                    className="btn-ghost text-xs"
                  >
                    <X size={13} /> Dismiss
                  </button>
                </div>
              )}
            </div>

            {!r.hasAccount && (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-amber-200">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                No account uses this address. Usually a typo made at signup — the
                person is locked out of an account that was never created. Worth
                writing back and asking which address they meant.
              </p>
            )}
            {r.isAdmin && (
              <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                This is an admin account. Admin passwords aren&apos;t resettable from
                the dashboard.
              </p>
            )}

            {password && (
              <div className="mt-3 rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">
                  Temporary password — shown once
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <code className="rounded-lg bg-white px-3 py-1.5 font-mono text-sm font-bold text-slate-900 ring-1 ring-emerald-200">
                    {password}
                  </code>
                  <button
                    onClick={() => {
                      void navigator.clipboard.writeText(password);
                      setCopied(r.id);
                      setTimeout(() => setCopied(null), 2000);
                    }}
                    className="btn-ghost text-xs"
                  >
                    {copied === r.id ? <Check size={13} /> : <Copy size={13} />}
                    {copied === r.id ? "Copied" : "Copy"}
                  </button>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-emerald-900">
                  Send this to {r.email} and close this page. It is not stored
                  anywhere — if you lose it, reset again. They will be made to
                  change it when they sign in.
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

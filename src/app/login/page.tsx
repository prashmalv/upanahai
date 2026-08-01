"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { IN_STATES } from "@/lib/geo";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="container-app py-20 text-center text-slate-400">Loading…</div>}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [accountType, setAccountType] = useState<"user" | "brand">("user");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Forgotten-password state. Deliberately a small inline panel rather than a
  // separate page: there is no email link at the other end of this yet, and the
  // ceremony of a whole page would imply there is.
  const [forgot, setForgot] = useState(false);
  const [forgotNote, setForgotNote] = useState("");
  const [forgotSent, setForgotSent] = useState<string | null>(null);
  const [forgotBusy, setForgotBusy] = useState(false);
  const [name, setName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [persona, setPersona] = useState("general");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        name,
        persona,
        city,
        state,
        accountType,
        brandName
      })
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong");
      return;
    }
    // Admins land straight on their dashboard.
    router.push(data.role === "admin" ? "/admin" : next);
    router.refresh();
  }

  const isSignup = mode === "signup";

  return (
    <div className="container-app grid min-h-[70vh] place-items-center py-10">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <Image
            src="/brand/upanah-mark.png"
            alt="Upanah.AI"
            width={256}
            height={256}
            className="mx-auto h-12 w-12 rounded-xl"
          />
          <h1 className="mt-3 text-2xl font-extrabold text-slate-900">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-sm text-slate-500">
            {isSignup
              ? "Join Upanah.AI — free, and your fit profile travels with you"
              : "Sign in to your saved fit, wishlist and questions"}
          </p>
        </div>

        {isSignup && (
          <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
            {(["user", "brand"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setAccountType(t)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  accountType === t
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t === "user" ? "I'm a shopper" : "I represent a brand"}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={submit} className="space-y-3">
          {isSignup && (
            <>
              <input
                className="input"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              {accountType === "brand" ? (
                <input
                  className="input"
                  placeholder="Brand you represent (e.g. Campus)"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  required
                />
              ) : (
                <select
                  className="input"
                  value={persona}
                  onChange={(e) => setPersona(e.target.value)}
                >
                  <option value="general">I&apos;m shopping for myself</option>
                  <option value="senior">Senior citizen — need extra support</option>
                  <option value="sports">Sportsperson / athlete</option>
                  <option value="kids-parent">Parent shopping for kids</option>
                </select>
              )}
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="input"
                  placeholder="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
                <select
                  className="input"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                >
                  <option value="">State</option>
                  {IN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <input
            className="input"
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="input"
            type="password"
            placeholder={isSignup ? "Password (min 8 characters)" : "Password"}
            autoComplete={isSignup ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={isSignup ? 8 : undefined}
          />

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
          </button>
        </form>

        {!isSignup && !forgot && !forgotSent && (
          <p className="mt-3 text-center text-sm">
            <button
              onClick={() => { setForgot(true); setError(null); }}
              className="font-semibold text-slate-500 hover:text-brand-600 hover:underline"
            >
              Forgotten your password?
            </button>
          </p>
        )}

        {forgot && !forgotSent && (
          <div className="mt-4 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <p className="text-sm font-semibold text-slate-900">
              We&apos;ll reset it by hand
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              There is no automatic reset email yet — we are small enough that a
              person does this. Put in the address you signed up with and we&apos;ll
              get back to you on it. Nothing is sent to you automatically, so please
              don&apos;t wait on an email arriving in the next minute.
            </p>
            <input
              className="input mt-3"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="input mt-2"
              placeholder="Anything that helps us find you (optional)"
              value={forgotNote}
              maxLength={300}
              onChange={(e) => setForgotNote(e.target.value)}
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={async () => {
                  setForgotBusy(true);
                  const res = await fetch("/api/auth/reset-request", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, note: forgotNote })
                  });
                  const d = await res.json().catch(() => ({}));
                  setForgotBusy(false);
                  if (!res.ok) { setError(d.error || "Could not send that"); return; }
                  setForgotSent(d.message);
                }}
                disabled={forgotBusy || !email}
                className="btn-primary text-sm disabled:opacity-40"
              >
                {forgotBusy ? "Sending…" : "Ask for a reset"}
              </button>
              <button onClick={() => setForgot(false)} className="btn-ghost text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}

        {forgotSent && (
          <p className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-900 ring-1 ring-emerald-200">
            {forgotSent}
          </p>
        )}

        <p className="mt-4 text-center text-sm text-slate-500">
          {isSignup ? "Already have an account?" : "New here?"}{" "}
          <button
            onClick={() => {
              setMode(isSignup ? "login" : "signup");
              setError(null);
            }}
            className="font-semibold text-brand-600 hover:underline"
          >
            {isSignup ? "Sign in" : "Create account"}
          </button>
        </p>
      </div>
    </div>
  );
}

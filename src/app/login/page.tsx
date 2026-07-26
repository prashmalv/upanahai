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

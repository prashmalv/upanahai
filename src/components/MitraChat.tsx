"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  MessageCircle, X, Mic, Send, Stethoscope, ArrowRight, Sparkles, Loader2
} from "lucide-react";

type Link = { key: string; path: string; label: string };
type Turn = {
  role: "user" | "assistant";
  content: string;
  links?: Link[];
  searchHref?: string;
  healthFlag?: boolean;
};

const OPENERS = [
  "What size am I in Campus?",
  "Wide feet — which brands fit?",
  "School shoes for a 7 year old",
  "Something for standing all day"
];

/**
 * Upanah Mitra, in a corner of every page.
 *
 * The answer appears in the same box the question was asked in — no page change,
 * because the point of asking is usually to avoid navigating. When the answer is
 * "that's on this page over here", the links come as buttons rather than a
 * sentence telling you to go and find it.
 *
 * Voice uses the browser's own recogniser, set to en-IN. It is offered only when
 * the browser actually has one, rather than showing a microphone that does
 * nothing on the browsers that don't.
 */
export function MitraChat() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOk, setVoiceOk] = useState(false);
  const recRef = useRef<any>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const SR =
      typeof window !== "undefined" &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (!SR) return;
    const rec = new SR();
    rec.lang = "en-IN";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      const said = e.results?.[0]?.[0]?.transcript;
      if (said) {
        setInput(said);
        void send(said);
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setVoiceOk(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, busy]);

  async function send(text?: string) {
    const question = (text ?? input).trim();
    if (!question || busy) return;
    setInput("");
    setTurns((t) => [...t, { role: "user", content: question }]);
    setBusy(true);
    try {
      const res = await fetch("/api/mitra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          history: turns.slice(-6).map((t) => ({ role: t.role, content: t.content }))
        })
      });
      const d = await res.json();
      setTurns((t) => [
        ...t,
        {
          role: "assistant",
          content: d.answer || "Sorry — I couldn't work that one out.",
          links: d.links ?? [],
          searchHref: d.searchHref || "",
          healthFlag: !!d.healthFlag
        }
      ]);
    } catch {
      setTurns((t) => [
        ...t,
        { role: "assistant", content: "I couldn't reach the assistant just now. Try again in a moment." }
      ]);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Ask Upanah Mitra"
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-xl transition hover:bg-slate-800"
      >
        <MessageCircle size={18} />
        <span className="hidden sm:inline">Ask Mitra</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-40 sm:inset-x-auto sm:right-5 sm:w-[380px]">
      <div className="flex max-h-[75vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between bg-slate-900 px-4 py-3">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-black text-white">
              <Sparkles size={14} className="text-indigo-300" /> Upanah Mitra
            </p>
            <p className="text-[11px] text-slate-400">Footwear questions only</p>
          </div>
          <button onClick={() => setOpen(false)} aria-label="Close" className="text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {turns.length === 0 && (
            <div>
              <p className="text-sm text-slate-600">
                Namaste. I can help with sizes, fit, brands and finding your way
                around this site. Ask in English or Hinglish.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {OPENERS.map((o) => (
                  <button
                    key={o}
                    onClick={() => void send(o)}
                    className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-200"
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>
          )}

          {turns.map((t, i) =>
            t.role === "user" ? (
              <p key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-brand-600 px-3 py-2 text-sm text-white">
                {t.content}
              </p>
            ) : (
              <div key={i} className="max-w-[92%]">
                <div
                  className={`rounded-2xl rounded-bl-sm px-3 py-2 text-sm ${
                    t.healthFlag
                      ? "bg-rose-50 text-rose-900 ring-1 ring-rose-200"
                      : "bg-slate-100 text-slate-800"
                  }`}
                >
                  {t.healthFlag && (
                    <p className="mb-1 flex items-center gap-1.5 text-xs font-bold">
                      <Stethoscope size={13} /> Worth seeing someone about
                    </p>
                  )}
                  {t.content}
                </div>

                {(t.links?.length || t.searchHref) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {t.searchHref && (
                      <Link
                        href={t.searchHref}
                        onClick={() => setOpen(false)}
                        className="inline-flex items-center gap-1 rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                      >
                        See results <ArrowRight size={12} />
                      </Link>
                    )}
                    {t.links?.map((l) => (
                      <Link
                        key={l.key}
                        href={l.path}
                        onClick={() => setOpen(false)}
                        className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
                      >
                        {l.label} <ArrowRight size={12} />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          )}

          {busy && (
            <p className="flex items-center gap-2 text-sm text-slate-400">
              <Loader2 size={14} className="animate-spin" /> Thinking…
            </p>
          )}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="flex items-center gap-2 border-t border-slate-100 p-3"
        >
          {voiceOk && (
            <button
              type="button"
              aria-label="Speak your question"
              onClick={() => {
                if (listening) {
                  recRef.current?.stop();
                  return;
                }
                setListening(true);
                try {
                  recRef.current?.start();
                } catch {
                  setListening(false);
                }
              }}
              className={`shrink-0 rounded-full p-2 transition ${
                listening ? "animate-pulse bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              <Mic size={16} />
            </button>
          )}
          <input
            className="input flex-1"
            placeholder={listening ? "Listening…" : "Ask about size, fit, brands…"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={500}
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={busy || !input.trim()}
            className="shrink-0 rounded-full bg-slate-900 p-2 text-white disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </form>

        <p className="border-t border-slate-100 px-3 py-2 text-[11px] leading-snug text-slate-400">
          Mitra can be wrong, and can&apos;t see live prices or stock. It is not a
          clinician. Questions are stored anonymously to improve the site.
        </p>
      </div>
    </div>
  );
}

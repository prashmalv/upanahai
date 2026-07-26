"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Mic, Sparkles } from "lucide-react";

const SUGGESTIONS = [
  "lightweight running shoes for men under 4000",
  "comfortable walking shoes for my grandfather",
  "cushioned shoes for daily marathon training",
  "kids school sports shoes with velcro",
  "formal leather shoes for office wedding",
  "wide-fit sandals with arch support"
];

export function SearchBar({ large = false, defaultValue = "" }: { large?: boolean; defaultValue?: string }) {
  const [q, setQ] = useState(defaultValue);
  const [listening, setListening] = useState(false);
  const [placeholder, setPlaceholder] = useState(SUGGESTIONS[0]);
  const recognitionRef = useRef<any>(null);
  const router = useRouter();

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % SUGGESTIONS.length;
      setPlaceholder(SUGGESTIONS[i]);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  function submit(text?: string) {
    const query = (text ?? q).trim();
    if (!query) return;
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  function startVoice() {
    const SR =
      (typeof window !== "undefined" && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) ||
      null;
    if (!SR) {
      alert("Voice search is not supported in this browser. Try Chrome.");
      return;
    }
    const rec = new SR();
    rec.lang = "en-IN";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setQ(transcript);
      submit(transcript);
    };
    recognitionRef.current = rec;
    rec.start();
  }

  return (
    <div className="w-full">
      <div
        className={`flex items-center gap-2 rounded-2xl bg-white p-2 shadow-soft ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-brand-400 ${
          large ? "md:p-3" : ""
        }`}
      >
        <span className="pl-2 text-brand-500">
          <Sparkles size={large ? 22 : 18} />
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={`Try: ${placeholder}`}
          className={`flex-1 bg-transparent px-1 text-slate-800 outline-none placeholder:text-slate-400 ${
            large ? "text-base md:text-lg py-2" : "text-sm"
          }`}
          aria-label="Describe the footwear you need"
        />
        <button
          onClick={startVoice}
          aria-label="Voice search"
          className={`grid place-items-center rounded-xl px-3 py-2 transition ${
            listening ? "animate-pulse bg-rose-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Mic size={large ? 20 : 18} />
        </button>
        <button onClick={() => submit()} className="btn-primary" aria-label="Search">
          <Search size={18} /> <span className="hidden sm:inline">Search</span>
        </button>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.slice(0, 4).map((s) => (
          <button
            key={s}
            onClick={() => submit(s)}
            className="rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-white"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

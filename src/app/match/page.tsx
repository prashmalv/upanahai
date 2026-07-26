"use client";

import { useState } from "react";
import { CameraCapture } from "@/components/CameraCapture";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { Camera, Sparkles } from "lucide-react";

export default function MatchPage() {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [detected, setDetected] = useState<{ brand?: string; category?: string; description?: string } | null>(null);
  const [matches, setMatches] = useState<ProductCardData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [aiUsed, setAiUsed] = useState(false);

  async function find(dataUrl: string) {
    setPreview(dataUrl);
    setLoading(true);
    setError(null);
    setMatches([]);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: dataUrl })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Match failed");
      setDetected(data.detected);
      setMatches(data.matches);
      setAiUsed(data.aiUsed);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-app py-10">
      <div className="mx-auto max-w-3xl text-center">
        <span className="chip mx-auto"><Camera size={13} /> Find by Photo</span>
        <h1 className="mt-3 text-3xl font-extrabold text-slate-900">Snap a shoe, find where to buy it</h1>
        <p className="mx-auto mt-2 max-w-xl text-slate-600">
          Saw shoes you loved on someone? Take or upload a photo — Upanah.AI identifies
          the style and shows visually similar branded shoes available in India.
        </p>
      </div>

      <div className="mx-auto mt-8 grid max-w-5xl gap-8 md:grid-cols-[360px_1fr]">
        <div className="card h-fit p-5">
          <CameraCapture onCapture={find} label="Identify shoe" aspect="aspect-square" />
          {preview && (
            <div className="mt-4">
              <p className="text-xs text-slate-500">Your photo</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="uploaded" className="mt-1 rounded-xl" />
            </div>
          )}
        </div>

        <div>
          {loading && <p className="animate-pulse text-slate-500">Looking for matches…</p>}
          {error && <p className="text-rose-600">{error}</p>}

          {detected && (
            <div className="mb-5 flex items-start gap-3 rounded-2xl bg-brand-50 p-4 ring-1 ring-brand-100">
              <Sparkles className="mt-0.5 shrink-0 text-brand-600" size={18} />
              <div className="text-sm text-brand-900">
                <p className="font-semibold">
                  Detected: {detected.brand ? `${detected.brand} · ` : ""}{detected.category || "footwear"}
                </p>
                {detected.description && <p>{detected.description}</p>}
                <p className="mt-1 text-xs text-brand-700">
                  {aiUsed ? "Identified with AI vision." : "Heuristic match (add AI keys for exact recognition)."}
                </p>
              </div>
            </div>
          )}

          {matches.length > 0 && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {matches.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          )}

          {!loading && !matches.length && !error && (
            <div className="grid h-64 place-items-center rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
              Similar shoes will appear here
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

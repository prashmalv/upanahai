"use client";

import { useEffect, useState } from "react";
import { CameraCapture } from "@/components/CameraCapture";
import { Sparkles, Shirt, Wand2 } from "lucide-react";

type Prod = { id: string; slug: string; brand: string; name: string; imageUrl: string; category: string };

const OUTFITS = ["Casual", "Office (Western)", "Indian / Ethnic", "Sportswear"];

export default function TryOnPage() {
  const [products, setProducts] = useState<Prod[]>([]);
  const [selected, setSelected] = useState<Prod | null>(null);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [outfit, setOutfit] = useState(OUTFITS[0]);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => {
        setProducts(d.products);
        const params = new URLSearchParams(window.location.search);
        const slug = params.get("product");
        const found = d.products.find((p: Prod) => p.slug === slug);
        setSelected(found || d.products[0]);
      });
  }, []);

  async function runTryOn() {
    if (!userPhoto || !selected) return;
    setLoading(true);
    setResult(null);
    setNote(null);
    try {
      const res = await fetch("/api/try-on", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userPhoto, productId: selected.id, outfit })
      });
      const data = await res.json();
      if (data.image) setResult(data.image);
      setNote(data.note || null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-app py-10">
      <div className="mx-auto max-w-3xl text-center">
        <span className="chip mx-auto"><Sparkles size={13} /> Virtual Try-On</span>
        <h1 className="mt-3 text-3xl font-extrabold text-slate-900">See how they look on you</h1>
        <p className="mx-auto mt-2 max-w-xl text-slate-600">
          Upload a full-length photo, pick a shoe and an outfit style, and preview
          how the footwear pairs with your look before you buy.
        </p>
      </div>

      <div className="mx-auto mt-8 grid max-w-6xl gap-8 lg:grid-cols-3">
        {/* Step 1: your photo */}
        <div className="card p-5">
          <p className="mb-3 font-bold text-slate-900">1 · Your photo</p>
          <CameraCapture onCapture={setUserPhoto} label="Use photo" aspect="aspect-[3/4]" />
          {userPhoto && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={userPhoto} alt="you" className="mt-3 rounded-xl" />
          )}
        </div>

        {/* Step 2: pick shoe + outfit */}
        <div className="card p-5">
          <p className="mb-3 font-bold text-slate-900">2 · Pick a shoe</p>
          <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto no-scrollbar">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className={`overflow-hidden rounded-xl ring-2 transition ${
                  selected?.id === p.id ? "ring-brand-500" : "ring-transparent hover:ring-slate-200"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.imageUrl} alt={p.name} className="aspect-square w-full object-cover" />
                <span className="block truncate px-1 py-1 text-[11px] font-medium text-slate-600">{p.brand}</span>
              </button>
            ))}
          </div>

          <p className="mb-2 mt-4 flex items-center gap-1 font-bold text-slate-900"><Shirt size={16} /> Outfit style</p>
          <div className="flex flex-wrap gap-2">
            {OUTFITS.map((o) => (
              <button key={o} onClick={() => setOutfit(o)} className={outfit === o ? "btn-primary" : "btn-ghost"}>
                {o}
              </button>
            ))}
          </div>

          <button onClick={runTryOn} disabled={!userPhoto || loading} className="btn-accent mt-4 w-full">
            <Wand2 size={16} /> {loading ? "Generating…" : "Try it on"}
          </button>
        </div>

        {/* Step 3: result */}
        <div className="card p-5">
          <p className="mb-3 font-bold text-slate-900">3 · Preview</p>
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-slate-100">
            {result ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={result} alt="try-on result" className="h-full w-full object-cover" />
            ) : userPhoto ? (
              <div className="relative h-full w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={userPhoto} alt="you" className="h-full w-full object-cover opacity-90" />
                {selected && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={selected.imageUrl}
                    alt={selected.name}
                    className="absolute bottom-2 left-1/2 w-1/3 -translate-x-1/2 rounded-lg shadow-lg ring-2 ring-white"
                  />
                )}
              </div>
            ) : (
              <div className="grid h-full place-items-center text-slate-400">Result appears here</div>
            )}
          </div>
          {note && <p className="mt-3 text-xs text-slate-500">{note}</p>}
          {selected && (
            <a href={`/product/${selected.slug}`} className="btn-primary mt-4 w-full">View &amp; compare prices</a>
          )}
        </div>
      </div>
    </div>
  );
}

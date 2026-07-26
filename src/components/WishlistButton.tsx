"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";

export function WishlistButton({ productId, initial = false }: { productId: string; initial?: boolean }) {
  const [saved, setSaved] = useState(initial);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId })
      });
      if (res.status === 401) {
        router.push("/login?next=/wishlist");
        return;
      }
      const data = await res.json();
      setSaved(data.saved);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
      className="grid h-9 w-9 place-items-center rounded-full bg-white/90 text-slate-600 shadow ring-1 ring-slate-200 backdrop-blur transition hover:scale-105"
    >
      <Heart size={17} className={saved ? "fill-rose-500 text-rose-500" : ""} />
    </button>
  );
}

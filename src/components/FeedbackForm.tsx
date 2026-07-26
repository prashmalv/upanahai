"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { useRouter } from "next/navigation";

export function FeedbackForm({ productId }: { productId: string }) {
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [fit, setFit] = useState("true-to-size");
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, rating, fitFeedback: fit, authorName: name || "Anonymous", comment })
    });
    if (res.ok) {
      setStatus("done");
      setComment("");
      router.refresh();
      setTimeout(() => setStatus("idle"), 1500);
    } else {
      setStatus("idle");
    }
  }

  return (
    <form onSubmit={submit} className="card mt-4 space-y-3 p-4">
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <button
            type="button"
            key={i}
            onMouseEnter={() => setHover(i + 1)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(i + 1)}
            aria-label={`${i + 1} stars`}
          >
            <Star
              size={24}
              className={(hover || rating) > i ? "fill-accent-500 text-accent-500" : "text-slate-300"}
            />
          </button>
        ))}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-600">How was the fit?</label>
        <select className="input" value={fit} onChange={(e) => setFit(e.target.value)}>
          <option value="small">Runs small</option>
          <option value="true-to-size">True to size</option>
          <option value="large">Runs large</option>
        </select>
      </div>
      <input className="input" placeholder="Your name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
      <textarea
        className="input min-h-[90px]"
        placeholder="Share your experience — comfort, durability, sizing..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        required
      />
      <button className="btn-primary w-full" disabled={status === "saving"}>
        {status === "saving" ? "Submitting..." : status === "done" ? "Thank you!" : "Submit feedback"}
      </button>
    </form>
  );
}

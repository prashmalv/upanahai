import { Star } from "lucide-react";

export function StarRating({ value, size = 14 }: { value: number; size?: number }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <span className="inline-flex items-center gap-0.5 text-accent-500" aria-label={`${value} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < full || (i === full && half);
        return (
          <Star
            key={i}
            size={size}
            className={filled ? "fill-accent-500 text-accent-500" : "text-slate-300"}
          />
        );
      })}
      <span className="ml-1 text-xs font-medium text-slate-500">{value.toFixed(1)}</span>
    </span>
  );
}

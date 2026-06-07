import { useState } from "react";

interface StarPickerProps {
  value: number;
  onChange: (rating: number) => void;
  size?: "sm" | "md" | "lg";
}

const sizes = { sm: "text-xl", md: "text-2xl", lg: "text-3xl" };

export default function StarPicker({ value, onChange, size = "md" }: StarPickerProps) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;

  return (
    <div className="flex gap-1" role="group" aria-label="Star rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          aria-label={`${star} star${star !== 1 ? "s" : ""}`}
          className={`${sizes[size]} transition-colors leading-none ${
            star <= active ? "text-orange" : "text-border"
          }`}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function StarDisplay({ rating, count }: { rating: number; count?: number }) {
  const full = Math.round(Number(rating));
  return (
    <span className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`text-sm ${i <= full ? "text-orange" : "text-border"}`}>★</span>
      ))}
      {count !== undefined && (
        <span className="text-caption text-grey-mid ml-1">
          {Number(rating).toFixed(1)} ({count} review{count !== 1 ? "s" : ""})
        </span>
      )}
    </span>
  );
}

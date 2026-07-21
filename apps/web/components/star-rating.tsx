import { Star } from "lucide-react";

export function StarRating({ rating, reviewCount }: { rating: number; reviewCount?: number }) {
  return (
    <div className="flex items-center gap-1 text-brand-accent">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="h-3.5 w-3.5" fill={i < rating ? "currentColor" : "none"} strokeWidth={1.5} />
      ))}
      {typeof reviewCount === "number" && (
        <span className="ml-1.5 text-xs text-muted-foreground">({reviewCount} reviews)</span>
      )}
    </div>
  );
}

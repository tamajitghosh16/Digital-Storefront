import { Wrap } from "@/components/primitives";

/**
 * Shown between the header and footer the moment a shopper follows a link,
 * while the next page's data loads. Without a loading boundary the old page
 * just sits there until the new one has fully rendered on the server, and
 * Next.js can't prefetch anything useful for a dynamic route. Shaped like the
 * common PageHeader band + product grid so the swap-in doesn't jump.
 */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="motion-safe:animate-pulse">
      <div className="bg-tile py-[34px]">
        <Wrap>
          <div className="h-9 w-72 max-w-full rounded-lg bg-ground" />
          <div className="mt-4 h-4 w-[28rem] max-w-full rounded bg-ground" />
        </Wrap>
      </div>
      <Wrap className="grid grid-cols-2 gap-5 py-10 md:grid-cols-4">
        {Array.from({ length: 8 }, (_, tile) => (
          <div key={tile}>
            <div className="aspect-[3/4] rounded-tile bg-tile" />
            <div className="mt-3 h-4 w-3/4 rounded bg-tile" />
            <div className="mt-2 h-4 w-1/3 rounded bg-tile" />
          </div>
        ))}
      </Wrap>
    </div>
  );
}

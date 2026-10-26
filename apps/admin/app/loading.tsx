/**
 * Shown in the content panel — the sidebar and top bar stay put — the
 * moment a staff member clicks through to another screen, while its data
 * loads. Without a loading boundary nothing on screen changes until the
 * whole next page has rendered on the server, which reads as a dead click.
 * Shaped like the usual PageHeader + table so the swap-in doesn't jump.
 */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="motion-safe:animate-pulse">
      <div className="mb-8">
        <div className="h-8 w-64 max-w-full rounded-lg bg-tile" />
        <div className="mt-3 h-4 w-96 max-w-full rounded bg-tile" />
      </div>
      <div className="overflow-hidden rounded-tile border border-line">
        <div className="h-11 border-b border-line bg-tile" />
        {Array.from({ length: 6 }, (_, row) => (
          <div key={row} className="flex items-center gap-6 border-b border-line px-4 py-4 last:border-b-0">
            <div className="h-4 w-1/3 rounded bg-tile" />
            <div className="h-4 w-1/5 rounded bg-tile" />
            <div className="ml-auto h-4 w-16 rounded bg-tile" />
          </div>
        ))}
      </div>
    </div>
  );
}

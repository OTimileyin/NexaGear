export default function ShopLoading() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12" aria-busy="true">
      <div className="flex items-baseline justify-between border-b border-ink/15 pb-3">
        <h1 className="text-2xl font-semibold tracking-tight">Shop</h1>
        <span className="font-mono text-[11px] text-steel">LOADING…</span>
      </div>
      <ul
        className="mt-10 grid animate-pulse grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3"
        aria-hidden="true"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="space-y-3">
            <div className="aspect-[4/3] border border-steel/40 bg-surface/60" />
            <div className="h-3 w-2/3 bg-steel/30" />
            <div className="h-3 w-1/3 bg-steel/20" />
          </li>
        ))}
      </ul>
      <span className="sr-only">Loading products…</span>
    </div>
  );
}

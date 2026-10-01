import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-24">
      <p className="font-mono text-xs text-steel">ERROR 404 · PART NOT FOUND</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        This page isn&apos;t in the catalogue
      </h1>
      <p className="mt-3 max-w-prose text-ink/75">
        The address doesn&apos;t match any page on NexaGear. Check the link, or
        browse everything the store carries.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/shop"
          className="bg-signal px-5 py-3 text-sm font-semibold text-white hover:bg-signal/90"
        >
          Browse the catalogue
        </Link>
        <Link
          href="/"
          className="border border-ink px-5 py-3 text-sm font-medium hover:bg-ink hover:text-paper"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";

export function CatalogErrorState() {
  return (
    <div
      role="alert"
      className="border-l-4 border-signal bg-surface px-6 py-8 apple:rounded-2xl apple:border-l-0 apple:border apple:border-signal/30 apple:bg-surface"
    >
      <h2 className="font-medium">The catalogue didn&apos;t load</h2>
      <p className="mt-2 max-w-prose text-sm text-ink/75">
        NexaGear couldn&apos;t reach its product database. Check the app&apos;s
        database connection and try again — nothing was changed.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-4 border border-ink px-4 py-2 text-sm font-medium hover:bg-ink hover:text-paper apple:rounded-full apple:border-0 apple:bg-signal apple:px-5 apple:text-paper"
      >
        Try again
      </button>
    </div>
  );
}

export function EmptyCatalogState() {
  return (
    <div className="border-l-4 border-drafting bg-surface px-6 py-8 apple:rounded-2xl apple:border-l-0 apple:border apple:border-drafting/30 apple:bg-surface">
      <h2 className="font-medium">No products yet</h2>
      <p className="mt-2 max-w-prose text-sm text-ink/75">
        The catalogue is empty. Once seed data is loaded, every product shows
        up here.
      </p>
      <Link
        href="/"
        className="mt-4 inline-block border border-ink px-4 py-2 text-sm font-medium hover:bg-ink hover:text-paper apple:rounded-full apple:border-0 apple:bg-signal apple:px-5 apple:text-paper"
      >
        Back to home
      </Link>
    </div>
  );
}

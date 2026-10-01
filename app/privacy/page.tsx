import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What the NexaGear demo stores and what it doesn't.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      <p className="font-mono text-xs text-steel">DRAFT · DEMO PROJECT</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Privacy — what this demo stores
      </h1>

      <div className="mt-8 space-y-6 text-ink/80">
        <p>
          NexaGear is an HNG internship assignment demonstration, not a
          registered business. It collects the minimum needed to show a working
          authenticated checkout — nothing more.
        </p>

        <section>
          <h2 className="text-lg font-semibold text-ink">What is stored</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Google profile basics</strong> — name, email, avatar —
              when you sign in with Google, via Supabase Auth.
            </li>
            <li>
              <strong>Order contact details</strong> — name, email, phone,
              delivery address — only for orders you actually place, stored in
              the demo database.
            </li>
            <li>
              <strong>Your cart</strong> — kept in this browser&apos;s
              localStorage only; it is never uploaded before you place an
              order.
            </li>
            <li>
              <strong>Session cookie</strong> — set by Supabase solely to keep
              you signed in.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">What is not stored</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Payment details — there are no payments; nothing is bought.</li>
            <li>Analytics, advertising trackers, or marketing cookies — none exist.</li>
            <li>Data shared with third parties — none; no third-party embeds run.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">Retention</h2>
          <p className="mt-2">
            Orders and profile rows persist in the demo database until the
            project is retired or the database is cleared. Because this is a
            demo, avoid entering personal details you would not want stored in
            a student project database.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">Changes</h2>
          <p className="mt-2">
            If analytics or any new data collection is ever added, this page is
            updated first and consent requirements are reviewed before it
            ships.
          </p>
        </section>
      </div>
    </div>
  );
}

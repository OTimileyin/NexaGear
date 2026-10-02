import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms",
  description: "Demo-status terms for the NexaGear assignment project.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      <p className="font-mono text-xs text-steel">DRAFT · DEMO PROJECT</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Terms — read the demo status first
      </h1>

      <div className="mt-8 space-y-6 text-ink/80">
        <section>
          <h2 className="text-lg font-semibold text-ink">This is a demo</h2>
          <p className="mt-2">
            NexaGear is a demonstration project built for the HNG Internship
            Assignment 2. It is not a registered business and does not sell
            goods. Payments run through Paystack in **test mode**: no real
            money moves, no card details are stored, and nothing ships.
            Placing an order creates a record in a demo database and sends a
            confirmation email.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">No commercial relationship</h2>
          <p className="mt-2">
            There is no seller–buyer relationship, no prices payable, no
            refunds, and no delivery obligations. Product names are original
            seed concepts for the demo catalogue and are not offers to sell
            real products or claims about any brand.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">As-is</h2>
          <p className="mt-2">
            The demo is provided as-is for evaluation. It targets WCAG 2.2 AA
            and is tested accordingly, but no warranties of any kind are made.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">Software licenses</h2>
          <p className="mt-2">
            The underlying open-source dependencies are used under their own
            licenses (MIT/Apache-2.0 — see the project&apos;s resources
            documentation).
          </p>
        </section>
      </div>
    </div>
  );
}

import Link from "next/link";

import { getCurrentUser } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Reads the sample references to offer. Any failure here means "show nothing",
 * never "show a broken notice" — a missing demo helper must not take down the
 * home page.
 */
async function readSampleRefs(): Promise<string[]> {
  try {
    if (!(await getCurrentUser())) return [];

    const supabase = await getSupabaseServerClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("orders")
      .select("sample_ref")
      .eq("is_sample", true)
      .order("sample_ref", { ascending: true })
      .limit(3);

    if (error || !data) return [];

    return (data as { sample_ref: string | null }[])
      .map((row) => row.sample_ref)
      .filter((ref): ref is string => Boolean(ref));
  } catch {
    return [];
  }
}

/**
 * Tells a signed-in visitor that the store carries fictional orders, and hands
 * them a reference to try so order tracking is demonstrable without placing an
 * order first.
 *
 * Renders nothing when there is no sample data (a real store), when the visitor
 * is signed out (RLS gives anon nothing), or when Supabase is unconfigured.
 */
export async function SampleDataNotice() {
  const refs = await readSampleRefs();
  if (refs.length === 0) return null;

  return (
    <aside
      aria-label="Sample data notice"
      className="border-l-4 border-drafting bg-white px-4 py-3 text-sm"
    >
      <p className="font-mono text-[11px] text-steel">
        SAMPLE DATA · FICTIONAL ORDERS
      </p>
      <p className="mt-1 max-w-prose text-ink/80">
        This demo store carries invented orders so you can see tracking without
        buying anything. Try{" "}
        {refs.map((ref, index) => (
          <span key={ref}>
            {index > 0 && ", "}
            <Link href={`/order/track?ref=${ref}`} className="font-mono underline">
              {ref}
            </Link>
          </span>
        ))}
        . They carry no payment references and no real customer details, and
        they are excluded from every total in the admin dashboard.
      </p>
    </aside>
  );
}
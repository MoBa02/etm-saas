// src/app/p/[id]/page.tsx

// ✅ CRITICAL: Forces Vercel to NEVER cache this page.
// Every request hits Supabase fresh. This is the core fix for Bug 1.
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import DynamicRenderer from "@/components/DynamicRenderer";

interface PageProps {
  params: { id: string };
}

export default async function PublicLandingPage({ params }: PageProps) {
  const { id } = params;
  const supabase = createSupabaseServerClient();

  // ✅ Fetch fresh from Supabase on every single request
  const { data, error } = await supabase
    .from("landing_pages")
    .select("*")
    .eq("id", id)
    .single();

  // ✅ If the row doesn't exist yet, show a proper 404
  if (error || !data) {
    notFound();
  }

  // ✅ The structure field holds the JSON from the worker
  const structure = data.structure;

  return (
    <main>
      <DynamicRenderer structure={structure} />
    </main>
  );
}

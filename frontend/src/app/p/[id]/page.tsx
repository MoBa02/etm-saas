// src/app/p/[id]/page.tsx
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

  const { data, error } = await supabase
    .from("landing_page_jobs")
    .select("structure, status")
    .eq("id", id)
    .eq("status", "completed")      // ✅ Only completed jobs
    .single();

  // Debug what failed
  if (error) {
    console.error("Supabase error:", error);
    notFound();
  }

  if (!data || !data.structure) {
    console.error("No data or no structure:", data);
    notFound();
  }

  return (
    <main>
      <DynamicRenderer structure={data.structure} />
    </main>
  );
}

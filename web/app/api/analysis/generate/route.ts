import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateNicheInsight } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const { scraped_profile_id } = await req.json();
  const supabase = getSupabaseAdmin();

  const { data: profile, error } = await supabase
    .from("scraped_profiles")
    .select("*")
    .eq("id", scraped_profile_id)
    .single();

  if (error || !profile) {
    return NextResponse.json({ erro: "Perfil não encontrado." }, { status: 404 });
  }

  const insight = await generateNicheInsight(profile.raw_data);

  await supabase.from("insights").insert({ scraped_profile_id: profile.id, insight });

  return NextResponse.json({ ok: true, insight });
}

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getOwnProfileMetrics } from "@/lib/instagram";
import { generateProfileRecommendations } from "@/lib/ai";

export async function POST() {
  const supabase = getSupabaseAdmin();

  const { data: account } = await supabase
    .from("instagram_accounts")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!account) {
    return NextResponse.json(
      { erro: "Conecte seu Instagram antes de gerar recomendações." },
      { status: 400 }
    );
  }

  const { data: insightsRows } = await supabase
    .from("insights")
    .select("insight, scraped_profiles(username, niche)")
    .order("created_at", { ascending: false })
    .limit(30);

  if (!insightsRows || insightsRows.length === 0) {
    return NextResponse.json(
      { erro: "Analise pelo menos um perfil de nicho antes de gerar recomendações." },
      { status: 400 }
    );
  }

  let ownProfile;
  try {
    ownProfile = await getOwnProfileMetrics(account.access_token);
  } catch (err: any) {
    return NextResponse.json({ erro: `Falha ao buscar seu perfil: ${err.message}` }, { status: 500 });
  }

  const nicheInsights = insightsRows.map((r: any) => ({
    perfil: r.scraped_profiles?.username,
    nicho: r.scraped_profiles?.niche,
    analise: r.insight,
  }));

  const recommendation = await generateProfileRecommendations(
    {
      username: ownProfile.profile.username,
      followers: ownProfile.profile.followers_count,
      posts: ownProfile.profile.media_count,
      aggregates: ownProfile.aggregates,
      topPost: ownProfile.aggregates?.topPost,
    },
    nicheInsights
  );

  const { error: dbError } = await supabase.from("recommendations").insert({ recommendation });
  if (dbError) {
    return NextResponse.json({ erro: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, recommendation });
}

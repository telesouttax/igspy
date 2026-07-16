import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateNicheInsight, ScrapedProfile } from "@/lib/claude";

function isAuthorized(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace("Bearer ", "");
  return token && token === process.env.EXTENSION_API_TOKEN;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ erro: "Token inválido." }, { status: 401 });
  }

  const body = (await req.json()) as ScrapedProfile;

  if (!body?.username || !Array.isArray(body?.posts)) {
    return NextResponse.json(
      { erro: "Payload inválido. Esperado { username, posts: [...] }." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  // 1. Salva os dados brutos coletados pela extensão
  const { data: saved, error: saveError } = await supabase
    .from("scraped_profiles")
    .insert({
      username: body.username,
      niche: body.niche ?? null,
      raw_data: body,
      collected_at: body.collectedAt ?? new Date().toISOString(),
    })
    .select()
    .single();

  if (saveError) {
    return NextResponse.json({ erro: saveError.message }, { status: 500 });
  }

  // 2. Gera a análise automaticamente com a Claude API
  let insight;
  try {
    insight = await generateNicheInsight(body);
  } catch (err: any) {
    insight = { erro: `Falha ao gerar análise: ${err.message}` };
  }

  const { error: insightError } = await supabase
    .from("insights")
    .insert({ scraped_profile_id: saved.id, insight });

  if (insightError) {
    return NextResponse.json({ erro: insightError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: saved.id, insight });
}

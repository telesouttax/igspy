import { NextRequest, NextResponse } from "next/server";
import { validateAndFetchProfile } from "@/lib/instagram";
import { getSupabaseAdmin } from "@/lib/supabase";

// Recebe { access_token } vindo do formulário do dashboard, valida contra a Graph API
// do Instagram e salva. Não há redirect OAuth neste fluxo — o token é gerado manualmente
// no painel de desenvolvedores da Meta (Casos de uso > Gerar tokens de acesso).
export async function POST(req: NextRequest) {
  const { access_token } = await req.json();

  if (!access_token) {
    return NextResponse.json({ erro: "Envie { access_token }." }, { status: 400 });
  }

  try {
    const profile = await validateAndFetchProfile(access_token);

    const supabase = getSupabaseAdmin();
    await supabase.from("instagram_accounts").upsert({
      ig_user_id: profile.user_id,
      access_token,
      username: profile.username,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, username: profile.username });
  } catch (err: any) {
    return NextResponse.json({ erro: err.message }, { status: 400 });
  }
}

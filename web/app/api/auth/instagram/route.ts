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

  let profile;
  try {
    profile = await validateAndFetchProfile(access_token);
  } catch (err: any) {
    return NextResponse.json({ erro: `Token inválido: ${err.message}` }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error: dbError } = await supabase.from("instagram_accounts").upsert({
    ig_user_id: profile.user_id,
    access_token,
    username: profile.username,
    updated_at: new Date().toISOString(),
  });

  if (dbError) {
    return NextResponse.json(
      { erro: `Token validado, mas falhou ao salvar no banco: ${dbError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, username: profile.username });
}

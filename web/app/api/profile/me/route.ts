import { NextResponse } from "next/server";
import { getOwnProfileMetrics } from "@/lib/instagram";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("instagram_accounts")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { conectado: false, mensagem: "Nenhuma conta conectada ainda." },
      { status: 200 }
    );
  }

  try {
    const metrics = await getOwnProfileMetrics(data.access_token);
    return NextResponse.json({ conectado: true, ...metrics });
  } catch (err: any) {
    return NextResponse.json({ conectado: false, erro: err.message }, { status: 500 });
  }
}

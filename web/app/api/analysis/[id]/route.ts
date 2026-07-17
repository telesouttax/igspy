import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// Deleta o "scraped_profile" — como a tabela insights tem "on delete cascade" ligada a ele,
// a análise (insight) correspondente é removida automaticamente junto.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("scraped_profiles").delete().eq("id", params.id);

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST() {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("instagram_accounts").delete().neq("ig_user_id", "");

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

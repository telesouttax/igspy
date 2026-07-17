import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForShortLivedToken,
  exchangeForLongLivedToken,
  validateAndFetchProfile,
} from "@/lib/instagram";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const errorParam = req.nextUrl.searchParams.get("error");

  if (errorParam) {
    return NextResponse.redirect(
      new URL(`/dashboard?error=${encodeURIComponent(errorParam)}`, req.url)
    );
  }
  if (!code) {
    return NextResponse.redirect(new URL("/dashboard?error=sem_code", req.url));
  }

  try {
    // O Instagram às vezes manda o code com "#_" no final — removemos por segurança
    const cleanCode = code.replace(/#_$/, "");

    const shortLived = await exchangeCodeForShortLivedToken(cleanCode);
    const longLived = await exchangeForLongLivedToken(shortLived.access_token);
    const profile = await validateAndFetchProfile(longLived.access_token);

    const supabase = getSupabaseAdmin();
    const { error: dbError } = await supabase.from("instagram_accounts").upsert({
      ig_user_id: profile.user_id,
      access_token: longLived.access_token,
      username: profile.username,
      updated_at: new Date().toISOString(),
    });

    if (dbError) {
      return NextResponse.redirect(
        new URL(`/dashboard?error=${encodeURIComponent(dbError.message)}`, req.url)
      );
    }

    return NextResponse.redirect(new URL("/dashboard?conectado=1", req.url));
  } catch (err: any) {
    return NextResponse.redirect(
      new URL(`/dashboard?error=${encodeURIComponent(err.message)}`, req.url)
    );
  }
}

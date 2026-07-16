import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken, getInstagramBusinessAccount } from "@/lib/instagram";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/dashboard?error=sem_code", req.url));
  }

  try {
    const { access_token } = await exchangeCodeForToken(code);
    const { igAccountId, pageAccessToken } = await getInstagramBusinessAccount(access_token);

    const supabase = getSupabaseAdmin();
    await supabase.from("instagram_accounts").upsert({
      ig_account_id: igAccountId,
      page_access_token: pageAccessToken,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.redirect(new URL("/dashboard?conectado=1", req.url));
  } catch (err: any) {
    return NextResponse.redirect(
      new URL(`/dashboard?error=${encodeURIComponent(err.message)}`, req.url)
    );
  }
}

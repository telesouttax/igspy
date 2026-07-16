import { NextResponse } from "next/server";
import { getInstagramLoginUrl } from "@/lib/instagram";

export async function GET() {
  return NextResponse.redirect(getInstagramLoginUrl());
}

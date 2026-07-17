import { NextRequest, NextResponse } from "next/server";
import { searchAdsLibrary } from "@/lib/adsLibrary";

export async function POST(req: NextRequest) {
  const { query, countries } = await req.json();

  if (!query) {
    return NextResponse.json({ erro: "Envie { query: 'termo de busca' }." }, { status: 400 });
  }

  try {
    const results = await searchAdsLibrary(query, countries ?? ["BR"]);
    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json({ erro: err.message }, { status: 400 });
  }
}

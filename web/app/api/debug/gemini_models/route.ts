import { NextResponse } from "next/server";

// Rota temporária de diagnóstico — lista os modelos Gemini disponíveis para a sua chave.
// Pode deletar essa pasta depois de descobrir o nome certo do modelo.
export async function GET() {
  const key = process.env.GEMINI_API_KEY;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
  );
  const data = await res.json();

  const models = (data.models ?? [])
    .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m: any) => m.name);

  return NextResponse.json({ modelosDisponiveis: models });
}

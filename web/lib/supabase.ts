import { createClient } from "@supabase/supabase-js";

// Usa a service role key só no backend (API routes), nunca exposta ao navegador.
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
    global: {
      // Força o Next.js a nunca usar o Data Cache para as chamadas do Supabase —
      // sem isso, respostas antigas podem ficar "presas" em cache entre deploys.
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        fetch(input, { ...init, cache: "no-store" }),
    },
  });
}

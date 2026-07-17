// Ad Library API oficial da Meta — pública, não exige login de usuário, só um "App Access Token"
// (formato APP_ID|APP_SECRET, gerado a partir do mesmo app que já criamos: `igspy`).
//
// IMPORTANTE — limitação real da Meta, não da nossa ferramenta:
// A Meta restringiu bastante essa API nos últimos anos. Anúncios políticos/de temas sociais têm
// dados completos (gasto, impressões, segmentação). Anúncios comerciais comuns (produtos, serviços)
// têm campos bem mais limitados — geralmente só texto do anúncio, nome da página e link pro
// "snapshot" visual do anúncio, sem métricas de investimento. Isso pode mudar de tempos em tempos,
// então trate o resultado como "o que a Meta liberar naquele momento".

const GRAPH_BASE = "https://graph.facebook.com/v19.0";

function getAppAccessToken() {
  return `${process.env.META_APP_ID}|${process.env.META_APP_SECRET}`;
}

export type AdsLibraryResult = {
  id: string;
  page_name?: string;
  ad_creative_bodies?: string[];
  ad_creative_link_titles?: string[];
  ad_snapshot_url?: string;
  ad_delivery_start_time?: string;
  ad_delivery_stop_time?: string;
};

export async function searchAdsLibrary(searchTerm: string, countries: string[] = ["BR"]) {
  const params = new URLSearchParams({
    search_terms: searchTerm,
    ad_reached_countries: JSON.stringify(countries),
    ad_type: "ALL",
    fields:
      "id,page_name,ad_creative_bodies,ad_creative_link_titles,ad_snapshot_url,ad_delivery_start_time,ad_delivery_stop_time",
    access_token: getAppAccessToken(),
    limit: "30",
  });

  const res = await fetch(`${GRAPH_BASE}/ads_archive?${params.toString()}`, { cache: "no-store" });
  const json = await res.json();

  if (!res.ok || json.error) {
    throw new Error(
      json.error?.message ||
        `A Ad Library API retornou um erro (${res.status}). Isso costuma acontecer quando o termo buscado só tem anúncios comerciais comuns, que têm acesso mais restrito nessa API.`
    );
  }

  return (json.data ?? []) as AdsLibraryResult[];
}

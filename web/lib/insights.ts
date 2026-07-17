// Insights avançados da Instagram Graph API — tudo aqui é "best effort": cada chamada roda
// isolada em try/catch, então se uma permissão estiver faltando ou uma métrica não existir
// pra essa conta, só aquela seção específica fica ausente, sem quebrar o resto do dashboard.
//
// IMPORTANTE — limitações reais da própria Meta (não é bug nosso):
// - Stories: só é possível ler insights de um story ENQUANTO ele está no ar (24h). Depois de
//   expirar, não existe endpoint de histórico. Pra ter esses dados, seria preciso rodar uma
//   tarefa periódica que captura os stories ativos em tempo real, e isso é uma feature futura.
// - Lives: só é possível ler métricas de uma transmissão ENQUANTO ela está ao vivo. Não existe
//   endpoint de histórico de lives passadas.

const GRAPH_BASE = "https://graph.instagram.com/v21.0";

async function safeFetch(url: string) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok || json.error) return null;
    return json;
  } catch {
    return null;
  }
}

function extractMetrics(json: any): Record<string, number> {
  const out: Record<string, number> = {};
  if (!Array.isArray(json?.data)) return out;
  for (const item of json.data) {
    const value = item.total_value?.value ?? item.values?.[0]?.value ?? null;
    if (value != null) out[item.name] = value;
  }
  return out;
}

// Métricas gerais de conta: alcance, engajamento, cliques na bio, etc.
export async function getAccountOverview(accessToken: string) {
  const json = await safeFetch(
    `${GRAPH_BASE}/me/insights?metric=reach,accounts_engaged,total_interactions,profile_views,website_clicks&period=day&metric_type=total_value&access_token=${accessToken}`
  );
  return extractMetrics(json);
}

// Alcance dividido por tipo de conteúdo (feed, reels, stories)
export async function getReachByContentType(accessToken: string) {
  const json = await safeFetch(
    `${GRAPH_BASE}/me/insights?metric=reach&period=day&metric_type=total_value&breakdown=media_product_type&access_token=${accessToken}`
  );
  const breakdown = json?.data?.[0]?.total_value?.breakdowns?.[0]?.results ?? [];
  const out: Record<string, number> = {};
  for (const r of breakdown) {
    const key = r.dimension_values?.[0] ?? "desconhecido";
    out[key] = r.value;
  }
  return out;
}

// Demografia dos seguidores — só retorna dados se a conta tiver 100+ seguidores
export async function getFollowerDemographics(accessToken: string) {
  const [ageGender, city, country] = await Promise.all([
    safeFetch(
      `${GRAPH_BASE}/me/insights?metric=follower_demographics&period=lifetime&metric_type=total_value&breakdown=age,gender&access_token=${accessToken}`
    ),
    safeFetch(
      `${GRAPH_BASE}/me/insights?metric=follower_demographics&period=lifetime&metric_type=total_value&breakdown=city&access_token=${accessToken}`
    ),
    safeFetch(
      `${GRAPH_BASE}/me/insights?metric=follower_demographics&period=lifetime&metric_type=total_value&breakdown=country&access_token=${accessToken}`
    ),
  ]);

  const parseBreakdown = (json: any) => json?.data?.[0]?.total_value?.breakdowns?.[0]?.results ?? [];

  return {
    porIdadeGenero: parseBreakdown(ageGender).map((r: any) => ({
      faixaEtaria: r.dimension_values?.[0],
      genero: r.dimension_values?.[1],
      valor: r.value,
    })),
    porCidade: parseBreakdown(city)
      .map((r: any) => ({ cidade: r.dimension_values?.[0], valor: r.value }))
      .sort((a: any, b: any) => b.valor - a.valor)
      .slice(0, 5),
    porPais: parseBreakdown(country)
      .map((r: any) => ({ pais: r.dimension_values?.[0], valor: r.value }))
      .sort((a: any, b: any) => b.valor - a.valor)
      .slice(0, 5),
  };
}

// Horários em que os seguidores estão mais ativos
export async function getOnlineFollowers(accessToken: string) {
  const json = await safeFetch(
    `${GRAPH_BASE}/me/insights?metric=online_followers&period=lifetime&access_token=${accessToken}`
  );
  const values = json?.data?.[0]?.values?.[0]?.value ?? {};
  // values vem como { "0": 120, "1": 90, ... } representando cada hora do dia
  return Object.entries(values)
    .map(([hora, quantidade]) => ({ hora: Number(hora), quantidade: Number(quantidade) }))
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 5);
}

// Insights por post individual — métricas diferentes dependendo se é foto/carrossel ou reel
export async function getMediaInsights(mediaId: string, mediaType: string, accessToken: string) {
  const isReel = mediaType === "VIDEO" || mediaType === "REELS";

  const metrics = isReel
    ? "plays,reach,saved,likes,comments,shares,total_interactions,ig_reels_avg_watch_time,ig_reels_video_view_total_time"
    : "reach,saved,likes,comments,shares,total_interactions,profile_visits,follows";

  const json = await safeFetch(
    `${GRAPH_BASE}/${mediaId}/insights?metric=${metrics}&access_token=${accessToken}`
  );

  const out: Record<string, number> = {};
  if (Array.isArray(json?.data)) {
    for (const item of json.data) {
      const value = item.values?.[0]?.value ?? null;
      if (value != null) out[item.name] = value;
    }
  }
  return out;
}

// Roda getMediaInsights para os N posts mais recentes (limitado pra não estourar rate limit)
export async function getRecentPostsInsights(
  media: Array<{ id: string; media_type: string }>,
  accessToken: string,
  limit = 12
) {
  const subset = media.slice(0, limit);
  const results = await Promise.all(
    subset.map(async (m) => ({
      id: m.id,
      insights: await getMediaInsights(m.id, m.media_type, accessToken),
    }))
  );
  return Object.fromEntries(results.map((r) => [r.id, r.insights]));
}

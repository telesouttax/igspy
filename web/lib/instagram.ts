// Instagram API with Instagram Login — cobre SOMENTE o seu próprio perfil Business/Creator.
// Aqui implementamos o fluxo OAuth "de verdade": o usuário clica em "Conectar com Instagram",
// loga direto na tela oficial do Instagram, e a gente troca o código por um token — sem precisar
// copiar/colar token manualmente. (O fluxo manual continua existindo como alternativa/fallback.)

const GRAPH_BASE = "https://graph.instagram.com/v21.0";

const SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments",
  "instagram_business_manage_insights",
].join(",");

export function getInstagramLoginUrl() {
  const params = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    redirect_uri: process.env.INSTAGRAM_REDIRECT_URI!,
    response_type: "code",
    scope: SCOPES,
  });
  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

// Troca o "code" retornado pelo redirect por um token de curta duração (~1h)
export async function exchangeCodeForShortLivedToken(code: string) {
  const form = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    client_secret: process.env.INSTAGRAM_APP_SECRET!,
    grant_type: "authorization_code",
    redirect_uri: process.env.INSTAGRAM_REDIRECT_URI!,
    code,
  });

  const res = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    body: form,
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Falha ao trocar code por token: ${await res.text()}`);
  return res.json() as Promise<{ access_token: string; user_id: number }>;
}

// Troca o token de curta duração por um de longa duração (~60 dias)
export async function exchangeForLongLivedToken(shortLivedToken: string) {
  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: process.env.INSTAGRAM_APP_SECRET!,
    access_token: shortLivedToken,
  });
  const res = await fetch(`${GRAPH_BASE}/access_token?${params.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Falha ao trocar por token de longa duração: ${await res.text()}`);
  return res.json() as Promise<{ access_token: string; token_type: string; expires_in: number }>;
}

export async function validateAndFetchProfile(accessToken: string) {
  const res = await fetch(
    `${GRAPH_BASE}/me?fields=user_id,username,account_type,media_count&access_token=${accessToken}`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token inválido ou expirado: ${body}`);
  }
  return res.json() as Promise<{
    user_id: string;
    username: string;
    account_type: string;
    media_count: number;
  }>;
}

export async function getOwnProfileMetrics(accessToken: string) {
  const profileRes = await fetch(
    `${GRAPH_BASE}/me?fields=user_id,username,name,account_type,media_count,followers_count,follows_count,profile_picture_url&access_token=${accessToken}`,
    { cache: "no-store" }
  );
  const profile = await profileRes.json();

  const mediaRes = await fetch(
    `${GRAPH_BASE}/me/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink&limit=50&access_token=${accessToken}`,
    { cache: "no-store" }
  );
  const mediaJson = await mediaRes.json();
  const media = mediaJson?.data ?? [];

  // Métricas agregadas calculadas a partir dos posts recentes (não é histórico total da conta,
  // é a soma/média dos últimos posts retornados pela API — ainda assim, dá uma boa noção do
  // desempenho recente).
  const totalLikes = media.reduce((sum: number, m: any) => sum + (m.like_count ?? 0), 0);
  const totalComments = media.reduce((sum: number, m: any) => sum + (m.comments_count ?? 0), 0);
  const avgLikes = media.length ? Math.round(totalLikes / media.length) : 0;
  const avgComments = media.length ? Math.round(totalComments / media.length) : 0;
  const topPost = media.length
    ? [...media].sort((a: any, b: any) => (b.like_count ?? 0) - (a.like_count ?? 0))[0]
    : null;

  // Insights de conta (visitas ao perfil, alcance, impressões) exigem a permissão
  // "instagram_business_manage_insights" no token. Se ainda não tiver sido concedida,
  // essa chamada falha silenciosamente e o dashboard simplesmente não mostra essa seção.
  let accountInsights: Record<string, number> = {};
  try {
    const insightsRes = await fetch(
      `${GRAPH_BASE}/me/insights?metric=profile_views,reach,accounts_engaged,total_interactions&period=day&metric_type=total_value&access_token=${accessToken}`,
      { cache: "no-store" }
    );
    const insightsJson = await insightsRes.json();
    if (Array.isArray(insightsJson?.data)) {
      for (const item of insightsJson.data) {
        const value = item.total_value?.value ?? item.values?.[0]?.value ?? null;
        if (value != null) accountInsights[item.name] = value;
      }
    }
  } catch {
    // sem permissão de insights ainda — sem problema, seção fica oculta
  }

  return {
    profile,
    media,
    aggregates: { totalLikes, totalComments, avgLikes, avgComments, topPost },
    accountInsights,
  };
}
}

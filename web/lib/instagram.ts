// Instagram Graph API — cobre SOMENTE o perfil autenticado (você), via login oficial
// "Entrar com Facebook", exigindo conta Instagram Business/Creator vinculada a uma Página do Facebook.
// Docs: https://developers.facebook.com/docs/instagram-api

const GRAPH_BASE = "https://graph.facebook.com/v19.0";

export function getInstagramLoginUrl() {
  const appId = process.env.META_APP_ID!;
  const redirectUri = process.env.META_REDIRECT_URI!;
  const scopes = [
    "instagram_basic",
    "instagram_manage_insights",
    "pages_show_list",
    "pages_read_engagement",
  ].join(",");

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: scopes,
    response_type: "code",
  });

  return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string) {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    redirect_uri: process.env.META_REDIRECT_URI!,
    code,
  });

  const res = await fetch(`${GRAPH_BASE}/oauth/access_token?${params.toString()}`);
  if (!res.ok) throw new Error(`Falha ao trocar code por token: ${await res.text()}`);
  return res.json() as Promise<{ access_token: string; token_type: string; expires_in: number }>;
}

// Descobre a Página do Facebook vinculada e a conta Instagram Business associada a ela.
export async function getInstagramBusinessAccount(userAccessToken: string) {
  const pagesRes = await fetch(
    `${GRAPH_BASE}/me/accounts?access_token=${userAccessToken}`
  );
  const pagesData = await pagesRes.json();
  const page = pagesData?.data?.[0];
  if (!page) throw new Error("Nenhuma Página do Facebook encontrada para esta conta.");

  const igRes = await fetch(
    `${GRAPH_BASE}/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
  );
  const igData = await igRes.json();
  const igAccountId = igData?.instagram_business_account?.id;
  if (!igAccountId) throw new Error("Nenhuma conta Instagram Business/Creator vinculada a essa Página.");

  return { igAccountId, pageAccessToken: page.access_token as string };
}

export async function getOwnProfileMetrics(igAccountId: string, pageAccessToken: string) {
  const fields = [
    "username",
    "followers_count",
    "follows_count",
    "media_count",
    "biography",
    "profile_picture_url",
  ].join(",");

  const profileRes = await fetch(
    `${GRAPH_BASE}/${igAccountId}?fields=${fields}&access_token=${pageAccessToken}`
  );
  const profile = await profileRes.json();

  const mediaRes = await fetch(
    `${GRAPH_BASE}/${igAccountId}/media?fields=id,caption,media_type,timestamp,like_count,comments_count,permalink&limit=25&access_token=${pageAccessToken}`
  );
  const media = await mediaRes.json();

  return { profile, media: media?.data ?? [] };
}

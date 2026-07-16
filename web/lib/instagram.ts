// Instagram API with Instagram Login — cobre SOMENTE o seu próprio perfil Business/Creator.
// Neste fluxo mais novo da Meta, o token de acesso é gerado direto no painel de desenvolvedores
// (Casos de uso -> Gerenciar mensagens e conteúdo no Instagram -> Gerar tokens de acesso ->
// Adicionar conta), então o app não precisa implementar o redirect OAuth completo — só chama
// a Graph API do Instagram (graph.instagram.com) usando o token que você colou no dashboard.

const GRAPH_BASE = "https://graph.instagram.com/v21.0";

export async function validateAndFetchProfile(accessToken: string) {
  const res = await fetch(
    `${GRAPH_BASE}/me?fields=user_id,username,account_type,media_count&access_token=${accessToken}`
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
    `${GRAPH_BASE}/me?fields=user_id,username,account_type,media_count,followers_count,follows_count&access_token=${accessToken}`
  );
  const profile = await profileRes.json();

  const mediaRes = await fetch(
    `${GRAPH_BASE}/me/media?fields=id,caption,media_type,timestamp,like_count,comments_count,permalink&limit=25&access_token=${accessToken}`
  );
  const media = await mediaRes.json();

  return { profile, media: media?.data ?? [] };
}

// Troca um token de curta duração por um de longa duração (~60 dias).
// Útil se, no futuro, você quiser automatizar a renovação do token.
export async function exchangeForLongLivedToken(shortLivedToken: string) {
  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: process.env.INSTAGRAM_APP_SECRET!,
    access_token: shortLivedToken,
  });
  const res = await fetch(`${GRAPH_BASE}/access_token?${params.toString()}`);
  if (!res.ok) throw new Error(`Falha ao trocar por token de longa duração: ${await res.text()}`);
  return res.json() as Promise<{ access_token: string; token_type: string; expires_in: number }>;
}

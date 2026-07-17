import { getSupabaseAdmin } from "@/lib/supabase";
import { getOwnProfileMetrics } from "@/lib/instagram";
import {
  getAccountOverview,
  getReachByContentType,
  getFollowerDemographics,
  getOnlineFollowers,
  getRecentPostsInsights,
} from "@/lib/insights";
import ConnectInstagramForm from "./ConnectInstagramForm";
import DisconnectButton from "./DisconnectButton";
import DeleteInsightButton from "./DeleteInsightButton";

export const dynamic = "force-dynamic";

async function getOwnProfile() {
  const supabase = getSupabaseAdmin();
  const { data, error: dbError } = await supabase
    .from("instagram_accounts")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (dbError) return { erro: `Erro ao ler o Supabase: ${dbError.message}` };
  if (!data) return null;

  try {
    const metrics = await getOwnProfileMetrics(data.access_token);
    const [overview, reachByType, demographics, onlineFollowers, postInsights] = await Promise.all([
      getAccountOverview(data.access_token),
      getReachByContentType(data.access_token),
      getFollowerDemographics(data.access_token),
      getOnlineFollowers(data.access_token),
      getRecentPostsInsights(metrics.media, data.access_token),
    ]);
    return { ...metrics, overview, reachByType, demographics, onlineFollowers, postInsights };
  } catch (err: any) {
    return { erro: `Token salvo, mas falhou ao buscar métricas: ${err.message}` };
  }
}

async function getInsights() {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("insights")
      .select("id, scraped_profile_id, insight, created_at, scraped_profiles(username, niche)")
      .order("created_at", { ascending: false })
      .limit(30);
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const [ownRaw, insights] = await Promise.all([getOwnProfile(), getInsights()]);
  const own: any = ownRaw;

  return (
    <>
      <h1>Visão geral</h1>
      <p className="subtitle">Seu perfil, lado a lado com o que está performando no seu nicho.</p>

      {own?.erro ? (
        <div className="empty-state" style={{ borderColor: "var(--danger)" }}>
          <p style={{ marginBottom: 16, color: "var(--danger)" }}>{own.erro}</p>
          <a className="btn" href="/api/auth/instagram/login" style={{ marginBottom: 16, display: "inline-flex" }}>
            Conectar com Instagram
          </a>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "16px 0 8px" }}>
            Ou, se preferir, cole um token gerado manualmente:
          </p>
          <ConnectInstagramForm />
        </div>
      ) : !own ? (
        <div className="empty-state">
          <p style={{ marginBottom: 16 }}>Seu Instagram ainda não está conectado.</p>
          <a className="btn" href="/api/auth/instagram/login" style={{ marginBottom: 16, display: "inline-flex" }}>
            Conectar com Instagram
          </a>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "16px 0 8px" }}>
            Ou, se preferir, cole um token gerado manualmente:
          </p>
          <ConnectInstagramForm />
        </div>
      ) : (
        <>
          <div className="profile-header">
            {own.profile.profile_picture_url && (
              <img src={own.profile.profile_picture_url} alt={own.profile.username} className="profile-avatar" />
            )}
            <div style={{ flex: 1 }}>
              <p className="profile-name">{own.profile.name || own.profile.username}</p>
              <p className="profile-username">@{own.profile.username}</p>
            </div>
            <DisconnectButton />
          </div>

          <div className="grid">
            <div className="card">
              <p className="card-title">Seguidores</p>
              <p className="metric">{own.profile.followers_count ?? "—"}</p>
            </div>
            <div className="card">
              <p className="card-title">Publicações</p>
              <p className="metric">{own.profile.media_count ?? "—"}</p>
            </div>
            <div className="card">
              <p className="card-title">Seguindo</p>
              <p className="metric">{own.profile.follows_count ?? "—"}</p>
            </div>
            <div className="card">
              <p className="card-title">Tipo de conta</p>
              <p className="metric accent" style={{ fontSize: 16 }}>{own.profile.account_type ?? "—"}</p>
            </div>
          </div>

          {/* Visão geral */}
          <div className="section-header" style={{ marginTop: 28 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 15, margin: 0, color: "var(--text-muted)" }}>
              Visão geral da conta
            </h2>
          </div>
          <div className="grid">
            <div className="card">
              <p className="card-title">Contas alcançadas (hoje)</p>
              <p className="metric">{own.overview?.reach ?? "—"}</p>
            </div>
            <div className="card">
              <p className="card-title">Contas com engajamento (hoje)</p>
              <p className="metric">{own.overview?.accounts_engaged ?? "—"}</p>
            </div>
            <div className="card">
              <p className="card-title">Interações totais (hoje)</p>
              <p className="metric">{own.overview?.total_interactions ?? "—"}</p>
            </div>
            <div className="card">
              <p className="card-title">Visitas ao perfil (hoje)</p>
              <p className="metric accent">{own.overview?.profile_views ?? "—"}</p>
            </div>
          </div>
          {Object.keys(own.overview ?? {}).length === 0 && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
              Essas métricas exigem a permissão <strong>instagram_business_manage_insights</strong> no
              token — adicione ela no painel da Meta e gere um token novo pra liberar essa seção.
            </p>
          )}

          {/* Alcance e distribuição */}
          <div className="section-header" style={{ marginTop: 28 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 15, margin: 0, color: "var(--text-muted)" }}>
              Alcance por tipo de conteúdo
            </h2>
          </div>
          {own.reachByType && Object.keys(own.reachByType).length > 0 ? (
            <div className="grid">
              {Object.entries(own.reachByType).map(([tipo, valor]) => (
                <div className="card" key={tipo}>
                  <p className="card-title">{tipo}</p>
                  <p className="metric">{valor as number}</p>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Ainda não disponível (mesma permissão acima).</p>
          )}

          {/* Curtidas/comentários agregados já calculados */}
          <div className="section-header" style={{ marginTop: 28 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 15, margin: 0, color: "var(--text-muted)" }}>
              Engajamento recente ({own.media?.length ?? 0} posts)
            </h2>
          </div>
          {own.aggregates && (
            <div className="grid">
              <div className="card">
                <p className="card-title">Total de curtidas</p>
                <p className="metric">{own.aggregates.totalLikes}</p>
              </div>
              <div className="card">
                <p className="card-title">Total de comentários</p>
                <p className="metric">{own.aggregates.totalComments}</p>
              </div>
              <div className="card">
                <p className="card-title">Média de curtidas/post</p>
                <p className="metric accent">{own.aggregates.avgLikes}</p>
              </div>
              <div className="card">
                <p className="card-title">Média de comentários/post</p>
                <p className="metric accent">{own.aggregates.avgComments}</p>
              </div>
            </div>
          )}

          {/* Dados do público */}
          <div className="section-header" style={{ marginTop: 28 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 15, margin: 0, color: "var(--text-muted)" }}>
              Dados do público
            </h2>
          </div>
          {own.demographics?.porPais?.length > 0 ||
          own.demographics?.porCidade?.length > 0 ||
          own.demographics?.porIdadeGenero?.length > 0 ? (
            <div className="grid">
              {own.demographics.porPais?.length > 0 && (
                <div className="card">
                  <p className="card-title">Principais países</p>
                  {own.demographics.porPais.map((p: any) => (
                    <p key={p.pais} style={{ fontSize: 13, marginTop: 4 }}>{p.pais}: <b>{p.valor}</b></p>
                  ))}
                </div>
              )}
              {own.demographics.porCidade?.length > 0 && (
                <div className="card">
                  <p className="card-title">Principais cidades</p>
                  {own.demographics.porCidade.map((c: any) => (
                    <p key={c.cidade} style={{ fontSize: 13, marginTop: 4 }}>{c.cidade}: <b>{c.valor}</b></p>
                  ))}
                </div>
              )}
              {own.demographics.porIdadeGenero?.length > 0 && (
                <div className="card">
                  <p className="card-title">Faixa etária / gênero</p>
                  {own.demographics.porIdadeGenero.slice(0, 6).map((d: any, i: number) => (
                    <p key={i} style={{ fontSize: 13, marginTop: 4 }}>
                      {d.faixaEtaria} · {d.genero}: <b>{d.valor}</b>
                    </p>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Ainda não disponível — exige a permissão de insights e no mínimo 100 seguidores.
            </p>
          )}

          {own.onlineFollowers?.length > 0 && (
            <div className="card" style={{ marginTop: 12 }}>
              <p className="card-title">Horários de maior atividade dos seguidores</p>
              {own.onlineFollowers.map((h: any) => (
                <p key={h.hora} style={{ fontSize: 13, marginTop: 4 }}>
                  {h.hora}h — <b>{h.quantidade}</b> seguidores online
                </p>
              ))}
            </div>
          )}

          {/* Stories e Lives — limitação real da API */}
          <div className="section-header" style={{ marginTop: 28 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 15, margin: 0, color: "var(--text-muted)" }}>
              Stories e Transmissões ao vivo
            </h2>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
            A API da Meta só permite ler insights de Stories enquanto estão no ar (24h) e de Lives
            enquanto estão acontecendo — não existe endpoint de histórico para nenhum dos dois depois
            que terminam. Pra ter esses dados aqui, seria necessário monitorar em tempo real (fica
            como possível melhoria futura).
          </p>

          {own.aggregates?.topPost && (
            <div className="card" style={{ marginTop: 20 }}>
              <p className="card-title">Post com mais curtidas recentemente</p>
              <a
                href={own.aggregates.topPost.permalink}
                target="_blank"
                rel="noreferrer"
                style={{ display: "flex", gap: 14, marginTop: 10, alignItems: "center" }}
              >
                <img
                  src={own.aggregates.topPost.thumbnail_url || own.aggregates.topPost.media_url}
                  alt="top post"
                  style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover" }}
                />
                <div>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>
                    ♥ {own.aggregates.topPost.like_count ?? 0} · 💬 {own.aggregates.topPost.comments_count ?? 0}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 400 }}>
                    {own.aggregates.topPost.caption?.slice(0, 90) ?? "sem legenda"}
                  </p>
                </div>
              </a>
            </div>
          )}

          {/* Grade de posts com insights individuais (curtidas, salvamentos, alcance, plays) */}
          <div className="section-header" style={{ marginTop: 28 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 15, margin: 0, color: "var(--text-muted)" }}>
              Publicações recentes (detalhado)
            </h2>
          </div>

          {own.media?.length > 0 && (
            <div className="posts-grid">
              {own.media.map((post: any) => {
                const pi = own.postInsights?.[post.id] ?? {};
                return (
                  <a key={post.id} href={post.permalink} target="_blank" rel="noreferrer" className="post-thumb" title={
                    Object.entries(pi).map(([k, v]) => `${k}: ${v}`).join(" · ") || "sem insights disponíveis"
                  }>
                    <img src={post.thumbnail_url || post.media_url} alt={post.caption?.slice(0, 40) || "post"} />
                    <div className="post-thumb-stats">
                      <span>♥ {post.like_count ?? 0}</span>
                      <span>💬 {post.comments_count ?? 0}</span>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </>
      )}

      <div className="section">
        <div className="section-header">
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, margin: 0 }}>
            Insights coletados pela extensão
          </h2>
        </div>

        {insights.length === 0 ? (
          <div className="empty-state">
            Nenhuma análise ainda. Instale a extensão, abra um perfil no Instagram e clique em
            "Analisar perfil" — o resultado aparece aqui automaticamente.
          </div>
        ) : (
          insights.map((item: any) => {
            const ins = item.insight ?? {};
            return (
              <div className="insight-card" key={item.id}>
                <div className="insight-header">
                  <span className="username">@{item.scraped_profiles?.username}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {item.scraped_profiles?.niche && (
                      <span className="niche-tag">{item.scraped_profiles.niche}</span>
                    )}
                    {typeof ins.score_potencial === "number" && (
                      <span className="score-ring">
                        score <b>{ins.score_potencial}</b>/100
                      </span>
                    )}
                    <DeleteInsightButton scrapedProfileId={item.scraped_profile_id} />
                  </div>
                </div>
                <div className="insight-body">
                  {ins.resumo && <p>{ins.resumo}</p>}

                  {ins.o_que_replicar && (
                    <>
                      <strong style={{ fontSize: 13 }}>O que replicar</strong>
                      <ul>
                        {ins.o_que_replicar.map((x: string, i: number) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                    </>
                  )}

                  {ins.formatos_que_mais_performam && (
                    <>
                      <strong style={{ fontSize: 13 }}>Formatos que mais performam</strong>
                      <ul>
                        {ins.formatos_que_mais_performam.map((x: string, i: number) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

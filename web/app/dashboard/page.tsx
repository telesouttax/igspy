import { getSupabaseAdmin } from "@/lib/supabase";
import { getOwnProfileMetrics } from "@/lib/instagram";
import ConnectInstagramForm from "./ConnectInstagramForm";
import DisconnectButton from "./DisconnectButton";

export const dynamic = "force-dynamic";

async function getOwnProfile() {
  const supabase = getSupabaseAdmin();
  const { data: allRows } = await supabase
    .from("instagram_accounts")
    .select("ig_user_id, username, updated_at");

  const { data, error: dbError, count } = await supabase
    .from("instagram_accounts")
    .select("*", { count: "exact" })
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const debugBanner = `[DEBUG ${new Date().toISOString()}] linhas encontradas: ${
    allRows?.length ?? 0
  } | ids: ${JSON.stringify(allRows?.map((r) => r.ig_user_id) ?? [])}`;

  if (dbError) {
    return { erro: `${debugBanner} | erro: ${dbError.message}` };
  }
  if (!data) {
    return { erro: `${debugBanner} | (nenhuma linha via maybeSingle)` };
  }

  try {
    const metrics = await getOwnProfileMetrics(data.access_token);
    return { ...metrics, _debugBanner: debugBanner };
  } catch (err: any) {
    return { erro: `${debugBanner} | falhou ao buscar métricas: ${err.message}` };
  }
}

async function getInsights() {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("insights")
      .select("id, insight, created_at, scraped_profiles(username, niche)")
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

      <div style={{ background: "red", color: "white", padding: 20, fontSize: 24, fontWeight: 900, marginBottom: 20 }}>
        MARCADOR-DE-VERSAO-XYZ-789
      </div>

      <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)", marginBottom: 16, wordBreak: "break-all" }}>
        {own?.erro || own?._debugBanner || "[DEBUG] own está null/undefined"}
      </p>

      {own?.erro ? (
        <div className="empty-state" style={{ borderColor: "var(--danger)" }}>
          <p style={{ marginBottom: 16, color: "var(--danger)" }}>{own.erro}</p>
          <ConnectInstagramForm />
        </div>
      ) : !own ? (
        <div className="empty-state">
          <p style={{ marginBottom: 16 }}>Seu Instagram ainda não está conectado.</p>
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

          {own.media?.length > 0 && (
            <div className="posts-grid">
              {own.media.map((post: any) => (
                <a key={post.id} href={post.permalink} target="_blank" rel="noreferrer" className="post-thumb">
                  <img src={post.thumbnail_url || post.media_url} alt={post.caption?.slice(0, 40) || "post"} />
                  <div className="post-thumb-stats">
                    <span>♥ {post.like_count ?? 0}</span>
                    <span>💬 {post.comments_count ?? 0}</span>
                  </div>
                </a>
              ))}
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

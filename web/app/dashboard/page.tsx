import { getSupabaseAdmin } from "@/lib/supabase";
import { getOwnProfileMetrics } from "@/lib/instagram";

export const dynamic = "force-dynamic";

async function getOwnProfile() {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("instagram_accounts")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return null;
    return await getOwnProfileMetrics(data.ig_account_id, data.page_access_token);
  } catch {
    return null;
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
  const [own, insights] = await Promise.all([getOwnProfile(), getInsights()]);

  return (
    <>
      <h1>Visão geral</h1>
      <p className="subtitle">Seu perfil, lado a lado com o que está performando no seu nicho.</p>

      {!own ? (
        <div className="empty-state">
          <p style={{ marginBottom: 16 }}>Seu Instagram ainda não está conectado.</p>
          <a className="btn" href="/api/auth/instagram">Conectar meu Instagram</a>
        </div>
      ) : (
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
            <p className="card-title">Últimas publicações analisadas</p>
            <p className="metric accent">{own.media?.length ?? 0}</p>
          </div>
        </div>
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

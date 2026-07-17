"use client";

import { useState } from "react";

export default function AdsLibraryPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const [results, setResults] = useState<any[]>([]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/ads-library/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, countries: ["BR"] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || "Falha na busca.");
      setResults(data.results ?? []);
      setStatus("idle");
    } catch (err: any) {
      setStatus("error");
      setError(err.message);
    }
  }

  return (
    <>
      <h1>Biblioteca de Anúncios</h1>
      <p className="subtitle">
        Busca oficial na Ad Library da Meta — veja o que marcas/perfis do seu nicho estão anunciando.
      </p>

      <form onSubmit={handleSearch} style={{ display: "flex", gap: 10, marginBottom: 24, maxWidth: 500 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="nome da página, marca ou termo"
          style={{
            flex: 1,
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            padding: "10px 12px",
            borderRadius: 8,
            fontSize: 13,
          }}
        />
        <button className="btn" type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Buscando..." : "Buscar"}
        </button>
      </form>

      {status === "error" && (
        <div className="empty-state" style={{ borderColor: "var(--danger)", marginBottom: 20 }}>
          <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>
        </div>
      )}

      {results.length === 0 && status !== "error" ? (
        <div className="empty-state">
          Nenhum resultado ainda. Busque pelo nome de uma página ou marca do seu nicho.
        </div>
      ) : (
        <div className="grid">
          {results.map((ad) => (
            <div className="card" key={ad.id}>
              <p className="card-title">{ad.page_name ?? "Página desconhecida"}</p>
              {ad.ad_creative_bodies?.[0] && (
                <p style={{ fontSize: 13, marginTop: 8, color: "var(--text)" }}>
                  {ad.ad_creative_bodies[0].slice(0, 160)}
                </p>
              )}
              {ad.ad_delivery_start_time && (
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
                  Ativo desde {new Date(ad.ad_delivery_start_time).toLocaleDateString("pt-BR")}
                </p>
              )}
              {ad.ad_snapshot_url && (
                <a
                  href={ad.ad_snapshot_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 12, color: "var(--accent-2)", display: "inline-block", marginTop: 10 }}
                >
                  Ver anúncio completo →
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

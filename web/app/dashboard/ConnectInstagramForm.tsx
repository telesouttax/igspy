"use client";

import { useState } from "react";

export default function ConnectInstagramForm() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/auth/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || "Falha ao conectar.");
      setStatus("ok");
      setMessage(`Conectado como @${data.username}. Atualizando...`);
      setTimeout(() => window.location.reload(), 1200);
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 420 }}>
      <label style={{ fontSize: 12, color: "var(--text-muted)" }}>
        Cole aqui o token gerado no painel da Meta (Casos de uso → Gerar tokens de acesso)
      </label>
      <input
        type="password"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="IGAAxxxxxxxxxxxxxxxxxxxx..."
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          color: "var(--text)",
          padding: "10px 12px",
          borderRadius: 8,
          fontSize: 13,
          fontFamily: "var(--font-mono)",
        }}
      />
      <button className="btn" type="submit" disabled={status === "loading" || !token}>
        {status === "loading" ? "Conectando..." : "Conectar meu Instagram"}
      </button>
      {message && (
        <p style={{ fontSize: 13, color: status === "error" ? "var(--danger)" : "var(--accent-2)" }}>
          {message}
        </p>
      )}
    </form>
  );
}

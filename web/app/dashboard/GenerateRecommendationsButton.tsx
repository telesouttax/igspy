"use client";

import { useState } from "react";

export default function GenerateRecommendationsButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleClick() {
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/recommendations/generate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || "Falha ao gerar recomendações.");
      window.location.reload();
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message);
    }
  }

  return (
    <div>
      <button className="btn" onClick={handleClick} disabled={status === "loading"}>
        {status === "loading" ? "Gerando (pode levar até 20s)..." : "Gerar recomendações estratégicas"}
      </button>
      {message && <p style={{ fontSize: 12, color: "var(--danger)", marginTop: 8 }}>{message}</p>}
    </div>
  );
}

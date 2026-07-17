"use client";

import { useState } from "react";

export default function DeleteInsightButton({ scrapedProfileId }: { scrapedProfileId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!confirm("Excluir essa análise? Não tem como desfazer.")) return;
    setLoading(true);
    await fetch(`/api/analysis/${scrapedProfileId}`, { method: "DELETE" });
    window.location.reload();
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="btn secondary"
      style={{ fontSize: 11, padding: "4px 10px" }}
    >
      {loading ? "..." : "Excluir"}
    </button>
  );
}

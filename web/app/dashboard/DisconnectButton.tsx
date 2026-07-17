"use client";

import { useState } from "react";

export default function DisconnectButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!confirm("Desconectar sua conta do Instagram? Você pode reconectar depois com um novo token.")) {
      return;
    }
    setLoading(true);
    await fetch("/api/auth/instagram/disconnect", { method: "POST" });
    window.location.reload();
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="btn secondary"
      style={{ fontSize: 12, padding: "6px 12px" }}
    >
      {loading ? "Desconectando..." : "Desconectar"}
    </button>
  );
}

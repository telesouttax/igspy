chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "SEND_TO_BACKEND") return;

  chrome.storage.sync.get(["backendUrl", "apiToken"], async ({ backendUrl, apiToken }) => {
    if (!backendUrl || !apiToken) {
      sendResponse({ ok: false, error: "Configure a URL do backend e o token na extensão (clique no ícone)." });
      return;
    }

    try {
      const res = await fetch(`${backendUrl.replace(/\/$/, "")}/api/analysis/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify(message.payload),
      });

      const data = await res.json();
      if (!res.ok) {
        sendResponse({ ok: false, error: data?.erro || `Erro ${res.status}` });
        return;
      }
      sendResponse({ ok: true, insight: data.insight });
    } catch (err) {
      sendResponse({ ok: false, error: String(err) });
    }
  });

  return true; // mantém o canal aberto para a resposta assíncrona
});

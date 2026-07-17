chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SEND_TO_BACKEND") {
    handleSendToBackend(message.payload, sendResponse);
    return true; // mantém o canal aberto para a resposta assíncrona
  }

  if (message.type === "START_BATCH_ANALYSIS") {
    handleBatchAnalysis(message.usernames, message.niche, message.intervalSeconds);
    sendResponse({ started: true });
    return true;
  }
});

function handleSendToBackend(payload, sendResponse) {
  chrome.storage.sync.get(["backendUrl", "apiToken"], async ({ backendUrl, apiToken }) => {
    if (!backendUrl || !apiToken) {
      sendResponse({ ok: false, error: "Configure a URL do backend e o token na extensão (clique no ícone)." });
      return;
    }
    try {
      const res = await fetch(`${backendUrl.replace(/\/$/, "")}/api/analysis/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify(payload),
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
}

// Função injetada diretamente na página do perfil — precisa ser 100% autocontida
// (sem referenciar nada de fora), porque roda isolada dentro da aba do Instagram.
function extractProfileDataInPage() {
  function parseMetaCounts() {
    const meta = document.querySelector('meta[property="og:description"]')?.content ?? "";
    const match = meta.match(/([\d.,mMkK]+)\s+Followers,\s+([\d.,mMkK]+)\s+Following,\s+([\d.,mMkK]+)\s+Posts/i);
    if (!match) return {};
    return { followersRaw: match[1], followingRaw: match[2], postsRaw: match[3] };
  }

  const username = location.pathname.replace(/\//g, "");
  const counts = parseMetaCounts();
  const bio =
    document.querySelector('meta[name="description"]')?.content ??
    document.querySelector("header section")?.innerText ??
    "";

  const anchors = Array.from(document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]'));
  const posts = anchors.slice(0, 24).map((a) => {
    const img = a.querySelector("img");
    const isReel = a.href.includes("/reel/");
    const ariaText = a.getAttribute("aria-label") || a.innerText || "";
    return {
      type: isReel ? "reel" : "post",
      url: a.href,
      altText: img?.alt ?? "",
      rawOverlayText: ariaText.slice(0, 200),
    };
  });

  return { username, bio, followers: counts.followersRaw, following: counts.followingRaw, postsCount: counts.postsRaw, posts };
}

async function handleBatchAnalysis(usernames, niche, intervalSeconds) {
  const { backendUrl, apiToken } = await chrome.storage.sync.get(["backendUrl", "apiToken"]);
  if (!backendUrl || !apiToken) {
    chrome.storage.local.set({ batchLog: ["Configure a URL do backend e o token antes de iniciar."], batchRunning: false });
    return;
  }

  const log = [];
  const pushLog = (line) => {
    log.push(line);
    chrome.storage.local.set({ batchLog: [...log], batchRunning: true });
  };

  pushLog(`Iniciando análise em lote de ${usernames.length} perfis...`);

  for (let i = 0; i < usernames.length; i++) {
    const username = usernames[i].trim().replace(/^@/, "");
    if (!username) continue;

    pushLog(`(${i + 1}/${usernames.length}) Abrindo @${username}...`);

    try {
      const tab = await chrome.tabs.create({ url: `https://www.instagram.com/${username}/`, active: false });

      // Espera a aba carregar de verdade + um tempo extra pro React da página renderizar
      await waitForTabLoad(tab.id);
      await sleep(3000);

      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractProfileDataInPage,
      });

      await chrome.tabs.remove(tab.id);

      if (!result?.posts?.length) {
        pushLog(`(${i + 1}/${usernames.length}) @${username} — não encontrei posts, pulando.`);
      } else {
        const payload = { ...result, niche: niche || null, collectedAt: new Date().toISOString() };
        const res = await fetch(`${backendUrl.replace(/\/$/, "")}/api/analysis/ingest`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiToken}` },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          pushLog(`(${i + 1}/${usernames.length}) @${username} — analisado com sucesso ✓`);
        } else {
          const data = await res.json().catch(() => ({}));
          pushLog(`(${i + 1}/${usernames.length}) @${username} — falhou: ${data?.erro || res.status}`);
        }
      }
    } catch (err) {
      pushLog(`(${i + 1}/${usernames.length}) @${username} — erro: ${String(err)}`);
    }

    if (i < usernames.length - 1) {
      pushLog(`Aguardando ${intervalSeconds}s antes do próximo perfil...`);
      await sleep(intervalSeconds * 1000);
    }
  }

  pushLog("Análise em lote concluída! Confira o dashboard.");
  chrome.storage.local.set({ batchRunning: false });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForTabLoad(tabId) {
  return new Promise((resolve) => {
    function listener(updatedTabId, info) {
      if (updatedTabId === tabId && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
    // Fallback: não trava pra sempre se o evento "complete" não disparar
    setTimeout(resolve, 10000);
  });
}

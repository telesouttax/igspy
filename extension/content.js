// Nicho Insights — content script
// Roda dentro da página do Instagram já carregada no SEU navegador (você logado normalmente).
// Só lê o que já está renderizado na tela (DOM) — não faz requisições automatizadas ao Instagram
// e não usa nenhuma credencial de terceiros.
//
// AVISO: o Instagram muda a estrutura do DOM com frequência. Os seletores abaixo são best-effort
// e podem precisar de ajuste periódico — veja o console (F12) se a extração vier vazia.

(function () {
  const isSinglePost = /\/(p|reel)\/[^/]+\/?/.test(location.pathname);
  const isProfilePage =
    !isSinglePost &&
    /^\/[A-Za-z0-9._]+\/?$/.test(location.pathname) &&
    !["explore", "reels", "stories", "direct", "accounts"].includes(
      location.pathname.split("/")[1]
    );

  if (!isSinglePost && !isProfilePage) return;

  injectButton(isSinglePost ? "Adicionar este post à análise" : "Analisar perfil neste nicho", () => {
    if (isSinglePost) handleSinglePost();
    else handleProfile();
  });

  function injectButton(label, onClick) {
    if (document.getElementById("ni-floating-btn")) return;
    const btn = document.createElement("button");
    btn.id = "ni-floating-btn";
    btn.textContent = `🔎 ${label}`;
    Object.assign(btn.style, {
      position: "fixed",
      bottom: "24px",
      right: "24px",
      zIndex: 999999,
      background: "#F2A93B",
      color: "#171200",
      fontWeight: "600",
      fontFamily: "sans-serif",
      fontSize: "13px",
      padding: "12px 18px",
      borderRadius: "999px",
      border: "none",
      boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
      cursor: "pointer",
    });
    btn.addEventListener("click", onClick);
    document.body.appendChild(btn);
  }

  function toast(message, isError) {
    const el = document.createElement("div");
    el.textContent = message;
    Object.assign(el.style, {
      position: "fixed",
      bottom: "76px",
      right: "24px",
      zIndex: 999999,
      background: isError ? "#F2665E" : "#171B2E",
      color: "#E8E9F3",
      border: "1px solid #272C46",
      padding: "10px 16px",
      borderRadius: "8px",
      fontFamily: "sans-serif",
      fontSize: "13px",
      maxWidth: "280px",
    });
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 5000);
  }

  // Extrai "X Followers, Y Following, Z Posts" do meta og:description (fonte estável)
  function parseMetaCounts() {
    const meta = document.querySelector('meta[property="og:description"]')?.content ?? "";
    const match = meta.match(/([\d.,mMkK]+)\s+Followers,\s+([\d.,mMkK]+)\s+Following,\s+([\d.,mMkK]+)\s+Posts/i);
    if (!match) return {};
    return { followersRaw: match[1], followingRaw: match[2], postsRaw: match[3] };
  }

  function handleProfile() {
    const username = location.pathname.replace(/\//g, "");
    const counts = parseMetaCounts();
    const bio =
      document.querySelector('meta[name="description"]')?.content ??
      document.querySelector("header section")?.innerText ??
      "";

    // Links de posts/reels visíveis na grade atual (o que já carregou na tela)
    const anchors = Array.from(document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]'));
    const posts = anchors.slice(0, 24).map((a) => {
      const img = a.querySelector("img");
      const isReel = a.href.includes("/reel/");
      // aria-label de itens da grade às vezes traz "123 likes, 4 comments" — best effort
      const ariaText = a.getAttribute("aria-label") || a.innerText || "";
      const numbers = ariaText.match(/[\d.,mMkK]+/g) || [];
      return {
        type: isReel ? "reel" : "post",
        url: a.href,
        altText: img?.alt ?? "",
        rawOverlayText: ariaText.slice(0, 200),
        approxNumbers: numbers,
      };
    });

    if (posts.length === 0) {
      toast("Não encontrei posts na grade. Role a página para carregar mais e tente de novo.", true);
      return;
    }

    getSettings((settings) => {
      const payload = {
        username,
        bio,
        followers: counts.followersRaw,
        following: counts.followingRaw,
        postsCount: counts.postsRaw,
        posts,
        niche: settings.niche || null,
        collectedAt: new Date().toISOString(),
      };

      toast("Analisando perfil com IA...");
      chrome.runtime.sendMessage({ type: "SEND_TO_BACKEND", payload }, (response) => {
        if (response?.ok) {
          const score = response.insight?.score_potencial;
          toast(`Análise concluída${score != null ? ` — score ${score}/100` : ""}. Veja no dashboard.`);
        } else {
          toast(response?.error || "Falha ao enviar. Confira as configurações da extensão.", true);
        }
      });
    });
  }

  function handleSinglePost() {
    const isReel = location.pathname.includes("/reel/");
    const caption =
      document.querySelector('meta[property="og:description"]')?.content ??
      document.querySelector("article")?.innerText?.slice(0, 500) ??
      "";
    const time = document.querySelector("time")?.getAttribute("datetime");

    // Curtidas/comentários/views geralmente aparecem como texto próximo a botões de ação.
    const bodyText = document.querySelector("article")?.innerText || document.body.innerText;
    const likesMatch = bodyText.match(/([\d.,mMkK]+)\s+likes?/i);
    const viewsMatch = bodyText.match(/([\d.,mMkK]+)\s+views?/i);
    const commentsMatch = bodyText.match(/([\d.,mMkK]+)\s+comments?/i);

    const username = document.querySelector('header a[role="link"]')?.textContent?.trim() || "desconhecido";

    getSettings((settings) => {
      const payload = {
        username,
        posts: [
          {
            type: isReel ? "reel" : "post",
            caption,
            likes: likesMatch?.[1],
            views: viewsMatch?.[1],
            comments: commentsMatch?.[1],
            postedAt: time,
            url: location.href,
          },
        ],
        niche: settings.niche || null,
        collectedAt: new Date().toISOString(),
      };

      toast("Enviando post para análise...");
      chrome.runtime.sendMessage({ type: "SEND_TO_BACKEND", payload }, (response) => {
        if (response?.ok) toast("Post adicionado à análise com sucesso.");
        else toast(response?.error || "Falha ao enviar.", true);
      });
    });
  }

  function getSettings(cb) {
    chrome.storage.sync.get(["backendUrl", "apiToken", "niche"], cb);
  }
})();

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type ScrapedPost = {
  type: "reel" | "post" | "carousel";
  caption?: string;
  likes?: number;
  comments?: number;
  views?: number;
  postedAt?: string;
  url?: string;
};

export type ScrapedProfile = {
  username: string;
  fullName?: string;
  bio?: string;
  followers?: number;
  following?: number;
  postsCount?: number;
  posts: ScrapedPost[];
  niche?: string; // nicho informado pelo usuário na extensão
  collectedAt: string;
};

const SYSTEM_PROMPT = `Você é um estrategista de crescimento para Instagram, especializado em analisar
perfis de um nicho e extrair padrões replicáveis. Você recebe dados extraídos de perfis públicos
(apenas o que já é visível na página: legendas, contagens de curtidas/comentários/views, bio).

Sua tarefa: analisar os dados e responder SOMENTE em JSON válido, sem markdown, sem texto fora do JSON,
seguindo exatamente este formato:

{
  "resumo": "2-3 frases sobre o padrão geral do perfil/nicho",
  "pontos_fortes": ["string", "string", "..."],
  "formatos_que_mais_performam": ["string", "..."],
  "padroes_de_legenda": ["string", "..."],
  "frequencia_e_timing": "string",
  "o_que_replicar": ["ação concreta e específica", "..."],
  "o_que_evitar": ["string", "..."],
  "score_potencial": 0
}

"score_potencial" é um número de 0 a 100 indicando o quão replicável/forte é esse conteúdo para alguém
que quer crescer no mesmo nicho. Seja específico e prático, evite generalidades tipo "poste mais".`;

export async function generateNicheInsight(profile: ScrapedProfile) {
  const userMessage = `Dados coletados do perfil @${profile.username} (nicho informado: ${
    profile.niche ?? "não informado"
  }):

${JSON.stringify(profile, null, 2)}

Gere a análise conforme o formato pedido.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";
  const clean = raw.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(clean);
  } catch {
    return { erro: "Não foi possível interpretar a resposta da IA.", bruto: raw };
  }
}

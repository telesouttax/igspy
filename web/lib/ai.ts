import { GoogleGenerativeAI } from "@google/generative-ai";

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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

  const model = client.getGenerativeModel({
    model: "gemini-flash-latest",
    systemInstruction: SYSTEM_PROMPT,
  });

  const result = await model.generateContent(userMessage);
  const raw = result.response.text();
  const clean = raw.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(clean);
  } catch {
    return { erro: "Não foi possível interpretar a resposta da IA.", bruto: raw };
  }
}

const RECOMMENDATION_SYSTEM_PROMPT = `Você é um consultor de crescimento para Instagram. Você recebe:
1. Dados do perfil do PRÓPRIO usuário (seguidores, posts recentes, curtidas médias, etc)
2. Um conjunto de análises já feitas de outros perfis do mesmo nicho (pontos fortes, formatos que
   performam, padrões de legenda, o que replicar)

Sua tarefa: cruzar essas informações e gerar um plano de ação PRÁTICO e ESPECÍFICO para o perfil do
usuário crescer, baseado nos padrões que já performam no nicho dele. Responda SOMENTE em JSON válido,
sem markdown, sem texto fora do JSON, neste formato exato:

{
  "resumo_estrategico": "2-3 frases sobre a maior oportunidade de crescimento identificada",
  "prioridades": ["ação mais importante primeiro", "..."],
  "plano_de_acao": [
    { "acao": "o que fazer, de forma concreta", "porque": "baseado em qual padrão observado no nicho" }
  ],
  "formatos_recomendados": ["formato específico de conteúdo a testar", "..."],
  "o_que_parar_de_fazer": ["hábito ou padrão do próprio perfil que está atrapalhando, se identificável"]
}

Seja específico — cite números e padrões reais dos dados recebidos sempre que possível. Evite
generalidades genéricas como "poste mais" sem contexto.`;

export async function generateProfileRecommendations(ownProfile: any, nicheInsights: any[]) {
  const userMessage = `MEU PERFIL:
${JSON.stringify(ownProfile, null, 2)}

ANÁLISES JÁ FEITAS DE OUTROS PERFIS DO NICHO:
${JSON.stringify(nicheInsights, null, 2)}

Gere o plano de ação conforme o formato pedido.`;

  const model = client.getGenerativeModel({
    model: "gemini-flash-latest",
    systemInstruction: RECOMMENDATION_SYSTEM_PROMPT,
  });

  const result = await model.generateContent(userMessage);
  const raw = result.response.text();
  const clean = raw.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(clean);
  } catch {
    return { erro: "Não foi possível interpretar a resposta da IA.", bruto: raw };
  }
}

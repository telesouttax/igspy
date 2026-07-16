# Nicho Insights

Ferramenta de análise de perfis do Instagram por nicho, com IA (Google Gemini — gratuito), pensada em 3 peças:

1. **`/web`** — dashboard Next.js, hospedado na Vercel. Mostra as métricas do SEU perfil (via
   Instagram Graph API oficial, login OAuth) e os insights gerados a partir dos dados que a
   extensão coleta.
2. **`/extension`** — extensão Chrome (Manifest V3). Roda enquanto VOCÊ navega, logado
   normalmente no Instagram. Lê os dados já visíveis na página (bio, contagens, legendas,
   likes/comments/views) e manda para o backend. Não faz login em conta de terceiros e não
   automatiza acesso ao Instagram — só lê o DOM da página que você já abriu.
3. **`/supabase`** — schema do banco de dados (Postgres via Supabase) que guarda o histórico de
   perfis coletados e as análises geradas.

⚠️ **Importante sobre Termos de Uso**: mesmo lendo só dados já visíveis na tela, isso ainda entra
numa área cinzenta dos Termos de Uso do Instagram (que restringem coleta automatizada de dados,
mesmo sem login). O risco de bloqueio de conta é baixo comparado a scraping via servidor, mas não é
zero. Use com moderação (não centenas de perfis por hora) e por sua conta e risco.

---

## 1. Suba o repositório no GitHub

```bash
cd nicho-insights
git init
git add .
git commit -m "Setup inicial"
gh repo create nicho-insights --private --source=. --push
# ou crie o repo manualmente no GitHub e faça: git remote add origin <url> && git push -u origin main
```

## 2. Crie o banco no Supabase

1. Crie um projeto grátis em https://supabase.com
2. Vá em **SQL Editor** e rode o conteúdo de `supabase/schema.sql`
3. Em **Project Settings → API**, copie:
   - `Project URL` → vai virar `NEXT_PUBLIC_SUPABASE_URL`
   - `service_role key` (não a `anon` key!) → vai virar `SUPABASE_SERVICE_ROLE_KEY`

## 3. Configure o app da Meta (para conectar SEU Instagram)

1. Acesse https://developers.facebook.com/apps → **Criar app** → tipo **Negócios**
2. Em **Casos de uso**, adicione **"Gerenciar mensagens e conteúdo no Instagram"**
3. Dentro desse caso de uso, clique em **"Add all required permissions"**
4. Vá em **Funções** → adicione sua própria conta do Instagram como **Testador do Instagram** →
   aceite o convite pelo app do Instagram no celular (Configurações → Apps e sites)
5. Volte no caso de uso → passo **"2. Gerar tokens de acesso"** → **Adicionar conta** →
   selecione sua conta → gere o token de acesso
6. Copie esse token — você vai colar ele direto no dashboard depois do deploy (não precisa
   guardar em nenhuma variável de ambiente; ele fica salvo no Supabase quando você conecta)

⚠️ Esse token expira em ~60 dias. Quando expirar, é só gerar um novo no mesmo painel e colar
de novo no dashboard.

(Opcional) Se quiser automatizar a renovação do token no futuro, guarde também a **"Chave
secreta do app do Instagram"** (aparece na mesma tela) como `INSTAGRAM_APP_SECRET` — não é
obrigatório para o funcionamento básico.

## 4. Configure o Google Gemini (gratuito)

1. Acesse https://aistudio.google.com/apikey
2. Faça login com sua conta Google
3. Clique em **Create API key** → copie o valor gerado
4. Isso vai virar `GEMINI_API_KEY`

O tier gratuito do Gemini tem limite de requisições por minuto/dia, mas é suficiente para uso
pessoal (várias análises por dia sem custo).

## 5. Deploy na Vercel

1. Importe o repositório do GitHub na Vercel, apontando o **Root Directory** para `/web`
2. Em **Settings → Environment Variables**, adicione todas as variáveis de `web/.env.example`
   preenchidas (Supabase, Gemini, Meta, e um `EXTENSION_API_TOKEN` — qualquer string aleatória
   longa que você mesmo inventa)
3. Faça o deploy. Anote a URL final (ex: `https://nicho-insights.vercel.app`)
4. Volte no painel da Meta e confirme que a `META_REDIRECT_URI` bate exatamente com essa URL

## 6. Instale a extensão no Chrome

1. Abra `chrome://extensions`
2. Ative o **Modo do desenvolvedor** (canto superior direito)
3. Clique em **Carregar sem compactação** e selecione a pasta `extension/`
4. Clique no ícone da extensão na barra do Chrome e preencha:
   - **URL do backend**: a URL da Vercel (ex: `https://nicho-insights.vercel.app`)
   - **Token**: o mesmo valor que você colocou em `EXTENSION_API_TOKEN` na Vercel
   - **Nicho padrão** (opcional): ex. "moda feminina"

## 7. Uso

1. Acesse `https://SEU-PROJETO.vercel.app/dashboard` e cole o token gerado no painel da Meta
   para ver suas próprias métricas (seguidores, publicações, etc).
2. Navegue normalmente até o perfil de alguém no seu nicho no Instagram (`instagram.com/perfil`).
3. Clique no botão flutuante **🔎 Analisar perfil neste nicho** que aparece no canto da tela.
4. A extensão extrai os dados visíveis, manda pro backend, o Gemini gera a análise, e ela
   aparece automaticamente no dashboard.
5. Para uma análise mais profunda de um post/reel específico, abra ele individualmente e clique
   em **🔎 Adicionar este post à análise** — isso captura legenda, likes, comments e views daquele
   post específico (dados que não aparecem na grade do perfil).

---

## Limitações conhecidas

- Os seletores do `content.js` são best-effort: o Instagram muda o HTML com frequência, então a
  extração pode quebrar e precisar de ajuste. Veja o console do navegador (F12) se algo vier vazio.
- A análise por enquanto usa o que está **visível na grade do perfil** (thumbnails, contagens
  aproximadas). Para legendas completas e métricas exatas de cada post, use o botão dentro do
  post/reel individual.
- A Instagram Graph API (para o seu próprio perfil) exige conta Business/Creator vinculada a uma
  Página do Facebook — é um requisito da Meta, não da ferramenta.

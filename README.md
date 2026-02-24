# GitHub to Telegram Bot Notifier 🚀🤖

Um bot rápido e escalável construído em **Node.js** para receber webhooks do GitHub e notificar você automaticamente pelo Telegram sempre que um *Push* (Deploy) for realizado nos seus repositórios.

Nunca mais perca um deploy de vista!

## 🌟 Funcionalidades
- Recebe mensagens formatadas no Telegram com informações cruciais:
  - Nome do Repositório.
  - Autor do Push/Commit.
  - Mensagem do Commit.
  - Link direto para visualizar o código no GitHub.
- Configuração simples usando apenas variáveis de ambiente (`.env`).
- Pronto para ser hospedado gratuitamente no Render, Vercel ou VPS.

## 🛠️ Tecnologias Utilizadas
- **Node.js** (Ambiente de Execução)
- **Express.js** (Servidor Web para o Webhook)
- **Telegraf** (Framework para API do Telegram)
- **Dotenv** (Gerenciamento de variáveis de ambiente)

## 🚀 Como instalar e rodar (Local)

1. Clone este repositório:
```bash
git clone https://github.com/viniciusdocanto/telegrambot.git
cd telegrambot
```

2. Instale as dependências:
```bash
npm install
```

3. Configure o arquivo `.env`:
Copie o arquivo `.env-sample` para `.env` (ou crie um novo) e adicione suas credenciais:
```env
TELEGRAM_BOT_TOKEN=SEU_TOKEN_DO_BOTFATHER
TELEGRAM_CHAT_ID=SEU_CHAT_ID_DO_TELEGRAM
```

4. Inicie o servidor:
```bash
npm start
```
*(O servidor rodará por padrão na porta 3000).*

## ☁️ Como hospedar na nuvem (Render.com)
Este projeto está pronto para a nuvem!
1. Crie um novo **Web Service** no Render apontando para o seu fork deste repositório.
2. Build Command: `npm install`
3. Start Command: `npm start`
4. Na seção **Environment Variables**, adicione as chaves `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID`.
5. Pegue a URL pública gerada pelo Render (ex: `https://seu-bot.onrender.com`).

## 🔗 Configurando no GitHub
Vá no repositório que você deseja monitorar:
1. Em `Settings > Webhooks > Add webhook`.
2. Em **Payload URL**, coloque o endereço do seu servidor seguido de `/github-webhook`. Exemplo:
   `https://seu-bot.onrender.com/github-webhook`
3. Em **Content type**, selecione `application/json`.
6. Selecione **"Let me select individual events."** e marque:
   - `Pushes`
   - `Workflow runs`
7. Clique em **Update webhook** (ou Add webhook).

---
Desenvolvido com ☕ e ❤️ para facilitar o dia a dia de desenvolvedores.

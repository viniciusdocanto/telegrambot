require('dotenv').config();
const express = require('express');
const { Telegraf } = require('telegraf');

// Inicializa o Express (servidor web para receber o webhook do GitHub)
const app = express();
app.use(express.json()); // Permite receber JSON no body da requisição

// Inicializa o Bot do Telegram com o seu Token
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Rota principal para verificar se o servidor está rodando
app.get('/', (req, res) => {
    res.send('Servidor do Bot do Telegram está rodando! 🚀');
});

// Rota que vai receber o Webhook do GitHub
app.post('/github-webhook', (req, res) => {
    // O GitHub envia um header 'x-github-event' para sabermos qual foi a ação
    const event = req.headers['x-github-event'];
    const payload = req.body;

    // Se o evento foi um 'push' (alguém enviou código pro repositório)
    if (event === 'push') {
        const repoName = payload.repository.name;
        const pusherName = payload.pusher.name;
        const commitMessage = payload.head_commit ? payload.head_commit.message : 'Sem mensagem de commit';
        const commitUrl = payload.head_commit ? payload.head_commit.url : payload.repository.html_url;

        // Montando a mensagem amigável que o bot vai enviar
        const mensagem = `
🚀 *Novo Push (Deploy) Detectado!*
📦 *Repositório:* ${repoName}
👤 *Autor:* ${pusherName}
📝 *Commit:* ${commitMessage}
🔗 [Ver Commit no GitHub](${commitUrl})
        `;

        // Envia a mensagem pro seu chat.
        // process.env.TELEGRAM_CHAT_ID é o seu ID pessoal ou do grupo no Telegram
        if (process.env.TELEGRAM_CHAT_ID) {
            bot.telegram.sendMessage(process.env.TELEGRAM_CHAT_ID, mensagem, { parse_mode: 'Markdown' })
                .then(() => console.log(`Notificação enviada com sucesso para o chat ${process.env.TELEGRAM_CHAT_ID}`))
                .catch(err => console.error('Erro ao enviar mensagem pro Telegram:', err));
        } else {
            console.log('TELEGRAM_CHAT_ID não configurado no .env. A mensagem seria:', mensagem);
        }
    } else if (event === 'ping') {
        if (process.env.TELEGRAM_CHAT_ID) {
            bot.telegram.sendMessage(process.env.TELEGRAM_CHAT_ID, '🏓 *Webhook do GitHub conectado com sucesso!*\n\nAgora os próximos pushes (deploys) aparecerão aqui.', { parse_mode: 'Markdown' });
        }
    }

    // Responde ao GitHub que recebemos o aviso com sucesso (status 200)
    res.status(200).send('Webhook recebido com sucesso!');
});

// Comando de teste no Telegram (quando você digitar /start no bot)
bot.start((ctx) => {
    // Pega o ID do chat para você colocar no seu .env depois
    const chatId = ctx.chat.id;
    ctx.reply(`Olá! Eu sou o seu bot de notificações do GitHub. 🤖\n\n⚠️ Seu ID DE CHAT é: ${chatId}\n\nCopie esse número e coloque na variável TELEGRAM_CHAT_ID do seu arquivo .env.`);
});

// Inicia o bot
bot.launch();

// Inicia o servidor Express na porta 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`🤖 Bot do Telegram inicializado.`);
});

// Trata encerramento gracioso (Ctrl+C no terminal)
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

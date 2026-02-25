require('dotenv').config();
const express = require('express');
const { Telegraf } = require('telegraf');

// Inicializa o Express (servidor web para receber o webhook do GitHub)
const app = express();
app.use(express.json()); // Permite receber JSON no body da requisição

// Inicializa o Bot do Telegram com o seu Token
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Cache para desduplicação (armazena os últimos 100 IDs de entrega do GitHub)
const processedDeliveries = new Set();
const MAX_PROCESSED_LOG = 100;


// Rota principal para verificar se o servidor está rodando
app.get('/', (req, res) => {
    res.send('Servidor do Bot do Telegram está rodando! 🚀');
});

// Função para processar o Webhook do GitHub
const processWebhook = (req, res) => {
    const event = req.headers['x-github-event'];
    const deliveryId = req.headers['x-github-delivery'];
    const payload = req.body;

    console.log(`[GitHub Webhook] Evento: ${event} | Entrega: ${deliveryId}`);

    // Verifica desduplicação
    if (deliveryId && processedDeliveries.has(deliveryId)) {
        console.log(`[GitHub Webhook] Entrega duplicada detectada: ${deliveryId}. Ignorando.`);
        return res.status(200).send('Entrega duplicada ignorada');
    }

    // Registra o ID da entrega no cache
    if (deliveryId) {
        processedDeliveries.add(deliveryId);
        if (processedDeliveries.size > MAX_PROCESSED_LOG) {
            const firstEntry = processedDeliveries.values().next().value;
            processedDeliveries.delete(firstEntry);
        }
    }


    if (event === 'push') {
        const repoName = payload.repository.name;
        const pusherName = payload.pusher.name;
        const branch = payload.ref.replace('refs/heads/', '');
        const commitMessage = payload.head_commit ? payload.head_commit.message : 'Sem mensagem de commit';
        const commitUrl = payload.head_commit ? payload.head_commit.url : payload.repository.html_url;

        const mensagem = `
🛠️ *Novo Commit Detectado*
━━━━━━━━━━━━━━━━━━━━━━
📦 *Repositório:* \`${repoName}\`
🌿 *Branch:* \`${branch}\`
👤 *Autor:* ${pusherName}
📝 *Mensagem:* ${commitMessage}

🔗 [Ver no GitHub](${commitUrl})
        `;

        if (process.env.TELEGRAM_CHAT_ID) {
            bot.telegram.sendMessage(process.env.TELEGRAM_CHAT_ID, mensagem, { parse_mode: 'Markdown' })
                .then(() => console.log(`Notificação de Push enviada para o chat ${process.env.TELEGRAM_CHAT_ID}`))
                .catch(err => console.error('Erro ao enviar mensagem pro Telegram:', err));
        } else {
            console.log('TELEGRAM_CHAT_ID não configurado no .env.');
        }

    } else if (event === 'workflow_run' || event === 'check_run') {
        const action = payload.action;
        const workflowData = payload.workflow_run || payload.check_run;

        if (!workflowData) return res.status(200).send('Payload incompleto');

        // Monitoramos apenas quando termina (completed) para evitar spam
        // Aplicado para workflow_run e check_run
        if (action !== 'completed') {
            console.log(`Evento ${event} em andamento (${action}). Aguardando conclusão...`);
            return res.status(200).send('Aguardando conclusão');
        }


        const status = workflowData.conclusion; // success, failure, cancelled, etc.
        const repoName = payload.repository.name;
        const workflowName = workflowData.name || (event === 'check_run' ? 'Check Run' : 'Workflow');
        const workflowUrl = workflowData.html_url;

        let icon = '🔄';
        let statusText = 'Pendente';
        if (status === 'success') {
            icon = '✅';
            statusText = 'Sucesso';
        } else if (status === 'failure') {
            icon = '❌';
            statusText = 'Falha';
        } else if (status === 'cancelled') {
            icon = '🚫';
            statusText = 'Cancelado';
        }

        const mensagem = `
🏗️ *Status do Build/Action*
━━━━━━━━━━━━━━━━━━━━━━
📦 *Repositório:* \`${repoName}\`
🔨 *Tarefa:* ${workflowName}
📊 *Resultado:* ${icon} *${statusText}*

🔗 [Logs da Action](${workflowUrl})
        `;

        if (process.env.TELEGRAM_CHAT_ID) {
            bot.telegram.sendMessage(process.env.TELEGRAM_CHAT_ID, mensagem, { parse_mode: 'Markdown' })
                .then(() => console.log(`Notificação de ${event} enviada para o chat ${process.env.TELEGRAM_CHAT_ID}`))
                .catch(err => console.error(`Erro ao enviar mensagem de ${event} pro Telegram:`, err));
        }

    } else if (event === 'ping') {
        if (process.env.TELEGRAM_CHAT_ID) {
            bot.telegram.sendMessage(process.env.TELEGRAM_CHAT_ID, '🏓 *Webhook do GitHub conectado com sucesso!*\n\nAgora os próximos pushes e deploys aparecerão aqui.', { parse_mode: 'Markdown' });
        }
    }

    res.status(200).send('Webhook recebido com sucesso!');
};

// Aceita o webhook tanto na raiz quanto no caminho específico
app.post('/', processWebhook);
app.post('/github-webhook', processWebhook);

// Comando de teste no Telegram (quando você digitar /start no bot)
bot.start((ctx) => {
    // Pega o ID do chat para você colocar no seu .env depois
    const chatId = ctx.chat.id;
    ctx.reply(`Olá! Eu sou o seu bot de notificações do GitHub. 🤖\n\n⚠️ Seu ID DE CHAT é: ${chatId}\n\nCopie esse número e coloque na variável TELEGRAM_CHAT_ID do seu arquivo .env.`);
});

// Configuração de Webhook para o Render
if (process.env.RENDER_EXTERNAL_URL) {
    const webhookPath = `/telegraf/${bot.secretPathComponent()}`;
    bot.telegram.setWebhook(`${process.env.RENDER_EXTERNAL_URL}${webhookPath}`)
        .then(() => {
            console.log('🤖 Bot configurado com Webhook no Render.');
            app.use(bot.webhookCallback(webhookPath));
        })
        .catch(err => console.error('Erro ao configurar Webhook no Telegram:', err));
} else {
    // Modo Polling para ambiente local
    bot.launch()
        .then(() => console.log('🤖 Bot do Telegram inicializado em modo Polling.'))
        .catch(err => {
            if (err.response && err.response.error_code === 409) {
                console.error('❌ Conflito de Bot detectado (409). Outra instância está rodando ou o Render ainda está migrando.');
            } else {
                console.error('Erro ao iniciar o bot:', err);
            }
        });
}

// Inicia o servidor Express na porta especificada pelo Render ou 3000 local
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor Express rodando na porta ${PORT}`);
});

// Trata encerramento gracioso (Ctrl+C no terminal) para evitar bot "preso"
const shutdown = (signal) => {
    console.log(`Recebido sinal ${signal}. Encerrando bot...`);
    // Só tenta parar o bot se ele foi iniciado (evita erro "Bot is not running")
    try {
        if (bot.polling) {
            bot.stop(signal);
        }
    } catch (e) { }
    process.exit(0);
};

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));


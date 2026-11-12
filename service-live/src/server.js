const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const redisClient = require('./config/redisClient');
const { connectRabbitMQ, getCanal } = require('./config/rabbitmq'); // Importa o RabbitMQ

const app = express();
app.use(cors());
app.use(express.static('public'));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Inicia o RabbitMQ do lado do Live
connectRabbitMQ();

io.on('connection', (socket) => {
    console.log(`🟢 Arrematante conectado: ${socket.id}`);

    socket.on('enviar_lance', async (dados) => {
        const lanceAtualStr = await redisClient.get('maior_lance_lote_1');
        const lanceAtual = lanceAtualStr ? parseFloat(lanceAtualStr) : 1500.00;

        if (dados.valor > lanceAtual) {
            await redisClient.set('maior_lance_lote_1', dados.valor);
            io.emit('atualizar_painel', { valor: dados.valor, mensagem: "Novo lance vencedor!" });
        } else {
            socket.emit('atualizar_painel', { valor: lanceAtual, mensagem: "Lance rejeitado. Alguém foi mais rápido!" });
        }
    });

    // NOVA FUNÇÃO: O que acontece quando o leiloeiro encerra o lote
    socket.on('encerrar_leilao', async () => {
        const valorFinalStr = await redisClient.get('maior_lance_lote_1');
        const valorFinal = valorFinalStr ? parseFloat(valorFinalStr) : 1500.00;

        const mensagemAuditoria = JSON.stringify({
            lote_nome: "Epiphone SG Special",
            valor_final: valorFinal,
            data_encerramento: new Date().toISOString()
        });

        // Dispara a mensagem pelo túnel do RabbitMQ para o Serviço Audit C
        const canal = getCanal();
        if (canal) {
            canal.sendToQueue('leilao_encerrado', Buffer.from(mensagemAuditoria));
            console.log(`📢 Mensagem de encerramento enviada: R$ ${valorFinal}`);
        }

        // Avisa os ecrãs de todos os utilizadores que acabou
        io.emit('leilao_finalizado', { valor: valorFinal, mensagem: "LEILÃO ENCERRADO!" });
    });

    socket.on('disconnect', () => console.log(`🔴 Arrematante desconectado: ${socket.id}`));
});

const PORT = 3002;
server.listen(PORT, () => console.log(`⚡ Serviço Live na porta ${PORT}`));
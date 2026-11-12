const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const redisClient = require('./config/redisClient'); // Puxa o conector

const app = express();
app.use(cors());
app.use(express.static('public'));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on('connection', (socket) => {
    console.log(`🟢 Arrematante conectado: ${socket.id}`);

    socket.on('enviar_lance', async (dados) => {
        // Busca o maior lance guardado na memória RAM (Redis)
        const lanceAtualStr = await redisClient.get('maior_lance_lote_1');
        const lanceAtual = lanceAtualStr ? parseFloat(lanceAtualStr) : 1500.00;

        // Regra de Concorrência: Só aceita se for maior que o valor atual no Redis
        if (dados.valor > lanceAtual) {
            // Salva o novo recorde na memória em milissegundos
            await redisClient.set('maior_lance_lote_1', dados.valor);
            
            console.log(`💰 Lance Vencedor de ${socket.id}: R$ ${dados.valor}`);
            
            io.emit('atualizar_painel', {
                valor: dados.valor,
                mensagem: "Novo lance vencedor!"
            });
        } else {
            // Se o lance chegou atrasado e alguém já cobriu, avisa só quem tentou
            socket.emit('atualizar_painel', {
                valor: lanceAtual,
                mensagem: "Lance rejeitado. Alguém foi mais rápido!"
            });
        }
    });

    socket.on('disconnect', () => {
        console.log(`🔴 Arrematante desconectado: ${socket.id}`);
    });
});

const PORT = 3002;
server.listen(PORT, () => {
    console.log(`⚡ Serviço Live (WebSockets) rodando na porta ${PORT}`);
});
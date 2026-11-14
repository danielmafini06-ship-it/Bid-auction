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

    const lotesConfig = {
        '1': { nome: 'EVH "Frankie" Stratocaster', inicial: 15000.00 },
        '2': { nome: "Fender Stratocaster Olympic White", inicial: 4500.00 },
        '3': { nome: "Chevrolet Opala 1978", inicial: 35000.00 }, // Atualizado para o Opala
        '4': { nome: "Chevrolet Vectra B 2.2 16v", inicial: 12000.00 }
    };

    io.on('connection', (socket) => {
    
        socket.on('entrar_sala', async (loteId) => {
            socket.join(`lote_${loteId}`);
            
            const inicial = lotesConfig[loteId] ? lotesConfig[loteId].inicial : 1500.00;
            const lanceAtualStr = await redisClient.get(`maior_lance_lote_${loteId}`);
            const lanceAtual = lanceAtualStr ? parseFloat(lanceAtualStr) : inicial;
            
            socket.emit('atualizar_painel', { valor: lanceAtual });
        });

        // 2. Processa lances apenas para aquela sala específica
        socket.on('enviar_lance', async (dados) => {
            const { loteId, valor } = dados;
            const inicial = lotesConfig[loteId] ? lotesConfig[loteId].inicial : 1500.00;
            
            const lanceAtualStr = await redisClient.get(`maior_lance_lote_${loteId}`);
            const lanceAtual = lanceAtualStr ? parseFloat(lanceAtualStr) : inicial;

            if (valor < inicial) {
                socket.emit('atualizar_painel', { 
                    valor: lanceAtual, 
                    mensagem: `Lance rejeitado. O valor mínimo do lote é R$ ${inicial.toLocaleString('pt-BR', {minimumFractionDigits: 2})}!` 
                });
            } 
            else if (valor <= lanceAtual) {
                socket.emit('atualizar_painel', { 
                    valor: lanceAtual, 
                    mensagem: "Lance rejeitado. Alguém foi mais rápido e cobriu sua oferta!" 
                });
            } 
            else {
                await redisClient.set(`maior_lance_lote_${loteId}`, valor);
                await redisClient.set(`vencedor_lote_${loteId}`, dados.usuario); // NOVO: Guarda o líder
                
                io.to(`lote_${loteId}`).emit('atualizar_painel', { 
                    valor: valor, 
                    mensagem: `Novo lance de ${dados.usuario}!` 
                });
            }
        });

        // 3. Encerra o leilão e notifica a auditoria
        // 3. Encerra o leilão e notifica a auditoria
        socket.on('encerrar_leilao', async (loteId) => {
            const inicial = lotesConfig[loteId] ? lotesConfig[loteId].inicial : 1500.00;
            const valorFinalStr = await redisClient.get(`maior_lance_lote_${loteId}`);
            const valorFinal = valorFinalStr ? parseFloat(valorFinalStr) : inicial;
            const nomeLote = lotesConfig[loteId] ? lotesConfig[loteId].nome : `Lote ${loteId}`;
            
            // NOVO: Puxa o vencedor da memória RAM (Redis)
            const vencedor = await redisClient.get(`vencedor_lote_${loteId}`) || 'Nenhum';

            // NOVO: O service-audit vai receber também o campo "vencedor"
            const mensagemAuditoria = JSON.stringify({
                lote_id: loteId,
                lote_nome: nomeLote,
                valor_final: valorFinal,
                vencedor: vencedor,
                data_encerramento: new Date().toISOString()
            });

            const canal = getCanal();
            if (canal) {
                canal.sendToQueue('leilao_encerrado', Buffer.from(mensagemAuditoria));
            }

            io.to(`lote_${loteId}`).emit('leilao_finalizado', { 
                valor: valorFinal, 
                mensagem: `ENCERRADO! Vencedor: ${vencedor}` 
            });
            
            await redisClient.del(`maior_lance_lote_${loteId}`);
            await redisClient.del(`vencedor_lote_${loteId}`); // Limpa a chave do vencedor
        });
    });

const PORT = 3002;
server.listen(PORT, () => console.log(`⚡ Serviço Live na porta ${PORT}`));
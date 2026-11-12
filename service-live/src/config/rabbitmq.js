const amqp = require('amqplib');

let canalRabbitMQ = null;

async function connectRabbitMQ() {
    try {
        const connection = await amqp.connect('amqp://admin:adminpassword@localhost');
        canalRabbitMQ = await connection.createChannel();
        
        // Garante que a fila existe antes de tentar enviar algo
        await canalRabbitMQ.assertQueue('leilao_encerrado', { durable: true });
        
        console.log('🐇 Serviço Live conectado ao RabbitMQ (Pronto para disparar mensagens).');
    } catch (error) {
        console.error('❌ Erro no RabbitMQ do Live:', error);
    }
}

function getCanal() {
    return canalRabbitMQ;
}

module.exports = { connectRabbitMQ, getCanal };
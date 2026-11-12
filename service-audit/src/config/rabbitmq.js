const amqp = require('amqplib');

async function connectRabbitMQ() {
    try {
        // Conecta no RabbitMQ com as credenciais exatas do seu docker-compose
        const connection = await amqp.connect('amqp://admin:adminpassword@localhost');
        const channel = await connection.createChannel();
        
        // Cria a fila chamada 'leilao_encerrado' 
        // (durable: true garante que as mensagens não se percam se o Docker reiniciar)
        const queue = 'leilao_encerrado';
        await channel.assertQueue(queue, { durable: true });
        
        console.log('🐇 Conectado ao RabbitMQ! Fila de auditoria pronta.');
        return { connection, channel, queue };
    } catch (error) {
        console.error('❌ Erro ao conectar no RabbitMQ:', error);
    }
}

module.exports = connectRabbitMQ;
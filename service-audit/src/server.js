const connectRabbitMQ = require('./config/rabbitmq');

async function startAuditService() {
    console.log('Iniciando Serviço Audit C...');
    const rabbit = await connectRabbitMQ();
    
    if (!rabbit) return;

    console.log(`🎧 Serviço escutando a fila: ${rabbit.queue}...`);

    // Fica aguardando infinitamente a chegada de mensagens
    rabbit.channel.consume(rabbit.queue, (msg) => {
        if (msg !== null) {
            // Converte a mensagem que chegou em formato de texto (Buffer) de volta para JSON
            const dados = JSON.parse(msg.content.toString());
            
            console.log('\n=======================================');
            console.log('📩 MENSAGEM RECEBIDA VIA RABBITMQ!');
            console.log(`🏆 Lote: ${dados.lote_nome}`);
            console.log(`💰 Valor Final: R$ ${dados.valor_final}`);
            console.log('=======================================\n');
            
            // O comando .ack() (acknowledge) avisa ao RabbitMQ que a mensagem 
            // foi processada com sucesso e pode ser excluída da fila.
            rabbit.channel.ack(msg);
        }
    });
}

startAuditService();
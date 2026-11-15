require('dotenv').config();
const amqp = require('amqplib');
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});

// Teste inicial de conexão ao banco para garantir que as credenciais do .env estão corretas
pool.connect()
    .then(() => console.log('[+] Conectado ao PostgreSQL com sucesso!'))
    .catch(err => console.error('[-] Erro ao conectar ao PostgreSQL:', err.stack));

async function iniciarAuditoria() {
    try {
        const conexaoRabbit = await amqp.connect(process.env.RABBITMQ_URL);
        const canal = await conexaoRabbit.createChannel();
        const fila = 'leilao_encerrado';

        await canal.assertQueue(fila, { durable: true });
        
        console.log(`[*] Microsserviço de Auditoria rodando.`);
        console.log(`[*] Aguardando mensagens na fila '${fila}'. Para sair pressione CTRL+C`);

        canal.consume(fila, async (mensagem) => {
            if (mensagem !== null) {
                try {
                    const dados = JSON.parse(mensagem.content.toString());
                    console.log(`\n[x] Recebido encerramento do Lote: ${dados.lote_nome}`);

                    const query = `
                        INSERT INTO auditoria_leiloes (lote_id, lote_nome, valor_final, vencedor, data_encerramento)
                        VALUES ($1, $2, $3, $4, $5) RETURNING id;
                    `;
                    
                    // Garante que a data_encerramento tem um valor padrão se não vier na mensagem
                    const valores = [
                        dados.lote_id || 'DESCONHECIDO', 
                        dados.lote_nome || 'N/A', 
                        dados.valor_final || 0, 
                        dados.vencedor || 'Sem vencedor', 
                        dados.data_encerramento || new Date().toISOString()
                    ];

                    const res = await pool.query(query, valores);
                    console.log(`[+] Salvo no PostgreSQL! ID: ${res.rows[0].id} | Vencedor: ${dados.vencedor}`);

                    canal.ack(mensagem);
                } catch (erro) {
                    console.error('[-] Erro ao processar mensagem ou salvar no banco:', erro.message);
                    console.error(erro); // Mostra o erro completo
                    // Em caso de erro, devolve a mensagem à fila para tentar mais tarde
                    canal.nack(mensagem, false, true); 
                }
            }
        });

    } catch (erro) {
        console.error('[-] Falha crítica no microsserviço de auditoria:', erro);
    }
}

iniciarAuditoria();
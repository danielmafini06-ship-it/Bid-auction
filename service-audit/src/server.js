require('dotenv').config();
const amqp = require('amqplib');
const { Pool } = require('pg');

// ============================================================================
// SERVIÇO C: AUDITORIA E PERSISTÊNCIA (Microsserviço de Ledger)
// Responsabilidade: Consumir fila de mensagens e garantir gravação no Banco
// ============================================================================

// ----------------------------------------------------------------------------
// 1. CONFIGURAÇÃO DE BANCO DE DADOS (Critério: Consistência de Dados)
// ----------------------------------------------------------------------------
const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});

pool.connect()
    .then(() => console.log('✅ PostgreSQL Conectado: Consistência garantida.'))
    .catch(err => console.error('❌ Erro de Banco:', err.stack));

// ----------------------------------------------------------------------------
// 2. WORKER DO RABBITMQ (Critério: Resiliência e Tolerância a Falhas)
// ----------------------------------------------------------------------------
async function iniciarAuditoria() {
    try {
        const conexaoRabbit = await amqp.connect(process.env.RABBITMQ_URL);
        const canal = await conexaoRabbit.createChannel();
        const fila = 'leilao_encerrado';

        // { durable: true } -> A fila sobrevive a reboots do RabbitMQ
        await canal.assertQueue(fila, { durable: true });
        
        console.log(`\n🎧 Worker de Auditoria Ativo.`);
        console.log(`🎧 Consumindo a fila '${fila}' (Resiliência de Mensageria)`);

        // O consumidor escuta a fila em background de forma assíncrona
        canal.consume(fila, async (mensagem) => {
            if (mensagem !== null) {
                try {
                    // Decodifica a mensagem (Payload) vinda do Serviço Live B
                    const dados = JSON.parse(mensagem.content.toString());
                    console.log(`\n📥 Processando Lote: ${dados.lote_nome}`);

                    // --------------------------------------------------------
                    // 3. PERSISTÊNCIA NO POSTGRESQL (Query de Inserção)
                    // --------------------------------------------------------
                    const query = `
                        INSERT INTO auditoria_leiloes (lote_id, lote_nome, valor_final, vencedor, data_encerramento)
                        VALUES ($1, $2, $3, $4, $5) RETURNING id;
                    `;
                    
                    const valores = [
                        dados.lote_id || 'DESCONHECIDO', 
                        dados.lote_nome || 'N/A', 
                        dados.valor_final || 0, 
                        dados.vencedor || 'Sem vencedor', 
                        dados.data_encerramento || new Date().toISOString()
                    ];

                    const res = await pool.query(query, valores);
                    console.log(`💾 Gravação Confirmada [ID: ${res.rows[0].id}] | Vencedor: ${dados.vencedor}`);

                    // 'ack' (Acknowledge) -> Informa ao broker que pode apagar a mensagem da fila
                    canal.ack(mensagem);
                    
                } catch (erro) {
                    console.error('❌ Erro na persistência:', erro.message);
                    
                    // 'nack' -> Devolve a mensagem para a fila tentar processar novamente mais tarde
                    // Isso garante que NENHUM dado financeiro seja perdido!
                    canal.nack(mensagem, false, true); 
                }
            }
        });

    } catch (erro) {
        console.error('❌ Falha Crítica no Worker:', erro);
    }
}

// Inicializa o serviço
iniciarAuditoria();
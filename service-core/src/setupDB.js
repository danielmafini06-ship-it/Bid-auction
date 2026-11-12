const pool = require('./config/database');

async function createTables() {
    try {
        console.log('A iniciar a criação das tabelas...');
        
        // Criação da tabela de Lotes (os itens que vão a leilão)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS lotes (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                descricao TEXT,
                lance_inicial DECIMAL(10, 2) NOT NULL,
                lance_atual DECIMAL(10, 2) DEFAULT 0,
                vencedor_id INT,
                status VARCHAR(20) DEFAULT 'ativo',
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        console.log('✅ Tabela "lotes" criada com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao criar tabelas:', error.message);
    } finally {
        process.exit();
    }
}

createTables();
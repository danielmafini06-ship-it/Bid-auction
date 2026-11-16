-- Estrutura da tabela de Auditoria de Leilões
CREATE TABLE IF NOT EXISTS auditoria_leiloes (
    id SERIAL PRIMARY KEY,
    lote_id VARCHAR(50) NOT NULL,
    lote_nome VARCHAR(255) NOT NULL,
    valor_final NUMERIC(10, 2) NOT NULL,
    vencedor VARCHAR(255) NOT NULL,
    data_encerramento TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
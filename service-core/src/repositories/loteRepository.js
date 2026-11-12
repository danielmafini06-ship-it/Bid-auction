const pool = require('../config/database');

class LoteRepository {
    async create({ nome, descricao, lance_inicial }) {
        // O $1, $2, $3 protege o banco contra ataques de injeção de SQL
        const result = await pool.query(
            'INSERT INTO lotes (nome, descricao, lance_inicial) VALUES ($1, $2, $3) RETURNING *',
            [nome, descricao, lance_inicial]
        );
        return result.rows[0];
    }
}

module.exports = new LoteRepository();
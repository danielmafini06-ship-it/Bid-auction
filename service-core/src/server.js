const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./config/database'); // Puxa o conector do banco

const app = express();
app.use(cors());
app.use(express.json());
const loteRoutes = require('./routes/loteRoutes');
app.use('/api/lotes', loteRoutes);

// Rota de teste turbinada
app.get('/api/health', async (req, res) => {
    try {
        const dbResult = await pool.query('SELECT NOW()'); // Faz uma consulta real no banco
        res.json({ 
            status: 'Serviço Core A operando 100%!', 
            database: 'Conectado ao Postgres 🐘',
            hora_banco: dbResult.rows[0].now 
        });
    } catch (error) {
        res.status(500).json({ status: 'Erro', error: error.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
    console.log(`🚀 Serviço Core rodando na porta ${PORT}`);
    try {
        // Tenta fazer um "ping" no banco assim que o servidor liga
        await pool.query('SELECT 1'); 
        console.log('📦 Banco de dados PostgreSQL conectado com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao conectar no banco de dados:', error.message);
    }
});
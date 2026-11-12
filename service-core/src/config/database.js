const { Pool } = require('pg');
require('dotenv').config();

// Configura a conexão usando as senhas do arquivo .env
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});

module.exports = pool;
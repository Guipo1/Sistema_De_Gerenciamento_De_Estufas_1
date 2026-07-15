const { Pool } = require('pg');
require("dotenv").config();
const pool = new Pool({
    user: process.env.POSTGRES_USER,
    host: '127.0.0.1',
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: 5555,
    max: 20, // Mantém até 20 conexões prontas na memória
    idleTimeoutMillis: 30000
});

pool.on('connect', () => {
    // Log silencioso ou de debug para monitorar o pool se necessário
});
pool.on('error', (err) => {
    console.error(' Erro inesperado no Pool do PostgreSQL:', err);
});

module.exports = pool;
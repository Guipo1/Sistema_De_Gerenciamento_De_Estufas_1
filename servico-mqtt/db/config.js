const { Pool } = require('pg');
require("dotenv").config();
const pool = new Pool({
    user: process.env.POSTGRES_USER,
    host: '127.0.0.1',
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: 5556,
    max: 20, // Mantém até 20 conexões prontas na memória
    idleTimeoutMillis: 30000
});
pool.query(`
CREATE TABLE IF NOT EXISTS leitura_sensores (
    id SERIAL PRIMARY KEY,
    codigo_serial VARCHAR(100) NOT NULL,
    id_sensor VARCHAR(100) NOT NULL,
    temperatura NUMERIC(5, 2) NOT NULL,
    umidade NUMERIC(5, 2) NOT NULL,
    data TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);`)
pool.on('connect', () => {
    // Log silencioso ou de debug para monitorar o pool se necessário
});
pool.on('error', (err) => {
    console.error(' Erro inesperado no Pool do PostgreSQL:', err);
});

module.exports = pool;
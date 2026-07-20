const mongoose = require("mongoose");
require("dotenv").config()
const { Pool } = require('pg');
const pool = new Pool({
    user: process.env.POSTGRES_USER,
    host: '127.0.0.1',
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: 5556,
    max: 20, // Mantém até 20 conexões prontas na memória
    idleTimeoutMillis: 30000
});
// Substitua pela sua string de conexão (local ou MongoDB Atlas)
const MONGO_URI = `mongodb://${process.env.MONGO_MONGO_USER}:${process.env.MONGO_MONGO_PASSWORD}@localhost:27017/saas_estufas?authSource=admin`;
// Configura os ouvintes de eventos ANTES de conectar
mongoose.connection.on('connected', () => {
    console.log('Conexão estabelecida com o MongoDB com sucesso!');
});

mongoose.connection.on('error', (err) => {
    console.error('Erro na conexão com o MongoDB:', err.message);
});

mongoose.connection.on('disconnected', () => {
    console.log('Conexão com o MongoDB foi interrompida.');
});

// Executa a conexão
mongoose.connect(MONGO_URI)
    .then(() => console.log('Inicialização do banco concluída.'))
    .catch((err) => console.error('Falha crítica ao iniciar o banco:', err.message));
module.exports = pool;
const mongoose = require("mongoose");
require("dotenv").config()
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
const { createClient } = require('redis');

// Configura a URL de conexão baseada no ambiente
const redisUrl = process.env.NODE_ENV === 'production'
    ? 'redis://cache-redis:6379'
    : 'redis://localhost:6379';

const redisClient = createClient({ url: redisUrl });

redisClient.on('error', (err) => console.error('Erro no Redis Client:', err));
redisClient.on('connect', () => console.log('Conectado ao Redis com sucesso!'));

// Inicializa a conexão (O driver do Redis gerencia a fila de comandos de forma segura)
redisClient.connect();

// Exporta o cliente usando o padrão CommonJS
module.exports = redisClient;
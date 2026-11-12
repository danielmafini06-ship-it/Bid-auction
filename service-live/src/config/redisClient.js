const redis = require('redis');

const redisClient = redis.createClient({
    socket: {
        host: 'localhost',
        port: 6379 // A porta padrão que ligamos lá no Docker
    }
});

redisClient.on('error', (err) => console.error('❌ Erro no Redis:', err));
redisClient.on('connect', () => console.log('⚡ Redis conectado (Em Memória)!'));

redisClient.connect();

module.exports = redisClient;
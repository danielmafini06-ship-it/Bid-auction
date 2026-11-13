const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
app.use(cors());

// ROTA 1: Tudo que começar com /api/core vai para o Serviço Core (Porta 3001)
app.use('/api/core', createProxyMiddleware({ 
    target: 'http://localhost:3001', 
    changeOrigin: true 
}));

// ROTA 2: Todo o resto (Frontend web e as conexões de WebSockets) vai para o Serviço Live (Porta 3002)
app.use('/', createProxyMiddleware({ 
    target: 'http://localhost:3002', 
    changeOrigin: true,
    ws: true // Configuração crucial para os lances em tempo real atravessarem o Gateway
}));

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚦 API Gateway rodando na porta ${PORT}`);
    console.log(`➡️  /api/core redirecionado para o Serviço Core (3001)`);
    console.log(`➡️  Tráfego principal e WebSockets redirecionados para o Serviço Live (3002)`);
});
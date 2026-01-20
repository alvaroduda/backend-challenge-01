// Arquivo principal da aplicação
// configura servidor Express e conecta aos serviços

const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const config = require('./config');
const routes = require('./routes');
const MongoService = require('./services/MongoService');
const ClickHouseService = require('./services/ClickHouseService');
const KafkaConsumerService = require('./services/KafkaConsumerService');

const app = express();

// // permite que o servidor entenda as requisições (middlewares)

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rota de teste para verificar se o servidor está funcionando
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Servidor está funcionando' });
});

// Swagger UI
app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Device Event Consumer API - Swagger',
  swaggerOptions: {
    persistAuthorization: true,
  }
}));

// Rotas
app.use('/', routes);

let server = null;

// Inicia a aplicação conectando aos serviços e iniciando o servidor
async function start() {
  try {
    await MongoService.connect();
    await ClickHouseService.connect();
    await KafkaConsumerService.start();

    server = app.listen(config.server.port, config.server.host || '0.0.0.0', () => {
      console.log(`Servidor rodando em http://${config.server.host || '0.0.0.0'}:${config.server.port}`);
    });
  } catch (error) {
    console.error('Erro ao iniciar aplicação:', error);
    process.exit(1);
  }
}

// Encerra a aplicação fechando conexões
async function shutdown() {
  console.log('Encerrando aplicação...');
  
  try {
    if (server) {
      await new Promise((resolve) => {
        server.close(() => {
          console.log('Servidor HTTP fechado');
          resolve();
        });
      });
    }

    await KafkaConsumerService.stop();
    await ClickHouseService.disconnect();
    await MongoService.disconnect();

    process.exit(0);
  } catch (error) {
    console.error('Erro ao encerrar aplicação:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();

module.exports = app;

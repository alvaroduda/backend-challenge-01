// carrega variáveis de ambiente do arquivo .env 
// no Docker, as variáveis são definidas pelo docker-compose.yml
// serve para usar local
require('dotenv').config();

module.exports = {
  server: {
    port: process.env.PORT || 3001,
    host: process.env.HOST || '0.0.0.0'
  },

  kafka: {
    clientId: process.env.KAFKA_CLIENT_ID || 'device-event-consumer',
    brokers: process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092'],
    topic: process.env.KAFKA_TOPIC || 'device-events',
    groupId: process.env.KAFKA_GROUP_ID || 'device-event-consumer-group'
  },

  mongodb: {
    url: process.env.MONGODB_URL || 'mongodb://localhost:27017',
    database: process.env.MONGODB_DATABASE || 'device_consumer_db'
  },

  clickhouse: {
    host: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
    database: process.env.CLICKHOUSE_DATABASE || 'device_events_db',
    username: process.env.CLICKHOUSE_USERNAME || 'default',
    password: process.env.CLICKHOUSE_PASSWORD || 'clickhouse123'
  },

  minio: {
    endpoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT) || 9000,
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    bucket: process.env.MINIO_BUCKET || 'device-images',
    publicEndpoint: process.env.MINIO_PUBLIC_ENDPOINT || process.env.MINIO_ENDPOINT || 'localhost',
    publicPort: parseInt(process.env.MINIO_PUBLIC_PORT) || parseInt(process.env.MINIO_PORT) || 9000
  }
};

// gerenciar conexão e operações com MongoDB

const { MongoClient } = require('mongodb');
const config = require('../config');

class MongoService {
  constructor() {
    this.client = null;
    this.db = null;
  }

  // Conecta ao MongoDB e cria índice único em cameraID
  async connect() {
    if (this.client) {
      return this.db;
    }

    try {
      this.client = new MongoClient(config.mongodb.url);
      await this.client.connect();
      this.db = this.client.db(config.mongodb.database);
      
      // Cria índice único para evitar cameraID duplicados
      await this.db.collection('devices').createIndex({ cameraID: 1 }, { unique: true });
      
      console.log('MongoDB conectado com sucesso');
      return this.db;
    } catch (error) {
      console.error('Erro ao conectar ao MongoDB:', error);
      throw error;
    }
  }

  // Desconecta do MongoDB
  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      console.log('MongoDB desconectado');
    }
  }

  // Retorna uma coleção do MongoDB
  getCollection(name) {
    if (!this.db) {
      throw new Error('MongoDB não está conectado');
    }
    return this.db.collection(name);
  }
}

module.exports = new MongoService();

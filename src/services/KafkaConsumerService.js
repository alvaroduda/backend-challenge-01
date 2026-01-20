// consumir eventos do Kafka e fazer o processamento

const { Kafka } = require('kafkajs');
const config = require('../config');
const ClickHouseService = require('./ClickHouseService');
const MinIOService = require('./MinIOService');

class KafkaConsumerService {
  constructor() {
    this.consumer = null;
    this.isRunning = false;
    this.loopRunning = false;
  }

  // Inicia o consumidor Kafka com retry se necessário
  async start() {
    if (this.isRunning) {
      return;
    }

    // Tenta conectar ao Kafka com retry (Kafka pode demorar para ficar pronto)
    let retries = 10;
    let connected = false;

    while (retries > 0 && !connected) {
      try {
        const kafka = new Kafka({
          clientId: config.kafka.clientId,
          brokers: config.kafka.brokers
        });

        this.consumer = kafka.consumer({ groupId: config.kafka.groupId });
        await this.consumer.connect();
        await this.consumer.subscribe({ 
          topic: config.kafka.topic, 
          fromBeginning: false 
        });
        
        connected = true;
      } catch (error) {
        retries--;
        if (retries > 0) {
          console.log(`Aguardando Kafka estar pronto... (tentativas restantes: ${retries})`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
          console.error('Erro ao conectar ao Kafka após múltiplas tentativas:', error);
          throw error;
        }
      }
    }

    try {
      await ClickHouseService.connect();
      await MinIOService.connect();

      console.log('Kafka consumer conectado e inscrito no tópico:', config.kafka.topic);

      if (!this.loopRunning) {
        this.startConsumerLoop();
      }

      this.isRunning = true;
    } catch (error) {
      console.error('Erro ao iniciar Kafka consumer:', error);
      throw error;
    }
  }

  // Loop infinito que processa mensagens do Kafka
  async startConsumerLoop() {
    if (this.loopRunning) {
      return;
    }
    
    this.loopRunning = true;
    
    while (true) {
      try {
        if (!this.consumer) {
          throw new Error('Consumer não existe');
        }
        
        // consumer.run() fica bloqueado processando mensagens
        await this.consumer.run({
          eachMessage: async ({ topic, partition, message }) => {
            try {
              await this.processMessage(message);
            } catch (error) {
              console.error('Erro ao processar mensagem:', error);
            }
          }
        });
        
        // Se chegou aqui, consumer.run() terminou (erro ou interrupção)
        await new Promise(resolve => setTimeout(resolve, 5000));
        
      } catch (error) {
        // Se o consumer crashar, tenta reconectar
        console.error('Consumer crashou, tentando reconectar em 10 segundos...', error.message);
        this.isRunning = false;
        
        if (this.consumer) {
          try {
            await this.consumer.disconnect();
          } catch (e) {
            // Ignora erros de desconexão
          }
          this.consumer = null;
        }
        
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Tenta reconectar
        try {
          const kafka = new Kafka({
            clientId: config.kafka.clientId,
            brokers: config.kafka.brokers
          });
          
          this.consumer = kafka.consumer({ groupId: config.kafka.groupId });
          await this.consumer.connect();
          await this.consumer.subscribe({ 
            topic: config.kafka.topic, 
            fromBeginning: false 
          });
          
          console.log('Kafka consumer reconectado com sucesso');
        } catch (reconnectError) {
          console.error('Erro ao reconectar consumer:', reconnectError.message);
        }
      }
    }
  }

  // Processa uma mensagem individual do Kafka
  async processMessage(message) {
    try {
      const event = JSON.parse(message.value.toString());
      
      // Valida campos obrigatórios
      if (!event.deviceId || !event.timestamp || !event.eventType) {
        console.warn('Evento inválido, campos obrigatórios faltando:', event);
        return;
      }

      let imageObjectKey = '';

      // Se houver imagem, faz upload no MinIO
      if (event.image && event.image.base64) {
        try {
          imageObjectKey = await MinIOService.uploadImage(
            event.image.base64,
            event.deviceId,
            event.timestamp
          );
        } catch (error) {
          console.error('Erro ao fazer upload da imagem:', error);
        }
      }

      // Salva evento no ClickHouse
      const eventId = `${event.deviceId}|${event.timestamp}|${event.eventType}`;
      await ClickHouseService.insertEvent({
        eventId,
        deviceId: event.deviceId,
        timestamp: event.timestamp,
        eventType: event.eventType,
        value: event.value || 0,
        metadata_location: event.metadata?.location || '',
        image_object_key: imageObjectKey
      });

      console.log(`Evento processado: ${event.deviceId} - ${event.timestamp} - ${eventId}`);
    } catch (error) {
      console.error('Erro ao processar mensagem do Kafka:', error);
      throw error;
    }
  }

  // Para o consumidor Kafka
  async stop() {
    this.loopRunning = false;
    
    if (this.consumer) {
      await this.consumer.disconnect();
      this.consumer = null;
      this.isRunning = false;
      console.log('Kafka consumer desconectado');
    }
  }
}

module.exports = new KafkaConsumerService();

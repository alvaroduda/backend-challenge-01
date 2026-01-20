// Gerenciar conexão e operações com ClickHouse

const { createClient } = require('@clickhouse/client');
const config = require('../config');

class ClickHouseService {
  constructor() {
    this.client = null;
  }

  // conecta ao ClickHouse e cria a tabela de eventos
  async connect() {
    if (this.client) {
      return this.client;
    }

    try {
      this.client = createClient({
        host: config.clickhouse.host,
        database: config.clickhouse.database,
        username: config.clickhouse.username,
        password: config.clickhouse.password || ''
      });

      await this.createEventsTable();
      console.log('ClickHouse conectado com sucesso');
      return this.client;
    } catch (error) {
      console.error('Erro ao conectar ao ClickHouse:', error);
      throw error;
    }
  }

  // Cria a tabela de eventos se não existir
  async createEventsTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS events (
        eventId String,
        deviceId String,
        timestamp DateTime,
        eventType String,
        value Float64,
        metadata_location String,
        image_object_key String
      ) ENGINE = MergeTree()
      ORDER BY (deviceId, timestamp)
    `;

    await this.client.exec({
      query,
      clickhouse_settings: {
        wait_end_of_query: 1
      }
    });
  }

  // Garante coluna eventId mesmo se a tabela antiga já existir
  async ensureEventIdColumn() {
    const alter = `
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS eventId String
    `;
    await this.client.exec({
      query: alter,
      clickhouse_settings: {
        wait_end_of_query: 1
      }
    });
  }

  // insere um evento na tabela
  async insertEvent(event) {
    if (!this.client) {
      await this.connect();
    }

    // garante que a coluna eventId existe
    await this.ensureEventIdColumn();

    // converte timestamp para formato "YYYY-MM-DD HH:MM:SS"
    let timestampDate;
    if (event.timestamp instanceof Date) {
      timestampDate = event.timestamp;
    } else {
      timestampDate = new Date(event.timestamp);
    }

    const year = timestampDate.getUTCFullYear();
    const month = String(timestampDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(timestampDate.getUTCDate()).padStart(2, '0');
    const hours = String(timestampDate.getUTCHours()).padStart(2, '0');
    const minutes = String(timestampDate.getUTCMinutes()).padStart(2, '0');
    const seconds = String(timestampDate.getUTCSeconds()).padStart(2, '0');
    const timestampStr = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

    const query = `
      INSERT INTO events (eventId, deviceId, timestamp, eventType, value, metadata_location, image_object_key)
      VALUES ({eventId:String}, {deviceId:String}, {timestamp:DateTime}, {eventType:String}, {value:Float64}, {metadata_location:String}, {image_object_key:String})
    `;

    await this.client.exec({
      query,
      query_params: {
        eventId: event.eventId || '',
        deviceId: event.deviceId,
        timestamp: timestampStr,
        eventType: event.eventType,
        value: event.value || 0,
        metadata_location: event.metadata_location || '',
        image_object_key: event.image_object_key || ''
      },
      clickhouse_settings: {
        wait_end_of_query: 1
      }
    });
  }

  // consulta eventos com filtros opcionais
  async queryEvents(filters = {}) {
    if (!this.client) {
      await this.connect();
    }

    let whereClause = '1=1';
    const params = {};

    if (filters.deviceId) {
      whereClause += ' AND deviceId = {deviceId:String}';
      params.deviceId = filters.deviceId;
    }

    if (filters.startDate) {
      whereClause += ' AND timestamp >= {startDate:DateTime}';
      params.startDate = filters.startDate;
    }

    if (filters.endDate) {
      whereClause += ' AND timestamp <= {endDate:DateTime}';
      params.endDate = filters.endDate;
    }

    if (filters.eventType) {
      whereClause += ' AND eventType = {eventType:String}';
      params.eventType = filters.eventType;
    }

    const query = `
      SELECT 
        eventId,
        deviceId,
        timestamp,
        eventType,
        value,
        metadata_location,
        image_object_key
      FROM events
      WHERE ${whereClause}
      ORDER BY timestamp DESC
      LIMIT {limit:UInt32}
      OFFSET {offset:UInt64}
    `;

    params.limit = filters.limit || 100;
    params.offset = filters.offset || 0;

    const result = await this.client.query({
      query,
      query_params: params,
      format: 'JSONEachRow'
    });

    return await result.json();
  }

  // Busca único evento por eventId
  async getEventById(eventId) {
    if (!this.client) {
      await this.connect();
    }
    const query = `
      SELECT 
        eventId,
        deviceId,
        timestamp,
        eventType,
        value,
        metadata_location,
        image_object_key
      FROM events
      WHERE eventId = {eventId:String}
      LIMIT 1
    `;
    const result = await this.client.query({
      query,
      query_params: { eventId },
      format: 'JSONEachRow'
    });
    const rows = await result.json();
    return rows[0] || null;
  }

  // Desconecta do ClickHouse
  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      console.log('ClickHouse desconectado');
    }
  }
}

module.exports = new ClickHouseService();

// consultar eventos armazenados no ClickHouse

const ClickHouseService = require('../services/ClickHouseService');

class EventController {
  // Lista eventos(deviceId, startDate, endDate, eventType, limit)
  async list(req, res) {
    try {
      const { deviceId, startDate, endDate, eventType, limit, offset } = req.query;

      const filters = {};
      if (deviceId) filters.deviceId = deviceId;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (eventType) filters.eventType = eventType;
      if (limit) filters.limit = parseInt(limit);
      if (offset) filters.offset = parseInt(offset);

      const events = await ClickHouseService.queryEvents(filters);
      res.json(events);
    } catch (error) {
      console.error('Erro ao listar eventos:', error);
      res.status(500).json({ error: 'Erro ao listar eventos' });
    }
  }

  // Retorna URL assinada para visualização da imagem por eventId
  async getImageUrl(req, res) {
    try {
      const { eventId } = req.params;
      if (!eventId || typeof eventId !== 'string') {
        return res.status(400).json({ error: 'eventId inválido' });
      }
      const event = await ClickHouseService.getEventById(eventId);
      if (!event) {
        return res.status(404).json({ error: 'Evento não encontrado' });
      }
      const MinIOService = require('../services/MinIOService');
      const expiresSeconds = 300;
      const url = await MinIOService.getPresignedUrl(event.image_object_key, expiresSeconds);
      return res.json({ url, expiresSeconds });
    } catch (error) {
      console.error('Erro ao obter URL da imagem:', error);
      res.status(500).json({ error: 'Erro ao obter URL da imagem' });
    }
  }
}

module.exports = new EventController();

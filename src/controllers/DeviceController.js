// CRUD de dispositivos no MongoDB

const { ObjectId } = require('mongodb');
const MongoService = require('../services/MongoService');

class DeviceController {
  // cria um novo dispositivo
  async create(req, res) {
    try {
      const { nome, cameraID, zona, enderecoRTSP } = req.body;

      if (!nome || !cameraID || !zona || !enderecoRTSP) {
        return res.status(400).json({ 
          error: 'Campos obrigatórios: nome, cameraID, zona, enderecoRTSP' 
        });
      }

      const devices = MongoService.getCollection('devices');
      const existing = await devices.findOne({ cameraID });
      
      if (existing) {
        return res.status(409).json({ error: 'Dispositivo com este cameraID já existe' });
      }

      const device = {
        nome,
        cameraID,
        zona,
        enderecoRTSP,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await devices.insertOne(device);
      const createdDevice = await devices.findOne({ _id: result.insertedId });

      res.status(201).json(createdDevice);
    } catch (error) {
      console.error('Erro ao criar dispositivo:', error);
      res.status(500).json({ error: 'Erro ao criar dispositivo' });
    }
  }

  // lista todos os dispositivos
  async list(req, res) {
    try {
      const devices = MongoService.getCollection('devices');
      const allDevices = await devices.find({}).toArray();
      res.json(allDevices);
    } catch (error) {
      console.error('Erro ao listar dispositivos:', error);
      res.status(500).json({ error: 'Erro ao listar dispositivos' });
    }
  }

  // busca um dispositivo por ID
  async getById(req, res) {
    try {
      const { id } = req.params;
      
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'ID inválido' });
      }

      const devices = MongoService.getCollection('devices');
      const device = await devices.findOne({ _id: new ObjectId(id) });
      
      if (!device) {
        return res.status(404).json({ error: 'Dispositivo não encontrado' });
      }

      res.json(device);
    } catch (error) {
      console.error('Erro ao buscar dispositivo:', error);
      res.status(500).json({ error: 'Erro ao buscar dispositivo' });
    }
  }

  // atualiza um dispositivo (todos os campos são opcionais)
  async update(req, res) {
    try {
      const { id } = req.params;
      const { nome, cameraID, zona, enderecoRTSP } = req.body;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'ID inválido' });
      }

      const devices = MongoService.getCollection('devices');
      const objectId = new ObjectId(id);
      
      const existing = await devices.findOne({ _id: objectId });
      if (!existing) {
        return res.status(404).json({ error: 'Dispositivo não encontrado' });
      }

      // verifica se cameraID está sendo alterado e se já existe em outro dispositivo
      if (cameraID && cameraID !== existing.cameraID) {
        const duplicate = await devices.findOne({ 
          cameraID, 
          _id: { $ne: objectId } 
        });
        
        if (duplicate) {
          return res.status(409).json({ error: 'Dispositivo com este cameraID já existe' });
        }
      }

      const updateData = { updatedAt: new Date() };
      if (nome !== undefined) updateData.nome = nome;
      if (cameraID !== undefined) updateData.cameraID = cameraID;
      if (zona !== undefined) updateData.zona = zona;
      if (enderecoRTSP !== undefined) updateData.enderecoRTSP = enderecoRTSP;

      await devices.updateOne(
        { _id: objectId },
        { $set: updateData }
      );

      const updatedDevice = await devices.findOne({ _id: objectId });
      res.json(updatedDevice);
    } catch (error) {
      console.error('Erro ao atualizar dispositivo:', error);
      res.status(500).json({ error: 'Erro ao atualizar dispositivo' });
    }
  }

  // Deleta um dispositivo
  async delete(req, res) {
    try {
      const { id } = req.params;
      
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'ID inválido' });
      }

      const devices = MongoService.getCollection('devices');
      const result = await devices.deleteOne({ _id: new ObjectId(id) });
      
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Dispositivo não encontrado' });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Erro ao deletar dispositivo:', error);
      res.status(500).json({ error: 'Erro ao deletar dispositivo' });
    }
  }
}

module.exports = new DeviceController();

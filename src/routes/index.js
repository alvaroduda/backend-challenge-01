// Define as rotas da API REST

const express = require('express');
const router = express.Router();
const DeviceController = require('../controllers/DeviceController');
const EventController = require('../controllers/EventController');

router.use(express.json());

// Rotas de dispositivos
router.post('/devices', DeviceController.create.bind(DeviceController));
router.get('/devices', DeviceController.list.bind(DeviceController));
router.get('/devices/:id', DeviceController.getById.bind(DeviceController));
router.put('/devices/:id', DeviceController.update.bind(DeviceController));
router.delete('/devices/:id', DeviceController.delete.bind(DeviceController));

// Rotas de eventos
router.get('/events', EventController.list.bind(EventController));
router.get('/events/:eventId/image-url', EventController.getImageUrl.bind(EventController));

module.exports = router;

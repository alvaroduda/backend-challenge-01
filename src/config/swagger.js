// Configuração do Swagger para documentação da API

const yaml = require('yamljs');
const path = require('path');

const swaggerSpec = yaml.load(path.join(__dirname, 'swagger.yaml'));

module.exports = swaggerSpec;

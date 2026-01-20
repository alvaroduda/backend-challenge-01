# Device Event Consumer API

O **Device Event Consumer API** foi desenvolvido em **Node.js** responsável por **consumir eventos de dispositivos (câmeras)** produzidos pelo **Device Event API** via **Kafka**, persistindo esses dados em um banco **OLAP** e expondo **endpoints REST** para:

- CRUD de dispositivos (câmeras)
- Consulta de eventos armazenados
  - Paginação (limit + offset)
  - Visualização de imagem por id do evento (URL assinada)
- Comunicação entre as duas APIs através do Kafka  

---

## Diagrama do Algoritmo

O gráfico abaixo ilustra o fluxo do algoritmo da aplicação:

![Diagrama do Algoritmo](Documentacao%20Extra/desafio%20aeolus%20cloud.png)

> Para visualizar interativamente, acesse [o diagrama no Mermaid](https://mermaid.ai/d/ecceeeb2-5d03-48f0-b48f-e093ecce93ab).

---

#### Fluxo:

1. **Device Event API gera evento** → Publica no Kafka
2. **Kafka armazena evento** → Fica disponível para consumo
3. **Device Event Consumer API consome evento** → Lê do Kafka
4. **Consumer processa evento:**
   - Decodifica imagem base64 
   - Faz upload no MinIO 
   - Salva dados no ClickHouse 
5. **Evento fica disponível** → Para consulta via API REST

#### Funcionamento da Device Event Consumer API

1. **Ao iniciar**, conecta aos serviços necessários:
   - MongoDB (para CRUD de dispositivos)
   - ClickHouse (para armazenar eventos)
   - MinIO (para armazenar imagens)
   - Kafka (para consumir eventos)

2. **Se liga ao tópico Kafka** `device-events`

3. **Quando um evento enviado pelo Device Event API chega do Kafka:**
   - Valida os campos obrigatórios
   - Decodifica a imagem base64
   - Faz upload da imagem no MinIO
   - Salva os dados do evento no ClickHouse
   - Registra no log que foi processado

4. **Expõe API REST** para:
   - CRUD de dispositivos (MongoDB) - 
   - Consulta de eventos (ClickHouse)
   - **Documentação Swagger** em `/swagger`

**Porta:** 3001 
**Endpoints:**
- `POST /devices` - Criar dispositivo
- `GET /devices` - Listar dispositivos
- `GET /devices/:id` - Buscar dispositivo por ID
- `PUT /devices/:id` - Atualizar dispositivo
- `DELETE /devices/:id` - Deletar dispositivo
- `GET /events` - Consultar eventos (filtros + paginação: limit e offset)
- `GET /events/{eventId}/image-url` - URL assinada da imagem do evento

##  API REST (Device Event Consumer API)

### Dispositivos
- POST /devices
- GET /devices
- GET /devices/:id
- PUT /devices/:id
- DELETE /devices/:id

### Eventos
- GET /events
  - Filtros: `deviceId`, `startDate`, `endDate`, `eventType`
  - Paginação: `limit` (padrão 100) e `offset` (padrão 0)
- GET /events/{eventId}/image-url
  - Retorna `{ url, expiresSeconds }` para visualizar a imagem no MinIO

---

#### Função de cada Banco de Dados

**MongoDB (Dispositivos):**
- Armazena informações dos dispositivos cadastrados via API REST
- Campos: `nome`, `cameraID`, `zona`, `enderecoRTSP`

**ClickHouse (Eventos):**
- Armazena eventos consumidos do Kafka
- Banco OLAP
- Campos: `eventId`, `deviceId`, `timestamp`, `eventType`, `value`, `metadata_location`, `image_object_key`
- `eventId` é gerado na ingestão como `deviceId|timestamp|eventType`

**MinIO (Imagens):**
- Armazena arquivos de imagem 
- Não armazena imagens no banco de dados
- Geração de URL assinada para visualização via `GET /events/{eventId}/image-url`

---

##  Integração com a Device Event API

A integração ocorre exclusivamente via **Kafka**.

###  Campos do evento consumido (Device Event API)

- `deviceId` (string)
- `timestamp` (string ISO 8601)
- `value` (number)
- `eventType` (string)
- `image.base64` (string)
- `metadata.location` (string)

## Documentação e Testes

### Swagger UI

A documentação interativa da API está disponível através do **Swagger UI**:

- **URL**: http://localhost:3001/swagger
Exibe todos os endpoints disponíveis, seus parâmetros, tipos de dados e descrições
- **OBS**: A documentação serve como referência visual dos endpoints. **Os testes devem ser realizados utilizando o Postman**

### Postman Collection

Collection completa do para testes dos endpoints

Recomendo o uso do postman collection para testar os endpoints da API, o Swagger deve servir apenas como documentação visual de referência.

---

## 🐳 Docker e Deployment

### Executando o Projeto

#### Ambiente de Desenvolvimento

Para desenvolvimento local, utilize o arquivo `docker-compose.yml` que realiza o build das imagens a partir do código-fonte:

```bash
docker compose up --build
```

Este comando:
- Constrói as imagens das aplicações a partir do código-fonte
- Inicia todos os serviços (infraestrutura + aplicações)
- Permite desenvolvimento e testes locais com código em tempo real

#### Ambiente de Produção

Para ambientes de produção, utilize o arquivo `docker-compose.prod.yml` que utiliza imagens pré-construídas do Docker Hub:

```bash
docker compose -f docker-compose.prod.yml up
```


**Por que é melhor?**

1. **Velocidade**: Imagens pré-construídas são mais rápidas de baixar do que construir do código-fonte
2. **Confiabilidade**: Imagens testadas e validadas garantem consistência entre ambientes
3. **Segurança**: Controle sobre quais versões são implantadas em produção
4. **Escalabilidade**: Fácil replicação da mesma imagem em múltiplos servidores
5. **Profissionalismo**: Demonstra maturidade técnica e preparo para ambientes de produção

---

##  Tecnologias

- **Node.js**: Runtime para executar a aplicação
- **Express.js**: Framework para criar APIs REST
- **Kafka**: Sistema de eventos
- **MongoDB**: Banco para dispositivos (CRUD)
- **ClickHouse**: Banco OLAP 
- **MinIO**: Armazenamento de objetos (imagens)
- **Docker**: Containerização da aplicação e serviços
- **Swagger/OpenAPI**: Documentação interativa da API


###  Bibliotecas Utilizadas

- **kafkajs**: Cliente Kafka para Node.js
- **mongodb**: Driver oficial do MongoDB
- **@clickhouse/client**: Cliente oficial do ClickHouse
- **@aws-sdk/client-s3**: Cliente S3 (usado para MinIO)
- **@aws-sdk/s3-request-presigner**: Geração de URL assinada (presigned URL)
- **swagger-ui-express**: Interface web para visualizar documentação Swagger
- **yamljs**: Parser YAML para carregar especificação OpenAPI

---

### Serviços

- **Kafka e Zookeeper** (compartilhados)
- **Device Event API** (porta 3000)
- **Device Event Consumer API** (porta 3001)
- **MongoDB** (porta 27017)
- **ClickHouse** (porta 8123)
- **MinIO** (porta 9000 é usada para o upload de imagens, gerar URLs assinadas  - porta 9001 é usada para o painel web)

### Acessos

- Device Event API: http://localhost:3000
- Device Event Consumer API: http://localhost:3001
- **Swagger (Documentação)**: http://localhost:3001/swagger
- MinIO Console: http://localhost:9001 (usuário: `minioadmin`, senha: `minioadmin`)

---

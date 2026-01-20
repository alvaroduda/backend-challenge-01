# 🐳 Como Funciona a Inicialização Simultânea com o  Docker Compose:

---
## Estrutura do docker-compose.yml

O arquivo `docker-compose.yml` define **7 serviços** que trabalham juntos:

### 1. Infraestrutura Compartilhada
- **Zookeeper** - Necessário para Kafka funcionar
- **Kafka** - Sistema de mensageria (compartilhado entre as duas APIs)

### 2. Bancos de Dados (Consumer API)
- **MongoDB** - Armazena dispositivos
- **ClickHouse** - Armazena eventos
- **MinIO** - Armazena imagens

### 3. Aplicações
- **device-event-api** - API que gera eventos (porta 3000)
- **device-event-consumer-api** - API que consome eventos (porta 3001)

### 4. Swagger

A documentação interativa da API está disponível através do **Swagger UI**:

- **URL**: http://localhost:3001/swagger
Exibe todos os endpoints disponíveis, seus parâmetros, tipos de dados e descrições
- **OBS**: A documentação serve como referência visual dos endpoints. **Os testes devem ser realizados utilizando o Postman**
---

##  Ordem de Inicialização Automática

Quando você executa `docker-compose up -d`, o Docker Compose **não inicia tudo de uma vez**. Ele segue uma **ordem inteligente** baseada em dependências:

### Fase 1: Infraestrutura Base (Sem Dependências)

```
1. Zookeeper inicia primeiro
   └─ Não depende de nada
   └─ Porta: 2181
```

**Por que primeiro?**
- Kafka precisa do Zookeeper para funcionar
- Zookeeper gerencia configurações e coordenação do Kafka

### Fase 2: Kafka (Depende de Zookeeper)

```
2. Kafka inicia depois do Zookeeper
   └─ depends_on: zookeeper
   └─ Aguarda Zookeeper estar "started" (rodando)
   └─ Porta: 9092
```


### Fase 3: Bancos de Dados e Ferramentas (Sem Dependências entre Si)

```
3. MongoDB, ClickHouse e MinIO iniciam em paralelo
   ├─ MongoDB (porta 27017)
   ├─ ClickHouse (porta 8123)
   ├─ MinIO (portas 9000, 9001)
   
   MongoDB, ClickHouse e MinIO têm healthchecks que verificam se o sistema está adequado/pronto.
```

### Fase 4: Device Event API (Depende de Kafka)

```
4. Device Event API inicia
   └─ depends_on:
        kafka:
          condition: service_started
   └─ Aguarda Kafka estar "started"
   └─ Porta: 3000
```

**O que significa `condition: service_started`?**
- Aguarda Kafka **iniciar** 
- Kafka pode ainda estar inicializando internamente
- API tenta conectar e faz retry se necessário

### Fase 5: Device Event Consumer API (Depende de Tudo)

```
5. Device Event Consumer API inicia por último
   └─ depends_on:
        kafka:
          condition: service_started
        mongodb:
          condition: service_healthy  ← Aguarda estar estável (healthy)
        clickhouse:
          condition: service_healthy  ← Aguarda estar estável (healthy)
        minio:
          condition: service_healthy  ← Aguarda estar estável (healthy)
   └─ Porta: 3001
```

---

##  Rede Compartilhada (device-network)

A **rede Docker** permite que os containers se comuniquem entre si.

```yaml
networks:
  - device-network
```

**Todos os serviços estão na mesma rede:**
- `zookeeper` → Acessível como `zookeeper:2181`
- `kafka` → Acessível como `kafka:29092`
- `mongodb` → Acessível como `mongodb:27017`
- `clickhouse` → Acessível como `clickhouse:8123`
- `minio` → Acessível como `minio:9000`
- `device-event-api` → Acessível como `device-event-api:3000`
- `device-event-consumer-api` → Acessível como `device-event-consumer-api:3001`

**Vantagem:**
- Comunicação interna rápida (não passa pela rede do host)


---

##  Timeline de Inicialização Real

Quando rodar o `docker-compose up -d`, acontece algo assim:

```
Zookeeper inicia
Kafka inicia (aguardou Zookeeper)
MongoDB inicia (em paralelo)
ClickHouse inicia (em paralelo)
MinIO inicia (em paralelo)
Device Event API inicia (aguardou Kafka)
Device Event Consumer API inicia (aguardou todos os bancos estarem healthy)
```

---

##  Como as Aplicações Se Conectam

### Device Event API → Kafka

```javascript
// Dentro do container device-event-api
KAFKA_BROKERS: kafka:29092
//              ↑
//         Nome do serviço na rede Docker
```

**Fluxo:**
1. Device Event API tenta conectar em `kafka:29092`
2. Docker resolve `kafka` para o IP do container Kafka
3. Conexão acontece dentro da rede Docker (rápida)

### Consumer API → Todos os Serviços

```javascript
// Dentro do container device-event-consumer-api
KAFKA_BROKERS: kafka:29092           // ← Nome da rede
MONGODB_URL: mongodb://mongodb:27017  // ← Nome da rede
CLICKHOUSE_HOST: http://clickhouse:8123  // ← Nome da rede
MINIO_ENDPOINT: minio                 // ← Nome da rede
```

**Todos usam nomes da rede Docker:**
- ✅ `kafka` em vez de IP
- ✅ `mongodb` em vez de IP
- ✅ `clickhouse` em vez de IP
- ✅ `minio` em vez de IP


**O que acontece:**

1. **Docker Compose lê** o arquivo `docker-compose.yml`
2. **Identifica** todos os 7 serviços
3. **Calcula ordem** baseada em `depends_on`
4. **Inicia serviços** na ordem correta:
   - Primeiro: Zookeeper
   - Depois: Kafka
- Em paralelo: MongoDB, ClickHouse, MinIO
   - Depois: Device Event API
   - Por último: Consumer API
5. **Cria rede** compartilhada (`device-network`)
6. **Conecta todos** na mesma rede
7. **Expõe portas** para o host (3000, 3001, 8080, etc.)

### Resultado Final

**Todos os serviços rodando simultaneamente:**
- ✅ Zookeeper rodando
- ✅ Kafka rodando e pronto
- ✅ MongoDB rodando e healthy
- ✅ ClickHouse rodando e healthy
- ✅ MinIO rodando e healthy
- ✅ Device Event API rodando (porta 3000)
- ✅ Consumer API rodando (porta 3001)

**Tudo funcionando junto!**

## Visualização de Imagens
- MinIO Console: http://localhost:9001 (login `minioadmin`/`minioadmin`)
- As imagens ficam no bucket `device-images`, organizadas por `deviceId/arquivo.jpg`
- Para visualizar via API, use `GET /events/{eventId}/image-url` que retorna uma URL assinada com expiração

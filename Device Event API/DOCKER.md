# Containerização com Docker

Esse projeto foi containerizado usando Docker e Docker Compose. Todos os serviços necessários (aplicação Node.js, Kafka, Zookeeper e Kafka UI) podem ser executados com um único comando.


##  Estrutura dos Serviços

O `docker-compose.yml` define os seguintes serviços:

1. **zookeeper** - Coordenador do Kafka (porta 2181)
2. **kafka** - Broker Kafka (porta 9092)
3. **kafbat-ui** - Interface web para gerenciar Kafka (porta 8081)
4. **app** - Aplicação Node.js (porta 3000)


###  Dockerfile explicado

1. **`python3-minimal`** -  Necessário (compilação do canvas)
2. **`make`** -  Necessário (compilação)
3. **`g++`** -  Necessário (compilador C++)
4. **`libcairo2-dev`** -  Necessário (canvas depende)
5. **`libpango1.0-dev`** -  Necessário (renderização de texto)
6. **`libjpeg-dev`** -  Necessário (formato JPEG usado)
7. **`WORKDIR`** -  Boa prática
8. **`COPY package*.json` antes do código** -  Otimização de cache
9. **`npm ci --only=production`** -  Melhor prática
10. **`mkdir -p tmp/images`** -  Garante diretório existe
11. **`EXPOSE`** -  Documentação (opcional mas recomendado)
12. **`CMD`** -  Necessário para iniciar aplicação

##  Acessos

- **API da Aplicação**: http://localhost:3000
- **Kafka UI**: http://localhost:8081 (usuário: `admin`, senha: `123456`)
- **Kafka Broker**: localhost:9092 (para conexões externas)

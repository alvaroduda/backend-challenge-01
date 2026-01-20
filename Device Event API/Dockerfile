FROM node:20-slim

RUN apt-get update && apt-get install -y \
    python3-minimal \
    make \
    g++ \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN mkdir -p tmp/images

EXPOSE 3000

CMD ["npm", "start"]
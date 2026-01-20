// serviço para gerenciar conexão e upload de imagens no MinIO

const { S3Client, PutObjectCommand, CreateBucketCommand, HeadBucketCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const config = require('../config');

class MinIOService {
  constructor() {
    this.client = null;
    this.publicClient = null;
  }

  // Conecta ao MinIO e garante que a pasta existe para guardar os arquivos
  async connect() {
    if (this.client) {
      return this.client;
    }

    try {
      const endpoint = `${config.minio.useSSL ? 'https' : 'http'}://${config.minio.endpoint}:${config.minio.port}`;
      
      this.client = new S3Client({
        endpoint,
        region: 'us-east-1',
        credentials: {
          accessKeyId: config.minio.accessKey,
          secretAccessKey: config.minio.secretKey
        },
        forcePathStyle: true
      });

      await this.ensureBucketExists();
      console.log('MinIO conectado com sucesso');
      return this.client;
    } catch (error) {
      console.error('Erro ao conectar ao MinIO:', error);
      throw error;
    }
  }

  // Cliente público usado apenas para gerar URLs com host acessível pelo navegador (ex.: localhost:9000)
  async getPublicClient() {
    if (this.publicClient) {
      return this.publicClient;
    }
    const publicEndpoint = `${config.minio.useSSL ? 'https' : 'http'}://${config.minio.publicEndpoint}:${config.minio.publicPort}`;
    this.publicClient = new S3Client({
      endpoint: publicEndpoint,
      region: 'us-east-1',
      credentials: {
        accessKeyId: config.minio.accessKey,
        secretAccessKey: config.minio.secretKey
      },
      forcePathStyle: true
    });
    return this.publicClient;
  }

  // Verifica se o bucket existe, cria se não existir
  async ensureBucketExists() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: config.minio.bucket }));
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        await this.client.send(new CreateBucketCommand({ Bucket: config.minio.bucket }));
        console.log(`Bucket ${config.minio.bucket} criado`);
      } else {
        throw error;
      }
    }
  }

  // Faz upload de uma imagem em base64 para o MinIO
  async uploadImage(base64Data, deviceId, timestamp) {
    if (!this.client) {
      await this.connect();
    }

    try {
      // decodifica base64 para Buffer
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      // Gera nome único do arquivo: deviceId/YYYY-MM-DDTHH-MM-SS-sssZ.jpg
      const date = new Date(timestamp);
      const dateStr = date.toISOString().replace(/[:.]/g, '-');
      const objectKey = `${deviceId}/${dateStr}.jpg`;

      // Faz upload no MinIO
      await this.client.send(new PutObjectCommand({
        Bucket: config.minio.bucket,
        Key: objectKey,
        Body: imageBuffer,
        ContentType: 'image/jpeg'
      }));

      return objectKey;
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      throw error;
    }
  }

  // Desconecta do MinIO
  async disconnect() {
    this.client = null;
    this.publicClient = null;
  }

  // Gera URL assinada para visualizar objeto por chave
  async getPresignedUrl(objectKey, expiresSeconds = 300) {
    if (!this.client) await this.connect();
    const publicClient = await this.getPublicClient();
    const command = new GetObjectCommand({
      Bucket: config.minio.bucket,
      Key: objectKey
    });
    // Usar o client público para assinar com host acessível (ex.: localhost:9000)
    const url = await getSignedUrl(publicClient, command, { expiresIn: expiresSeconds });
    return url;
  }
}

module.exports = new MinIOService();

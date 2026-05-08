import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// Conexão compartilhada com Redis.
// BullMQ exige maxRetriesPerRequest=null.
export const redisConnection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null
});

// Responsável por baixar mídia recebida pelo WhatsApp e salvar no R2.
export const mediaDownloadQueue = new Queue<MediaDownloadJobData>('media-download', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 500 }
  }
});

export interface MediaDownloadJobData {
  documentFileId: string;
  metaMediaId?: string | null;
  mediaUrl?: string | null;
  filename: string;
  mimeType: string;
  clientId?: string | null;
  officeId?: string | null;
}

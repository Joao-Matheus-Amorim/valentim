import { Worker, Job } from 'bullmq';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '../lib/prisma';
import { redisConnection, MediaDownloadJobData } from '../lib/queue';

// ---------------------------------------------------------------------------
// Cloudflare R2 (compatível com S3)
// ---------------------------------------------------------------------------

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? ''
  }
});

const R2_BUCKET = process.env.R2_BUCKET ?? 'valentim-docs';

// ---------------------------------------------------------------------------
// Meta Graph API
// ---------------------------------------------------------------------------

const META_API_VERSION = process.env.META_API_VERSION ?? 'v19.0';
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

interface MetaMediaInfo {
  url: string;
  mime_type: string;
  sha256: string;
  file_size: number;
  id: string;
}

async function fetchMetaMediaUrl(mediaId: string): Promise<MetaMediaInfo> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!token) {
    throw new Error('WHATSAPP_ACCESS_TOKEN não configurado');
  }

  const res = await fetch(`${META_BASE_URL}/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Meta API erro ao buscar media info: ${res.status} — ${body}`);
  }

  return res.json() as Promise<MetaMediaInfo>;
}

async function downloadMetaMedia(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!token) {
    throw new Error('WHATSAPP_ACCESS_TOKEN não configurado');
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Falha ao baixar mídia da Meta: ${res.status} — ${body}`);
  }

  const contentType = res.headers.get('content-type') ?? 'application/octet-stream';
  const arrayBuffer = await res.arrayBuffer();

  return { buffer: Buffer.from(arrayBuffer), contentType };
}

// ---------------------------------------------------------------------------
// Upload para o Cloudflare R2
// ---------------------------------------------------------------------------

async function uploadToR2(key: string, buffer: Buffer, contentType: string): Promise<string> {
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType
    })
  );

  const publicUrl = process.env.R2_PUBLIC_URL;

  if (publicUrl) {
    return `${publicUrl.replace(/\/$/, '')}/${key}`;
  }

  return `r2://${R2_BUCKET}/${key}`;
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

function safeFileName(filename: string): string {
  return filename
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'documento';
}

function buildStorageKey(documentFileId: string, filename: string): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `documents/${year}/${month}/${documentFileId}/${safeFileName(filename)}`;
}

async function processMediaDownload(job: Job<MediaDownloadJobData>) {
  const { documentFileId, metaMediaId, filename, mimeType } = job.data;

  job.log(`Iniciando download — media ID: ${metaMediaId}`);

  await job.updateProgress(10);
  const mediaInfo = await fetchMetaMediaUrl(metaMediaId);
  job.log(`URL temporária obtida — tamanho: ${mediaInfo.file_size} bytes`);

  await job.updateProgress(30);
  const { buffer, contentType } = await downloadMetaMedia(mediaInfo.url);
  job.log(`Arquivo baixado — ${buffer.length} bytes`);

  await job.updateProgress(60);
  const storageKey = buildStorageKey(documentFileId, filename);
  const storageUrl = await uploadToR2(storageKey, buffer, contentType || mimeType);
  job.log(`Upload concluído — chave: ${storageKey}`);

  await job.updateProgress(90);
  await prisma.documentFile.update({
    where: { id: documentFileId },
    data: { storageKey: storageUrl }
  });

  await job.updateProgress(100);
  job.log(`DocumentFile ${documentFileId} atualizado com storage permanente`);

  return { storageKey, bytes: buffer.length };
}

export function startMediaDownloadWorker() {
  const worker = new Worker<MediaDownloadJobData>('media-download', processMediaDownload, {
    connection: redisConnection,
    concurrency: Number(process.env.MEDIA_DOWNLOAD_CONCURRENCY ?? 5)
  });

  worker.on('completed', (job, result) => {
    console.log(`[media-worker] Job ${job.id} concluído — ${result.bytes} bytes → ${result.storageKey}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[media-worker] Job ${job?.id} falhou (tentativa ${job?.attemptsMade}):`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[media-worker] Erro no worker:', err);
  });

  console.log('[media-worker] Worker de download de mídia iniciado');

  return worker;
}

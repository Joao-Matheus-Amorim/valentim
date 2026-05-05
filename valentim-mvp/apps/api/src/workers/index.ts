/**
 * Ponto de entrada dos workers assíncronos do Valentim.
 *
 * Roda separado da API (processo independente), assim um pico de downloads
 * não afeta o tempo de resposta do servidor HTTP.
 */

import { redisConnection } from '../lib/queue';
import { startMediaDownloadWorker } from './media-download.worker';

const workers = [startMediaDownloadWorker()];

async function shutdown(signal: string) {
  console.log(`\n[workers] Recebido ${signal} — encerrando workers...`);

  await Promise.all(workers.map((worker) => worker.close()));
  await redisConnection.quit();

  console.log('[workers] Todos os workers encerrados.');
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

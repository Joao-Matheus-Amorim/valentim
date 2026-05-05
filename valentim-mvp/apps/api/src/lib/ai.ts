/**
 * Ponto central de análise de documentos do Valentim.
 *
 * Estratégia:
 *   1. Tenta Gemini Flash quando GEMINI_API_KEY estiver configurada
 *   2. Se Gemini falhar ou retornar confiança < 0.6, roda análise local
 *   3. Combina os dois resultados escolhendo o melhor campo
 *
 * Dessa forma o sistema não para: mesmo sem internet ou sem chave configurada,
 * o analisador local garante extração mínima.
 */

import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { analyzeDocumentGemini } from './ai-gemini';
import { analyzeDocumentLocal, type AiResult } from './ai-local';

export type { AiResult };

// ---------------------------------------------------------------------------
// Buscar arquivo do R2
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

function storageUrlToKey(storageKey: string): string {
  if (storageKey.startsWith('r2://')) {
    const withoutScheme = storageKey.replace(/^r2:\/\//, '');
    const slashIndex = withoutScheme.indexOf('/');
    return slashIndex >= 0 ? withoutScheme.slice(slashIndex + 1) : withoutScheme;
  }

  if (storageKey.startsWith('http')) {
    return new URL(storageKey).pathname.slice(1);
  }

  return storageKey;
}

export async function fetchFromR2(storageKey: string): Promise<{ buffer: Buffer; contentType: string }> {
  const key = storageUrlToKey(storageKey);
  const res = await r2.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }));
  const contentType = res.ContentType ?? 'application/octet-stream';

  const chunks: Buffer[] = [];

  for await (const chunk of res.Body as Readable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return { buffer: Buffer.concat(chunks), contentType };
}

// ---------------------------------------------------------------------------
// Combinação de resultados
// ---------------------------------------------------------------------------

function mergeResults(gemini: AiResult | null, local: AiResult): AiResult {
  if (!gemini) return local;

  return {
    documentType: gemini.confidence >= local.confidence ? gemini.documentType : local.documentType,
    competence: gemini.competence ?? local.competence,
    cnpj: gemini.cnpj ?? local.cnpj,
    totalValue: gemini.totalValue ?? local.totalValue,
    dueDate: gemini.dueDate ?? local.dueDate,
    confidence: Math.max(gemini.confidence, local.confidence),
    summary: gemini.summary ?? local.summary,
    flags: [...new Set([...gemini.flags, ...local.flags])],
    model: gemini.confidence >= local.confidence ? `${gemini.model}+local` : `local+${gemini.model}`
  };
}

// ---------------------------------------------------------------------------
// Ponto de entrada principal
// ---------------------------------------------------------------------------

const CONFIDENCE_THRESHOLD = Number(process.env.AI_CONFIDENCE_THRESHOLD ?? 0.6);

export async function analyzeDocument(buffer: Buffer, mimeType: string, filename: string): Promise<AiResult> {
  let geminiResult: AiResult | null = null;

  if (process.env.GEMINI_API_KEY) {
    try {
      geminiResult = await analyzeDocumentGemini(buffer, mimeType);
      console.log(`[ai] Gemini retornou confiança ${geminiResult.confidence} para "${filename}"`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[ai] Gemini falhou — usando local. Motivo: ${message}`);
    }
  }

  const needsLocal = !geminiResult || geminiResult.confidence < CONFIDENCE_THRESHOLD;

  let localResult: AiResult | null = null;

  if (needsLocal) {
    try {
      localResult = await analyzeDocumentLocal(buffer, mimeType, filename);
      console.log(`[ai] Local retornou confiança ${localResult.confidence} para "${filename}"`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[ai] Analisador local falhou: ${message}`);
    }
  }

  if (geminiResult && localResult) return mergeResults(geminiResult, localResult);
  if (geminiResult) return geminiResult;
  if (localResult) return localResult;

  return {
    documentType: 'OUTRO',
    competence: null,
    cnpj: null,
    totalValue: null,
    dueDate: null,
    confidence: 0.1,
    summary: `Não foi possível analisar "${filename}" automaticamente`,
    flags: ['analise_manual_necessaria'],
    model: 'fallback'
  };
}

// ---------------------------------------------------------------------------
// Versão que busca do R2 antes de analisar (usada no worker)
// ---------------------------------------------------------------------------

export async function analyzeDocumentFromStorage(storageKey: string, filename: string): Promise<AiResult> {
  const { buffer, contentType } = await fetchFromR2(storageKey);
  return analyzeDocument(buffer, contentType, filename);
}

import { analyzeDocument as analyzeDocumentMock, type AiResult } from './ai-mock';
import { analyzeDocumentLocal } from './ai-local';
import { analyzeDocumentGemini } from './ai-gemini';

export type { AiResult };

/**
 * Abstração assíncrona do provider de IA.
 *
 * Providers:
 * - mock: usa nome do arquivo para classificar sem custo externo
 * - local: usa pdf-parse/Tesseract + regex em Buffer real
 * - gemini: usa Gemini Flash em Buffer real
 *
 * Observação: chamadas legadas com string continuam caindo no mock, porque
 * providers reais precisam dos bytes do documento.
 */
export async function analyzeDocument(
  input: string | Buffer,
  mimeType = 'application/octet-stream',
  filename?: string
): Promise<AiResult> {
  const provider = (process.env.AI_PROVIDER || 'mock').toLowerCase();
  const safeFilename = typeof input === 'string' ? input : filename || 'documento';

  if (provider === 'mock' || typeof input === 'string') {
    return analyzeDocumentMock(safeFilename, mimeType);
  }

  if (provider === 'local') {
    return analyzeDocumentLocal(input, mimeType, safeFilename);
  }

  if (provider === 'gemini') {
    return analyzeDocumentGemini(input, mimeType);
  }

  return analyzeDocumentMock(safeFilename, mimeType);
}

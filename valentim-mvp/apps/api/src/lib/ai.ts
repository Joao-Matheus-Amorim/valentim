import { analyzeDocument as analyzeDocumentMock, type AiResult } from './ai-mock';

export type { AiResult };

/**
 * Abstração do provider de IA.
 *
 * Compatibilidade:
 * - webhook mockado: analyzeDocument(filename, mimeType)
 * - worker real: analyzeDocument(buffer, mimeType, filename)
 *
 * Quando integrar Claude/OpenAI/Gemini real, o provider pode usar o Buffer.
 * Enquanto isso, o mock usa o nome do arquivo para classificar o documento.
 */
export function analyzeDocument(
  input: string | Buffer,
  mimeType = 'application/octet-stream',
  filename?: string
): AiResult {
  const provider = process.env.AI_PROVIDER || 'mock';
  const safeFilename = typeof input === 'string' ? input : filename || 'documento';

  if (provider === 'mock') {
    return analyzeDocumentMock(safeFilename, mimeType);
  }

  // TODO: implementar provider real (Claude Vision / OpenAI / Gemini) usando input Buffer quando disponível.
  return analyzeDocumentMock(safeFilename, mimeType);
}

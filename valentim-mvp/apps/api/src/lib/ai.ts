import { analyzeDocument as analyzeDocumentMock } from './ai-mock';

/**
 * Abstração do provider de IA.
 * Troque AI_PROVIDER=real e implemente analyzeDocumentReal quando integrar Claude/OpenAI.
 */
export function analyzeDocument(filename: string, mimeType?: string) {
  const provider = process.env.AI_PROVIDER || 'mock';

  if (provider === 'mock') {
    return analyzeDocumentMock(filename, mimeType);
  }

  // TODO: implementar provider real (Claude Vision / OpenAI GPT-4o)
  // if (provider === 'claude') return analyzeDocumentClaude(filename, mimeType);

  return analyzeDocumentMock(filename, mimeType);
}

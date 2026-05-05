export interface AiResult {
  documentType: string;
  competence?: string | null;
  cnpj?: string | null;
  totalValue?: number | null;
  confidence: number;
  summary?: string | null;
  flags: string[];
  model: string;
}

export function analyzeDocument(fileName: string, mimeType: string): AiResult {
  const lower = fileName.toLowerCase();
  let documentType = 'OUTRO';
  if (lower.includes('das')) documentType = 'DAS';
  else if (lower.includes('darf')) documentType = 'DARF';
  else if (lower.includes('extrato')) documentType = 'EXTRATO';
  else if (lower.includes('nf') || lower.includes('nota')) documentType = 'NF';
  return {
    documentType,
    competence: null,
    cnpj: null,
    totalValue: null,
    confidence: 0.9,
    summary: `${documentType} document`,
    flags: [],
    model: 'mock-ai'
  };
}

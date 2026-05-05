/**
 * Analisador de documentos usando Google Gemini Flash.
 * Suporta PDF e imagens nativamente (sem OCR manual).
 */

import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import type { AiResult } from './ai-local';

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '');

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `Você é especialista em documentos contábeis brasileiros.
Analise o documento e extraia os dados com precisão.
Responda SOMENTE com JSON válido. Sem markdown. Sem explicações.`;

const EXTRACTION_PROMPT = `Analise este documento contábil brasileiro e retorne JSON com esta estrutura exata:

{
  "documentType": "DAS" | "DARF" | "NF" | "EXTRATO" | "CONTRATO" | "GPS" | "FGTS" | "OUTRO",
  "competence": "YYYY-MM" ou null,
  "cnpj": "14 dígitos sem formatação" ou null,
  "totalValue": número ou null,
  "dueDate": "YYYY-MM-DD" ou null,
  "confidence": número entre 0 e 1,
  "summary": "descrição curta em português" ou null,
  "flags": ["vencido" | "cancelado" | "complementar" | "cnpj_divergente"]
}

Regras:
- documentType: identifique pelo conteúdo, não pelo nome do arquivo
- cnpj: extraia o CNPJ do emitente/contribuinte principal
- totalValue: valor total a pagar/receber em decimal (ex: 1234.56)
- dueDate: data de vencimento se houver
- confidence: sua confiança na análise (0.9 = muito seguro, 0.5 = incerto)
- flags: lista vazia [] se nenhuma condição se aplicar`;

// ---------------------------------------------------------------------------
// Converter buffer para Part do Gemini
// ---------------------------------------------------------------------------

function bufferToPart(buffer: Buffer, mimeType: string): Part {
  return {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType: normalizeMime(mimeType)
    }
  };
}

function normalizeMime(mimeType: string): string {
  const supported = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ];

  if (supported.includes(mimeType)) return mimeType;
  if (mimeType.startsWith('image/')) return 'image/jpeg';
  return 'application/pdf';
}

// ---------------------------------------------------------------------------
// Parsear resposta
// ---------------------------------------------------------------------------

function parseGeminiResponse(text: string): AiResult {
  const clean = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/gi, '')
    .trim();

  const parsed = JSON.parse(clean);

  return {
    documentType: parsed.documentType ?? 'OUTRO',
    competence: parsed.competence ?? null,
    cnpj: parsed.cnpj ? String(parsed.cnpj).replace(/\D/g, '') : null,
    totalValue: typeof parsed.totalValue === 'number' ? parsed.totalValue : null,
    dueDate: parsed.dueDate ?? null,
    confidence:
      typeof parsed.confidence === 'number'
        ? Math.min(1, Math.max(0, parsed.confidence))
        : 0.5,
    summary: parsed.summary ?? null,
    flags: Array.isArray(parsed.flags) ? parsed.flags : [],
    model: 'gemini-1.5-flash'
  };
}

// ---------------------------------------------------------------------------
// Ponto de entrada
// ---------------------------------------------------------------------------

export async function analyzeDocumentGemini(buffer: Buffer, mimeType: string): Promise<AiResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não configurado');
  }

  const model = genai.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? 'gemini-1.5-flash',
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 512
    }
  });

  const result = await model.generateContent([EXTRACTION_PROMPT, bufferToPart(buffer, mimeType)]);
  const text = result.response.text();

  return parseGeminiResponse(text);
}

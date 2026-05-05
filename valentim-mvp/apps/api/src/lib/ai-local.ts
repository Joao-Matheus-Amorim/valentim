/**
 * Analisador local de documentos contábeis brasileiros.
 * Usa pdf-parse para PDFs e Tesseract.js para imagens.
 * Custo: zero. Roda offline.
 */

import pdfParse from 'pdf-parse';
import Tesseract from 'tesseract.js';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface AiResult {
  documentType: string;
  competence: string | null; // "YYYY-MM"
  cnpj: string | null; // 14 dígitos
  totalValue: number | null;
  dueDate: string | null; // "YYYY-MM-DD"
  confidence: number; // 0–1
  summary: string | null;
  flags: string[];
  model: string;
}

// ---------------------------------------------------------------------------
// Extração de texto
// ---------------------------------------------------------------------------

async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf') {
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (mimeType.startsWith('image/')) {
    const { data } = await Tesseract.recognize(buffer, 'por', {
      logger: () => {}
    });
    return data.text;
  }

  return buffer.toString('utf-8');
}

// ---------------------------------------------------------------------------
// Regexes para documentos brasileiros
// ---------------------------------------------------------------------------

const CNPJ_RE = /\b(\d{2})[.\s]?(\d{3})[.\s]?(\d{3})[\/\s]?(\d{4})[-\s]?(\d{2})\b/g;
const VALUE_RE = /R\$\s*([\d.]+,\d{2})/g;
const DATE_RE = /(\d{2})\/(\d{2})\/(\d{4})/g;
const COMP_RE = /(?:competência|competencia|período|periodo)[:\s]+(\d{2})\/(\d{4})/i;
const COMP2_RE = /\b(0[1-9]|1[0-2])\/(\d{4})\b/g;

// ---------------------------------------------------------------------------
// Detectar tipo do documento
// ---------------------------------------------------------------------------

interface DocSignature {
  type: string;
  keywords: string[];
  weight: number;
}

const DOC_SIGNATURES: DocSignature[] = [
  { type: 'DAS', keywords: ['documento de arrecadação do simples', 'simples nacional', 'das ', 'pgdas'], weight: 3 },
  { type: 'DARF', keywords: ['documento de arrecadação de receitas federais', 'darf', 'receita federal', 'período de apuração'], weight: 3 },
  { type: 'NF', keywords: ['nota fiscal', 'nf-e', 'nfe', 'danfe', 'chave de acesso', 'cfop'], weight: 3 },
  { type: 'EXTRATO', keywords: ['extrato', 'saldo anterior', 'saldo final', 'lançamentos', 'conta corrente'], weight: 2 },
  { type: 'CONTRATO', keywords: ['contrato', 'cláusula', 'contratante', 'contratado', 'vigência'], weight: 2 },
  { type: 'GPS', keywords: ['guia da previdência', 'gps', 'inss', 'competência previdenciária'], weight: 3 },
  { type: 'FGTS', keywords: ['fgts', 'fundo de garantia', 'grf', 'guia de recolhimento do fgts'], weight: 3 }
];

function detectDocumentType(text: string): { type: string; confidence: number } {
  const lower = text.toLowerCase();
  let best = { type: 'OUTRO', score: 0 };

  for (const sig of DOC_SIGNATURES) {
    const matches = sig.keywords.filter((kw) => lower.includes(kw)).length;
    const score = matches * sig.weight;
    if (score > best.score) best = { type: sig.type, score };
  }

  const confidence = best.score >= 3 ? 0.9 : best.score === 2 ? 0.75 : best.score === 1 ? 0.55 : 0.3;

  return { type: best.type, confidence };
}

// ---------------------------------------------------------------------------
// Extração de campos
// ---------------------------------------------------------------------------

function extractCnpj(text: string): string | null {
  const matches = [...text.matchAll(CNPJ_RE)];
  if (!matches.length) return null;

  const freq: Record<string, number> = {};
  for (const m of matches) {
    const digits = `${m[1]}${m[2]}${m[3]}${m[4]}${m[5]}`;
    freq[digits] = (freq[digits] ?? 0) + 1;
  }

  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function extractValue(text: string): number | null {
  const matches = [...text.matchAll(VALUE_RE)];
  if (!matches.length) return null;

  const values = matches
    .map((m) => parseFloat(m[1].replace(/\./g, '').replace(',', '.')))
    .filter((v) => !Number.isNaN(v));

  return values.length ? Math.max(...values) : null;
}

function extractCompetence(text: string): string | null {
  const explicit = COMP_RE.exec(text);
  if (explicit) {
    return `${explicit[2]}-${explicit[1].padStart(2, '0')}`;
  }

  const matches = [...text.matchAll(COMP2_RE)];
  if (matches.length) {
    return `${matches[0][2]}-${matches[0][1]}`;
  }

  return null;
}

function extractDueDate(text: string): string | null {
  const vencIdx = text.toLowerCase().indexOf('vencimento');
  if (vencIdx === -1) return null;

  const snippet = text.slice(vencIdx, vencIdx + 80);
  const match = DATE_RE.exec(snippet);
  if (!match) return null;

  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

function buildFlags(text: string, dueDate: string | null): string[] {
  const flags: string[] = [];
  const lower = text.toLowerCase();

  if (dueDate) {
    const due = new Date(dueDate);
    if (due < new Date()) flags.push('vencido');
  }

  if (lower.includes('cancelad')) flags.push('cancelado');
  if (lower.includes('inutilizad')) flags.push('inutilizado');
  if (lower.includes('complementar')) flags.push('complementar');

  return flags;
}

function buildSummary(type: string, cnpj: string | null, competence: string | null, value: number | null): string {
  const parts: string[] = [type];
  if (cnpj) parts.push(`CNPJ ${cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')}`);
  if (competence) parts.push(`competência ${competence}`);
  if (value) parts.push(`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  return parts.join(' · ');
}

// ---------------------------------------------------------------------------
// Ponto de entrada
// ---------------------------------------------------------------------------

export async function analyzeDocumentLocal(buffer: Buffer, mimeType: string, filename: string): Promise<AiResult> {
  const text = await extractText(buffer, mimeType);

  const { type: documentType, confidence: typeConf } = detectDocumentType(text);
  const cnpj = extractCnpj(text);
  const totalValue = extractValue(text);
  const competence = extractCompetence(text);
  const dueDate = extractDueDate(text);
  const flags = buildFlags(text, dueDate);

  const fieldScore = [cnpj, totalValue, competence].filter(Boolean).length / 3;
  const confidence = Math.round((typeConf * 0.6 + fieldScore * 0.4) * 100) / 100;

  return {
    documentType,
    competence,
    cnpj,
    totalValue,
    dueDate,
    confidence,
    summary: buildSummary(documentType, cnpj, competence, totalValue),
    flags,
    model: `local-regex-v1:${filename}`
  };
}

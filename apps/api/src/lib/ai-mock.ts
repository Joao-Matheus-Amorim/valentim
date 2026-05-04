import type { AiDocumentAnalysisResult, AiDecisionType } from "@valentim/shared";

export interface AnalyzeInput {
  fileName?: string;
  mimeType?: string;
  body?: string;
  phone: string;
}

function includesAny(source: string, terms: string[]) {
  return terms.some((term) => source.includes(term));
}

export function analyzeDocumentMock(input: AnalyzeInput): AiDocumentAnalysisResult {
  const source = `${input.fileName ?? ""} ${input.mimeType ?? ""} ${input.body ?? ""}`.toLowerCase();

  if (includesAny(source, ["das", "simples", "sn"])) {
    return {
      documentType: "DAS_PAGO",
      competenceMonth: 4,
      competenceYear: 2026,
      cnpj: "12.345.678/0001-90",
      cpf: null,
      totalValue: 1280.5,
      dueDate: "2026-05-20",
      confidence: 0.94,
      summary: "Guia DAS do Simples Nacional referente a abril/2026.",
      flags: [],
    };
  }

  if (includesAny(source, ["extrato", "banco", "bancario", "bank"])) {
    return {
      documentType: "EXTRATO_BANCARIO",
      competenceMonth: 4,
      competenceYear: 2026,
      cnpj: "12.345.678/0001-90",
      cpf: null,
      totalValue: null,
      dueDate: null,
      confidence: 0.88,
      summary: "Extrato bancário referente a abril/2026.",
      flags: [],
    };
  }

  if (includesAny(source, ["nota", "nfe", "nf-e", "nfse", "nfs-e"])) {
    return {
      documentType: "NOTAS_SAIDA",
      competenceMonth: 4,
      competenceYear: 2026,
      cnpj: "12.345.678/0001-90",
      cpf: null,
      totalValue: null,
      dueDate: null,
      confidence: 0.7,
      summary: "Documento parece ser uma nota fiscal, mas precisa de revisão.",
      flags: ["confidence_medio"],
    };
  }

  return {
    documentType: "OUTROS",
    competenceMonth: null,
    competenceYear: null,
    cnpj: null,
    cpf: null,
    totalValue: null,
    dueDate: null,
    confidence: 0.35,
    summary: "Não foi possível identificar o documento com segurança.",
    flags: ["baixo_confidence", "triagem_necessaria"],
  };
}

export function decideFromConfidence(confidence: number): AiDecisionType {
  const autoThreshold = Number(process.env.AI_CONFIDENCE_THRESHOLD ?? 0.75);
  const reviewThreshold = Number(process.env.AI_REVIEW_THRESHOLD ?? 0.5);

  if (confidence >= autoThreshold) {
    return "AUTO_MATCH";
  }

  if (confidence >= reviewThreshold) {
    return "REVIEW_REQUIRED";
  }

  return "REQUEST_REUPLOAD";
}

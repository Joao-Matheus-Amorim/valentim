import type { Color } from '../types/ui';

export type ArchitectureSectionId = 'overview' | 'pipeline' | 'ai' | 'conversation' | 'sequence' | 'states' | 'domain' | 'jobs' | 'deploy';

export interface ArchitectureSectionItem {
  id: ArchitectureSectionId;
  label: string;
  icon: string;
  tag?: string;
}

export const architectureSections: ArchitectureSectionItem[] = [
  { id: 'overview', label: 'Visão Geral', icon: '⬡', tag: 'NOVO' },
  { id: 'pipeline', label: 'Pipeline WhatsApp', icon: '→', tag: 'NOVO' },
  { id: 'ai', label: 'IA & Análise', icon: '◈', tag: 'NOVO' },
  { id: 'conversation', label: 'Conversa Bot', icon: '💬', tag: 'NOVO' },
  { id: 'sequence', label: 'Sequência Completa', icon: '↕', tag: 'NOVO' },
  { id: 'states', label: 'Estados', icon: '◉' },
  { id: 'domain', label: 'Domínio', icon: '⊞' },
  { id: 'jobs', label: 'Jobs & Notif.', icon: '⏱' },
  { id: 'deploy', label: 'Deploy', icon: '⬆' },
];

export const pipelineStages: Array<{ id: string; name: string; color: Color; icon: string; desc: string; details: string[] }> = [
  {
    id: '01',
    name: 'RECEPÇÃO',
    color: 'green',
    icon: '📥',
    desc: 'Webhook recebe evento do WhatsApp',
    details: [
      'POST /api/webhooks/whatsapp',
      'Valida assinatura HMAC/token do provider',
      'Identifica remetente por telefone',
      'Normaliza texto, imagem, PDF, áudio ou documento',
      'Salva WhatsAppMessage e enfileira processamento',
    ],
  },
  {
    id: '02',
    name: 'DOWNLOAD',
    color: 'sky',
    icon: '⬇',
    desc: 'Baixa a mídia do provider',
    details: ['Obtém mediaId/mediaUrl do payload', 'Baixa binário do provider', 'Valida tamanho, MIME e extensão', 'Calcula hash para deduplicação', 'Prepara arquivo para análise'],
  },
  {
    id: '03',
    name: 'IA ANÁLISE',
    color: 'amber',
    icon: '🤖',
    desc: 'IA lê e classifica o documento',
    details: ['MockAIProvider primeiro; Claude/OpenAI depois', 'Extrai tipo, competência, CNPJ, valor e vencimento', 'Gera summary e flags', 'Calcula confidence score', 'Salva AIAnalysis com resposta bruta'],
  },
  {
    id: '04',
    name: 'MATCHING',
    color: 'violet',
    icon: '🔗',
    desc: 'Associa ao DocumentRequest correto',
    details: ['Busca solicitações PENDING do cliente', 'Filtra por empresa, CNPJ, tipo e competência', 'Confidence >= 0.75: match automático', 'Confidence médio: inbox para STAFF', 'Sem match: cria UnmatchedDocument'],
  },
  {
    id: '05',
    name: 'ARQUIVO',
    color: 'emerald',
    icon: '📁',
    desc: 'Arquiva e atualiza status',
    details: ['Upload para Supabase Storage/S3/R2', 'Cria DocumentFile', 'Vincula AIAnalysis', 'Atualiza DocumentRequest', 'Registra AuditLog com origem WhatsApp'],
  },
  {
    id: '06',
    name: 'RESPOSTA',
    color: 'green',
    icon: '💬',
    desc: 'Confirma ao cliente',
    details: ['Monta template de confirmação', 'Informa documento recebido', 'Lista pendências restantes', 'Pede reenvio se necessário', 'Notifica STAFF no dashboard'],
  },
];

export const sequenceSteps: Array<{ n: string; actor: string; color: Color; action: string; detail: string }> = [
  { n: '1', actor: 'STAFF', color: 'sky', action: 'Cria solicitação no dashboard', detail: 'POST /api/documents/requests — status PENDING' },
  { n: '2', actor: 'API', color: 'teal', action: 'Envia pedido pelo WhatsApp', detail: 'Template doc_request com cliente, tipo e competência' },
  { n: '3', actor: 'CLIENT', color: 'green', action: 'Envia foto, PDF ou documento', detail: 'Sem portal, sem senha, sem app novo' },
  { n: '4', actor: 'WEBHOOK', color: 'violet', action: 'Recebe evento do provider', detail: 'POST /api/webhooks/whatsapp' },
  { n: '5', actor: 'QUEUE', color: 'violet', action: 'Enfileira job', detail: 'document-analysis via BullMQ/Redis' },
  { n: '6', actor: 'WORKER', color: 'amber', action: 'Baixa mídia e chama IA', detail: 'MockAIProvider primeiro; provider real depois' },
  { n: '7', actor: 'AI', color: 'amber', action: 'Extrai dados e confidence', detail: 'tipo, competência, CNPJ, valor, vencimento, flags' },
  { n: '8', actor: 'API', color: 'teal', action: 'Faz matching', detail: 'AUTO_MATCH, REVIEW_REQUIRED, REQUEST_REUPLOAD ou UNMATCHED' },
  { n: '9', actor: 'STORAGE', color: 'emerald', action: 'Arquiva arquivo', detail: 'storageKey em bucket externo' },
  { n: '10', actor: 'STAFF', color: 'sky', action: 'Revisa quando necessário', detail: 'Inbox IA mostra summary, confidence e documento' },
  { n: '11', actor: 'BOT', color: 'green', action: 'Confirma no WhatsApp', detail: 'Cliente sabe o que foi recebido e o que falta' },
];

export const deployLayers = [
  ['Front-end', 'Vercel', 'Dashboard React para STAFF/ADMIN'],
  ['API + Webhook', 'Railway/Render', 'Fastify com HTTPS público'],
  ['Worker', 'Railway/Render', 'Processamento da fila de documentos'],
  ['Redis', 'Upstash/Railway', 'BullMQ'],
  ['Banco', 'Supabase/Neon', 'PostgreSQL'],
  ['Storage', 'Supabase/R2/S3', 'Arquivos dos clientes'],
  ['WhatsApp', 'Mock → Z-API/Evolution → Meta', 'Provider plugável'],
  ['IA', 'Mock → Claude/OpenAI', 'Vision e extração estruturada'],
];

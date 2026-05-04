import { useMemo, useState } from "react";

type SectionId = "overview" | "pipeline" | "ai" | "conversation" | "sequence" | "states" | "domain" | "jobs" | "deploy";
type Color = "green" | "teal" | "amber" | "violet" | "rose" | "sky" | "slate" | "emerald";

interface SectionItem {
  id: SectionId;
  label: string;
  icon: string;
  tag?: string;
}

const sections: SectionItem[] = [
  { id: "overview", label: "Visão Geral", icon: "⬡", tag: "NOVO" },
  { id: "pipeline", label: "Pipeline WhatsApp", icon: "→", tag: "NOVO" },
  { id: "ai", label: "IA & Análise", icon: "◈", tag: "NOVO" },
  { id: "conversation", label: "Conversa Bot", icon: "💬", tag: "NOVO" },
  { id: "sequence", label: "Sequência Completa", icon: "↕", tag: "NOVO" },
  { id: "states", label: "Estados", icon: "◉" },
  { id: "domain", label: "Domínio", icon: "⊞" },
  { id: "jobs", label: "Jobs & Notif.", icon: "⏱" },
  { id: "deploy", label: "Deploy", icon: "⬆" },
];

const pipelineStages: Array<{ id: string; name: string; color: Color; icon: string; desc: string; details: string[] }> = [
  {
    id: "01",
    name: "RECEPÇÃO",
    color: "green",
    icon: "📥",
    desc: "Webhook recebe evento do WhatsApp",
    details: [
      "POST /api/webhooks/whatsapp",
      "Valida assinatura HMAC/token do provider",
      "Identifica remetente por telefone",
      "Normaliza texto, imagem, PDF, áudio ou documento",
      "Salva WhatsAppMessage e enfileira processamento",
    ],
  },
  {
    id: "02",
    name: "DOWNLOAD",
    color: "sky",
    icon: "⬇",
    desc: "Baixa a mídia do provider",
    details: [
      "Obtém mediaId/mediaUrl do payload",
      "Baixa binário do provider",
      "Valida tamanho, MIME e extensão",
      "Calcula hash para deduplicação",
      "Prepara arquivo para análise",
    ],
  },
  {
    id: "03",
    name: "IA ANÁLISE",
    color: "amber",
    icon: "🤖",
    desc: "IA lê e classifica o documento",
    details: [
      "MockAIProvider primeiro; Claude/OpenAI depois",
      "Extrai tipo, competência, CNPJ, valor e vencimento",
      "Gera summary e flags",
      "Calcula confidence score",
      "Salva AIAnalysis com resposta bruta",
    ],
  },
  {
    id: "04",
    name: "MATCHING",
    color: "violet",
    icon: "🔗",
    desc: "Associa ao DocumentRequest correto",
    details: [
      "Busca solicitações PENDING do cliente",
      "Filtra por empresa, CNPJ, tipo e competência",
      "Confidence >= 0.75: match automático",
      "Confidence médio: inbox para STAFF",
      "Sem match: cria UnmatchedDocument",
    ],
  },
  {
    id: "05",
    name: "ARQUIVO",
    color: "emerald",
    icon: "📁",
    desc: "Arquiva e atualiza status",
    details: [
      "Upload para Supabase Storage/S3/R2",
      "Cria DocumentFile",
      "Vincula AIAnalysis",
      "Atualiza DocumentRequest",
      "Registra AuditLog com origem WhatsApp",
    ],
  },
  {
    id: "06",
    name: "RESPOSTA",
    color: "green",
    icon: "💬",
    desc: "Confirma ao cliente",
    details: [
      "Monta template de confirmação",
      "Informa documento recebido",
      "Lista pendências restantes",
      "Pede reenvio se necessário",
      "Notifica STAFF no dashboard",
    ],
  },
];

const sequenceSteps: Array<{ n: string; actor: string; color: Color; action: string; detail: string }> = [
  { n: "1", actor: "STAFF", color: "sky", action: "Cria solicitação no dashboard", detail: "POST /api/documents/requests — status PENDING" },
  { n: "2", actor: "API", color: "teal", action: "Envia pedido pelo WhatsApp", detail: "Template doc_request com cliente, tipo e competência" },
  { n: "3", actor: "CLIENT", color: "green", action: "Envia foto, PDF ou documento", detail: "Sem portal, sem senha, sem app novo" },
  { n: "4", actor: "WEBHOOK", color: "violet", action: "Recebe evento do provider", detail: "POST /api/webhooks/whatsapp" },
  { n: "5", actor: "QUEUE", color: "violet", action: "Enfileira job", detail: "document-analysis via BullMQ/Redis" },
  { n: "6", actor: "WORKER", color: "amber", action: "Baixa mídia e chama IA", detail: "MockAIProvider primeiro; provider real depois" },
  { n: "7", actor: "AI", color: "amber", action: "Extrai dados e confidence", detail: "tipo, competência, CNPJ, valor, vencimento, flags" },
  { n: "8", actor: "API", color: "teal", action: "Faz matching", detail: "AUTO_MATCH, REVIEW_REQUIRED, REQUEST_REUPLOAD ou UNMATCHED" },
  { n: "9", actor: "STORAGE", color: "emerald", action: "Arquiva arquivo", detail: "storageKey em bucket externo" },
  { n: "10", actor: "STAFF", color: "sky", action: "Revisa quando necessário", detail: "Inbox IA mostra summary, confidence e documento" },
  { n: "11", actor: "BOT", color: "green", action: "Confirma no WhatsApp", detail: "Cliente sabe o que foi recebido e o que falta" },
];

function Badge({ color = "teal", children }: { color?: Color; children: React.ReactNode }) {
  return <span className={`badge ${color}`}>{children}</span>;
}

function Card({ children, color = "slate", title, className = "" }: { children: React.ReactNode; color?: Color; title?: string; className?: string }) {
  return (
    <section className={`card ${color} ${className}`}>
      {title ? <div className={`card-title ${color}`}>{title}</div> : null}
      {children}
    </section>
  );
}

function Step({ n, actor, action, detail, color }: { n: string; actor: string; action: string; detail: string; color: Color }) {
  return (
    <div className="step">
      <div className={`step-number ${color}`}>{n}</div>
      <div>
        <div className="step-head">
          <Badge color={color}>{actor}</Badge>
          <strong>{action}</strong>
        </div>
        <p>{detail}</p>
      </div>
    </div>
  );
}

function OverviewSection() {
  const actors = [
    {
      role: "CLIENT",
      icon: "📱",
      tool: "WhatsApp",
      color: "green" as Color,
      actions: ["Recebe solicitação", "Envia foto/PDF", "Recebe confirmação", "Recebe lembretes"],
      note: "Único canal. Zero aprendizado.",
    },
    {
      role: "STAFF",
      icon: "🧑‍💼",
      tool: "Dashboard Web",
      color: "sky" as Color,
      actions: ["Cria solicitações", "Vê análise IA", "Aprova/rejeita", "Acompanha prazos"],
      note: "A IA pré-processa antes da equipe.",
    },
    {
      role: "ADMIN",
      icon: "👑",
      tool: "Dashboard Web",
      color: "violet" as Color,
      actions: ["Configura escritório", "Gerencia equipe", "Vê relatórios", "Configura templates"],
      note: "Visibilidade total da operação.",
    },
  ];

  return (
    <div className="stack">
      <Card color="green">
        <div className="hero-card">
          <span>💬</span>
          <div>
            <h3>Mudança de paradigma</h3>
            <p>
              O cliente não tem portal web. Toda interação acontece via WhatsApp. O sistema recebe documentos, usa IA para ler, classificar e arquivar,
              atualiza estados automaticamente e notifica o contador.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid three">
        {actors.map((actor) => (
          <Card key={actor.role} color={actor.color}>
            <div className="actor">
              <div className="actor-icon">{actor.icon}</div>
              <Badge color={actor.color}>{actor.role}</Badge>
              <div className={`muted ${actor.color}`}>{actor.tool}</div>
            </div>
            <ul className="list">
              {actor.actions.map((action) => (
                <li key={action}>▸ {action}</li>
              ))}
            </ul>
            <div className="note">{actor.note}</div>
          </Card>
        ))}
      </div>

      <Card title="Arquitetura de alto nível" color="slate">
        <div className="architecture-flow">
          <div>📱 WhatsApp</div><span>→</span><div>Provider</div><span>→</span><div>Webhook Fastify</div>
          <span>↓</span><div>🤖 AI Processor</div><span>→</span><div>Classify + Extract</div><span>→</span><div>Archive + Status</div>
          <span>↓</span><div>🔔 Resposta WhatsApp</div><span>+</span><div>Dashboard STAFF</div>
        </div>
      </Card>
    </div>
  );
}

function PipelineSection() {
  return (
    <div className="stack">
      <p className="lead">Pipeline completo desde a mensagem WhatsApp até o arquivamento e notificação.</p>
      <div className="grid two">
        {pipelineStages.map((stage) => (
          <Card key={stage.id} color={stage.color}>
            <div className="stage-head">
              <strong className={stage.color}>{stage.id}</strong>
              <span>{stage.icon}</span>
              <div>
                <h3 className={stage.color}>{stage.name}</h3>
                <p>{stage.desc}</p>
              </div>
            </div>
            <ul className="list compact">
              {stage.details.map((detail) => (
                <li key={detail}>· {detail}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
      <Card title="Tratamento de erros" color="rose">
        <div className="grid three small-text">
          <p><strong>Arquivo ilegível:</strong> pede reenvio e mantém PENDING.</p>
          <p><strong>Match incerto:</strong> cria inbox para STAFF revisar.</p>
          <p><strong>Sem solicitação:</strong> cria UnmatchedDocument e avisa recebimento.</p>
        </div>
      </Card>
    </div>
  );
}

function AiSection() {
  return (
    <div className="stack">
      <p className="lead">A IA começa mockada para não gastar API. Depois entra Claude Vision ou GPT-4o.</p>
      <div className="grid two">
        <Card title="Entrada do modelo" color="amber">
          <pre>{`Contexto:
- Office
- Cliente por telefone
- Empresas vinculadas
- Solicitações pendentes

Arquivo:
- imagem/PDF/base64

Resposta esperada:
- documentType
- competenceMonth/year
- cnpj/cpf
- totalValue
- dueDate
- confidence
- summary
- flags`}</pre>
        </Card>
        <Card title="Saída estruturada" color="emerald">
          <pre>{`{
  "documentType": "DAS",
  "competenceMonth": 4,
  "competenceYear": 2026,
  "cnpj": "12.345.678/0001-90",
  "totalValue": 1280.50,
  "confidence": 0.94,
  "summary": "Guia DAS abr/2026",
  "flags": []
}`}</pre>
        </Card>
      </div>
      <Card title="Decisão da IA" color="slate">
        <div className="decision-grid">
          <Badge color="emerald">≥ 0.75 AUTO_MATCH</Badge>
          <Badge color="amber">0.50–0.74 REVIEW_REQUIRED</Badge>
          <Badge color="rose">&lt; 0.50 REQUEST_REUPLOAD</Badge>
        </div>
      </Card>
    </div>
  );
}

function ConversationSection() {
  const states = ["IDLE", "WAITING_DOC", "PROCESSING", "CONFIRMED", "UNDER_REVIEW", "REMINDER_SENT", "OVERDUE"];
  return (
    <div className="stack">
      <p className="lead">A conversa tem estado próprio por telefone/cliente, para o bot responder com contexto.</p>
      <div className="state-line">
        {states.map((state) => <div key={state} className="state-node">{state}</div>)}
      </div>
      <Card title="Exemplo de conversa" color="green">
        <div className="chat-demo">
          <div className="bot">Olá Maria! Precisamos do DAS referente a abril/2026. Pode enviar aqui como foto ou PDF.</div>
          <div className="client">[envia imagem do guia DAS]</div>
          <div className="bot">✅ Recebi! Identifiquei DAS abr/2026, R$ 1.280,50. Ainda falta: extrato bancário e notas de serviço.</div>
        </div>
      </Card>
    </div>
  );
}

function SequenceSection() {
  return (
    <div className="stack">
      <p className="lead">Sequência ponta a ponta do pedido ao arquivamento.</p>
      <Card color="slate">
        {sequenceSteps.map((step) => <Step key={step.n} {...step} />)}
      </Card>
    </div>
  );
}

function StatesSection() {
  return (
    <div className="stack">
      <Card title="DocumentRequest" color="teal">
        <div className="flow-line">PENDING → SENT → UNDER_REVIEW → APPROVED</div>
        <div className="flow-line danger">PENDING → OVERDUE</div>
        <div className="flow-line danger">UNDER_REVIEW → REJECTED → SENT</div>
      </Card>
      <Card title="ConversationState" color="green">
        <div className="flow-line">IDLE → WAITING_DOC → PROCESSING → CONFIRMED → IDLE</div>
        <div className="flow-line danger">WAITING_DOC → REMINDER_SENT → OVERDUE</div>
      </Card>
    </div>
  );
}

function DomainSection() {
  const entities = [
    ["WhatsAppMessage", "Registro de cada mensagem recebida ou enviada."],
    ["AIAnalysis", "Resultado estruturado da análise de IA."],
    ["ConversationState", "Estado atual do bot por telefone/cliente."],
    ["UnmatchedDocument", "Documento sem solicitação correspondente."],
    ["DocumentRequest", "Solicitação contábil esperada."],
    ["DocumentFile", "Arquivo arquivado no storage externo."],
  ];
  return (
    <div className="grid two">
      {entities.map(([name, desc], index) => (
        <Card key={name} color={index % 2 === 0 ? "green" : "amber"}>
          <h3>{name}</h3>
          <p className="lead">{desc}</p>
        </Card>
      ))}
    </div>
  );
}

function JobsSection() {
  return (
    <div className="stack">
      <Card title="Jobs automáticos" color="violet">
        <ul className="list">
          <li>0 0 * * * — marca documentos, prazos e propostas vencidas.</li>
          <li>0 8 * * * — envia lembretes WhatsApp de documentos pendentes.</li>
          <li>0 6 1 * * — gera solicitações mensais e dispara pedidos.</li>
          <li>*/5 * * * * — processa fila document-analysis.</li>
        </ul>
      </Card>
    </div>
  );
}

function DeploySection() {
  const layers = [
    ["Front-end", "Vercel", "Dashboard React para STAFF/ADMIN"],
    ["API + Webhook", "Railway/Render", "Fastify com HTTPS público"],
    ["Worker", "Railway/Render", "Processamento da fila de documentos"],
    ["Redis", "Upstash/Railway", "BullMQ"],
    ["Banco", "Supabase/Neon", "PostgreSQL"],
    ["Storage", "Supabase/R2/S3", "Arquivos dos clientes"],
    ["WhatsApp", "Mock → Z-API/Evolution → Meta", "Provider plugável"],
    ["IA", "Mock → Claude/OpenAI", "Vision e extração estruturada"],
  ];
  return (
    <div className="stack">
      {layers.map(([layer, service, note]) => (
        <Card key={layer} color="slate">
          <div className="deploy-row"><Badge color="green">{layer}</Badge><strong>{service}</strong><span>{note}</span></div>
        </Card>
      ))}
    </div>
  );
}

const views: Record<SectionId, () => JSX.Element> = {
  overview: OverviewSection,
  pipeline: PipelineSection,
  ai: AiSection,
  conversation: ConversationSection,
  sequence: SequenceSection,
  states: StatesSection,
  domain: DomainSection,
  jobs: JobsSection,
  deploy: DeploySection,
};

export function App() {
  const [active, setActive] = useState<SectionId>("overview");
  const ActiveView = useMemo(() => views[active], [active]);
  const activeSection = sections.find((section) => section.id === active);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p>Valentim — UML v4 · WhatsApp-first</p>
          <h1>Sistema de Contabilidade Automatizada</h1>
        </div>
        <div className="top-badges">
          <Badge color="green">WhatsApp</Badge>
          <Badge color="amber">IA Vision</Badge>
          <Badge color="violet">Auto-archive</Badge>
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          {sections.map((section) => (
            <button
              key={section.id}
              className={active === section.id ? "nav-item active" : "nav-item"}
              onClick={() => setActive(section.id)}
              type="button"
            >
              <span>{section.icon}</span>
              <strong>{section.label}</strong>
              {section.tag ? <em>NEW</em> : null}
            </button>
          ))}
          <div className="sidebar-info">
            <small>Canal cliente</small>
            <strong>📱 WhatsApp only</strong>
            <small>Stack IA</small>
            <strong>Mock → Claude/OpenAI</strong>
          </div>
        </aside>

        <main className="content">
          <div className="page-title">
            <h2>{activeSection?.label}</h2>
            {activeSection?.tag ? <Badge color="green">NOVO</Badge> : null}
          </div>
          <ActiveView />
        </main>
      </div>
    </div>
  );
}

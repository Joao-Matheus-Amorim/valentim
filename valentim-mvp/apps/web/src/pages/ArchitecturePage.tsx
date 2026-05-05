import { useMemo, useState } from 'react';
import { architectureSections, deployLayers, pipelineStages, sequenceSteps, type ArchitectureSectionId } from '../data/architecture';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { Step } from '../components/Step';
import type { Color } from '../types/ui';

function OverviewSection() {
  const actors = [
    { role: 'CLIENT', icon: '📱', tool: 'WhatsApp', color: 'green' as Color, actions: ['Recebe solicitação', 'Envia foto/PDF', 'Recebe confirmação', 'Recebe lembretes'], note: 'Único canal. Zero aprendizado.' },
    { role: 'STAFF', icon: '🧑‍💼', tool: 'Dashboard Web', color: 'sky' as Color, actions: ['Cria solicitações', 'Vê análise IA', 'Aprova/rejeita', 'Acompanha prazos'], note: 'A IA pré-processa antes da equipe.' },
    { role: 'ADMIN', icon: '👑', tool: 'Dashboard Web', color: 'violet' as Color, actions: ['Configura escritório', 'Gerencia equipe', 'Vê relatórios', 'Configura templates'], note: 'Visibilidade total da operação.' },
  ];

  return (
    <div className="stack">
      <Card color="green">
        <div className="hero-card">
          <span>💬</span>
          <div>
            <h3>Mudança de paradigma</h3>
            <p>O cliente não tem portal web. Toda interação acontece via WhatsApp. O sistema recebe documentos, usa IA para ler, classificar e arquivar, atualiza estados automaticamente e notifica o contador.</p>
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
              {actor.actions.map((action) => <li key={action}>▸ {action}</li>)}
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
              {stage.details.map((detail) => <li key={detail}>· {detail}</li>)}
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
          <pre>{`Contexto:\n- Office\n- Cliente por telefone\n- Empresas vinculadas\n- Solicitações pendentes\n\nArquivo:\n- imagem/PDF/base64\n\nResposta esperada:\n- documentType\n- competenceMonth/year\n- cnpj/cpf\n- totalValue\n- dueDate\n- confidence\n- summary\n- flags`}</pre>
        </Card>
        <Card title="Saída estruturada" color="emerald">
          <pre>{`{\n  "documentType": "DAS",\n  "competenceMonth": 4,\n  "competenceYear": 2026,\n  "cnpj": "12.345.678/0001-90",\n  "totalValue": 1280.50,\n  "confidence": 0.94,\n  "summary": "Guia DAS abr/2026",\n  "flags": []\n}`}</pre>
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
  const states = ['IDLE', 'WAITING_DOC', 'PROCESSING', 'CONFIRMED', 'UNDER_REVIEW', 'REMINDER_SENT', 'OVERDUE'];
  return (
    <div className="stack">
      <p className="lead">A conversa tem estado próprio por telefone/cliente, para o bot responder com contexto.</p>
      <div className="state-line">{states.map((state) => <div key={state} className="state-node">{state}</div>)}</div>
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
  return <div className="stack"><p className="lead">Sequência ponta a ponta do pedido ao arquivamento.</p><Card color="slate">{sequenceSteps.map((step) => <Step key={step.n} {...step} />)}</Card></div>;
}

function StatesSection() {
  return (
    <div className="stack">
      <Card title="DocumentRequest" color="teal"><div className="flow-line">PENDING → SENT → UNDER_REVIEW → APPROVED</div><div className="flow-line danger">PENDING → OVERDUE</div><div className="flow-line danger">UNDER_REVIEW → REJECTED → SENT</div></Card>
      <Card title="ConversationState" color="green"><div className="flow-line">IDLE → WAITING_DOC → PROCESSING → CONFIRMED → IDLE</div><div className="flow-line danger">WAITING_DOC → REMINDER_SENT → OVERDUE</div></Card>
    </div>
  );
}

function DomainSection() {
  const entities = [
    ['WhatsAppMessage', 'Registro de cada mensagem recebida ou enviada.'],
    ['AIAnalysis', 'Resultado estruturado da análise de IA.'],
    ['ConversationState', 'Estado atual do bot por telefone/cliente.'],
    ['UnmatchedDocument', 'Documento sem solicitação correspondente.'],
    ['DocumentRequest', 'Solicitação contábil esperada.'],
    ['DocumentFile', 'Arquivo arquivado no storage externo.'],
  ];
  return <div className="grid two">{entities.map(([name, desc], index) => <Card key={name} color={index % 2 === 0 ? 'green' : 'amber'}><h3>{name}</h3><p className="lead">{desc}</p></Card>)}</div>;
}

function JobsSection() {
  return <div className="stack"><Card title="Jobs automáticos" color="violet"><ul className="list"><li>0 0 * * * — marca documentos, prazos e propostas vencidas.</li><li>0 8 * * * — envia lembretes WhatsApp de documentos pendentes.</li><li>0 6 1 * * — gera solicitações mensais e dispara pedidos.</li><li>*/5 * * * * — processa fila document-analysis.</li></ul></Card></div>;
}

function DeploySection() {
  return <div className="stack">{deployLayers.map(([layer, service, note]) => <Card key={layer} color="slate"><div className="deploy-row"><Badge color="green">{layer}</Badge><strong>{service}</strong><span>{note}</span></div></Card>)}</div>;
}

const views: Record<ArchitectureSectionId, () => JSX.Element> = {
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

export function ArchitecturePage() {
  const [active, setActive] = useState<ArchitectureSectionId>('overview');
  const ActiveView = useMemo(() => views[active], [active]);
  const activeSection = architectureSections.find((section) => section.id === active);

  return (
    <div className="stack">
      <div className="page-title"><h2>Arquitetura Valentim</h2><Badge color="green">WhatsApp-first</Badge></div>
      <div className="tabs-row">
        {architectureSections.map((section) => (
          <button key={section.id} className={active === section.id ? 'tab-pill active' : 'tab-pill'} onClick={() => setActive(section.id)} type="button">
            <span>{section.icon}</span>{section.label}
          </button>
        ))}
      </div>
      <div className="page-title compact"><h2>{activeSection?.label}</h2>{activeSection?.tag ? <Badge color="green">{activeSection.tag}</Badge> : null}</div>
      <ActiveView />
    </div>
  );
}

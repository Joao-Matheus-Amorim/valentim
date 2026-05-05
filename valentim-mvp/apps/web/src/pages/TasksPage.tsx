import { Badge } from '../components/Badge';
import { Card } from '../components/Card';

const taskQueue = [
  { title: 'Cobrar DAS de abril', client: 'Padaria do Joao', priority: 'Urgente', status: 'Aguardando cliente' },
  { title: 'Revisar documento analisado pela IA', client: 'Clinica Santa Luzia', priority: 'Alta', status: 'Aguardando revisao' },
  { title: 'Enviar proposta de consultoria', client: 'Oficina Almeida', priority: 'Media', status: 'Pendente' },
  { title: 'Conferir cobranca vencida', client: 'Mercado Central', priority: 'Alta', status: 'Em andamento' },
];

export function TasksPage() {
  return (
    <div className="stack">
      <div className="page-title">
        <h2>Tarefas Inteligentes</h2>
        <Badge color="green">Central operacional</Badge>
      </div>

      <Card color="green">
        <div className="hero-card">
          <span>✓</span>
          <div>
            <h3>O que o escritorio precisa fazer agora</h3>
            <p>Este modulo transforma documentos pendentes, mensagens do WhatsApp, analises da IA, prazos e cobrancas em uma fila clara de trabalho para a equipe.</p>
          </div>
        </div>
      </Card>

      <div className="grid four">
        <Card color="amber" title="Pendentes"><div className="metric">12</div><p>Tarefas abertas aguardando acao.</p></Card>
        <Card color="rose" title="Criticas"><div className="metric">3</div><p>Itens vencidos ou proximos do prazo.</p></Card>
        <Card color="violet" title="IA"><div className="metric">5</div><p>Analises que exigem revisao humana.</p></Card>
        <Card color="emerald" title="Concluidas"><div className="metric">18</div><p>Tarefas finalizadas nesta semana.</p></Card>
      </div>

      <Card title="Fila prioritaria de hoje" color="slate">
        <div className="table-list">
          {taskQueue.map((task) => (
            <div className="table-row" key={task.title}>
              <strong>{task.title}</strong>
              <span>{task.client}</span>
              <Badge color={task.priority === 'Urgente' ? 'rose' : task.priority === 'Alta' ? 'amber' : 'sky'}>{task.priority}</Badge>
              <span>{task.status}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid two">
        <Card title="Gatilhos automaticos" color="violet">
          <ul className="list">
            <li>▸ Documento pendente perto do vencimento cria tarefa de cobranca.</li>
            <li>▸ IA com baixa confianca cria tarefa de revisao.</li>
            <li>▸ Mensagem WhatsApp sem resposta cria tarefa de atendimento.</li>
            <li>▸ Cobranca vencida cria tarefa financeira.</li>
          </ul>
        </Card>
        <Card title="API preparada" color="green">
          <ul className="list">
            <li>▸ GET /api/tasks</li>
            <li>▸ POST /api/tasks</li>
            <li>▸ PUT /api/tasks/:id</li>
            <li>▸ DELETE /api/tasks/:id</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

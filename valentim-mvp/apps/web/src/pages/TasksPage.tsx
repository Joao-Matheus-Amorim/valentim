import { useEffect, useMemo, useState } from 'react';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { api } from '../services/api';
import type { Color } from '../types/ui';
import './TasksPage.css';

interface Task {
  id?: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  source?: string;
  dueDate?: string | null;
  clientId?: string | null;
  companyId?: string | null;
}

const fallbackTasks: Task[] = [
  { title: 'Cobrar DAS de abril', priority: 'URGENT', status: 'WAITING_CLIENT', source: 'document' },
  { title: 'Revisar documento analisado pela IA', priority: 'HIGH', status: 'WAITING_REVIEW', source: 'ai' },
  { title: 'Enviar proposta de consultoria', priority: 'MEDIUM', status: 'PENDING', source: 'proposal' },
  { title: 'Conferir cobranca vencida', priority: 'HIGH', status: 'IN_PROGRESS', source: 'finance' },
];

function priorityLabel(priority: string) {
  const labels: Record<string, string> = { LOW: 'Baixa', MEDIUM: 'Media', HIGH: 'Alta', URGENT: 'Urgente' };
  return labels[priority] || priority;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: 'Pendente',
    IN_PROGRESS: 'Em andamento',
    WAITING_CLIENT: 'Aguardando cliente',
    WAITING_DOCUMENT: 'Aguardando documento',
    WAITING_REVIEW: 'Aguardando revisao',
    DONE: 'Concluida',
    OVERDUE: 'Atrasada',
    CANCELED: 'Cancelada',
  };
  return labels[status] || status;
}

function priorityColor(priority: string): Color {
  if (priority === 'URGENT') return 'rose';
  if (priority === 'HIGH') return 'amber';
  if (priority === 'LOW') return 'slate';
  return 'sky';
}

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(fallbackTasks);
  const [source, setSource] = useState<'api' | 'fallback'>('fallback');

  useEffect(() => {
    api.get<Task[]>('/tasks')
      .then((response) => {
        if (Array.isArray(response.data)) {
          setTasks(response.data.length ? response.data : fallbackTasks);
          setSource(response.data.length ? 'api' : 'fallback');
        }
      })
      .catch(() => setSource('fallback'));
  }, []);

  const metrics = useMemo(() => {
    const pending = tasks.filter((task) => !['DONE', 'CANCELED'].includes(task.status)).length;
    const urgent = tasks.filter((task) => task.priority === 'URGENT' || task.status === 'OVERDUE').length;
    const review = tasks.filter((task) => task.status === 'WAITING_REVIEW' || task.source === 'ai').length;
    const done = tasks.filter((task) => task.status === 'DONE').length;
    return { pending, urgent, review, done };
  }, [tasks]);

  return (
    <div className="stack">
      <div className="page-title">
        <h2>Tarefas Inteligentes</h2>
        <Badge color="green">Central operacional</Badge>
        {source === 'fallback' ? <Badge color="amber">Demo ate migration</Badge> : <Badge color="emerald">API ativa</Badge>}
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
        <Card color="amber" title="Pendentes"><div className="metric">{metrics.pending}</div><p>Tarefas abertas aguardando acao.</p></Card>
        <Card color="rose" title="Criticas"><div className="metric">{metrics.urgent}</div><p>Itens vencidos ou proximos do prazo.</p></Card>
        <Card color="violet" title="IA"><div className="metric">{metrics.review}</div><p>Analises que exigem revisao humana.</p></Card>
        <Card color="emerald" title="Concluidas"><div className="metric">{metrics.done}</div><p>Tarefas finalizadas.</p></Card>
      </div>

      <Card title="Fila prioritaria de hoje" color="slate">
        <div className="table-list">
          {tasks.map((task, index) => (
            <div className="table-row" key={task.id || `${task.title}-${index}`}>
              <strong>{task.title}</strong>
              <span>{task.source || 'manual'}</span>
              <Badge color={priorityColor(task.priority)}>{priorityLabel(task.priority)}</Badge>
              <span>{statusLabel(task.status)}</span>
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

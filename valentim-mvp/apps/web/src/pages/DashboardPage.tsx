import { useEffect, useMemo, useState } from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { listTasks } from '../services/tasks';
import type { Task } from '../types/task';
import './DashboardPage.css';

function isFinished(task: Task) {
  return task.status === 'DONE' || task.status === 'CANCELED';
}

function isOverdue(task: Task) {
  if (!task.dueDate || isFinished(task)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(task.dueDate);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate < today;
}

function formatDate(value?: string | null) {
  if (!value) return 'Sem prazo';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Prazo inválido';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [tasksError, setTasksError] = useState(false);

  useEffect(() => {
    listTasks()
      .then((data) => {
        setTasks(data);
        setTasksError(false);
      })
      .catch(() => setTasksError(true))
      .finally(() => setLoadingTasks(false));
  }, []);

  const metrics = useMemo(() => {
    const open = tasks.filter((task) => !isFinished(task)).length;
    const critical = tasks.filter((task) => task.priority === 'URGENT' || task.status === 'OVERDUE' || isOverdue(task)).length;
    const review = tasks.filter((task) => task.status === 'WAITING_REVIEW' || task.source === 'ai').length;
    const done = tasks.filter((task) => task.status === 'DONE').length;
    return { open, critical, review, done };
  }, [tasks]);

  const priorityTasks = useMemo(() => {
    return tasks
      .filter((task) => !isFinished(task))
      .sort((first, second) => {
        const priorityWeight: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        const firstWeight = priorityWeight[first.priority] ?? 4;
        const secondWeight = priorityWeight[second.priority] ?? 4;
        if (firstWeight !== secondWeight) return firstWeight - secondWeight;
        return new Date(first.dueDate || '2999-12-31').getTime() - new Date(second.dueDate || '2999-12-31').getTime();
      })
      .slice(0, 5);
  }, [tasks]);

  return (
    <div className="stack dashboard-page">
      <div className="page-title dashboard-title">
        <div>
          <h2>Dashboard Operacional</h2>
          <p className="lead">Visão executiva do que exige ação agora no escritório.</p>
        </div>
        <Badge color="green">MVP operacional</Badge>
      </div>

      <div className="grid four">
        <Card color="amber" title="Tarefas abertas"><div className="metric">{metrics.open}</div><p>Itens aguardando ação da equipe.</p></Card>
        <Card color="rose" title="Críticas"><div className="metric">{metrics.critical}</div><p>Urgentes, vencidas ou em risco.</p></Card>
        <Card color="violet" title="Revisão IA"><div className="metric">{metrics.review}</div><p>Triagens e análises que precisam de humano.</p></Card>
        <Card color="emerald" title="Concluídas"><div className="metric">{metrics.done}</div><p>Tarefas finalizadas na fila atual.</p></Card>
      </div>

      <div className="grid two">
        <Card title="Fila crítica do dia" color="slate">
          {loadingTasks ? <p className="lead">Carregando tarefas...</p> : null}
          {tasksError ? <p className="lead">Não foi possível carregar tarefas. Verifique API/token.</p> : null}
          {!loadingTasks && !tasksError && priorityTasks.length === 0 ? <p className="lead">Nenhuma tarefa crítica ou aberta encontrada.</p> : null}
          {!loadingTasks && !tasksError && priorityTasks.length > 0 ? (
            <div className="dashboard-priority-list">
              {priorityTasks.map((task) => (
                <div className="dashboard-priority-item" key={task.id}>
                  <div>
                    <strong>{task.title}</strong>
                    <span>{task.source || 'manual'} · {formatDate(task.dueDate)}</span>
                  </div>
                  <Badge color={task.priority === 'URGENT' ? 'rose' : task.priority === 'HIGH' ? 'amber' : 'sky'}>{task.priority}</Badge>
                </div>
              ))}
            </div>
          ) : null}
        </Card>

        <Card title="Próxima evolução do produto" color="green">
          <ul className="list">
            <li>▸ Conectar documentos pendentes à criação automática de tarefas.</li>
            <li>▸ Criar alertas por prazo, vencimento e prioridade.</li>
            <li>▸ Enviar lembretes WhatsApp com base nas tarefas abertas.</li>
            <li>▸ Criar painel “O que fazer agora?” por usuário responsável.</li>
          </ul>
        </Card>
      </div>

      <Card title="Fluxo operacional Valentim" color="slate">
        <div className="dashboard-flow">
          <span>Cliente envia no WhatsApp</span>
          <strong>→</strong>
          <span>IA classifica</span>
          <strong>→</strong>
          <span>Sistema cria tarefa</span>
          <strong>→</strong>
          <span>Equipe executa</span>
          <strong>→</strong>
          <span>Dashboard acompanha</span>
        </div>
      </Card>
    </div>
  );
}

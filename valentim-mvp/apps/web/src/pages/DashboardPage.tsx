import { useMemo } from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { useTasks } from '../context/TasksContext';
import { isFinished, isOverdue } from '../utils/task';
import { formatDate } from '../utils/format';
import type { Task } from '../types/task';
import './DashboardPage.css';

export function DashboardPage() {
  const { tasks, metrics, loading, error, refreshTasks } = useTasks();

  const priorityTasks = useMemo(() => {
    return tasks
      .filter((task) => !isFinished(task))
      .sort((a, b) => {
        const w: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        const wa = w[a.priority] ?? 4;
        const wb = w[b.priority] ?? 4;
        if (wa !== wb) return wa - wb;
        return new Date(a.dueDate || '2999-12-31').getTime() - new Date(b.dueDate || '2999-12-31').getTime();
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
        <div className="dashboard-actions">
          <Badge color="green">MVP operacional</Badge>
          <button className="dashboard-refresh" type="button" onClick={refreshTasks}>Atualizar</button>
        </div>
      </div>

      <div className="grid four">
        <Card color="amber" title="Tarefas abertas"><div className="metric">{metrics.open}</div><p>Itens aguardando ação da equipe.</p></Card>
        <Card color="rose" title="Críticas"><div className="metric">{metrics.critical}</div><p>Urgentes, vencidas ou em risco.</p></Card>
        <Card color="violet" title="Revisão IA"><div className="metric">{metrics.review}</div><p>Triagens e análises que precisam de humano.</p></Card>
        <Card color="emerald" title="Concluídas"><div className="metric">{metrics.done}</div><p>Tarefas finalizadas na fila atual.</p></Card>
      </div>

      <div className="grid two">
        <Card title="Fila crítica do dia" color="slate">
          {loading ? <p className="lead">Carregando tarefas...</p> : null}
          {error ? <p className="lead">{error}</p> : null}
          {!loading && !error && priorityTasks.length === 0
            ? <p className="lead">Nenhuma tarefa crítica ou aberta encontrada.</p>
            : null}
          {!loading && !error && priorityTasks.length > 0 ? (
            <div className="dashboard-priority-list">
              {priorityTasks.map((task: Task) => (
                <div className={`dashboard-priority-item${isOverdue(task) ? ' overdue' : ''}`} key={task.id}>
                  <div>
                    <strong>{task.title}</strong>
                    <span>{task.source || 'manual'} · {formatDate(task.dueDate)}</span>
                  </div>
                  <Badge color={task.priority === 'URGENT' ? 'rose' : task.priority === 'HIGH' ? 'amber' : 'sky'}>
                    {task.priority}
                  </Badge>
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
            <li>▸ Criar painel "O que fazer agora?" por usuário responsável.</li>
          </ul>
        </Card>
      </div>

      <Card title="Fluxo operacional Valentim" color="slate">
        <div className="dashboard-flow">
          <span>Cliente envia no WhatsApp</span><strong>→</strong>
          <span>IA classifica</span><strong>→</strong>
          <span>Sistema cria tarefa</span><strong>→</strong>
          <span>Equipe executa</span><strong>→</strong>
          <span>Dashboard acompanha</span>
        </div>
      </Card>
    </div>
  );
}

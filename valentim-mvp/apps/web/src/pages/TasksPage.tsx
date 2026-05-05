import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { completeTask, createTask, listTasks, updateTask } from '../services/tasks';
import type { Color } from '../types/ui';
import type { CreateTaskInput, Task, TaskFilters, TaskPriority, TaskStatus } from '../types/task';
import { TASK_PRIORITIES, TASK_SOURCES, TASK_STATUSES } from '../types/task';
import './TasksPage.css';

const initialForm: CreateTaskInput = {
  title: '',
  description: '',
  status: 'PENDING',
  priority: 'MEDIUM',
  source: 'manual',
  dueDate: ''
};

const statusLabels = Object.fromEntries(TASK_STATUSES.map((item) => [item.value, item.label]));
const priorityLabels = Object.fromEntries(TASK_PRIORITIES.map((item) => [item.value, item.label]));

function priorityColor(priority: TaskPriority): Color {
  if (priority === 'URGENT') return 'rose';
  if (priority === 'HIGH') return 'amber';
  if (priority === 'LOW') return 'slate';
  return 'sky';
}

function statusColor(status: TaskStatus): Color {
  if (status === 'DONE') return 'emerald';
  if (status === 'OVERDUE' || status === 'CANCELED') return 'rose';
  if (status === 'WAITING_REVIEW') return 'violet';
  if (status === 'WAITING_CLIENT' || status === 'WAITING_DOCUMENT') return 'amber';
  if (status === 'IN_PROGRESS') return 'sky';
  return 'slate';
}

function formatDate(value?: string | null) {
  if (!value) return 'Sem prazo';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Prazo inválido';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

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

function isDueToday(task: Task) {
  if (!task.dueDate || isFinished(task)) return false;
  const today = new Date();
  const dueDate = new Date(task.dueDate);
  return today.toDateString() === dueDate.toDateString();
}

function normalizeTaskPayload(form: CreateTaskInput): CreateTaskInput {
  return {
    ...form,
    title: form.title.trim(),
    description: form.description?.trim() || null,
    dueDate: form.dueDate || null,
    source: form.source || 'manual',
    status: form.status || 'PENDING',
    priority: form.priority || 'MEDIUM'
  };
}

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filters, setFilters] = useState<TaskFilters>({ status: 'ALL', priority: 'ALL', source: 'ALL' });
  const [form, setForm] = useState<CreateTaskInput>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadTasks(nextFilters = filters) {
    setLoading(true);
    setError(null);
    try {
      const data = await listTasks(nextFilters);
      setTasks(data);
    } catch (err) {
      setError('Não foi possível carregar as tarefas. Verifique se a API está rodando e se o login/token estão configurados.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const sourceOk = !filters.source || filters.source === 'ALL' || task.source === filters.source;
      return sourceOk;
    });
  }, [tasks, filters.source]);

  const metrics = useMemo(() => {
    const open = filteredTasks.filter((task) => !isFinished(task)).length;
    const critical = filteredTasks.filter((task) => task.priority === 'URGENT' || task.status === 'OVERDUE' || isOverdue(task)).length;
    const review = filteredTasks.filter((task) => task.status === 'WAITING_REVIEW' || task.source === 'ai').length;
    const done = filteredTasks.filter((task) => task.status === 'DONE').length;
    return { open, critical, review, done };
  }, [filteredTasks]);

  async function handleFilterChange(nextFilters: TaskFilters) {
    setFilters(nextFilters);
    await loadTasks(nextFilters);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const payload = normalizeTaskPayload(form);

    if (!payload.title) {
      setError('Informe um título para criar a tarefa.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const created = await createTask(payload);
      setTasks((current) => [created, ...current]);
      setForm(initialForm);
    } catch (err) {
      setError('Não foi possível criar a tarefa. Confira os dados e tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(task: Task, status: TaskStatus) {
    setError(null);
    try {
      const updated = await updateTask(task.id, { status });
      setTasks((current) => current.map((item) => (item.id === task.id ? updated : item)));
    } catch (err) {
      setError('Não foi possível atualizar o status da tarefa.');
    }
  }

  async function handleComplete(task: Task) {
    setError(null);
    try {
      const updated = await completeTask(task.id);
      setTasks((current) => current.map((item) => (item.id === task.id ? updated : item)));
    } catch (err) {
      setError('Não foi possível concluir a tarefa.');
    }
  }

  return (
    <div className="stack tasks-page">
      <div className="page-title tasks-title">
        <div>
          <h2>Tarefas Inteligentes</h2>
          <p className="lead">Central operacional para transformar pendências, WhatsApp, IA, prazos e financeiro em trabalho executável.</p>
        </div>
        <Badge color="green">Operacional</Badge>
      </div>

      {error ? <div className="tasks-alert">{error}</div> : null}

      <div className="grid four">
        <Card color="amber" title="Abertas"><div className="metric">{metrics.open}</div><p>Tarefas que ainda exigem ação.</p></Card>
        <Card color="rose" title="Críticas"><div className="metric">{metrics.critical}</div><p>Urgentes, atrasadas ou vencendo.</p></Card>
        <Card color="violet" title="Revisão IA"><div className="metric">{metrics.review}</div><p>Análises que precisam de humano.</p></Card>
        <Card color="emerald" title="Concluídas"><div className="metric">{metrics.done}</div><p>Finalizadas no fluxo atual.</p></Card>
      </div>

      <div className="grid two tasks-workspace">
        <Card title="Criar nova tarefa" color="green">
          <form className="task-form" onSubmit={handleSubmit}>
            <label>
              Título
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ex.: Cobrar DAS de abril" />
            </label>

            <label>
              Descrição
              <textarea value={form.description || ''} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Contexto, instruções ou observações para a equipe" />
            </label>

            <div className="task-form-grid">
              <label>
                Prioridade
                <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as TaskPriority })}>
                  {TASK_PRIORITIES.map((priority) => <option key={priority.value} value={priority.value}>{priority.label}</option>)}
                </select>
              </label>

              <label>
                Origem
                <select value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })}>
                  {TASK_SOURCES.map((source) => <option key={source} value={source}>{source}</option>)}
                </select>
              </label>
            </div>

            <div className="task-form-grid">
              <label>
                Status inicial
                <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as TaskStatus })}>
                  {TASK_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                </select>
              </label>

              <label>
                Prazo
                <input type="date" value={form.dueDate || ''} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} />
              </label>
            </div>

            <button className="task-primary-button" type="submit" disabled={saving}>{saving ? 'Criando...' : 'Criar tarefa'}</button>
          </form>
        </Card>

        <Card title="Filtros operacionais" color="slate">
          <div className="task-filters">
            <label>
              Status
              <select value={filters.status || 'ALL'} onChange={(event) => handleFilterChange({ ...filters, status: event.target.value as TaskStatus | 'ALL' })}>
                <option value="ALL">Todos</option>
                {TASK_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
              </select>
            </label>

            <label>
              Prioridade
              <select value={filters.priority || 'ALL'} onChange={(event) => handleFilterChange({ ...filters, priority: event.target.value as TaskPriority | 'ALL' })}>
                <option value="ALL">Todas</option>
                {TASK_PRIORITIES.map((priority) => <option key={priority.value} value={priority.value}>{priority.label}</option>)}
              </select>
            </label>

            <label>
              Origem
              <select value={filters.source || 'ALL'} onChange={(event) => setFilters({ ...filters, source: event.target.value })}>
                <option value="ALL">Todas</option>
                {TASK_SOURCES.map((source) => <option key={source} value={source}>{source}</option>)}
              </select>
            </label>

            <button className="task-secondary-button" type="button" onClick={() => handleFilterChange({ status: 'ALL', priority: 'ALL', source: 'ALL' })}>Limpar filtros</button>
          </div>
        </Card>
      </div>

      <Card title="Fila de execução" color="slate">
        {loading ? <p className="lead">Carregando tarefas...</p> : null}

        {!loading && filteredTasks.length === 0 ? (
          <div className="tasks-empty">
            <strong>Nenhuma tarefa encontrada.</strong>
            <span>Crie a primeira tarefa ou ajuste os filtros para visualizar a fila.</span>
          </div>
        ) : null}

        {!loading && filteredTasks.length > 0 ? (
          <div className="tasks-list">
            {filteredTasks.map((task) => (
              <article className={isOverdue(task) ? 'task-card overdue' : 'task-card'} key={task.id}>
                <div className="task-card-main">
                  <div className="task-card-head">
                    <strong>{task.title}</strong>
                    <div className="task-badges">
                      <Badge color={priorityColor(task.priority)}>{priorityLabels[task.priority]}</Badge>
                      <Badge color={statusColor(task.status)}>{statusLabels[task.status]}</Badge>
                    </div>
                  </div>
                  {task.description ? <p>{task.description}</p> : null}
                  <div className="task-meta">
                    <span>Origem: {task.source || 'manual'}</span>
                    <span>Prazo: {formatDate(task.dueDate)}</span>
                    {isDueToday(task) ? <span className="task-due-today">vence hoje</span> : null}
                    {isOverdue(task) ? <span className="task-overdue">atrasada</span> : null}
                  </div>
                </div>

                <div className="task-card-actions">
                  <select value={task.status} onChange={(event) => handleStatusChange(task, event.target.value as TaskStatus)}>
                    {TASK_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                  </select>
                  <button type="button" onClick={() => handleComplete(task)} disabled={task.status === 'DONE'}>Concluir</button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </Card>
    </div>
  );
}

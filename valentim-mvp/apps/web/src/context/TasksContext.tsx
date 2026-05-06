import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { completeTask as completeTaskRequest, createTask as createTaskRequest, listTasks, updateTask as updateTaskRequest } from '../services/tasks';
import { isFinished, isOverdue } from '../utils/task';
import type { CreateTaskInput, Task, TaskStatus, UpdateTaskInput } from '../types/task';

interface ToastState {
  type: 'success' | 'error';
  message: string;
}

interface TaskMetrics {
  open: number;
  critical: number;
  review: number;
  done: number;
}

interface TasksContextValue {
  tasks: Task[];
  metrics: TaskMetrics;
  loading: boolean;
  error: string | null;
  toast: ToastState | null;
  loadTasks: (force?: boolean) => Promise<void>;
  refreshTasks: () => Promise<void>;
  createTask: (input: CreateTaskInput) => Promise<Task | null>;
  updateTask: (id: string, input: UpdateTaskInput) => Promise<Task | null>;
  changeTaskStatus: (id: string, status: TaskStatus) => Promise<Task | null>;
  completeTask: (id: string) => Promise<Task | null>;
  clearToast: () => void;
}

const TasksContext = createContext<TasksContextValue | null>(null);

function getTaskMetrics(tasks: Task[]): TaskMetrics {
  return {
    open: tasks.filter((task) => !isFinished(task)).length,
    critical: tasks.filter((task) => task.priority === 'URGENT' || task.status === 'OVERDUE' || isOverdue(task)).length,
    review: tasks.filter((task) => task.status === 'WAITING_REVIEW' || task.source === 'ai').length,
    done: tasks.filter((task) => task.status === 'DONE').length
  };
}

function sortTasks(tasks: Task[]) {
  const priorityWeight: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  return [...tasks].sort((first, second) => {
    const finishedDiff = Number(isFinished(first)) - Number(isFinished(second));
    if (finishedDiff !== 0) return finishedDiff;
    const fw = priorityWeight[first.priority] ?? 4;
    const sw = priorityWeight[second.priority] ?? 4;
    if (fw !== sw) return fw - sw;
    return new Date(first.dueDate || '2999-12-31').getTime() - new Date(second.dueDate || '2999-12-31').getTime();
  });
}

export function TasksProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const hasLoadedRef = useRef(false);
  const inFlightRef = useRef<Promise<void> | null>(null);

  const showToast = useCallback((next: ToastState) => {
    setToast(next);
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const loadTasks = useCallback(async (force = false) => {
    if (inFlightRef.current) return inFlightRef.current;
    if (hasLoadedRef.current && !force) return;
    setLoading(true);
    setError(null);
    const request = listTasks()
      .then((data) => { setTasks(sortTasks(data)); hasLoadedRef.current = true; })
      .catch(() => { setError('Não foi possível carregar as tarefas.'); })
      .finally(() => { setLoading(false); inFlightRef.current = null; });
    inFlightRef.current = request;
    return request;
  }, []);

  const refreshTasks = useCallback(() => loadTasks(true), [loadTasks]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const createTask = useCallback(async (input: CreateTaskInput) => {
    setError(null);
    try {
      const created = await createTaskRequest(input);
      setTasks((cur) => sortTasks([created, ...cur]));
      showToast({ type: 'success', message: 'Tarefa criada com sucesso.' });
      return created;
    } catch {
      setError('Não foi possível criar a tarefa.');
      showToast({ type: 'error', message: 'Erro ao criar tarefa.' });
      return null;
    }
  }, [showToast]);

  const updateTask = useCallback(async (id: string, input: UpdateTaskInput) => {
    setError(null);
    try {
      const updated = await updateTaskRequest(id, input);
      setTasks((cur) => sortTasks(cur.map((t) => (t.id === id ? updated : t))));
      showToast({ type: 'success', message: 'Tarefa atualizada.' });
      return updated;
    } catch {
      setError('Não foi possível atualizar a tarefa.');
      showToast({ type: 'error', message: 'Erro ao atualizar tarefa.' });
      return null;
    }
  }, [showToast]);

  const changeTaskStatus = useCallback((id: string, status: TaskStatus) => updateTask(id, { status }), [updateTask]);

  const completeTask = useCallback(async (id: string) => {
    setError(null);
    try {
      const updated = await completeTaskRequest(id);
      setTasks((cur) => sortTasks(cur.map((t) => (t.id === id ? updated : t))));
      showToast({ type: 'success', message: 'Tarefa concluída.' });
      return updated;
    } catch {
      setError('Não foi possível concluir a tarefa.');
      showToast({ type: 'error', message: 'Erro ao concluir tarefa.' });
      return null;
    }
  }, [showToast]);

  const value = useMemo<TasksContextValue>(() => ({
    tasks, metrics: getTaskMetrics(tasks), loading, error, toast,
    loadTasks, refreshTasks, createTask, updateTask, changeTaskStatus, completeTask,
    clearToast: () => setToast(null)
  }), [tasks, loading, error, toast, loadTasks, refreshTasks, createTask, updateTask, changeTaskStatus, completeTask]);

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks() {
  const context = useContext(TasksContext);
  if (!context) throw new Error('useTasks must be used inside TasksProvider');
  return context;
}

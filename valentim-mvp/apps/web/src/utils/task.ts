import type { Task } from '../types/task';

export function isFinished(task: Task) {
  return task.status === 'DONE' || task.status === 'CANCELED';
}

export function isOverdue(task: Task) {
  if (!task.dueDate || isFinished(task)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(task.dueDate);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate < today;
}

export function isDueToday(task: Task) {
  if (!task.dueDate || isFinished(task)) return false;
  const today = new Date();
  const dueDate = new Date(task.dueDate);
  return today.toDateString() === dueDate.toDateString();
}

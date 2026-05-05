import type { NavItem } from '../types/ui';

export const navigationItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '▣' },
  { id: 'tasks', label: 'Tarefas', icon: '✓', tag: 'NOVO' },
  { id: 'architecture', label: 'Arquitetura', icon: '⬡' },
  { id: 'clients', label: 'Clientes', icon: '◔' },
  { id: 'companies', label: 'Empresas', icon: '▦' },
  { id: 'documents', label: 'Documentos', icon: '▤' },
  { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { id: 'review', label: 'Triagem IA', icon: '◈' },
  { id: 'deadlines', label: 'Prazos', icon: '⏱' },
  { id: 'finance', label: 'Financeiro', icon: 'R$' },
  { id: 'proposals', label: 'Propostas', icon: '✦' },
];

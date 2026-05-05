import type { ReactNode } from 'react';
import type { AppSectionId, NavItem } from '../types/ui';
import { Badge } from './Badge';

interface AppShellProps {
  active: AppSectionId;
  items: NavItem[];
  onNavigate: (section: AppSectionId) => void;
  children: ReactNode;
}

export function AppShell({ active, items, onNavigate, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p>Valentim · WhatsApp-first</p>
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
          {items.map((item) => (
            <button key={item.id} className={active === item.id ? 'nav-item active' : 'nav-item'} onClick={() => onNavigate(item.id)} type="button">
              <span>{item.icon}</span>
              <strong>{item.label}</strong>
              {item.tag ? <em>{item.tag}</em> : null}
            </button>
          ))}
          <div className="sidebar-info">
            <small>Canal cliente</small>
            <strong>📱 WhatsApp only</strong>
            <small>Stack IA</small>
            <strong>Mock → Claude/OpenAI</strong>
          </div>
        </aside>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}

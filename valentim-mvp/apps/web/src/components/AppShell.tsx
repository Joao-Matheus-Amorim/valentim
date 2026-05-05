import type { ReactNode } from 'react';
import type { AuthUser } from '../types/auth';
import type { AppSectionId, NavItem } from '../types/ui';
import { Badge } from './Badge';
import './AppShell.css';

interface AppShellProps {
  active: AppSectionId;
  items: NavItem[];
  user: AuthUser;
  onNavigate: (section: AppSectionId) => void;
  onLogout: () => void;
  children: ReactNode;
}

export function AppShell({ active, items, user, onNavigate, onLogout, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p>Valentim · WhatsApp-first</p>
          <h1>Sistema de Contabilidade Automatizada</h1>
        </div>
        <div className="topbar-actions">
          <div className="user-pill">
            <strong>{user.name}</strong>
            <span>{user.role}</span>
          </div>
          <div className="top-badges">
            <Badge color="green">WhatsApp</Badge>
            <Badge color="amber">IA Vision</Badge>
            <Badge color="violet">Auto-archive</Badge>
          </div>
          <button className="logout-button" type="button" onClick={onLogout}>Sair</button>
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
            <small>Usuário</small>
            <strong>{user.email}</strong>
          </div>
        </aside>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}

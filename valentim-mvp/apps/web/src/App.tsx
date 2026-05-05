import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from './components/AppShell';
import { Card } from './components/Card';
import { navigationItems } from './data/navigation';
import { getStoredToken } from './services/api';
import { getMe, logout } from './services/auth';
import { ArchitecturePage } from './pages/ArchitecturePage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { ModulePlaceholderPage } from './pages/ModulePlaceholderPage';
import { TasksPage } from './pages/TasksPage';
import type { AuthUser } from './types/auth';
import type { AppSectionId } from './types/ui';

const modulePages: Record<Exclude<AppSectionId, 'dashboard' | 'architecture' | 'tasks'>, JSX.Element> = {
  clients: <ModulePlaceholderPage title="Clientes" badge="Operacao" color="green" description="Central para cadastrar e acompanhar clientes do escritorio, telefones e empresas vinculadas." nextSteps={['Consumir GET /api/clients.', 'Adicionar criacao e edicao de cliente.', 'Exibir empresas e pendencias por cliente.']} />,
  companies: <ModulePlaceholderPage title="Empresas" badge="Cadastro" color="sky" description="Area para visualizar empresas vinculadas aos clientes, CNPJ, regime tributario e documentos esperados." nextSteps={['Consumir GET /api/companies.', 'Criar formulario de nova empresa.', 'Mostrar documentos mensais por empresa.']} />,
  documents: <ModulePlaceholderPage title="Documentos" badge="Fila" color="amber" description="Fila de solicitacoes contabeis por empresa, competencia, vencimento e status de envio." nextSteps={['Consumir GET /api/documents.', 'Criar tela de solicitacao de documentos.', 'Exibir status PENDING, SENT, UNDER_REVIEW, APPROVED e OVERDUE.']} />,
  whatsapp: <ModulePlaceholderPage title="WhatsApp" badge="Mensagens" color="green" description="Inbox operacional das mensagens recebidas e enviadas pelo canal do escritorio." nextSteps={['Criar GET /api/whatsapp/messages.', 'Listar conversas por cliente e telefone.', 'Adicionar envio de templates mockados.']} />,
  review: <ModulePlaceholderPage title="Triagem IA" badge="Revisao" color="violet" description="Caixa de revisao para documentos com analise incerta ou sem associacao automatica segura." nextSteps={['Criar GET /api/unmatched-documents.', 'Permitir associar documento a uma solicitacao.', 'Mostrar confidence, resumo e flags da IA.']} />,
  deadlines: <ModulePlaceholderPage title="Prazos" badge="Controle" color="rose" description="Calendario operacional de vencimentos, atrasos e lembretes automaticos." nextSteps={['Consumir GET /api/deadlines.', 'Criar visao por vencimento.', 'Destacar atrasados e proximos 7 dias.']} />,
  finance: <ModulePlaceholderPage title="Financeiro" badge="Cobrancas" color="emerald" description="Acompanhamento basico de cobrancas abertas, pagas, vencidas e valores por empresa." nextSteps={['Consumir GET /api/charges.', 'Somar valores por status.', 'Adicionar filtros por cliente e empresa.']} />,
  proposals: <ModulePlaceholderPage title="Propostas" badge="Comercial" color="teal" description="Gestao de propostas comerciais enviadas para clientes e prospects do escritorio." nextSteps={['Consumir GET /api/proposals.', 'Criar formulario de proposta.', 'Controlar status enviada, aceita e recusada.']} />,
};

function LoadingSession() {
  return (
    <div className="login-shell">
      <Card color="slate" className="login-card">
        <h1>Carregando sessão...</h1>
        <p className="lead">Validando token e preparando o painel do escritório.</p>
      </Card>
    </div>
  );
}

function AuthenticatedApp({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const [active, setActive] = useState<AppSectionId>('dashboard');

  const activePage = useMemo(() => {
    if (active === 'dashboard') return <DashboardPage />;
    if (active === 'tasks') return <TasksPage />;
    if (active === 'architecture') return <ArchitecturePage />;
    return modulePages[active];
  }, [active]);

  return (
    <AppShell active={active} items={navigationItems} user={user} onNavigate={setActive} onLogout={onLogout}>
      {activePage}
    </AppShell>
  );
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  const refreshSession = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setCheckingSession(false);
      return;
    }

    setCheckingSession(true);
    try {
      const currentUser = await getMe();
      setUser(currentUser);
      if (!currentUser) {
        logout();
      }
    } catch (err) {
      logout();
      setUser(null);
    } finally {
      setCheckingSession(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  function handleLogout() {
    logout();
    setUser(null);
  }

  if (checkingSession) return <LoadingSession />;

  if (!user) {
    return <LoginPage onAuthenticated={refreshSession} />;
  }

  return <AuthenticatedApp user={user} onLogout={handleLogout} />;
}

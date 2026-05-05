import { Card } from '../components/Card';
import { Badge } from '../components/Badge';

export function DashboardPage() {
  return (
    <div className="stack">
      <div className="page-title">
        <h2>Dashboard Operacional</h2>
        <Badge color="green">MVP</Badge>
      </div>

      <div className="grid four">
        <Card color="green" title="Clientes"><div className="metric">0</div><p>Clientes ativos no escritório.</p></Card>
        <Card color="sky" title="Empresas"><div className="metric">0</div><p>Empresas vinculadas aos clientes.</p></Card>
        <Card color="amber" title="Documentos"><div className="metric">0</div><p>Solicitações pendentes ou em análise.</p></Card>
        <Card color="violet" title="Financeiro"><div className="metric">0</div><p>Cobranças abertas e vencidas.</p></Card>
      </div>

      <div className="grid two">
        <Card title="Próxima evolução" color="slate">
          <ul className="list">
            <li>▸ Conectar cards ao endpoint GET /api/dashboard.</li>
            <li>▸ Listar documentos pendentes por cliente e empresa.</li>
            <li>▸ Exibir mensagens WhatsApp recentes.</li>
            <li>▸ Destacar triagens de IA que exigem revisão.</li>
          </ul>
        </Card>
        <Card title="Fluxo ideal do escritório" color="green">
          <div className="flow-line">Solicitar → Receber WhatsApp → IA analisar → STAFF aprovar → Arquivar</div>
          <p className="lead">O dashboard deve mostrar a operação real do escritório sem obrigar o cliente final a acessar portal.</p>
        </Card>
      </div>
    </div>
  );
}

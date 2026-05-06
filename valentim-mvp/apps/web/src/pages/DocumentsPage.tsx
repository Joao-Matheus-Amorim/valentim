import { useEffect, useMemo, useState } from 'react';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { listDocuments } from '../services/documents';
import type { DocumentRequest, DocumentStatus } from '../types/document';
import './DocumentsPage.css';

const statusLabels: Record<DocumentStatus, string> = {
  PENDING: 'Pendente',
  SENT: 'Enviado',
  UNDER_REVIEW: 'Em revisão',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  OVERDUE: 'Atrasado'
};

function formatDate(date?: string | null) {
  if (!date) return 'Sem vencimento';
  return new Date(date).toLocaleDateString('pt-BR');
}

function getStatusBadgeColor(status: DocumentStatus) {
  if (status === 'APPROVED') return 'green';
  if (status === 'SENT') return 'sky';
  if (status === 'UNDER_REVIEW') return 'violet';
  if (status === 'REJECTED' || status === 'OVERDUE') return 'rose';
  return 'amber';
}

export function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDocuments() {
    setLoading(true);
    setError(null);

    try {
      const data = await listDocuments();
      setDocuments(data);
    } catch (err) {
      setError('Não foi possível carregar os documentos. Verifique API/token.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDocuments();
  }, []);

  const metrics = useMemo(() => {
    return {
      total: documents.length,
      pending: documents.filter((document) => document.status === 'PENDING').length,
      sent: documents.filter((document) => document.status === 'SENT').length,
      approved: documents.filter((document) => document.status === 'APPROVED').length,
      overdue: documents.filter((document) => document.status === 'OVERDUE').length
    };
  }, [documents]);

  return (
    <div className="stack documents-page">
      <div className="page-title documents-title">
        <div>
          <h2>Documentos</h2>
          <p className="lead">Solicitações de documentos organizadas por empresa, competência e status.</p>
        </div>
        <div className="documents-actions">
          <Badge color="amber">Fila</Badge>
          <button className="document-secondary-button" type="button" onClick={loadDocuments}>Atualizar</button>
        </div>
      </div>

      {error ? <div className="documents-alert error">{error}</div> : null}

      <div className="grid four">
        <Card color="amber" title="Total"><div className="metric">{metrics.total}</div><p>Solicitações cadastradas.</p></Card>
        <Card color="sky" title="Pendentes"><div className="metric">{metrics.pending}</div><p>Aguardando envio do cliente.</p></Card>
        <Card color="green" title="Aprovados"><div className="metric">{metrics.approved}</div><p>Documentos conferidos.</p></Card>
        <Card color="rose" title="Atrasados"><div className="metric">{metrics.overdue}</div><p>Itens fora do prazo.</p></Card>
      </div>

      <Card title="Fila de documentos" color="slate">
        {loading ? <p className="lead">Carregando documentos...</p> : null}

        {!loading && documents.length === 0 ? (
          <div className="documents-empty">
            <strong>Nenhum documento encontrado.</strong>
            <span>Crie solicitações vinculadas a empresas para acompanhar a entrega mensal.</span>
          </div>
        ) : null}

        {!loading && documents.length > 0 ? (
          <div className="documents-list">
            {documents.map((document) => (
              <article className="document-card" key={document.id}>
                <div className="document-card-main">
                  <div>
                    <strong>{document.documentType}</strong>
                    <span>Empresa: {document.company?.name || 'Empresa não informada'}</span>
                    <span>Competência: {document.competence || 'Não informada'} · Vencimento: {formatDate(document.dueDate)}</span>
                  </div>
                  <div className="document-card-meta">
                    <Badge color={getStatusBadgeColor(document.status)}>{statusLabels[document.status]}</Badge>
                    <Badge color="slate">{document.files?.length || 0} arquivos</Badge>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </Card>
    </div>
  );
}

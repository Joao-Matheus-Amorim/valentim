import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { listCompanies } from '../services/companies';
import { createDocument, listDocuments } from '../services/documents';
import type { Company } from '../types/company';
import type { CreateDocumentInput, DocumentRequest, DocumentStatus } from '../types/document';
import './DocumentsPage.css';

const statusLabels: Record<DocumentStatus, string> = {
  PENDING: 'Pendente',
  SENT: 'Enviado',
  UNDER_REVIEW: 'Em revisão',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  OVERDUE: 'Atrasado'
};

const documentTypeOptions = ['DAS', 'DARF', 'NF', 'EXTRATO', 'FOLHA', 'OUTRO'];

const initialDocumentForm: CreateDocumentInput = {
  companyId: '',
  documentType: '',
  competence: '',
  dueDate: ''
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

function canReviewDocument(status: DocumentStatus) {
  return status !== 'APPROVED' && status !== 'REJECTED';
}

export function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRequest[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [documentForm, setDocumentForm] = useState<CreateDocumentInput>(initialDocumentForm);
  const [reviewingDocumentId, setReviewingDocumentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadDocuments() {
    setLoading(true);
    setError(null);

    try {
      const [documentsData, companiesData] = await Promise.all([
        listDocuments(),
        listCompanies()
      ]);
      setDocuments(documentsData);
      setCompanies(companiesData);
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

  async function handleDocumentFormSubmit(event: FormEvent) {
    event.preventDefault();

    const companyId = documentForm.companyId;
    const documentType = documentForm.documentType.trim();
    const competence = documentForm.competence?.trim() || null;
    const dueDate = documentForm.dueDate || null;

    if (!companyId) {
      setError('Selecione a empresa da solicitação.');
      return;
    }

    if (!documentType) {
      setError('Selecione o tipo de documento.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await createDocument({ companyId, documentType, competence, dueDate });
      setDocumentForm(initialDocumentForm);
      setSuccess('Solicitação criada com sucesso.');
      window.setTimeout(() => setSuccess(null), 3000);
      await loadDocuments();
    } catch (err) {
      setError('Não foi possível criar a solicitação. Verifique os dados e tente novamente.');
    } finally {
      setSaving(false);
    }
  }

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
      {success ? <div className="documents-alert success">{success}</div> : null}

      <div className="grid four">
        <Card color="amber" title="Total"><div className="metric">{metrics.total}</div><p>Solicitações cadastradas.</p></Card>
        <Card color="sky" title="Pendentes"><div className="metric">{metrics.pending}</div><p>Aguardando envio do cliente.</p></Card>
        <Card color="green" title="Aprovados"><div className="metric">{metrics.approved}</div><p>Documentos conferidos.</p></Card>
        <Card color="rose" title="Atrasados"><div className="metric">{metrics.overdue}</div><p>Itens fora do prazo.</p></Card>
      </div>

      <div className="grid two documents-workspace">
        <Card title="Criar solicitação" color="amber">
          <form className="document-form" onSubmit={handleDocumentFormSubmit}>
            <label>
              Empresa
              <select
                value={documentForm.companyId}
                onChange={(event) => setDocumentForm({ ...documentForm, companyId: event.target.value })}
                disabled={loading || saving || companies.length === 0}
              >
                <option value="">Selecione uma empresa</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            </label>
            <label>
              Tipo de documento
              <select
                value={documentForm.documentType}
                onChange={(event) => setDocumentForm({ ...documentForm, documentType: event.target.value })}
                disabled={loading || saving}
              >
                <option value="">Selecione o tipo</option>
                {documentTypeOptions.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>
            <label>
              Competência
              <input
                value={documentForm.competence || ''}
                onChange={(event) => setDocumentForm({ ...documentForm, competence: event.target.value })}
                placeholder="Ex.: 05/2026"
                disabled={saving}
              />
            </label>
            <label>
              Vencimento
              <input
                type="date"
                value={documentForm.dueDate || ''}
                onChange={(event) => setDocumentForm({ ...documentForm, dueDate: event.target.value })}
                disabled={saving}
              />
            </label>
            <button className="document-primary-button" type="submit" disabled={loading || saving || companies.length === 0}>
              {saving ? 'Criando...' : 'Criar solicitação'}
            </button>
          </form>
        </Card>

        <Card title="Como usar" color="slate">
          <div className="document-help-box">
            <strong>Documento sempre pertence a uma empresa.</strong>
            <span>Crie solicitações mensais para acompanhar o que o cliente precisa enviar.</span>
            <span>Quando o documento chegar, o status poderá ser acompanhado pela fila.</span>
          </div>
        </Card>
      </div>

      <Card title="Fila de documentos" color="slate">
        {loading ? <p className="lead">Carregando documentos e empresas...</p> : null}

        {!loading && companies.length === 0 ? (
          <div className="documents-empty">
            <strong>Nenhuma empresa disponível.</strong>
            <span>Cadastre uma empresa antes de criar solicitações de documentos.</span>
          </div>
        ) : null}

        {!loading && companies.length > 0 && documents.length === 0 ? (
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
                    {canReviewDocument(document.status) ? (
                      <>
                        <button className="document-secondary-button" type="button" disabled={reviewingDocumentId === document.id}>
                          Aprovar
                        </button>
                        <button className="document-secondary-button" type="button" disabled={reviewingDocumentId === document.id}>
                          Rejeitar
                        </button>
                      </>
                    ) : null}
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

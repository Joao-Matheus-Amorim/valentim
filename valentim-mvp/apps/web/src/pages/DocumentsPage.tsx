import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { listCompanies } from '../services/companies';
import { createDocument, listDocuments, reviewDocument } from '../services/documents';
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

type DocumentFilter = 'all' | 'pending' | 'sent' | 'approved' | 'rejected';
type DocumentSort = 'dueDateAsc' | 'newest' | 'oldest' | 'typeAsc';

const ALL_COMPANIES_FILTER = 'all';

const documentFilterOptions: Array<{ id: DocumentFilter; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'pending', label: 'Pendentes' },
  { id: 'sent', label: 'Enviados' },
  { id: 'approved', label: 'Aprovados' },
  { id: 'rejected', label: 'Rejeitados / reenvio' }
];

const documentSortOptions: Array<{ id: DocumentSort; label: string }> = [
  { id: 'dueDateAsc', label: 'Vencimento mais próximo' },
  { id: 'newest', label: 'Mais recentes' },
  { id: 'oldest', label: 'Mais antigos' },
  { id: 'typeAsc', label: 'Tipo A-Z' }
];

const documentTypeOptions = ['DAS', 'DARF', 'NF', 'EXTRATO', 'FOLHA', 'OUTRO'];

const initialDocumentForm: CreateDocumentInput = {
  companyId: '',
  documentType: '',
  competence: '',
  dueDate: ''
};

function normalizeSearchValue(value?: string | null) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getTimeValue(date?: string | null, fallback = Number.MAX_SAFE_INTEGER) {
  if (!date) return fallback;
  const timestamp = new Date(date).getTime();
  return Number.isNaN(timestamp) ? fallback : timestamp;
}

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
  return status !== 'APPROVED';
}

function getApproveButtonLabel(document: DocumentRequest, isReviewing: boolean) {
  if (isReviewing) return 'Processando...';
  if (document.status === 'REJECTED') return 'Aprovar reenviado';
  return 'Aprovar';
}

function matchesDocumentFilter(document: DocumentRequest, filter: DocumentFilter) {
  if (filter === 'all') return true;
  if (filter === 'pending') return document.status === 'PENDING' || document.status === 'OVERDUE';
  if (filter === 'sent') return document.status === 'SENT' || document.status === 'UNDER_REVIEW';
  if (filter === 'approved') return document.status === 'APPROVED';
  return document.status === 'REJECTED';
}

function matchesCompanyFilter(document: DocumentRequest, companyFilter: string) {
  return companyFilter === ALL_COMPANIES_FILTER || document.companyId === companyFilter;
}

function matchesDocumentSearch(document: DocumentRequest, search: string) {
  const normalizedSearch = normalizeSearchValue(search);
  if (!normalizedSearch) return true;

  const searchableText = [
    document.documentType,
    document.company?.name,
    document.competence,
    document.dueDate ? formatDate(document.dueDate) : null,
    statusLabels[document.status],
    document.rejectionReason
  ].map(normalizeSearchValue).join(' ');

  return searchableText.includes(normalizedSearch);
}

function sortDocuments(documents: DocumentRequest[], sort: DocumentSort) {
  return [...documents].sort((a, b) => {
    if (sort === 'newest') {
      return getTimeValue(b.createdAt, 0) - getTimeValue(a.createdAt, 0);
    }

    if (sort === 'oldest') {
      return getTimeValue(a.createdAt, 0) - getTimeValue(b.createdAt, 0);
    }

    if (sort === 'typeAsc') {
      return a.documentType.localeCompare(b.documentType, 'pt-BR');
    }

    const dueDateDiff = getTimeValue(a.dueDate) - getTimeValue(b.dueDate);
    if (dueDateDiff !== 0) return dueDateDiff;
    return getTimeValue(b.createdAt, 0) - getTimeValue(a.createdAt, 0);
  });
}

export function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRequest[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [documentForm, setDocumentForm] = useState<CreateDocumentInput>(initialDocumentForm);
  const [activeDocumentFilter, setActiveDocumentFilter] = useState<DocumentFilter>('all');
  const [activeCompanyFilter, setActiveCompanyFilter] = useState<string>(ALL_COMPANIES_FILTER);
  const [documentSearch, setDocumentSearch] = useState('');
  const [documentSort, setDocumentSort] = useState<DocumentSort>('dueDateAsc');
  const [reviewingDocumentId, setReviewingDocumentId] = useState<string | null>(null);
  const [rejectingDocument, setRejectingDocument] = useState<DocumentRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState<string | null>(null);
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

  const companyFilteredDocuments = useMemo(() => {
    return documents.filter((document) => matchesCompanyFilter(document, activeCompanyFilter));
  }, [activeCompanyFilter, documents]);

  const filterCounts = useMemo(() => {
    return documentFilterOptions.reduce<Record<DocumentFilter, number>>((acc, option) => {
      acc[option.id] = companyFilteredDocuments.filter((document) => matchesDocumentFilter(document, option.id)).length;
      return acc;
    }, { all: 0, pending: 0, sent: 0, approved: 0, rejected: 0 });
  }, [companyFilteredDocuments]);

  const filteredDocuments = useMemo(() => {
    const result = companyFilteredDocuments
      .filter((document) => matchesDocumentFilter(document, activeDocumentFilter))
      .filter((document) => matchesDocumentSearch(document, documentSearch));

    return sortDocuments(result, documentSort);
  }, [activeDocumentFilter, companyFilteredDocuments, documentSearch, documentSort]);

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
      setActiveCompanyFilter(companyId);
      setActiveDocumentFilter('pending');
      setDocumentSearch('');
      setDocumentSort('dueDateAsc');
      setSuccess('Solicitação criada com sucesso.');
      window.setTimeout(() => setSuccess(null), 3000);
      await loadDocuments();
    } catch (err) {
      setError('Não foi possível criar a solicitação. Verifique os dados e tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  async function handleApproveDocument(documentId: string) {
    setReviewingDocumentId(documentId);
    setError(null);
    setSuccess(null);

    try {
      await reviewDocument(documentId, { action: 'approve' });
      setActiveDocumentFilter('approved');
      setDocumentSearch('');
      setSuccess('Documento aprovado com sucesso.');
      window.setTimeout(() => setSuccess(null), 3000);
      await loadDocuments();
    } catch (err) {
      setError('Não foi possível aprovar o documento. Verifique API/token e tente novamente.');
    } finally {
      setReviewingDocumentId(null);
    }
  }

  function openRejectModal(document: DocumentRequest) {
    setRejectingDocument(document);
    setRejectionReason(document.rejectionReason || '');
    setRejectionError(null);
    setError(null);
    setSuccess(null);
  }

  function closeRejectModal() {
    if (reviewingDocumentId) return;
    setRejectingDocument(null);
    setRejectionReason('');
    setRejectionError(null);
  }

  function clearDocumentFilters() {
    setActiveCompanyFilter(ALL_COMPANIES_FILTER);
    setActiveDocumentFilter('all');
    setDocumentSearch('');
    setDocumentSort('dueDateAsc');
  }

  async function handleRejectSubmit(event: FormEvent) {
    event.preventDefault();

    if (!rejectingDocument) return;

    const reason = rejectionReason.trim();

    if (!reason) {
      setRejectionError('Informe o motivo para rejeitar o documento.');
      return;
    }

    setReviewingDocumentId(rejectingDocument.id);
    setRejectionError(null);
    setError(null);
    setSuccess(null);

    try {
      await reviewDocument(rejectingDocument.id, { action: 'reject', reason });
      setSuccess('Documento rejeitado com motivo registrado.');
      setRejectingDocument(null);
      setRejectionReason('');
      setActiveCompanyFilter(rejectingDocument.companyId);
      setActiveDocumentFilter('rejected');
      setDocumentSearch('');
      setDocumentSort('newest');
      window.setTimeout(() => setSuccess(null), 3000);
      await loadDocuments();
    } catch (err) {
      setRejectionError('Não foi possível rejeitar o documento. Verifique API/token e tente novamente.');
    } finally {
      setReviewingDocumentId(null);
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
            <span>Use as abas, o filtro de empresa, a busca e a ordenação para organizar a fila operacional.</span>
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

        {!loading && documents.length > 0 ? (
          <div className="document-filter-panel">
            <div className="document-company-filter">
              <label>
                Empresa
                <select value={activeCompanyFilter} onChange={(event) => setActiveCompanyFilter(event.target.value)}>
                  <option value={ALL_COMPANIES_FILTER}>Todas as empresas</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Busca rápida
                <input
                  value={documentSearch}
                  onChange={(event) => setDocumentSearch(event.target.value)}
                  placeholder="Buscar por tipo, competência, empresa, status ou motivo"
                />
              </label>
              <label>
                Ordenar por
                <select value={documentSort} onChange={(event) => setDocumentSort(event.target.value as DocumentSort)}>
                  {documentSortOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </label>
              <button className="document-secondary-button" type="button" onClick={clearDocumentFilters}>
                Limpar filtros
              </button>
            </div>

            <div className="document-tabs" role="tablist" aria-label="Filtros de documentos por status">
              {documentFilterOptions.map((option) => (
                <button
                  key={option.id}
                  className={activeDocumentFilter === option.id ? 'document-tab active' : 'document-tab'}
                  type="button"
                  onClick={() => setActiveDocumentFilter(option.id)}
                  role="tab"
                  aria-selected={activeDocumentFilter === option.id}
                >
                  <span>{option.label}</span>
                  <strong>{filterCounts[option.id]}</strong>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {!loading && companies.length > 0 && documents.length === 0 ? (
          <div className="documents-empty">
            <strong>Nenhum documento encontrado.</strong>
            <span>Crie solicitações vinculadas a empresas para acompanhar a entrega mensal.</span>
          </div>
        ) : null}

        {!loading && documents.length > 0 && filteredDocuments.length === 0 ? (
          <div className="documents-empty">
            <strong>Nenhum documento neste filtro.</strong>
            <span>Troque a empresa, mude a aba de status, ajuste a busca ou crie uma nova solicitação para movimentar a fila.</span>
          </div>
        ) : null}

        {!loading && filteredDocuments.length > 0 ? (
          <div className="documents-list">
            {filteredDocuments.map((document) => {
              const isReviewing = reviewingDocumentId === document.id;

              return (
                <article className="document-card" key={document.id}>
                  <div className="document-card-main">
                    <div>
                      <strong>{document.documentType}</strong>
                      <span>Empresa: {document.company?.name || 'Empresa não informada'}</span>
                      <span>Competência: {document.competence || 'Não informada'} · Vencimento: {formatDate(document.dueDate)}</span>
                      {document.status === 'REJECTED' && document.rejectionReason ? (
                        <span>Motivo da rejeição: {document.rejectionReason}</span>
                      ) : null}
                    </div>
                    <div className="document-card-meta">
                      <Badge color={getStatusBadgeColor(document.status)}>{statusLabels[document.status]}</Badge>
                      <Badge color="slate">{document.files?.length || 0} arquivos</Badge>
                      {canReviewDocument(document.status) ? (
                        <>
                          <button
                            className="document-secondary-button"
                            type="button"
                            disabled={isReviewing}
                            onClick={() => handleApproveDocument(document.id)}
                          >
                            {getApproveButtonLabel(document, isReviewing)}
                          </button>
                          <button
                            className="document-secondary-button"
                            type="button"
                            disabled={isReviewing}
                            onClick={() => openRejectModal(document)}
                          >
                            Rejeitar
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </Card>

      {rejectingDocument ? (
        <div className="document-modal-backdrop" role="presentation" onMouseDown={closeRejectModal}>
          <form className="document-reject-modal" onSubmit={handleRejectSubmit} onMouseDown={(event) => event.stopPropagation()}>
            <div className="document-modal-header">
              <strong>Rejeitar documento</strong>
              <span>{rejectingDocument.documentType} · {rejectingDocument.company?.name || 'Empresa não informada'}</span>
            </div>

            <label>
              Motivo da rejeição
              <textarea
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                placeholder="Ex.: Documento ilegível. Cliente precisa reenviar em melhor qualidade."
                disabled={reviewingDocumentId === rejectingDocument.id}
                autoFocus
              />
            </label>

            {rejectionError ? <div className="documents-alert error">{rejectionError}</div> : null}

            <div className="document-modal-actions">
              <button
                className="document-secondary-button"
                type="button"
                onClick={closeRejectModal}
                disabled={reviewingDocumentId === rejectingDocument.id}
              >
                Cancelar
              </button>
              <button
                className="document-primary-button"
                type="submit"
                disabled={reviewingDocumentId === rejectingDocument.id}
              >
                {reviewingDocumentId === rejectingDocument.id ? 'Rejeitando...' : 'Confirmar rejeição'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

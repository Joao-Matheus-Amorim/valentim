import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { listCompanies } from '../services/companies';
import { createDocument, listDocuments, reviewDocument } from '../services/documents';
import { listPeople } from '../services/people';
import type { Company } from '../types/company';
import type { CreateDocumentInput, DocumentRequest, DocumentStatus, DocumentTargetType } from '../types/document';
import type { Person } from '../types/person';
import { personRoleLabels } from '../types/person';
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
type DocumentTargetFilter = 'all' | 'company' | 'person';
type DocumentSort = 'dueDateAsc' | 'newest' | 'oldest' | 'typeAsc';
type DueSignal = { label: string; color: 'slate' | 'green' | 'amber' | 'rose' };
type DocumentUrgencyFilter = 'dueToday' | 'nextSevenDays' | 'overdue' | 'rejected';

const ALL_COMPANIES_FILTER = 'all';
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const BRASILIA_TIME_ZONE = 'America/Sao_Paulo';

const documentFilterOptions: Array<{ id: DocumentFilter; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'pending', label: 'Pendentes' },
  { id: 'sent', label: 'Enviados' },
  { id: 'approved', label: 'Aprovados' },
  { id: 'rejected', label: 'Rejeitados / reenvio' }
];

const documentTargetFilterOptions: Array<{ id: DocumentTargetFilter; label: string }> = [
  { id: 'all', label: 'Todos os alvos' },
  { id: 'company', label: 'Empresas' },
  { id: 'person', label: 'Pessoas' }
];

const documentSortOptions: Array<{ id: DocumentSort; label: string }> = [
  { id: 'dueDateAsc', label: 'Vencimento mais próximo' },
  { id: 'newest', label: 'Mais recentes' },
  { id: 'oldest', label: 'Mais antigos' },
  { id: 'typeAsc', label: 'Tipo A-Z' }
];

const documentTypeOptions = [
  'DAS',
  'DARF',
  'NF',
  'EXTRATO',
  'FOLHA',
  'OUTRO',
  'CPF',
  'RG',
  'CNH',
  'COMPROVANTE_RESIDENCIA',
  'PROCURACAO',
  'E-CPF'
];

const initialDocumentForm: CreateDocumentInput = {
  companyId: '',
  targetType: 'COMPANY',
  personId: '',
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

function formatDateTime(date?: string | null) {
  if (!date) return null;
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return null;

  return value.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: BRASILIA_TIME_ZONE
  });
}

function getDueDateDiffDays(date?: string | null) {
  if (!date) return null;
  const due = new Date(date);
  if (Number.isNaN(due.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  return Math.round((due.getTime() - today.getTime()) / DAY_IN_MS);
}

function getDocumentDueDateSignal(document: DocumentRequest): DueSignal {
  if (document.status === 'APPROVED') return { label: 'Conferido', color: 'green' };
  if (document.status === 'REJECTED') return { label: 'Aguardando reenvio', color: 'rose' };

  const diffDays = getDueDateDiffDays(document.dueDate);

  if (diffDays === null) return { label: 'Sem vencimento', color: 'slate' };

  if (diffDays < 0) {
    const daysLate = Math.abs(diffDays);
    return {
      label: daysLate === 1 ? 'Atrasado há 1 dia' : `Atrasado há ${daysLate} dias`,
      color: 'rose'
    };
  }

  if (diffDays === 0) return { label: 'Vence hoje', color: 'amber' };
  if (diffDays === 1) return { label: 'Vence amanhã', color: 'amber' };

  return {
    label: `Vence em ${diffDays} dias`,
    color: diffDays <= 7 ? 'amber' : 'slate'
  };
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

function getReviewerName(document: DocumentRequest) {
  return document.reviewedBy?.name || document.reviewedBy?.email || null;
}

function getReviewHistoryLabel(document: DocumentRequest) {
  const reviewedAt = formatDateTime(document.reviewedAt);
  if (!reviewedAt) return null;

  const reviewerName = getReviewerName(document);
  const reviewerSuffix = reviewerName ? ` por ${reviewerName}` : '';

  if (document.status === 'APPROVED') {
    return `Aprovado em ${reviewedAt} (Brasília)${reviewerSuffix}`;
  }

  if (document.status === 'REJECTED') {
    return `Rejeitado em ${reviewedAt} (Brasília)${reviewerSuffix}`;
  }

  return `Revisado em ${reviewedAt} (Brasília)${reviewerSuffix}`;
}

function getDocumentTargetLabel(document: DocumentRequest) {
  if (document.targetType === 'PERSON') {
    const role =
      document.person?.role && personRoleLabels[document.person.role as keyof typeof personRoleLabels]
        ? personRoleLabels[document.person.role as keyof typeof personRoleLabels]
        : 'Pessoa';

    return `Documento da pessoa: ${document.person?.name || 'Pessoa não informada'} · ${role}`;
  }

  return `Documento da empresa: ${document.company?.name || 'Empresa não informada'}`;
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

function matchesTargetFilter(document: DocumentRequest, targetFilter: DocumentTargetFilter) {
  if (targetFilter === 'all') return true;
  if (targetFilter === 'person') return document.targetType === 'PERSON';
  return document.targetType !== 'PERSON';
}

function matchesDocumentSearch(document: DocumentRequest, search: string) {
  const normalizedSearch = normalizeSearchValue(search);
  if (!normalizedSearch) return true;

  const dueDateSignal = getDocumentDueDateSignal(document);

  const searchableText = [
    document.documentType,
    document.company?.name,
    document.person?.name,
    document.person?.cpf,
    document.targetType === 'PERSON' ? 'documento da pessoa' : 'documento da empresa',
    document.competence,
    document.dueDate ? formatDate(document.dueDate) : null,
    statusLabels[document.status],
    dueDateSignal.label,
    getReviewHistoryLabel(document),
    document.rejectionReason
  ]
    .map(normalizeSearchValue)
    .join(' ');

  return searchableText.includes(normalizedSearch);
}

function sortDocuments(documents: DocumentRequest[], sort: DocumentSort) {
  return [...documents].sort((a, b) => {
    if (sort === 'newest') return getTimeValue(b.createdAt, 0) - getTimeValue(a.createdAt, 0);
    if (sort === 'oldest') return getTimeValue(a.createdAt, 0) - getTimeValue(b.createdAt, 0);
    if (sort === 'typeAsc') return a.documentType.localeCompare(b.documentType, 'pt-BR');

    const dueDateDiff = getTimeValue(a.dueDate) - getTimeValue(b.dueDate);
    if (dueDateDiff !== 0) return dueDateDiff;

    return getTimeValue(b.createdAt, 0) - getTimeValue(a.createdAt, 0);
  });
}

function getFilterLabel(options: Array<{ id: string; label: string }>, id: string) {
  return options.find((option) => option.id === id)?.label || 'Todos';
}

function isActionableDocument(document: DocumentRequest) {
  return document.status !== 'APPROVED';
}

function countDueToday(documents: DocumentRequest[]) {
  return documents.filter((document) => isActionableDocument(document) && getDueDateDiffDays(document.dueDate) === 0).length;
}

function countNextSevenDays(documents: DocumentRequest[]) {
  return documents.filter((document) => {
    const diffDays = getDueDateDiffDays(document.dueDate);
    return isActionableDocument(document) && diffDays !== null && diffDays > 0 && diffDays <= 7;
  }).length;
}

function countOverdue(documents: DocumentRequest[]) {
  return documents.filter((document) => {
    const diffDays = getDueDateDiffDays(document.dueDate);
    return isActionableDocument(document) && (document.status === 'OVERDUE' || (diffDays !== null && diffDays < 0));
  }).length;
}

export function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRequest[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [documentForm, setDocumentForm] = useState<CreateDocumentInput>(initialDocumentForm);
  const [activeDocumentFilter, setActiveDocumentFilter] = useState<DocumentFilter>('all');
  const [activeTargetFilter, setActiveTargetFilter] = useState<DocumentTargetFilter>('all');
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

  const selectedCompany = useMemo(() => {
    return companies.find((company) => company.id === documentForm.companyId) || null;
  }, [companies, documentForm.companyId]);

  const availablePeopleForSelectedCompany = useMemo(() => {
    if (!selectedCompany) return people;
    return people.filter((person) => !person.clientId || person.clientId === selectedCompany.clientId);
  }, [people, selectedCompany]);

  async function loadDocuments() {
    setLoading(true);
    setError(null);

    try {
      const [documentsData, companiesData, peopleData] = await Promise.all([
        listDocuments(),
        listCompanies(),
        listPeople()
      ]);

      setDocuments(documentsData);
      setCompanies(companiesData);
      setPeople(peopleData);
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

  const activeCompanyName = useMemo(() => {
    if (activeCompanyFilter === ALL_COMPANIES_FILTER) return 'Todas as empresas';
    return companies.find((company) => company.id === activeCompanyFilter)?.name || 'Empresa selecionada';
  }, [activeCompanyFilter, companies]);

  const companyFilteredDocuments = useMemo(() => {
    return documents.filter((document) => matchesCompanyFilter(document, activeCompanyFilter));
  }, [activeCompanyFilter, documents]);

  const targetFilteredDocuments = useMemo(() => {
    return companyFilteredDocuments.filter((document) => matchesTargetFilter(document, activeTargetFilter));
  }, [activeTargetFilter, companyFilteredDocuments]);

  const targetCounts = useMemo(() => {
    return documentTargetFilterOptions.reduce<Record<DocumentTargetFilter, number>>((acc, option) => {
      acc[option.id] = companyFilteredDocuments.filter((document) => matchesTargetFilter(document, option.id)).length;
      return acc;
    }, { all: 0, company: 0, person: 0 });
  }, [companyFilteredDocuments]);

  const urgencyMetrics = useMemo(() => {
    return {
      dueToday: countDueToday(targetFilteredDocuments),
      nextSevenDays: countNextSevenDays(targetFilteredDocuments),
      overdue: countOverdue(targetFilteredDocuments),
      rejected: targetFilteredDocuments.filter((document) => document.status === 'REJECTED').length
    };
  }, [targetFilteredDocuments]);

  const filterCounts = useMemo(() => {
    return documentFilterOptions.reduce<Record<DocumentFilter, number>>((acc, option) => {
      acc[option.id] = targetFilteredDocuments.filter((document) => matchesDocumentFilter(document, option.id)).length;
      return acc;
    }, { all: 0, pending: 0, sent: 0, approved: 0, rejected: 0 });
  }, [targetFilteredDocuments]);

  const filteredDocuments = useMemo(() => {
    const result = targetFilteredDocuments
      .filter((document) => matchesDocumentFilter(document, activeDocumentFilter))
      .filter((document) => matchesDocumentSearch(document, documentSearch));

    return sortDocuments(result, documentSort);
  }, [activeDocumentFilter, targetFilteredDocuments, documentSearch, documentSort]);

  function applyUrgencyFilter(filter: DocumentUrgencyFilter) {
    setDocumentSearch('');
    setDocumentSort(filter === 'rejected' ? 'newest' : 'dueDateAsc');

    if (filter === 'rejected') {
      setActiveDocumentFilter('rejected');
      return;
    }

    if (filter === 'overdue') {
      setActiveDocumentFilter('pending');
      setDocumentSearch('atrasado');
      return;
    }

    if (filter === 'dueToday') {
      setActiveDocumentFilter('all');
      setDocumentSearch('vence hoje');
      return;
    }

    setActiveDocumentFilter('all');
    setDocumentSearch('vence em');
  }

  function updateDocumentTargetType(targetType: DocumentTargetType) {
    setDocumentForm({
      ...documentForm,
      targetType,
      personId: targetType === 'PERSON' ? documentForm.personId || '' : ''
    });
  }

  async function handleDocumentFormSubmit(event: FormEvent) {
    event.preventDefault();

    const companyId = documentForm.companyId;
    const targetType = documentForm.targetType || 'COMPANY';
    const personId = targetType === 'PERSON' ? documentForm.personId || null : null;
    const documentType = documentForm.documentType.trim();
    const competence = documentForm.competence?.trim() || null;
    const dueDate = documentForm.dueDate || null;

    if (!companyId) {
      setError('Selecione a empresa da solicitação.');
      return;
    }

    if (targetType === 'PERSON' && !personId) {
      setError('Selecione a pessoa dona deste documento.');
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
      await createDocument({ companyId, targetType, personId, documentType, competence, dueDate });

      setDocumentForm(initialDocumentForm);
      setActiveCompanyFilter(companyId);
      setActiveDocumentFilter('pending');
      setActiveTargetFilter(targetType === 'PERSON' ? 'person' : 'company');
      setDocumentSearch('');
      setDocumentSort('dueDateAsc');
      setSuccess(
        targetType === 'PERSON'
          ? 'Solicitação de documento pessoal criada com sucesso.'
          : 'Solicitação de documento da empresa criada com sucesso.'
      );

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
    setActiveTargetFilter('all');
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
      setActiveTargetFilter(rejectingDocument.targetType === 'PERSON' ? 'person' : 'company');
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
          <p className="lead">Solicitações organizadas por empresa, pessoa física, competência e status.</p>
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

      <div className="document-urgency-grid">
        <button className="document-urgency-card amber" type="button" onClick={() => applyUrgencyFilter('dueToday')}>
          <span>Vencem hoje</span>
          <strong>{urgencyMetrics.dueToday}</strong>
          <small>Prioridade imediata</small>
        </button>
        <button className="document-urgency-card amber" type="button" onClick={() => applyUrgencyFilter('nextSevenDays')}>
          <span>Próximos 7 dias</span>
          <strong>{urgencyMetrics.nextSevenDays}</strong>
          <small>Planejar cobrança</small>
        </button>
        <button className="document-urgency-card rose" type="button" onClick={() => applyUrgencyFilter('overdue')}>
          <span>Atrasados</span>
          <strong>{urgencyMetrics.overdue}</strong>
          <small>Exige ação</small>
        </button>
        <button className="document-urgency-card rose" type="button" onClick={() => applyUrgencyFilter('rejected')}>
          <span>Aguardando reenvio</span>
          <strong>{urgencyMetrics.rejected}</strong>
          <small>Cliente precisa corrigir</small>
        </button>
      </div>

      <div className="grid two documents-workspace">
        <Card title="Criar solicitação" color="amber">
          <form className="document-form" onSubmit={handleDocumentFormSubmit}>
            <label>
              Empresa vinculada
              <select
                value={documentForm.companyId}
                onChange={(event) => setDocumentForm({ ...documentForm, companyId: event.target.value, personId: '' })}
                disabled={loading || saving || companies.length === 0}
              >
                <option value="">Selecione uma empresa</option>
                {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
              </select>
            </label>

            <label>
              Alvo do documento
              <select
                value={documentForm.targetType || 'COMPANY'}
                onChange={(event) => updateDocumentTargetType(event.target.value as DocumentTargetType)}
                disabled={saving}
              >
                <option value="COMPANY">Documento da empresa</option>
                <option value="PERSON">Documento da pessoa / dono / representante</option>
              </select>
            </label>

            {(documentForm.targetType || 'COMPANY') === 'PERSON' ? (
              <label>
                Pessoa vinculada
                <select
                  value={documentForm.personId || ''}
                  onChange={(event) => setDocumentForm({ ...documentForm, personId: event.target.value })}
                  disabled={saving || !documentForm.companyId}
                >
                  <option value="">Selecione a pessoa</option>
                  {availablePeopleForSelectedCompany.map((person) => (
                    <option key={person.id} value={person.id}>{person.name} · {personRoleLabels[person.role]}</option>
                  ))}
                </select>
              </label>
            ) : null}

            <label>
              Tipo de documento
              <select
                value={documentForm.documentType}
                onChange={(event) => setDocumentForm({ ...documentForm, documentType: event.target.value })}
                disabled={loading || saving}
              >
                <option value="">Selecione o tipo</option>
                {documentTypeOptions.map((type) => <option key={type} value={type}>{type}</option>)}
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
            <strong>Documento pode ser da empresa ou da pessoa.</strong>
            <span>Use documento da empresa para CNPJ, DAS, extratos e obrigações do negócio.</span>
            <span>Use documento da pessoa para CPF, RG, CNH, procuração, e-CPF, sócios e representantes legais.</span>
          </div>
        </Card>
      </div>

      <Card title="Fila de documentos" color="slate">
        {loading ? <p className="lead">Carregando documentos, empresas e pessoas...</p> : null}

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
                  {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                </select>
              </label>

              <label>
                Busca rápida
                <input
                  value={documentSearch}
                  onChange={(event) => setDocumentSearch(event.target.value)}
                  placeholder="Buscar por tipo, pessoa, empresa, competência, status ou motivo"
                />
              </label>

              <label>
                Ordenar por
                <select value={documentSort} onChange={(event) => setDocumentSort(event.target.value as DocumentSort)}>
                  {documentSortOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
              </label>

              <button className="document-secondary-button" type="button" onClick={clearDocumentFilters}>Limpar filtros</button>
            </div>

            <div className="document-tabs document-target-tabs" role="tablist" aria-label="Filtros de documentos por alvo">
              {documentTargetFilterOptions.map((option) => (
                <button
                  key={option.id}
                  className={activeTargetFilter === option.id ? 'document-tab active' : 'document-tab'}
                  type="button"
                  onClick={() => setActiveTargetFilter(option.id)}
                  role="tab"
                  aria-selected={activeTargetFilter === option.id}
                >
                  <span>{option.label}</span>
                  <strong>{targetCounts[option.id]}</strong>
                </button>
              ))}
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

            <div className="document-filter-summary">
              <strong>{filteredDocuments.length}</strong>
              <span>de {targetFilteredDocuments.length} documentos em {activeCompanyName}</span>
              <span>· Alvo: {getFilterLabel(documentTargetFilterOptions, activeTargetFilter)}</span>
              <span>· Aba: {getFilterLabel(documentFilterOptions, activeDocumentFilter)}</span>
              <span>· Ordenação: {getFilterLabel(documentSortOptions, documentSort)}</span>
              {documentSearch.trim() ? <span>· Busca: “{documentSearch.trim()}”</span> : null}
            </div>
          </div>
        ) : null}

        {!loading && companies.length > 0 && documents.length === 0 ? (
          <div className="documents-empty">
            <strong>Nenhum documento encontrado.</strong>
            <span>Crie solicitações vinculadas a empresas ou pessoas para acompanhar a entrega mensal.</span>
          </div>
        ) : null}

        {!loading && documents.length > 0 && filteredDocuments.length === 0 ? (
          <div className="documents-empty">
            <strong>Nenhum documento neste filtro.</strong>
            <span>Troque a empresa, mude o alvo, ajuste a aba de status, revise a busca ou crie uma nova solicitação.</span>
          </div>
        ) : null}

        {!loading && filteredDocuments.length > 0 ? (
          <div className="documents-list">
            {filteredDocuments.map((document) => {
              const isReviewing = reviewingDocumentId === document.id;
              const dueDateSignal = getDocumentDueDateSignal(document);
              const reviewHistoryLabel = getReviewHistoryLabel(document);

              return (
                <article className="document-card" key={document.id}>
                  <div className="document-card-main">
                    <div>
                      <strong>{document.documentType}</strong>
                      <span className="document-target-note">{getDocumentTargetLabel(document)}</span>
                      <span>Empresa vinculada: {document.company?.name || 'Empresa não informada'}</span>
                      <span>Competência: {document.competence || 'Não informada'} · Vencimento: {formatDate(document.dueDate)}</span>
                      {reviewHistoryLabel ? <span className="document-review-history">{reviewHistoryLabel}</span> : null}
                      {document.status === 'REJECTED' && document.rejectionReason ? <span>Motivo da rejeição: {document.rejectionReason}</span> : null}
                    </div>

                    <div className="document-card-meta">
                      <Badge color={document.targetType === 'PERSON' ? 'teal' : 'sky'}>{document.targetType === 'PERSON' ? 'Pessoa' : 'Empresa'}</Badge>
                      <Badge color={getStatusBadgeColor(document.status)}>{statusLabels[document.status]}</Badge>
                      <Badge color={getDocumentDueDateSignal(document).color}>{getDocumentDueDateSignal(document).label}</Badge>
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
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { listClients } from '../services/clients';
import { createCompany, listCompanies, updateCompany } from '../services/companies';
import type { Client } from '../types/client';
import type { Company, CreateCompanyInput } from '../types/company';
import './CompaniesPage.css';

const initialCompanyForm: CreateCompanyInput = {
  clientId: '',
  name: '',
  cnpj: '',
  regime: ''
};

function formatNullable(value?: string | null) {
  return value?.trim() || 'Não informado';
}

function countDocuments(company: Company) {
  return company.documentRequests?.length || 0;
}

function countDeadlines(company: Company) {
  return company.deadlines?.length || 0;
}

function countCharges(company: Company) {
  return company.charges?.length || 0;
}

export function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [companyForm, setCompanyForm] = useState<CreateCompanyInput>(initialCompanyForm);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadCompanies() {
    setLoading(true);
    setError(null);

    try {
      const [companiesData, clientsData] = await Promise.all([
        listCompanies(),
        listClients()
      ]);
      setCompanies(companiesData);
      setClients(clientsData);
    } catch (err) {
      setError('Não foi possível carregar as empresas. Verifique API/token.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCompanies();
  }, []);

  const metrics = useMemo(() => {
    return {
      total: companies.length,
      withCnpj: companies.filter((company) => company.cnpj?.trim()).length,
      documents: companies.reduce((total, company) => total + countDocuments(company), 0),
      clients: new Set(companies.map((company) => company.clientId)).size
    };
  }, [companies]);

  function startEditingCompany(company: Company) {
    setEditingCompany(company);
    setCompanyForm({
      clientId: company.clientId,
      name: company.name,
      cnpj: company.cnpj ?? '',
      regime: company.regime ?? ''
    });
    setError(null);
    setSuccess(null);
  }

  async function handleCompanyFormSubmit(event: FormEvent) {
    event.preventDefault();

    const clientId = companyForm.clientId;
    const name = companyForm.name.trim();
    const cnpj = companyForm.cnpj?.trim() || null;
    const regime = companyForm.regime?.trim() || null;

    if (!clientId) {
      setError('Selecione o cliente responsável pela empresa.');
      return;
    }

    if (!name) {
      setError('Informe o nome da empresa.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await createCompany({ clientId, name, cnpj, regime });
      setCompanyForm(initialCompanyForm);
      setSuccess('Empresa criada com sucesso.');
      window.setTimeout(() => setSuccess(null), 3000);
      await loadCompanies();
    } catch (err) {
      setError('Não foi possível criar a empresa. Verifique os dados e tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stack companies-page">
      <div className="page-title companies-title">
        <div>
          <h2>Empresas</h2>
          <p className="lead">Cadastro operacional das empresas vinculadas aos clientes do escritório.</p>
        </div>
        <div className="companies-actions">
          <Badge color="sky">Cadastro</Badge>
          <button className="company-secondary-button" type="button" onClick={loadCompanies}>Atualizar</button>
        </div>
      </div>

      {error ? <div className="companies-alert error">{error}</div> : null}
      {success ? <div className="companies-alert success">{success}</div> : null}

      <div className="grid four">
        <Card color="sky" title="Empresas"><div className="metric">{metrics.total}</div><p>Total cadastrado no escritório.</p></Card>
        <Card color="green" title="Com CNPJ"><div className="metric">{metrics.withCnpj}</div><p>Empresas com CNPJ informado.</p></Card>
        <Card color="amber" title="Documentos"><div className="metric">{metrics.documents}</div><p>Solicitações vinculadas às empresas.</p></Card>
        <Card color="violet" title="Clientes"><div className="metric">{metrics.clients}</div><p>Clientes com empresas vinculadas.</p></Card>
      </div>

      <div className="grid two companies-workspace">
        <Card title="Cadastrar empresa" color="sky">
          <form className="company-form" onSubmit={handleCompanyFormSubmit}>
            <label>
              Cliente responsável
              <select
                value={companyForm.clientId}
                onChange={(event) => setCompanyForm({ ...companyForm, clientId: event.target.value })}
                disabled={loading || saving || clients.length === 0}
              >
                <option value="">Selecione um cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </label>
            <label>
              Nome da empresa
              <input
                value={companyForm.name}
                onChange={(event) => setCompanyForm({ ...companyForm, name: event.target.value })}
                placeholder="Ex.: Padaria do João LTDA"
                disabled={saving}
              />
            </label>
            <label>
              CNPJ
              <input
                value={companyForm.cnpj || ''}
                onChange={(event) => setCompanyForm({ ...companyForm, cnpj: event.target.value })}
                placeholder="Ex.: 00.000.000/0001-00"
                disabled={saving}
              />
            </label>
            <label>
              Regime tributário
              <input
                value={companyForm.regime || ''}
                onChange={(event) => setCompanyForm({ ...companyForm, regime: event.target.value })}
                placeholder="Ex.: Simples Nacional"
                disabled={saving}
              />
            </label>
            <button className="company-primary-button" type="submit" disabled={loading || saving || clients.length === 0}>
              {saving ? 'Criando...' : 'Criar empresa'}
            </button>
          </form>
        </Card>

        <Card title="Como usar" color="slate">
          <div className="company-help-box">
            <strong>Empresa sempre pertence a um cliente.</strong>
            <span>Cadastre primeiro o cliente na aba Clientes. Depois vincule uma ou mais empresas a ele.</span>
            <span>Os documentos, prazos e cobranças serão organizados por empresa.</span>
          </div>
        </Card>
      </div>

      <Card title="Carteira de empresas" color="slate">
        {loading ? <p className="lead">Carregando empresas e clientes...</p> : null}

        {!loading && clients.length === 0 ? (
          <div className="companies-empty">
            <strong>Nenhum cliente disponível.</strong>
            <span>Cadastre um cliente antes de criar empresas.</span>
          </div>
        ) : null}

        {!loading && clients.length > 0 && companies.length === 0 ? (
          <div className="companies-empty">
            <strong>Nenhuma empresa encontrada.</strong>
            <span>Cadastre uma empresa vinculada a um cliente para iniciar o fluxo contábil.</span>
          </div>
        ) : null}

        {!loading && companies.length > 0 ? (
          <div className="companies-list">
            {companies.map((company) => (
              <article className="company-card" key={company.id}>
                <div className="company-card-main">
                  <div>
                    <strong>{company.name}</strong>
                    <span>{formatNullable(company.cnpj)} · {formatNullable(company.regime)}</span>
                    <span>Cliente: {company.client?.name || 'Cliente não informado'}</span>
                  </div>
                  <div className="company-card-meta">
                    <Badge color="amber">{countDocuments(company)} documentos</Badge>
                    <Badge color="rose">{countDeadlines(company)} prazos</Badge>
                    <Badge color="emerald">{countCharges(company)} cobranças</Badge>
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

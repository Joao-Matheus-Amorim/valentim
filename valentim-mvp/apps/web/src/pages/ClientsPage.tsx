import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { createClient, listClients, updateClient } from '../services/clients';
import type { Client, CreateClientInput } from '../types/client';
import './ClientsPage.css';

const initialForm: CreateClientInput = {
  name: '',
  phone: ''
};

function formatPhone(phone?: string | null) {
  return phone?.trim() || 'Sem telefone';
}

function countDocuments(client: Client) {
  return client.companies?.reduce((total, company) => total + (company.documentRequests?.length || 0), 0) || 0;
}

function countTasks(client: Client) {
  return client.tasks?.length || 0;
}

export function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState<CreateClientInput>(initialForm);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadClients() {
    setLoading(true);
    setError(null);
    try {
      const data = await listClients();
      setClients(data);
    } catch (err) {
      setError('Não foi possível carregar os clientes. Verifique API/token.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
  }, []);

  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter((client) =>
      client.name.toLowerCase().includes(term) ||
      client.phone?.toLowerCase().includes(term)
    );
  }, [clients, search]);

  const metrics = useMemo(() => {
    return {
      total: clients.length,
      companies: clients.reduce((total, client) => total + (client.companies?.length || 0), 0),
      tasks: clients.reduce((total, client) => total + countTasks(client), 0),
      documents: clients.reduce((total, client) => total + countDocuments(client), 0)
    };
  }, [clients]);

  function startEditingClient(client: Client) {
    setEditingClient(client);
    setForm({
      name: client.name,
      phone: client.phone ?? ''
    });
    setError(null);
    setSuccess(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const name = form.name.trim();
    const phone = form.phone?.trim() || null;

    if (!name) {
      setError('Informe o nome do cliente.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const created = await createClient({ name, phone });
      setClients((current) => [created, ...current]);
      setForm(initialForm);
      setSuccess('Cliente criado com sucesso.');
      window.setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Não foi possível criar o cliente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stack clients-page">
      <div className="page-title clients-title">
        <div>
          <h2>Clientes</h2>
          <p className="lead">Base operacional de clientes do escritório, vinculando empresas, documentos e tarefas.</p>
        </div>
        <div className="clients-actions">
          <Badge color="green">CRM</Badge>
          <button className="client-secondary-button" type="button" onClick={loadClients}>Atualizar</button>
        </div>
      </div>

      {error ? <div className="clients-alert error">{error}</div> : null}
      {success ? <div className="clients-alert success">{success}</div> : null}

      <div className="grid four">
        <Card color="green" title="Clientes"><div className="metric">{metrics.total}</div><p>Total cadastrado no escritório.</p></Card>
        <Card color="sky" title="Empresas"><div className="metric">{metrics.companies}</div><p>Empresas vinculadas aos clientes.</p></Card>
        <Card color="amber" title="Documentos"><div className="metric">{metrics.documents}</div><p>Solicitações relacionadas.</p></Card>
        <Card color="violet" title="Tarefas"><div className="metric">{metrics.tasks}</div><p>Tarefas vinculadas aos clientes.</p></Card>
      </div>

      <div className="grid two clients-workspace">
        <Card title="Cadastrar cliente" color="green">
          <form className="client-form" onSubmit={handleSubmit}>
            <label>
              Nome
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ex.: Padaria do João" />
            </label>
            <label>
              Telefone WhatsApp
              <input value={form.phone || ''} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Ex.: 5521999999999" />
            </label>
            <button className="client-primary-button" type="submit" disabled={saving}>{saving ? 'Criando...' : 'Criar cliente'}</button>
          </form>
        </Card>

        <Card title="Busca rápida" color="slate">
          <div className="client-search-box">
            <label>
              Pesquisar por nome ou telefone
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Digite para filtrar" />
            </label>
            <p className="lead">Use a busca para encontrar rapidamente clientes com pendências, empresas e tarefas.</p>
          </div>
        </Card>
      </div>

      <Card title="Carteira de clientes" color="slate">
        {loading ? <p className="lead">Carregando clientes...</p> : null}
        {!loading && filteredClients.length === 0 ? (
          <div className="clients-empty">
            <strong>Nenhum cliente encontrado.</strong>
            <span>Cadastre o primeiro cliente ou ajuste a busca.</span>
          </div>
        ) : null}

        {!loading && filteredClients.length > 0 ? (
          <div className="clients-list">
            {filteredClients.map((client) => (
              <article className="client-card" key={client.id}>
                <div className="client-card-main">
                  <div>
                    <strong>{client.name}</strong>
                    <span>{formatPhone(client.phone)}</span>
                  </div>
                  <div className="client-card-meta">
                    <Badge color="sky">{client.companies?.length || 0} empresas</Badge>
                    <Badge color="amber">{countDocuments(client)} documentos</Badge>
                    <Badge color="violet">{countTasks(client)} tarefas</Badge>
                    <button className="client-secondary-button" type="button" onClick={() => startEditingClient(client)}>
                      Editar
                    </button>
                  </div>
                </div>

                {client.companies?.length ? (
                  <div className="client-companies">
                    {client.companies.slice(0, 3).map((company) => (
                      <div key={company.id}>
                        <strong>{company.name}</strong>
                        <span>{company.cnpj || 'CNPJ não informado'} · {company.regime || 'Regime não informado'}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="client-companies muted-box">Nenhuma empresa vinculada ainda.</div>
                )}
              </article>
            ))}
          </div>
        ) : null}
      </Card>
    </div>
  );
}

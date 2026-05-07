import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { listClients } from '../services/clients';
import { createPerson, deletePerson, listPeople, updatePerson } from '../services/people';
import type { Client } from '../types/client';
import type { CreatePersonInput, Person, PersonRole } from '../types/person';
import { PERSON_ROLE_OPTIONS, personRoleLabels } from '../types/person';
import './PeoplePage.css';

const initialForm: CreatePersonInput = {
  clientId: '',
  name: '',
  cpf: '',
  email: '',
  phone: '',
  role: 'OWNER'
};

function formatOptional(value?: string | null, fallback = 'Não informado') {
  return value?.trim() || fallback;
}

function countDocuments(person: Person) {
  return person.documentRequests?.length || 0;
}

function countTasks(person: Person) {
  return person.tasks?.length || 0;
}

function getPersonNextStep(person: Person) {
  if (!person.clientId) return 'Vincule esta pessoa ao cliente/contratante correto.';
  if (countDocuments(person) === 0) return 'Depois, vincule documentos pessoais como CPF, RG, CNH, procuração ou e-CPF.';
  if (countTasks(person) === 0) return 'Crie tarefas para acompanhar pendências pessoais ou de representação.';
  return 'Acompanhe documentos pessoais, tarefas e vínculos operacionais.';
}

function getPersonOperationalRole(person: Person) {
  if (person.role === 'OWNER') return 'Dono ou titular ligado ao cliente.';
  if (person.role === 'PARTNER') return 'Sócio vinculado à operação do cliente.';
  if (person.role === 'LEGAL_REPRESENTATIVE') return 'Representante legal para documentos e assinaturas.';
  if (person.role === 'RESPONSIBLE') return 'Responsável operacional ou administrativo.';
  if (person.role === 'CONTACT') return 'Contato para cobrança, envio ou confirmação.';
  return 'Pessoa vinculada ao cliente para fins operacionais.';
}

export function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState<CreatePersonInput>(initialForm);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [deletingPersonId, setDeletingPersonId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<PersonRole | 'ALL'>('ALL');
  const [clientFilter, setClientFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadPeople() {
    setLoading(true);
    setError(null);

    try {
      const [peopleData, clientsData] = await Promise.all([
        listPeople(),
        listClients()
      ]);
      setPeople(peopleData);
      setClients(clientsData);
    } catch (err) {
      setError('Não foi possível carregar donos, sócios e representantes. Verifique API/token.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPeople();
  }, []);

  const filteredPeople = useMemo(() => {
    const term = search.trim().toLowerCase();

    return people.filter((person) => {
      const roleOk = roleFilter === 'ALL' || person.role === roleFilter;
      const clientOk = clientFilter === 'ALL' || person.clientId === clientFilter;
      const searchOk = !term || [
        person.name,
        person.cpf,
        person.email,
        person.phone,
        person.client?.name,
        personRoleLabels[person.role]
      ].some((value) => value?.toLowerCase().includes(term));

      return roleOk && clientOk && searchOk;
    });
  }, [clientFilter, people, roleFilter, search]);

  const metrics = useMemo(() => {
    return {
      total: people.length,
      owners: people.filter((person) => person.role === 'OWNER').length,
      legalRepresentatives: people.filter((person) => person.role === 'LEGAL_REPRESENTATIVE').length,
      linkedDocuments: people.reduce((total, person) => total + countDocuments(person), 0)
    };
  }, [people]);

  function startEditingPerson(person: Person) {
    setEditingPerson(person);
    setForm({
      clientId: person.clientId || '',
      name: person.name,
      cpf: person.cpf || '',
      email: person.email || '',
      phone: person.phone || '',
      role: person.role
    });
    setError(null);
    setSuccess(null);
  }

  function cancelEditingPerson() {
    setEditingPerson(null);
    setForm(initialForm);
    setError(null);
    setSuccess(null);
  }

  function startDeletingPerson(person: Person) {
    setDeletingPersonId(person.id);
    setError(null);
    setSuccess(null);
  }

  function cancelDeletingPerson() {
    setDeletingPersonId(null);
    setError(null);
  }

  async function handleDeletePerson(person: Person) {
    setError(null);
    setSuccess(null);

    try {
      await deletePerson(person.id);
      setPeople((current) => current.filter((item) => item.id !== person.id));
      if (editingPerson?.id === person.id) cancelEditingPerson();
      setSuccess('Pessoa excluída com sucesso.');
      window.setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Não foi possível excluir. Verifique se a pessoa possui documentos pessoais ou tarefas vinculadas.');
    } finally {
      setDeletingPersonId(null);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const payload: CreatePersonInput = {
      clientId: form.clientId || null,
      name: form.name.trim(),
      cpf: form.cpf?.trim() || null,
      email: form.email?.trim() || null,
      phone: form.phone?.trim() || null,
      role: form.role || 'OTHER'
    };

    if (!payload.name) {
      setError('Informe o nome da pessoa física.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (editingPerson) {
        const updated = await updatePerson(editingPerson.id, payload);
        setPeople((current) => current.map((person) => person.id === updated.id ? updated : person));
        setEditingPerson(null);
        setForm(initialForm);
        setSuccess('Pessoa atualizada com sucesso.');
        window.setTimeout(() => setSuccess(null), 3000);
        return;
      }

      const created = await createPerson(payload);
      setPeople((current) => [created, ...current]);
      setForm(initialForm);
      setSuccess('Pessoa cadastrada com sucesso.');
      window.setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(editingPerson ? 'Não foi possível atualizar a pessoa.' : 'Não foi possível cadastrar a pessoa.');
    } finally {
      setSaving(false);
    }
  }

  const formTitle = editingPerson ? 'Editar pessoa física vinculada' : 'Cadastrar pessoa física vinculada';
  const submitLabel = editingPerson ? 'Salvar alterações' : 'Criar pessoa';

  return (
    <div className="stack people-page">
      <div className="page-title people-title">
        <div>
          <h2>Pessoas</h2>
          <p className="lead">Cadastre donos, sócios, representantes legais e responsáveis. Esta área não substitui Clientes: ela identifica as pessoas físicas por trás do cliente ou da empresa.</p>
        </div>
        <div className="people-actions">
          <Badge color="teal">Pessoas físicas</Badge>
          <button className="person-secondary-button" type="button" onClick={loadPeople}>Atualizar</button>
        </div>
      </div>

      {error ? <div className="people-alert error">{error}</div> : null}
      {success ? <div className="people-alert success">{success}</div> : null}

      <div className="people-context-box">
        <strong>Diferença operacional</strong>
        <span><b>Clientes</b> são os contratantes/carteiras do escritório. <b>Pessoas</b> são donos, sócios, representantes ou responsáveis ligados a esses clientes.</span>
        <span>Use esta área para documentos pessoais: CPF, RG, CNH, comprovante de residência, procuração, certificado e-CPF e assinaturas.</span>
      </div>

      <div className="grid four">
        <Card color="teal" title="Pessoas físicas"><div className="metric">{metrics.total}</div><p>Donos, sócios e responsáveis cadastrados.</p></Card>
        <Card color="green" title="Donos"><div className="metric">{metrics.owners}</div><p>Titulares ou donos vinculados.</p></Card>
        <Card color="violet" title="Representantes"><div className="metric">{metrics.legalRepresentatives}</div><p>Representantes legais.</p></Card>
        <Card color="amber" title="Docs pessoais"><div className="metric">{metrics.linkedDocuments}</div><p>Documentos pessoais vinculados.</p></Card>
      </div>

      <div className="grid two people-workspace">
        <Card title={formTitle} color={editingPerson ? 'amber' : 'teal'}>
          <form className="person-form" onSubmit={handleSubmit}>
            {editingPerson ? <p className="lead">Editando <strong>{editingPerson.name}</strong>.</p> : null}
            <label>Nome da pessoa física<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ex.: João Silva" /></label>
            <div className="person-form-grid">
              <label>CPF<input value={form.cpf || ''} onChange={(event) => setForm({ ...form, cpf: event.target.value })} placeholder="000.000.000-00" /></label>
              <label>Papel no cliente/empresa<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as PersonRole })}>{PERSON_ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></label>
            </div>
            <div className="person-form-grid">
              <label>Email pessoal/profissional<input value={form.email || ''} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="email@cliente.com" /></label>
              <label>Telefone da pessoa<input value={form.phone || ''} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="5521999999999" /></label>
            </div>
            <label>Cliente/contratante vinculado<select value={form.clientId || ''} onChange={(event) => setForm({ ...form, clientId: event.target.value })}><option value="">Sem cliente vinculado</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
            <div className="person-form-actions">
              <button className="person-primary-button" type="submit" disabled={saving}>{saving ? 'Salvando...' : submitLabel}</button>
              {editingPerson ? <button className="person-secondary-button" type="button" onClick={cancelEditingPerson} disabled={saving}>Cancelar edição</button> : null}
            </div>
          </form>
        </Card>

        <Card title="Filtros de pessoas físicas" color="slate">
          <div className="person-filters">
            <label>Busca<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome, CPF, email, telefone, papel ou cliente" /></label>
            <label>Papel<select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as PersonRole | 'ALL')}><option value="ALL">Todos</option>{PERSON_ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></label>
            <label>Cliente/contratante<select value={clientFilter} onChange={(event) => setClientFilter(event.target.value)}><option value="ALL">Todos</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
            <button className="person-secondary-button" type="button" onClick={() => { setSearch(''); setRoleFilter('ALL'); setClientFilter('ALL'); }}>Limpar filtros</button>
          </div>
        </Card>
      </div>

      <Card title="Donos, sócios e representantes cadastrados" color="slate">
        {loading ? <p className="lead">Carregando pessoas...</p> : null}
        {!loading && filteredPeople.length === 0 ? (
          <div className="people-empty"><strong>Nenhuma pessoa encontrada.</strong><span>Cadastre um dono, sócio, representante ou responsável, ou ajuste os filtros.</span></div>
        ) : null}

        {!loading && filteredPeople.length > 0 ? (
          <div className="people-list">
            {filteredPeople.map((person) => (
              <article className="person-card" key={person.id}>
                <div className="person-card-main">
                  <div>
                    <strong>{person.name}</strong>
                    <span>{personRoleLabels[person.role]} · Cliente/contratante: {person.client?.name || 'Sem cliente vinculado'}</span>
                    <span>CPF: {formatOptional(person.cpf)} · Telefone: {formatOptional(person.phone)}</span>
                    <span>Email: {formatOptional(person.email)}</span>
                    <span className="person-role-note">{getPersonOperationalRole(person)}</span>
                  </div>
                  <div className="person-card-meta">
                    <Badge color="teal">{personRoleLabels[person.role]}</Badge>
                    <Badge color="amber">{countDocuments(person)} docs pessoais</Badge>
                    <Badge color="violet">{countTasks(person)} tarefas</Badge>
                    <button className="person-secondary-button" type="button" onClick={() => startEditingPerson(person)} disabled={deletingPersonId === person.id}>Editar</button>
                    <button className="person-secondary-button" type="button" onClick={() => startDeletingPerson(person)} disabled={deletingPersonId === person.id}>{deletingPersonId === person.id ? 'Confirmando...' : 'Excluir'}</button>
                  </div>
                </div>

                <div className="person-next-step">
                  <strong>Próximo passo</strong>
                  <span>{getPersonNextStep(person)}</span>
                </div>

                {deletingPersonId === person.id ? (
                  <div className="person-delete-box">
                    <strong>Tem certeza que deseja excluir esta pessoa?</strong>
                    <span>Não será possível excluir se houver documentos pessoais ou tarefas vinculadas.</span>
                    <div className="person-form-actions">
                      <button className="person-primary-button" type="button" onClick={() => handleDeletePerson(person)}>Confirmar exclusão</button>
                      <button className="person-secondary-button" type="button" onClick={cancelDeletingPerson}>Cancelar</button>
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}
      </Card>
    </div>
  );
}

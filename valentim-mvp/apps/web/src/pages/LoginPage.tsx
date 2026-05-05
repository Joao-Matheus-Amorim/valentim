import { FormEvent, useState } from 'react';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { login } from '../services/auth';
import './LoginPage.css';

interface LoginPageProps {
  onAuthenticated: () => Promise<void>;
}

export function LoginPage({ onAuthenticated }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login({ email, password });
      await onAuthenticated();
    } catch (err) {
      setError('Não foi possível entrar. Verifique a API, o banco e as credenciais.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <Card color="green" className="login-card">
        <div className="login-brand">
          <Badge color="green">Valentim</Badge>
          <span>CRM Contábil WhatsApp-first</span>
        </div>

        <h1>Entrar no painel do escritório</h1>
        <p className="lead">Acesse o dashboard para gerenciar clientes, empresas, documentos, tarefas, prazos, financeiro e triagem de IA.</p>

        {error ? <div className="login-error">{error}</div> : null}

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" placeholder="seu@email.com" />
          </label>

          <label>
            Senha
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" placeholder="sua senha" />
          </label>

          <button type="submit" disabled={loading || !email || !password}>{loading ? 'Entrando...' : 'Entrar'}</button>
        </form>
      </Card>
    </div>
  );
}

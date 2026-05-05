import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      const token = res.data.token;
      localStorage.setItem('token', token);
      onLogin(token);
    } catch (err) {
      alert('Login failed');
    }
  };
  return (
    <div style={{ padding: '2rem' }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', maxWidth: '300px' }}>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
        <button type="submit">Login</button>
      </form>
    </div>
  );
}

function Dashboard({ token }: { token: string }) {
  const [dashboard, setDashboard] = useState<any>(null);
  useEffect(() => {
    async function fetchDashboard() {
      const res = await axios.get('/api/dashboard', { headers: { Authorization: `Bearer ${token}` } });
      setDashboard(res.data);
    }
    fetchDashboard();
  }, [token]);
  if (!dashboard) return <div>Loading...</div>;
  return (
    <div style={{ padding: '2rem' }}>
      <h2>Dashboard</h2>
      <pre>{JSON.stringify(dashboard, null, 2)}</pre>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const handleLogin = (tok: string) => setToken(tok);
  return <div>{!token ? <Login onLogin={handleLogin} /> : <Dashboard token={token} />}</div>;
}

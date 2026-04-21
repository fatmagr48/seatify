import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/login', { email, password });
      if (!res.data.is_admin) {
        setError('Unauthorized: Admin access required');
        return;
      }
      localStorage.setItem('token', res.data.access_token);
      localStorage.setItem('is_admin', 'true');
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed');
    }
  };

  return (
    <div style={{ maxWidth: '450px', margin: '4rem auto' }} className="glass-panel">
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <img 
          src="/logo.png" 
          alt="Seatify Logo" 
          style={{ height: '50px', width: 'auto', marginBottom: '1rem', filter: 'grayscale(1) brightness(0.2)' }} 
        />
        <h2 style={{ marginBottom: '0.3rem' }}>Admin Portal</h2>
        <p style={{ color: 'var(--text-muted)' }}>Sign in to manage the Seatify network</p>
      </div>
      
      {error && <div style={{ color: '#ef4444', marginBottom: '1rem', textAlign: 'center', padding: '0.5rem', background: '#fef2f2', borderRadius: '8px' }}>{error}</div>}
      
      <form onSubmit={handleLogin}>
        <input
          className="input-field"
          type="email"
          placeholder="Admin Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="input-field"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="btn btn-pill" style={{ width: '100%', marginTop: '1rem', background: '#222', color: 'white', boxShadow: 'none' }}>Authenticate</button>
      </form>
    </div>
  );
}

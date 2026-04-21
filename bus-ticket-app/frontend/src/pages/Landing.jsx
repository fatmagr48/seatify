import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      textAlign: 'center',
    }}>
      <div className="glass-panel no-hover-lift" style={{ maxWidth: '520px', width: '100%', padding: '3.5rem 2.5rem' }}>
        {/* Icon */}
        <img 
          src="/logo.png" 
          alt="Seatify Logo" 
          style={{ height: '80px', width: 'auto', marginBottom: '1.5rem' }} 
        />

        <h1 style={{ fontSize: '2.4rem', marginBottom: '0.6rem', color: 'var(--primary)' }}>
          Seatify
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem', fontSize: '1.05rem' }}>
          Your seat, your journey. Turkey's smart way to travel.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
          <button
            className="btn btn-pill"
            style={{ width: '80%', padding: '1rem', fontSize: '1rem' }}
            onClick={() => navigate('/login')}
          >
            Login as Passenger
          </button>
          <button
            className="btn btn-secondary"
            style={{ width: '80%', padding: '1rem', fontSize: '1rem' }}
            onClick={() => navigate('/admin-login')}
          >
            Login as Admin
          </button>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            New here?{' '}
            <span
              style={{ color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
              onClick={() => navigate('/register')}
            >
              Create an account
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

import { Link, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const isAdmin = localStorage.getItem('is_admin') === 'true';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('is_admin');
    navigate('/');
  };

  return (
    <nav className="glass" style={{
      padding: '0.75rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      margin: '1rem',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-md)',
    }}>
      {/* Brand */}
      <Link
        to={token ? (isAdmin ? '/admin' : '/trips') : '/'}
        style={{
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <img 
          src="/logo.png" 
          alt="Seatify Logo" 
          style={{ height: '40px', width: 'auto', borderRadius: '8px' }} 
        />
      </Link>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {token ? (
          <>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(124, 108, 246, 0.08)',
              padding: '0.4rem 1rem',
              borderRadius: '99px',
            }}>
              <span style={{ fontSize: '1rem' }}>{isAdmin ? '🛡️' : '👤'}</span>
              <span style={{
                color: 'var(--primary)',
                fontSize: '0.85rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                {isAdmin ? 'Admin' : 'Passenger'}
              </span>
            </div>
            <button
              className="btn btn-secondary"
              onClick={handleLogout}
              style={{ padding: '0.5rem 1.2rem', fontSize: '0.9rem', borderRadius: '12px' }}
            >
              Logout
            </button>
          </>
        ) : (
          <Link
            to="/login"
            className="btn btn-pill"
            style={{ textDecoration: 'none', padding: '0.6rem 1.8rem', fontSize: '0.95rem' }}
          >
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}

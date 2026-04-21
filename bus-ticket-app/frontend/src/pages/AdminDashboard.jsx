import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';

const maskPhone = (phone) => {
  if (!phone || phone.length < 7) return phone;
  return `${phone.slice(0, 3)}***${phone.slice(-4)}`;
};

const maskIdentity = (id) => {
  if (!id || id.length < 5) return id;
  return `${id.slice(0, 3)}*****${id.slice(-2)}`;
};

const Seat = ({ seat, isSelected, onClick }) => {
  const isOccupied = seat.is_reserved;
  
  const getSeatColor = () => {
    if (isSelected) return 'var(--primary)';
    if (isOccupied) {
      return seat.gender === 'female' ? 'var(--seat-female)' : 'var(--seat-male)';
    }
    return 'var(--seat-empty)';
  };

  const getGridColumn = () => {
    if (seat.seat_number.endsWith('A')) return 1;
    if (seat.seat_number.endsWith('B')) return 2;
    if (seat.seat_number.endsWith('C')) return 4;
    return 1;
  };

  return (
    <div 
      onClick={() => !isOccupied && onClick(seat)}
      style={{
        width: '40px',
        height: '45px',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isOccupied ? 'not-allowed' : 'pointer',
        background: getSeatColor(),
        color: (isOccupied || isSelected) ? 'white' : 'var(--text-main)',
        fontWeight: '700',
        fontSize: '0.8rem',
        boxShadow: isOccupied ? 'none' : '0 2px 5px rgba(0,0,0,0.05)',
        transition: 'all 0.2s',
        gridColumn: getGridColumn(),
      }}
    >
      {seat.seat_number}
      {isOccupied && (
        <div style={{ position: 'absolute', bottom: '-18px', fontSize: '0.55rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontWeight: 600 }}>
           {seat.first_name}
        </div>
      )}
    </div>
  );
};

export default function AdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'records';
  
  const setActiveTab = (tab) => {
    setSearchParams({ tab });
  };

  const [bookings, setBookings] = useState([]);
  const [trips, setTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [seats, setSeats] = useState([]);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liveLogs, setLiveLogs] = useState([]);
  
  const [passengerInfo, setPassengerInfo] = useState({
    first_name: '',
    last_name: '',
    gender: 'female',
    age: '',
    phone: '',
    identity_number: ''
  });

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchBookings(), fetchTrips()]);
      setLoading(false);
    };
    init();

    const ws = new WebSocket('ws://localhost:8000/ws/admin');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setLiveLogs(prev => [{
        id: Date.now(),
        ...data,
        receivedAt: new Date().toLocaleTimeString()
      }, ...prev].slice(0, 50));
    };
    return () => ws.close();
  }, []);

  const fetchBookings = async () => {
    try {
      const res = await api.get('/admin/bookings');
      setBookings(res.data);
    } catch (err) {
      setError('Failed to load bookings');
    }
  };

  const fetchTrips = async () => {
    try {
      const res = await api.get('/trips');
      setTrips(res.data);
    } catch (err) {
      setError('Failed to load trips');
    }
  };

  useEffect(() => {
    if (selectedTripId) {
      const fetchSeats = async () => {
        try {
          const res = await api.get(`/seats/${selectedTripId}`);
          setSeats(res.data);
          setSelectedSeat(null);
        } catch (err) {
          setError('Failed to load seats');
        }
      };
      fetchSeats();
    }
  }, [selectedTripId]);

  const handleAdminBook = async (e) => {
    e.preventDefault();
    if (!selectedSeat) return alert('Please select a seat');
    
    // Phone validation: 10-11 digits
    const phoneRegex = /^\d{10,11}$/;
    if (!phoneRegex.test(passengerInfo.phone)) {
      return alert('Phone number must be between 10 and 11 digits');
    }

    try {
      await api.post('/book', {
        trip_id: parseInt(selectedTripId),
        seat_number: selectedSeat,
        ...passengerInfo,
        age: parseInt(passengerInfo.age)
      });
      const res = await api.get(`/seats/${selectedTripId}`);
      setSeats(res.data);
      setSelectedSeat(null);
      setPassengerInfo({ first_name: '', last_name: '', gender: 'female', age: '', phone: '', identity_number: '' });
      fetchBookings();
    } catch (err) {
      alert(err.response?.data?.detail || 'Booking failed');
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', height: 'fit-content' }}>
      
      {/* Main Content Area */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {activeTab === 'booking' && (
              <button 
                onClick={() => setActiveTab('records')} 
                className="btn btn-secondary" 
                style={{ width: '40px', height: '40px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ←
              </button>
            )}
            <div>
              <h1 style={{ fontSize: '2.2rem', margin: 0 }}>Control Center</h1>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>Administrative tools & overview</p>
            </div>
          </div>
          <div className="glass" style={{ display: 'flex', gap: '0.4rem', padding: '0.4rem', borderRadius: '16px' }}>
            <button 
              className={`btn ${activeTab === 'records' ? '' : 'btn-secondary'}`}
              style={{ padding: '0.6rem 1.4rem', borderRadius: '12px', fontSize: '0.9rem', border: 'none' }}
              onClick={() => setActiveTab('records')}
            >
              📜 Records
            </button>
            <button 
              className={`btn ${activeTab === 'booking' ? '' : 'btn-secondary'}`}
              style={{ padding: '0.6rem 1.4rem', borderRadius: '12px', fontSize: '0.9rem', border: 'none' }}
              onClick={() => setActiveTab('booking')}
            >
              ➕ Manual Booking
            </button>
          </div>
        </div>

        {error && <div style={{ color: 'var(--error)', background: '#fff5f5', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid rgba(255,107,107,0.1)' }}>{error}</div>}

        {activeTab === 'records' ? (
          <div className="glass-panel no-hover-lift" style={{ overflowX: 'auto', padding: '0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F9F9FF' }}>
                  <th style={{ padding: '1.2rem', fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Passenger</th>
                  <th style={{ padding: '1.2rem', fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Route</th>
                  <th style={{ padding: '1.2rem', fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Seat</th>
                  <th style={{ padding: '1.2rem', fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Phone</th>
                  <th style={{ padding: '1.2rem', fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Identity</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} style={{ borderBottom: '1.5px solid var(--bg-main)', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#F9F9FF'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '1.2rem', fontWeight: 700 }}>{b.first_name}</td>
                    <td style={{ padding: '1.2rem', fontSize: '0.95rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{b.origin}</span>
                      <span style={{ margin: '0 0.5rem', color: 'var(--primary)' }}>➔</span>
                      <span>{b.destination}</span>
                    </td>
                    <td style={{ padding: '1.2rem' }}><span className="badge badge-primary">{b.seat_number}</span></td>
                    <td style={{ padding: '1.2rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{maskPhone(b.phone)}</td>
                    <td style={{ padding: '1.2rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{maskIdentity(b.identity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div className="glass-panel no-hover-lift">
              <h3 style={{ marginBottom: '1.5rem' }}>Cabin Layout</h3>
              <select className="input-field" value={selectedTripId} onChange={(e) => setSelectedTripId(e.target.value)} style={{ marginBottom: '2rem' }}>
                <option value="">-- Select Trip --</option>
                {trips.map(t => <option key={t.id} value={t.id}>{t.origin} ➔ {t.destination}</option>)}
              </select>
              {selectedTripId && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', background: 'var(--bg-main)', padding: '2rem', borderRadius: '30px', maxWidth: '280px', margin: '0 auto' }}>
                  {seats.map(s => <Seat key={s.seat_number} seat={s} isSelected={selectedSeat === s.seat_number} onClick={() => setSelectedSeat(s.seat_number)} />)}
                </div>
              )}
            </div>
            <div className="glass-panel no-hover-lift">
              <h3 style={{ marginBottom: '1.5rem' }}>Passenger Details</h3>
              <form onSubmit={handleAdminBook} className="form-grid">
                <div className="form-group"><label className="label">First Name</label><input type="text" required className="input-field" value={passengerInfo.first_name} onChange={e => setPassengerInfo({...passengerInfo, first_name: e.target.value})} /></div>
                <div className="form-group"><label className="label">Last Name</label><input type="text" required className="input-field" value={passengerInfo.last_name} onChange={e => setPassengerInfo({...passengerInfo, last_name: e.target.value})} /></div>
                <div className="form-group"><label className="label">Gender</label><select className="input-field" value={passengerInfo.gender} onChange={e => setPassengerInfo({...passengerInfo, gender: e.target.value})}><option value="female">Female</option><option value="male">Male</option></select></div>
                <div className="form-group"><label className="label">Age</label><input type="number" required className="input-field" value={passengerInfo.age} onChange={e => setPassengerInfo({...passengerInfo, age: e.target.value})} /></div>
                <div className="form-group"><label className="label">Phone Number</label><input type="text" required placeholder="5XXXXXXXXX" className="input-field" value={passengerInfo.phone} onChange={e => setPassengerInfo({...passengerInfo, phone: e.target.value.replace(/\D/g, '')})} maxLength={11} /></div>
                <div className="form-group full"><label className="label">ID Number</label><input type="text" required className="input-field" value={passengerInfo.identity_number} onChange={e => setPassengerInfo({...passengerInfo, identity_number: e.target.value})} /></div>
                <button type="submit" className="btn btn-pill" style={{ width: '100%', marginTop: '1rem', gridColumn: 'span 2' }} disabled={!selectedSeat}>Reserve Now</button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar: Live Logs */}
      <div className="glass-panel no-hover-lift" style={{ height: 'calc(100vh - 120px)', position: 'sticky', top: '100px', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
        <div style={{ borderBottom: '1.5px solid var(--bg-main)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.4rem' }}>📡</span> Live Activities
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Real-time Kafka event bridge</p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {liveLogs.length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>☁️</div>
              <p style={{ fontSize: '0.85rem' }}>Listening for events...</p>
            </div>
          ) : (
            liveLogs.map(log => (
              <div key={log.id} style={{ 
                padding: '1rem', 
                background: 'var(--bg-main)', 
                borderRadius: '16px', 
                borderLeft: '4px solid var(--primary)',
                animation: 'slideUp 0.3s ease-out'
              }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                  {log.receivedAt}
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: '1.4' }}>
                  {log.message}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                  Trip: {log.trip} | Seat: <strong>{log.seat}</strong>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function TripCard({ trip, onClick }) {
  const date = new Date(trip.date);
  const timeStr = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const dateStr = date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });

  return (
    <div
      className="glass-panel"
      style={{ 
        padding: '1.5rem', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1.2rem',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden'
      }}
      onClick={onClick}
    >
      <div style={{ position: 'absolute', top: 0, right: 0, padding: '0.5rem 1rem', background: 'rgba(124, 108, 246, 0.1)', color: 'var(--primary)', fontWeight: 700, borderBottomLeftRadius: '16px', fontSize: '0.85rem' }}>
        #{trip.id}
      </div>

      <div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Route</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <span style={{ fontWeight: 700, fontSize: '1.2rem' }}>{trip.origin}</span>
          <span style={{ color: 'var(--primary)', fontSize: '1.4rem' }}>➞</span>
          <span style={{ fontWeight: 700, fontSize: '1.2rem' }}>{trip.destination}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Departure</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{timeStr}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{dateStr}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Price</div>
          <div style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '1.4rem' }}>₺500.00</div>
        </div>
      </div>

      <button className="btn btn-pill" style={{ width: '100%', padding: '0.9rem' }}>
        Select Seat
      </button>
    </div>
  );
}

export default function Trips() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useState({ origin: '', destination: '', date: '' });
  const navigate = useNavigate();

  const cities = ["Istanbul", "Ankara", "Izmir", "Bursa", "Antalya", "Adana", "Konya", "Kütahya"];

  useEffect(() => { 
    fetchTrips(); 
  }, []);

  const fetchTrips = async (params = {}) => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (params.origin) query.append('origin', params.origin);
      if (params.destination) query.append('destination', params.destination);
      if (params.date) query.append('date', params.date);

      const url = query.toString() ? `/trips/search?${query.toString()}` : '/trips';
      const res = await api.get(url);
      setTrips(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchTrips(searchParams);
  };

  const swapCities = () => {
    setSearchParams(prev => ({
      ...prev,
      origin: prev.destination,
      destination: prev.origin
    }));
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Hero Search Section */}
      <div style={{ 
        padding: '4rem 1rem', 
        textAlign: 'center', 
        background: 'linear-gradient(180deg, rgba(124, 108, 246, 0.05) 0%, transparent 100%)',
        marginBottom: '2rem',
        borderRadius: '0 0 40px 40px'
      }}>
        <h1 style={{ fontSize: '3.5rem', marginBottom: '1rem', color: 'var(--text-main)' }}>Where to next?</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '3rem' }}>Experience the future of travel with Seatify's premium bus network.</p>
        
        <div className="glass" style={{ 
          maxWidth: '900px', 
          margin: '0 auto', 
          padding: '1.5rem', 
          borderRadius: '30px',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <form onSubmit={handleSearch} style={{ 
            display: 'flex', 
            gap: '1rem', 
            alignItems: 'flex-end',
            flexWrap: 'wrap'
          }}>
            <div style={{ flex: 1, minWidth: '180px', position: 'relative' }}>
              <label className="label">Origin</label>
              <select 
                className="input-field"
                value={searchParams.origin}
                onChange={(e) => setSearchParams({...searchParams, origin: e.target.value})}
                style={{ marginBottom: 0 }}
              >
                <option value="">Choose City</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <button 
              type="button" 
              onClick={swapCities}
              style={{
                background: 'var(--primary)',
                color: 'white',
                border: 'none',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '4px',
                fontSize: '1.2rem',
                transition: 'transform 0.3s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'rotate(180deg)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'rotate(0deg)'}
            >
              🔄
            </button>

            <div style={{ flex: 1, minWidth: '180px' }}>
              <label className="label">Destination</label>
              <select 
                className="input-field"
                value={searchParams.destination}
                onChange={(e) => setSearchParams({...searchParams, destination: e.target.value})}
                style={{ marginBottom: 0 }}
              >
                <option value="">Choose City</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ flex: 1, minWidth: '180px' }}>
              <label className="label">Travel Date</label>
              <input 
                type="date" 
                className="input-field"
                value={searchParams.date}
                onChange={(e) => setSearchParams({...searchParams, date: e.target.value})}
                style={{ marginBottom: 0 }}
              />
            </div>

            <button type="submit" className="btn btn-pill" style={{ height: '52px', padding: '0 2.5rem' }}>
               Search
            </button>
          </form>
        </div>
      </div>

      <div className="app-container" style={{ paddingTop: 0 }}>
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.8rem' }}>Available Trips</h2>
            <p style={{ color: 'var(--text-muted)' }}>{trips.length} routes found today</p>
          </div>
          <button className="btn btn-secondary" onClick={() => { setSearchParams({origin:'', destination:'', date:''}); fetchTrips(); }}>Show All</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem' }}>
            <div className="loader" style={{ margin: '0 auto 1.5rem' }}></div>
            <p style={{ color: 'var(--text-muted)' }}>Fetching the newest journeys...</p>
          </div>
        ) : trips.length > 0 ? (
          <div style={{
            display: 'grid',
            gap: '2rem',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          }}>
            {trips.map(trip => (
              <TripCard
                key={trip.id}
                trip={trip}
                onClick={() => navigate(`/trips/${trip.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="glass-panel no-hover-lift" style={{ textAlign: 'center', padding: '5rem' }}>
            <div style={{ fontSize: '5rem', marginBottom: '1.5rem' }}>🎫</div>
            <h2>No Journeys Found</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Maybe try a different date or city?</p>
          </div>
        )}
      </div>
    </div>
  );
}

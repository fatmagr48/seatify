import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const Seat = ({ seat, isSelected, isHovered, isRestricted, onMouseEnter, onMouseLeave, onClick }) => {
  const getSeatColor = () => {
    if (isSelected) return 'var(--primary)';
    if (seat.is_reserved) {
      return seat.gender === 'female' ? 'var(--seat-female)' : 'var(--seat-male)';
    }
    if (isHovered) {
      if (isRestricted) return '#fee2e2';
      return 'rgba(124, 108, 246, 0.1)';
    }
    return isRestricted ? '#f1f1f1' : 'var(--seat-empty)';
  };

  const isOccupied = seat.is_reserved;

  const getGridColumn = () => {
    if (seat.seat_number.endsWith('A')) return 1;
    if (seat.seat_number.endsWith('B')) return 2;
    if (seat.seat_number.endsWith('C')) return 4;
    return 1;
  };

  const seatStyle = {
    width: '45px',
    height: '55px',
    borderRadius: '12px 12px 4px 4px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: isOccupied ? 'not-allowed' : 'pointer',
    fontWeight: '700',
    fontSize: '0.8rem',
    position: 'relative',
    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    boxShadow: isOccupied ? 'none' : '0 4px 10px rgba(0,0,0,0.05)',
    margin: '0 auto',
    background: getSeatColor(),
    color: (isOccupied || isSelected) ? 'white' : 'var(--text-main)',
    transform: (isSelected || isHovered) ? 'scale(1.1) translateY(-3px)' : 'none',
    boxShadow: (isSelected || isHovered) ? '0 10px 20px rgba(124, 108, 246, 0.2)' : (isOccupied ? 'none' : '0 4px 10px rgba(0,0,0,0.05)'),
    border: isRestricted ? '2px dashed var(--error)' : 'none',
    opacity: isRestricted ? 0.45 : 1,
    filter: isRestricted ? 'grayscale(0.6)' : 'none',
    zIndex: (isSelected || isHovered) ? 10 : 1
  };

  return (
    <div 
      style={{ gridColumn: getGridColumn(), position: 'relative' }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div 
        onClick={() => !isOccupied && onClick(seat)}
        style={seatStyle}
      >
        <div style={{ width: '28px', height: '6px', background: 'rgba(255,255,255,0.25)', borderRadius: '10px', marginTop: '4px', marginBottom: '4px' }}></div>
        {seat.seat_number}
        <div style={{ width: '32px', height: '2px', background: 'rgba(0,0,0,0.05)', marginTop: '8px', borderRadius: '2px' }}></div>
      </div>

      {isHovered && isOccupied && (
        <div className="glass" style={{
          position: 'absolute',
          top: '-55px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '0.6rem 1rem',
          borderRadius: '12px',
          fontSize: '0.8rem',
          whiteSpace: 'nowrap',
          zIndex: 20,
          boxShadow: 'var(--shadow-md)',
          pointerEvents: 'none',
          textAlign: 'center',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{seat.first_name}</span>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{seat.gender.toUpperCase()} PASSENGER</div>
        </div>
      )}
      {isHovered && isRestricted && !isOccupied && (
        <div className="glass" style={{
          position: 'absolute',
          top: '-50px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '0.5rem 0.8rem',
          borderRadius: '10px',
          fontSize: '0.75rem',
          whiteSpace: 'nowrap',
          zIndex: 30,
          background: 'var(--error)',
          color: 'white',
          fontWeight: 700,
          boxShadow: 'var(--shadow-lg)'
        }}>
          Gender Restricted
        </div>
      )}
    </div>
  );
};

export default function SeatSelection() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [seats, setSeats] = useState([]);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hoveredSeat, setHoveredSeat] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [passengerInfo, setPassengerInfo] = useState({
    first_name: '',
    last_name: '',
    gender: 'female',
    age: '',
    phone: '',
    identity_number: ''
  });
  const wsRef = useRef(null);
  const { addToast } = useToast();

  const fetchSeats = async () => {
    try {
      const res = await api.get(`/seats/${tripId}`);
      console.log("Seats API Response:", res.data);
      setSeats(res.data);
    } catch (err) {
       setError('Failed to load seats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeats();
    const ws = new WebSocket(`ws://localhost:8000/ws/trips/${tripId}`);
    wsRef.current = ws;
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'seat_update') {
        setSeats(prev => prev.map(s => s.seat_number === data.seat_number ? { 
          ...s, 
          is_reserved: true,
          status: 'reserved', 
          gender: data.gender,
          first_name: data.first_name || s.first_name
        } : s));
        setSelectedSeat(prev => (prev === data.seat_number ? null : prev));
      } else if (data.type === 'trip_reset') {
        fetchSeats();
      }
    };
    return () => ws.close();
  }, [tripId]);

  const handleSeatClick = (seat) => {
    if (seat.is_reserved) return;
    setError('');
    
    const restriction = getGenderRestrictionError(seat.seat_number, passengerInfo.gender);
    if (restriction) {
      addToast("This seat cannot be selected due to gender rules", 'error');
      return;
    }
    
    setSelectedSeat(seat.seat_number === selectedSeat ? null : seat.seat_number);
  };

  const validateTC = (tc) => {
    if (!tc || tc.length !== 11 || !/^\d+$/.test(tc)) return false;
    if (tc[0] === '0') return false;
    const digits = tc.split('').map(Number);
    const sumOdd = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
    const sumEven = digits[1] + digits[3] + digits[5] + digits[7];
    const d10 = ((sumOdd * 7) - sumEven) % 10;
    if (d10 !== digits[9]) return false;
    const d11 = digits.slice(0, 10).reduce((a, b) => a + b, 0) % 10;
    if (d11 !== digits[10]) return false;
    return true;
  };

  const getGenderRestrictionError = (seatNumber, gender) => {
    let neighborNumber = null;
    if (seatNumber.endsWith('A')) neighborNumber = seatNumber.replace('A', 'B');
    else if (seatNumber.endsWith('B')) neighborNumber = seatNumber.replace('B', 'A');
    if (!neighborNumber) return null;
    const neighbor = seats.find(s => s.seat_number === neighborNumber);
    if (neighbor && neighbor.is_reserved && neighbor.gender !== gender) {
      return "Cannot select this seat due to gender rules";
    }
    return null;
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    setError('');
    if (!validateTC(passengerInfo.identity_number)) {
      addToast('Please enter a valid 11-digit Turkish ID.', 'error');
      return;
    }
    navigate('/payment', { 
      state: { 
        tripId: parseInt(tripId),
        seatNumber: selectedSeat,
        passengerInfo: { ...passengerInfo, age: parseInt(passengerInfo.age) }
      } 
    });
  };

  if (loading && !showModal) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="loader"></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Configuring cabin layout...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        
        {/* Left Side: Seat Map */}
        <div className="glass-panel no-hover-lift" style={{ flex: '1.2', minWidth: '350px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <button 
              onClick={() => navigate(-1)} 
              className="btn btn-secondary" 
              style={{ width: '40px', height: '40px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ←
            </button>
            <h2 style={{ fontSize: '1.8rem', margin: 0 }}>Select your seat</h2>
          </div>

          {/* Gender Selector for UX */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            gap: '1rem', 
            marginBottom: '2rem',
            padding: '0.8rem',
            background: 'var(--bg-main)',
            borderRadius: '20px',
            border: '1.5px solid var(--surface-border)'
          }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)', marginRight: '0.5rem' }}>BOOKING AS:</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={() => {
                  setPassengerInfo({...passengerInfo, gender: 'female'});
                  setSelectedSeat(null);
                }}
                className={`btn ${passengerInfo.gender === 'female' ? 'btn-pill' : 'btn-secondary'}`}
                style={{ padding: '0.5rem 1.5rem', fontSize: '0.85rem' }}
              >
                👩 Female
              </button>
              <button 
                onClick={() => {
                  setPassengerInfo({...passengerInfo, gender: 'male'});
                  setSelectedSeat(null);
                }}
                className={`btn ${passengerInfo.gender === 'male' ? 'btn-pill' : 'btn-secondary'}`}
                style={{ padding: '0.5rem 1.5rem', fontSize: '0.85rem' }}
              >
                👨 Male
              </button>
            </div>
          </div>

          {error && <div style={{ color: 'var(--error)', marginBottom: '1.5rem', padding: '1rem', background: '#fff5f5', borderRadius: '12px', fontSize: '0.9rem', border: '1px solid rgba(255, 107, 107, 0.1)' }}>{error}</div>}

          {/* Legend */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginBottom: '3rem', padding: '1rem', background: 'var(--bg-main)', borderRadius: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: 'var(--seat-empty)' }}></div> <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Empty</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: 'var(--primary)' }}></div> <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Selected</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: 'var(--seat-female)' }}></div> <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Female</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: 'var(--seat-male)' }}></div> <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Male</span>
            </div>
          </div>

          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1.5rem', 
            maxWidth: '340px', 
            margin: '0 auto', 
            background: 'white', 
            padding: '2.5rem 1.5rem', 
            borderRadius: '40px 40px 20px 20px', 
            boxShadow: 'inset 0 0 40px rgba(124, 108, 246, 0.05)',
            border: '2px solid var(--surface-border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'flex-start', borderBottom: '2px dashed var(--surface-border)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '44px', height: '44px', background: 'var(--bg-main)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', border: '1.5px solid var(--surface-border)' }}>
                  👨‍✈️
                </div>
                <span style={{ fontSize: '0.7rem', marginTop: '0.5rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.05em' }}>CAPTAIN</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2.5rem 1fr', gap: '14px', alignItems: 'center' }}>
              {seats.map((seat) => (
                <Seat 
                  key={seat.seat_number}
                  seat={seat}
                  isSelected={selectedSeat === seat.seat_number}
                  isHovered={hoveredSeat === seat.seat_number}
                  isRestricted={!!getGenderRestrictionError(seat.seat_number, passengerInfo.gender)}
                  onMouseEnter={() => setHoveredSeat(seat.seat_number)}
                  onMouseLeave={() => setHoveredSeat(null)}
                  onClick={handleSeatClick}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Summary */}
        <div style={{ flex: '0.7', minWidth: '300px', position: 'sticky', top: '7rem' }}>
          <div className={`glass-panel ${selectedSeat ? 'selection-active' : ''}`} style={{ 
            border: selectedSeat ? '2px solid var(--primary)' : '2px solid var(--surface-border)', 
            background: selectedSeat ? 'rgba(124, 108, 246, 0.02)' : 'white',
            animation: selectedSeat ? 'pulseSelection 2s infinite' : 'none'
          }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.4rem' }}>Ticket Summary</h3>
            {selectedSeat ? (
              <div style={{ animation: 'slideRight 0.3s ease-out' }}>
                <div style={{ padding: '1.5rem', background: 'white', borderRadius: '20px', border: '1px solid var(--surface-border)', marginBottom: '1.5rem', boxShadow: 'var(--shadow-md)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.1em' }}>RESERVED SEAT</div>
                  <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--primary)', margin: '0.5rem 0' }}>{selectedSeat}</div>
                  <div style={{ height: '1px', background: 'var(--bg-main)', margin: '1rem 0' }}></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Ticket Price</span>
                    <span style={{ fontWeight: 800, fontSize: '1.3rem' }}>₺500.00</span>
                  </div>
                </div>
                <button className="btn btn-pill" style={{ width: '100%', padding: '1.2rem', gap: '0.8rem' }} onClick={() => setShowModal(true)}>
                  <span>Book This Seat</span>
                  <span style={{ fontSize: '1.2rem' }}>➜</span>
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', border: '2px dashed var(--surface-border)', borderRadius: '20px', opacity: 0.7 }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛋️</div>
                <p style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.9rem' }}>Choose your favorite seat on the map to continue</p>
              </div>
            )}
          </div>
          <style>{`
            @keyframes slideRight { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
            @keyframes pulseSelection { 0% { box-shadow: 0 0 0 0 rgba(124, 108, 246, 0.1); } 70% { box-shadow: 0 0 0 10px rgba(124, 108, 246, 0); } 100% { box-shadow: 0 0 0 0 rgba(124, 108, 246, 0); } }
          `}</style>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '550px', padding: '2.5rem' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.8rem', marginBottom: '0.3rem' }}>Passenger info</h2>
              <p style={{ color: 'var(--text-muted)' }}>Required details for seat <strong>{selectedSeat}</strong></p>
            </div>

            <form onSubmit={handleNextStep}>
              <div className="form-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <label className="label">First Name</label>
                  <input type="text" required className="input-field" value={passengerInfo.first_name} onChange={e => setPassengerInfo({...passengerInfo, first_name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="label">Last Name</label>
                  <input type="text" required className="input-field" value={passengerInfo.last_name} onChange={e => setPassengerInfo({...passengerInfo, last_name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="label">Gender</label>
                  <select className="input-field" value={passengerInfo.gender} onChange={e => setPassengerInfo({...passengerInfo, gender: e.target.value})}>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Age</label>
                  <input type="number" required className="input-field" value={passengerInfo.age} onChange={e => setPassengerInfo({...passengerInfo, age: e.target.value})} />
                </div>
                <div className="form-group full">
                  <label className="label">Phone Number</label>
                  <input type="tel" required className="input-field" value={passengerInfo.phone} onChange={e => setPassengerInfo({...passengerInfo, phone: e.target.value})} />
                </div>
                <div className="form-group full">
                  <label className="label">Turkish ID (TC No)</label>
                  <input type="text" required className="input-field" value={passengerInfo.identity_number} onChange={e => setPassengerInfo({...passengerInfo, identity_number: e.target.value})} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Back</button>
                <button type="submit" className="btn btn-pill" style={{ flex: 1 }}>Proceed to Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import './SeatMap.css';

const MOCK_API_URL = 'http://localhost:8002'; // Booking service docker mapped port

export default function SeatMap({ tripId }) {
  const [seats, setSeats] = useState([]);
  const [layoutType, setLayoutType] = useState('2+1');
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Example Mode toggle (Reserve vs Change)
  const [mode, setMode] = useState('reserve'); // 'reserve' or 'change'
  const [ownedSeat, setOwnedSeat] = useState(null);

  useEffect(() => {
    fetchSeats();
  }, [tripId]);

  const fetchSeats = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${MOCK_API_URL}/seats/${tripId || 'trip1'}`);
      const data = await res.json();
      setSeats(data.seats || []);
      setLayoutType(data.layoutType || '2+1');
    } catch (err) {
      setError('Failed to fetch seats. Make sure backend is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSeatClick = (seat) => {
    if (seat.status === 'occupied') {
        if (mode === 'change' && !ownedSeat) {
            setOwnedSeat(seat);
            setSuccessMsg(`Selected your owned seat: ${seat.id}. Now select an available seat to change.`);
            return;
        }
        return; // Clicked someone else's occupied seat
    }
    
    // Changing seat logic
    if (mode === 'change' && ownedSeat) {
       changeSeat(ownedSeat.id, seat.id);
       return;
    }

    // Reservation logic
    if (mode === 'reserve') {
        setSelectedSeat(seat);
    }
  };

  const reserveSeat = async () => {
    if (!selectedSeat) return;
    try {
      const res = await fetch(`${MOCK_API_URL}/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seat_id: selectedSeat.id, user_id: 'user_123' })
      });
      if (!res.ok) throw new Error('Failed to reserve');
      setSuccessMsg(`Seat ${selectedSeat.id} reserved!`);
      setSelectedSeat(null);
      fetchSeats();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError('Could not reserve seat');
      setTimeout(() => setError(''), 3000);
    }
  };

  const changeSeat = async (oldId, newId) => {
      try {
        const res = await fetch(`${MOCK_API_URL}/change-seat`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ old_seat_id: oldId, new_seat_id: newId })
        });
        if (!res.ok) throw new Error('Failed to change seat');
        setSuccessMsg(`Seat changed from ${oldId} to ${newId}!`);
        setOwnedSeat(null);
        setSelectedSeat(null);
        fetchSeats();
        setTimeout(() => setSuccessMsg(''), 3000);
      } catch (err) {
        setError('Could not change seat');
        setTimeout(() => setError(''), 3000);
      }
  }

  if (loading) return <div className="loader">Loading seats...</div>;

  // Group seats by row (assuming IDs like "1A", "1B", "1C")
  const rows = seats.reduce((acc, seat) => {
    const rowNum = seat.id.match(/\d+/)[0];
    if (!acc[rowNum]) acc[rowNum] = [];
    acc[rowNum].push(seat);
    return acc;
  }, {});

  return (
    <div className="seat-map-container">
        <div className="seat-map-header">
            <h2>Select Your Seat</h2>
            <div className="mode-toggle">
                <button className={mode === 'reserve' ? 'active' : ''} onClick={() => { setMode('reserve'); setOwnedSeat(null); setSelectedSeat(null); }}>Buy Ticket</button>
                <button className={mode === 'change' ? 'active' : ''} onClick={() => { setMode('change'); setSelectedSeat(null); }}>Change Seat</button>
            </div>
            
            {mode === 'change' && !ownedSeat && <p className="instruction">Select your current seat first (mocking an occupied seat for testing).</p>}
        </div>

        {error && <div className="toast error">{error}</div>}
        {successMsg && <div className="toast success">{successMsg}</div>}

        <div className="bus-layout">
            <div className="steering-wheel">Steering Wheel</div>
            
            {Object.keys(rows).map(rowNum => {
                const rowSeats = rows[rowNum];
                return (
                    <div className="seat-row" key={rowNum}>
                        <div className="seat-group-left">
                            {rowSeats.filter(s => s.type !== 'single').map(seat => (
                                <Seat 
                                    key={seat.id} 
                                    seat={seat} 
                                    mode={mode}
                                    ownedSeat={ownedSeat}
                                    selectedSeat={selectedSeat}
                                    onClick={() => handleSeatClick(seat)} 
                                />
                            ))}
                        </div>
                        <div className="aisle"></div>
                        <div className="seat-group-right">
                             {rowSeats.filter(s => s.type === 'single').map(seat => (
                                <Seat 
                                    key={seat.id} 
                                    seat={seat} 
                                    mode={mode}
                                    ownedSeat={ownedSeat}
                                    selectedSeat={selectedSeat}
                                    onClick={() => handleSeatClick(seat)} 
                                />
                            ))}
                        </div>
                    </div>
                )
            })}
        </div>

        {mode === 'reserve' && selectedSeat && (
            <div className="action-panel">
                <p>Selected Seat: <strong>{selectedSeat.id}</strong></p>
                <button className="btn-primary" onClick={reserveSeat}>Confirm Reservation</button>
            </div>
        )}
    </div>
  );
}

function Seat({ seat, selectedSeat, ownedSeat, onClick, mode }) {
    let classes = ['seat'];
    if (seat.status === 'occupied') classes.push('occupied');
    if (seat.status === 'available') classes.push('available');
    
    // UI states for interactions
    if (selectedSeat?.id === seat.id) classes.push('selected');
    if (ownedSeat?.id === seat.id) classes.push('owned');

    return (
        <div className={classes.join(' ')} onClick={onClick}>
            {seat.id}
        </div>
    )
}

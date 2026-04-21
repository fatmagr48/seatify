import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

export default function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const bookingData = location.state;

  const [cardInfo, setCardInfo] = useState({
    card_number: '',
    card_name: '',
    expiry: '',
    cvv: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (!bookingData) {
      navigate('/trips');
    }
  }, [bookingData, navigate]);

  if (!bookingData) return null;

  const validatePayment = () => {
    const { card_number, expiry, cvv } = cardInfo;
    if (!/^\d{16}$/.test(card_number.replace(/\s/g, ''))) return "Card number must be exactly 16 digits.";
    if (!/^\d{3}$/.test(cvv)) return "CVV must be 3 digits.";
    const expiryMatch = expiry.match(/^(\d{2})\/(\d{2})$/);
    if (!expiryMatch) return "Expiry must be in MM/YY format.";
    const month = parseInt(expiryMatch[1]);
    const year = parseInt(`20${expiryMatch[2]}`);
    const now = new Date();
    const expiryDate = new Date(year, month - 1);
    if (month < 1 || month > 12) return "Invalid month in expiry.";
    if (expiryDate < now) return "Expiry date must be in the future.";
    return null;
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setError('');
    const validationError = validatePayment();
    if (validationError) {
      addToast(validationError, 'error');
      return;
    }
    setLoading(true);
    try {
      await api.post('/payment', {
        ...cardInfo,
        card_number: cardInfo.card_number.replace(/\s/g, ''),
        amount: 500.00
      });
      await api.post('/book', {
        trip_id: bookingData.tripId,
        seat_number: bookingData.seatNumber,
        ...bookingData.passengerInfo
      });
      addToast('Payment successful! Your journey is confirmed.', 'success');
      setSuccess(true);
      setTimeout(() => navigate('/trips'), 4000);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Transaction failed. Please try again.';
      addToast(msg, 'error');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length > 0 ? parts.join(' ') : v;
  };

  if (success) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem', maxWidth: '500px', borderRadius: '40px' }}>
          <div className="success-checkmark">
            <div className="check-icon">
              <span className="icon-line line-tip"></span>
              <span className="icon-line line-long"></span>
              <div className="icon-circle"></div>
              <div className="icon-fix"></div>
            </div>
          </div>
          <h1 style={{ color: 'var(--text-main)', fontSize: '2.2rem', marginBottom: '1rem' }}>Sent!</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: '1.6' }}>
            Your journey for seat <strong>{bookingData.seatNumber}</strong> is confirmed. Check your email for the ticket.
          </p>
          <div className="loader" style={{ margin: '2rem auto' }}></div>
          <style>{`
            .success-checkmark { width: 80px; height: 115px; margin: 0 auto; }
            .check-icon { width: 80px; height: 80px; position: relative; border-radius: 50%; box-sizing: content-box; border: 4px solid #4CAF50; }
            .check-icon::before { top: 3px; left: -2px; width: 30px; transform-origin: 100% 50%; border-radius: 100px 0 0 100px; }
            .check-icon::after { top: 0; left: 30px; width: 60px; transform-origin: 0 50%; border-radius: 0 100px 100px 0; animation: rotateCircle 4.25s ease-in; }
            .icon-line { height: 5px; background-color: #4CAF50; display: block; border-radius: 2px; position: absolute; z-index: 10; }
            .line-tip { top: 46px; left: 14px; width: 25px; transform: rotate(45deg); animation: icon-line-tip 0.75s; }
            .line-long { top: 38px; right: 8px; width: 47px; transform: rotate(-45deg); animation: icon-line-long 0.75s; }
            .icon-circle { top: -4px; left: -4px; z-index: 10; width: 80px; height: 80px; border-radius: 50%; border: 4px solid rgba(76, 175, 80, .5); box-sizing: content-box; position: absolute; }
            @keyframes icon-line-tip { 0% { width: 0; left: 1px; top: 19px; } 54% { width: 0; left: 1px; top: 19px; } 70% { width: 50px; left: -8px; top: 37px; } 84% { width: 17px; left: 21px; top: 48px; } 100% { width: 25px; left: 14px; top: 46px; } }
            @keyframes icon-line-long { 0% { width: 0; right: 46px; top: 54px; } 65% { width: 0; right: 46px; top: 54px; } 84% { width: 55px; right: 0px; top: 35px; } 100% { width: 47px; right: 8px; top: 38px; } }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '2rem auto', padding: '0 1rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2.5rem', flexWrap: 'wrap' }}>
        
        {/* Left Side: Card Form */}
        <div className="glass-panel no-hover-lift" style={{ padding: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <button 
              onClick={() => navigate(-1)} 
              className="btn btn-secondary" 
              style={{ width: '40px', height: '40px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ←
            </button>
            <div>
              <h2 style={{ fontSize: '1.8rem', margin: 0 }}>Payment Details</h2>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>Secure 256-bit encrypted transaction</p>
            </div>
          </div>
          
          {error && <div style={{ background: '#fff5f5', color: 'var(--error)', padding: '1.2rem', borderRadius: '16px', marginBottom: '2rem', border: '1px solid rgba(255, 107, 107, 0.1)', fontWeight: 600 }}>{error}</div>}

          <form onSubmit={handlePayment}>
            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label className="label">Cardholder Name</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>👤</span>
                <input 
                  type="text" required className="input-field" placeholder="FULL NAME ON CARD"
                  value={cardInfo.card_name} onChange={e => setCardInfo({...cardInfo, card_name: e.target.value.toUpperCase()})}
                  style={{ paddingLeft: '3rem' }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label className="label">Card Number</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>🔒</span>
                <input 
                  type="text" required className="input-field" placeholder="0000 0000 0000 0000"
                  value={cardInfo.card_number} onChange={e => setCardInfo({...cardInfo, card_number: formatCardNumber(e.target.value)})}
                  maxLength="19"
                  style={{ paddingLeft: '3rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
              <div className="form-group">
                <label className="label">Expiry Date</label>
                <input 
                  type="text" required className="input-field" placeholder="MM/YY"
                  value={cardInfo.expiry} onChange={e => {
                    let v = e.target.value.replace(/[^0-9/]/g, '');
                    if (v.length === 2 && !v.includes('/')) v += '/';
                    setCardInfo({...cardInfo, expiry: v});
                  }}
                  maxLength="5"
                />
              </div>
              <div className="form-group">
                <label className="label">CVV</label>
                <input 
                  type="password" required className="input-field" placeholder="***"
                  value={cardInfo.cvv} onChange={e => setCardInfo({...cardInfo, cvv: e.target.value.replace(/\D/g, '')})}
                  maxLength="3"
                />
              </div>
            </div>

            <button className="btn btn-pill" style={{ width: '100%', padding: '1.4rem', fontSize: '1.2rem' }} disabled={loading}>
              {loading ? 'Processing...' : `Pay ₺500.00 Now`}
            </button>
          </form>
        </div>

        {/* Right Side: Order Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="glass-panel no-hover-lift" style={{ background: 'var(--primary)', color: 'white' }}>
            <h3 style={{ marginBottom: '1.5rem', color: 'white', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '0.8rem' }}>Order Summary</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ opacity: 0.8 }}>Passenger</span>
                <span style={{ fontWeight: 700 }}>{bookingData.passengerInfo.first_name} {bookingData.passengerInfo.last_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ opacity: 0.8 }}>Seat Number</span>
                <span style={{ fontWeight: 700 }}>{bookingData.seatNumber}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ opacity: 0.8 }}>Price</span>
                <span style={{ fontWeight: 800, fontSize: '1.2rem' }}>₺500.00</span>
              </div>
            </div>
          </div>
          
          <div className="glass-panel no-hover-lift" style={{ textAlign: 'center', border: '1px dashed var(--primary-light)' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              By clicking pay, you agree to our <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Terms of Service</span>.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

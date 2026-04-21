import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import Register from './pages/Register';
import Trips from './pages/Trips';
import SeatSelection from './pages/SeatSelection';
import AdminDashboard from './pages/AdminDashboard';
import PaymentPage from './pages/PaymentPage';

function PrivateRoute({ children, reqAdmin = false }) {
  const token = localStorage.getItem('token');
  const isAdmin = localStorage.getItem('is_admin') === 'true';
  
  if (!token) {
    return <Navigate to="/login" replace={false} />;
  }
  
  if (reqAdmin && !isAdmin) {
    return <Navigate to="/trips" replace={false} />;
  }
  
  return children;
}

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Navbar />
        <div className="app-container">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/register" element={<Register />} />
            
            <Route path="/trips" element={<PrivateRoute><Trips /></PrivateRoute>} />
            <Route path="/trips/:tripId" element={<PrivateRoute><SeatSelection /></PrivateRoute>} />
            <Route path="/payment" element={<PrivateRoute><PaymentPage /></PrivateRoute>} />
            
            <Route path="/admin" element={<PrivateRoute reqAdmin={true}><AdminDashboard /></PrivateRoute>} />
            
            <Route path="*" element={<Navigate to="/" replace={false} />} />
          </Routes>
        </div>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;

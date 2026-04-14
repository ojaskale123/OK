import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import './index.css';

// Context
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PosBilling from './pages/PosBilling';
import Inventory from './pages/Inventory';
import Cashbook from './pages/Cashbook';
import History from './pages/History';
import Subscription from './pages/Subscription';

import LandingPage from './pages/LandingPage';
import Gamification from './pages/Gamification';
import Profile from './pages/Profile';
import WorkerManagement from './pages/WorkerManagement';
import RepairManagement from './pages/RepairManagement';
import WhatsAppCenter from './pages/WhatsAppCenter';

const PrivateRoute = ({ children }) => {
    const { token } = useAuth();
    return token ? children : <Navigate to="/login" />;
};

const LockScreen = ({ children }) => {
    const { user } = useAuth();
    const validUntil = user?.subscription?.validUntil ? new Date(user.subscription.validUntil) : new Date(0);
    const isExpired = user?.subscription?.isActive && validUntil < new Date();
    
    // Admin bypass so you never get locked out during your master check
    if (user?._id === 'master-admin-id') return children;

    if (isExpired) {
        return (
            <div style={{position: 'relative', height: '100%'}}>
               <div style={{filter: 'blur(5px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.5}}>{children}</div>
               <div className="glass-card" style={{position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 999, textAlign: 'center', padding: '3rem', minWidth: '400px'}}>
                   <h2 style={{color: 'var(--ok-red)'}}>Plan Expired</h2>
                   <p className="text-secondary" style={{margin: '1.5rem 0'}}>Your free trial or subscription has expired. All your data is safely stored.</p>
                   <Link to="/plans" className="btn btn-primary">Upgrade Settings to Restore Access</Link>
               </div>
            </div>
        );
    }
    return children;
};

function Layout({ children }) {
  const { token } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  if(!token) return children;

  return (
    <div className={`app-container ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      <div className="mobile-overlay" onClick={() => setIsSidebarOpen(false)}></div>
      <Sidebar />
      <div className="main-content">
        <Topbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <div className="page-wrapper" onClick={() => { if(isSidebarOpen) setIsSidebarOpen(false) }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public / Fullscreen Routes (No Sidebar) */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/plans" element={<PrivateRoute><Subscription /></PrivateRoute>} />
          
          {/* App Core Routes (With Sidebar and Topbar) */}
          <Route path="/*" element={
            <Layout>
              <Routes>
                <Route path="/dashboard" element={<PrivateRoute><LockScreen><Dashboard /></LockScreen></PrivateRoute>} />
                <Route path="/pos" element={<PrivateRoute><LockScreen><PosBilling /></LockScreen></PrivateRoute>} />
                <Route path="/inventory" element={<PrivateRoute><LockScreen><Inventory /></LockScreen></PrivateRoute>} />
                <Route path="/cashbook" element={<PrivateRoute><LockScreen><Cashbook /></LockScreen></PrivateRoute>} />
                <Route path="/history" element={<PrivateRoute><LockScreen><History /></LockScreen></PrivateRoute>} />
                <Route path="/rewards" element={<PrivateRoute><LockScreen><Gamification /></LockScreen></PrivateRoute>} />
                <Route path="/profile" element={<PrivateRoute><LockScreen><Profile /></LockScreen></PrivateRoute>} />
                <Route path="/workers" element={<PrivateRoute><LockScreen><WorkerManagement /></LockScreen></PrivateRoute>} />
                <Route path="/repairs" element={<PrivateRoute><LockScreen><RepairManagement /></LockScreen></PrivateRoute>} />
                <Route path="/whatsapp" element={<PrivateRoute><LockScreen><WhatsAppCenter /></LockScreen></PrivateRoute>} />
              </Routes>
            </Layout>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

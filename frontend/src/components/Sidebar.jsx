import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, BookOpen, Crown, User, Gift, Users, Brain, MessageSquare, FileText, Lock, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuth();
  
  const plan = user?.subscription?.plan || 'None';

    const isWorker = user?.role === 'worker';
    const isMaster = user?._id === 'master-admin-id' || user?.email === 'ojask68@gmail.com' || user?.email === 'frndztelecomm61@gmail.com';

    const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, hidden: isWorker },
    { name: 'POS / Billing', path: '/pos', icon: ShoppingCart },
    { name: 'Inventory', path: '/inventory', icon: Package },
    { name: 'Device Repairs', path: '/repairs', icon: Zap, locked: false },
    { name: 'Workers & Staff', path: '/workers', icon: Users, locked: plan === 'Shopkeeper' || plan === 'None', hidden: isWorker },
    { name: 'Chat Cashbook', path: '/cashbook', icon: BookOpen, locked: plan === 'Shopkeeper' || plan === 'None', hidden: isWorker },
    { name: 'WhatsApp Bot', path: '/whatsapp', icon: MessageSquare, locked: false, hidden: isWorker },
    { name: 'Action History', path: '/history', icon: FileText },

    { name: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <aside className="sidebar glass-card">
      <div className="logo-container">
        <h1 className="text-gradient" style={{fontSize: '1.6rem'}}>OK ERP</h1>
      </div>
      <nav className="nav-menu" style={{ overflowY: 'auto', paddingRight: '10px' }}>
        {menuItems.map((item) => {
          if (item.hidden) return null;
          
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          if (item.locked) {
              return (
                <div key={item.name} className="nav-item" style={{opacity: 0.5, cursor: 'not-allowed', color: 'var(--text-secondary)'}} title="Upgrade to unlock">
                  <Icon size={20} className="nav-icon" />
                  <span style={{flex: 1}}>{item.name}</span>
                  <Lock size={14} color="var(--neon-purple)" />
                </div>
              );
          }

          return (
            <Link to={item.path} key={item.name} className={`nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={20} className="nav-icon" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
      
      {!isWorker && !isMaster && (
        <div className="sidebar-footer" style={{marginTop: '1rem'}}>
          <Link to="/plans" className="btn btn-primary" style={{width: '100%', marginBottom: '1rem', padding: '0.5rem', fontSize: '0.8rem'}}>
              <Crown size={16} /> Manage Plan
          </Link>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;

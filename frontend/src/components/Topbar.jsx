import React from 'react';
import { Bell, Menu } from 'lucide-react';
import './Topbar.css';

const Topbar = ({ toggleSidebar }) => {
  return (
    <header className="topbar glass-card">
      <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
        <button className="icon-btn hamburger-btn" onClick={toggleSidebar}>
           <Menu size={24} />
        </button>
        <div>
          <h3 className="greeting">Welcome back, Shop Manager 👋</h3>
          <p className="text-secondary" style={{fontSize: '0.85rem'}}>Let's grow your business today</p>
        </div>
      </div>

      <div className="topbar-actions">
        <button className="icon-btn">
          <Bell size={20} />
          <span className="badge">3</span>
        </button>
        <div className="user-profile">
          <div className="avatar">A</div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;

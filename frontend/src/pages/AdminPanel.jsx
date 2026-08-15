import React, { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, UserPlus, Users, Lock, RefreshCcw } from 'lucide-react';
import { apiFetch, authHeaders } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const MASTER_EMAIL = 'ojask68@gmail.com';

const AdminPanel = () => {
  const { user, token } = useAuth();
  const isMaster = user?._id === 'master-admin-id' || user?.email === MASTER_EMAIL;
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [newUser, setNewUser] = useState({ name: '', email: '', password: '' });
  const [newWorker, setNewWorker] = useState({ name: '', email: '', password: '', employerId: '' });

  const employers = useMemo(() => users.filter((item) => item.role !== 'worker'), [users]);

  const headers = authHeaders(token);

  const fetchAdminData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [usersRes, statsRes] = await Promise.all([
        apiFetch('/api/admin/users', { headers }),
        apiFetch('/api/admin/stats', { headers }),
      ]);

      if (!usersRes.ok) throw new Error('Failed to load users');
      if (!statsRes.ok) throw new Error('Failed to load stats');

      const usersData = await usersRes.json();
      const statsData = await statsRes.json();
      setUsers(usersData);
      setStats(statsData);
    } catch (err) {
      setError(err.message || 'Unable to load admin panel');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isMaster) return;
    fetchAdminData();
  }, [isMaster]);

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      const res = await apiFetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(newUser),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to create user');
      }
      setMessage('User added successfully.');
      setNewUser({ name: '', email: '', password: '' });
      await fetchAdminData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateWorker = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      const res = await apiFetch('/api/admin/workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(newWorker),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to create worker');
      }
      setMessage('Worker added successfully.');
      setNewWorker({ name: '', email: '', password: '', employerId: '' });
      await fetchAdminData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleBlock = async (userId) => {
    setError('');
    setMessage('');
    try {
      const res = await apiFetch(`/api/admin/users/${userId}/block`, {
        method: 'PUT',
        headers,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to update block status');
      }
      const data = await res.json();
      setMessage(data.isBlocked ? 'User blocked.' : 'User unblocked.');
      await fetchAdminData();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!isMaster) {
    return (
      <div className="glass-card" style={{ padding: '3rem', maxWidth: '720px', margin: '2rem auto' }}>
        <h2 className="text-gradient">Access Denied</h2>
        <p className="text-secondary">Only the master admin can access this page.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-gradient">Master Admin Panel</h1>
          <p className="text-secondary">Manage users, workers, block access, and inspect system metrics.</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchAdminData} style={{ alignSelf: 'flex-start' }}>
          <RefreshCcw size={18} style={{ marginRight: '0.5rem' }} /> Refresh data
        </button>
      </div>

      {error && <div className="glass-card" style={{ margin: '1rem 0', borderLeft: '4px solid #ff5b5b' }}>{error}</div>}
      {message && <div className="glass-card" style={{ margin: '1rem 0', borderLeft: '4px solid #4ade80' }}>{message}</div>}

      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginTop: '1.5rem' }}>
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShieldCheck size={24} />
            <div>
              <strong>Total Admins</strong>
              <div className="text-secondary">{stats?.adminCount ?? '—'}</div>
            </div>
          </div>
        </div>
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Users size={24} />
            <div>
              <strong>Shop Owners</strong>
              <div className="text-secondary">{stats?.userCount ?? '—'}</div>
            </div>
          </div>
        </div>
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <UserPlus size={24} />
            <div>
              <strong>Workers</strong>
              <div className="text-secondary">{stats?.workerCount ?? '—'}</div>
            </div>
          </div>
        </div>
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Lock size={24} />
            <div>
              <strong>Pending Requests</strong>
              <div className="text-secondary">{stats?.pendingRequests ?? '—'}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '2rem', marginTop: '2rem' }}>
        <div className="glass-card" style={{ padding: '1.75rem' }}>
          <h2>Quick Actions</h2>
          <div style={{ display: 'grid', gap: '1.5rem', marginTop: '1rem' }}>
            <form onSubmit={handleCreateUser} style={{ display: 'grid', gap: '0.85rem' }}>
              <h3 style={{ marginBottom: '0.75rem' }}>Add Shop Owner</h3>
              <input value={newUser.name} required placeholder="Shop owner name" onChange={(e) => setNewUser((prev) => ({ ...prev, name: e.target.value }))} />
              <input value={newUser.email} required type="email" placeholder="Email" onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))} />
              <input value={newUser.password} required type="password" placeholder="Password" onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))} />
              <button type="submit" className="btn btn-primary">Create Shop Owner</button>
            </form>

            <form onSubmit={handleCreateWorker} style={{ display: 'grid', gap: '0.85rem' }}>
              <h3 style={{ marginBottom: '0.75rem' }}>Add Worker</h3>
              <input value={newWorker.name} required placeholder="Worker name" onChange={(e) => setNewWorker((prev) => ({ ...prev, name: e.target.value }))} />
              <input value={newWorker.email} required type="email" placeholder="Email" onChange={(e) => setNewWorker((prev) => ({ ...prev, email: e.target.value }))} />
              <input value={newWorker.password} required type="password" placeholder="Password" onChange={(e) => setNewWorker((prev) => ({ ...prev, password: e.target.value }))} />
              <select value={newWorker.employerId} required onChange={(e) => setNewWorker((prev) => ({ ...prev, employerId: e.target.value }))}>
                <option value="">Select employer</option>
                {employers.map((owner) => (
                  <option key={owner._id} value={owner._id}>{owner.name} ({owner.email})</option>
                ))}
              </select>
              <button type="submit" className="btn btn-primary">Create Worker</button>
            </form>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.75rem' }}>
          <h2>System Monitor</h2>
          <div style={{ marginTop: '1rem' }}>
            <strong>Recent activity</strong>
            <div style={{ marginTop: '1rem', display: 'grid', gap: '0.85rem' }}>
              {stats?.recentLogs?.length ? stats.recentLogs.map((log) => (
                <div key={log._id} className="glass-card" style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
                    <span>{log.actionType}</span>
                    <span className="text-secondary" style={{ fontSize: '0.8rem' }}>{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-secondary" style={{ margin: '0.5rem 0 0' }}>{log.description}</p>
                </div>
              )) : <p className="text-secondary">No recent activity available.</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ marginTop: '2rem', padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Users & Workers</h2>
          <div className="text-secondary">{isLoading ? 'Refreshing…' : `Total ${users.length}`}</div>
        </div>
        {users.length === 0 ? (
          <p className="text-secondary">No users found yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Employer</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((userItem) => (
                  <tr key={userItem._id} style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <td>{userItem.name}</td>
                    <td>{userItem.email}</td>
                    <td>{userItem.role}</td>
                    <td>{userItem.role === 'worker' ? users.find((u) => u._id?.toString() === userItem.employerId?.toString())?.name || 'Unknown' : '-'}</td>
                    <td>{userItem.isBlocked ? 'Blocked' : 'Active'}</td>
                    <td>
                      <button className="btn btn-secondary" style={{ fontSize: '0.85rem' }} onClick={() => handleToggleBlock(userItem._id)}>
                        {userItem.isBlocked ? 'Unblock' : 'Block'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;

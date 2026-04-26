import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const { login } = useAuth();
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = isLogin ? { email, password } : { name, email, password };

    try {
      const res = await fetch(`https://ok-ax2v.onrender.com${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.message);
      
      login(data, data.token);
      
      // Redirect Logic
      if (isLogin) {
          navigate('/dashboard');
      } else {
          navigate('/plans'); // Go to plans after signup to choose trial
      }
    } catch(err) {
      setError(err.message);
    }
  };

  return (
    <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className="glass-card animate-fade-in" style={{ width: '400px', padding: '2.5rem' }}>
        <h2 className="text-gradient" style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '2rem' }}>OK ERP</h2>
        <h3 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>{isLogin ? 'Welcome Back' : 'Create Account'}</h3>
        
        {error && <div style={{ color: 'var(--ok-red)', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
        
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label className="form-label" htmlFor="registerName">Full Name</label>
              <input id="registerName" name="registerName" type="text" className="form-input" value={name} onChange={e=>setName(e.target.value)} required />
            </div>
          )}
          <div className="form-group">
            <label className="form-label" htmlFor="loginEmail">Email</label>
            <input id="loginEmail" name="loginEmail" type="email" className="form-input" value={email} onChange={e=>setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="loginPassword">Password</label>
            <input id="loginPassword" name="loginPassword" type="password" className="form-input" value={password} onChange={e=>setPassword(e.target.value)} required />
          </div>
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
            {isLogin ? 'Login to Dashboard' : 'Sign Up'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }} 
             onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? 'Need an account? Sign up' : 'Already have an account? Login'}
        </div>
      </div>

      {/* Signature Watermark */}
      <img src="/ojas-signature.png" alt="Ojas Kale Signature" style={{position: 'fixed', bottom: '20px', right: '30px', width: '150px', opacity: 0.7, zIndex: 9999, pointerEvents: 'none', filter: 'drop-shadow(0 0 10px rgba(139, 92, 246, 0.4))'}} />
    </div>
  );
};

export default Login;

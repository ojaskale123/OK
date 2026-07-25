import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, ShieldCheck, Users, ArrowRightCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';

const plans = [
  {
    name: '1 Year Plan',
    description: 'Full access to every feature for 12 months.',
    price: '₹5,000 / year',
    details: ['Inventory', 'POS billing', 'Cashbook', 'GST reports', 'Repair module', 'Attendance', 'WhatsApp bot']
  },
  {
    name: '2 Year Plan',
    description: 'Full access to every feature for 24 months.',
    price: '₹9,000 / 2 years',
    popular: true,
    details: ['Inventory', 'POS billing', 'Cashbook', 'GST reports', 'Repair module', 'Attendance', 'WhatsApp bot']
  },
  {
    name: '3 Year Plan',
    description: 'Full access to every feature for 36 months.',
    price: '₹12,000 / 3 years',
    details: ['Inventory', 'POS billing', 'Cashbook', 'GST reports', 'Repair module', 'Attendance', 'WhatsApp bot']
  },
  {
    name: '5 Year Plan',
    description: 'Full access to every feature for 60 months.',
    price: '₹15,000 / 5 years',
    details: ['Inventory', 'POS billing', 'Cashbook', 'GST reports', 'Repair module', 'Attendance', 'WhatsApp bot']
  }
];

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLoginClick = () => {
    // Open the login form without pre-filling credentials for privacy
    setShowLoginForm(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const response = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed.');
      }

      // Handle worker pending-approval flow returned by the API
      if (data.status === 'pending_approval') {
        setErrorMessage(data.message || 'Login request pending approval from your shop admin.');
        setIsSubmitting(false);
        return;
      }

      if (!data.token) {
        throw new Error(data.message || 'Login did not return a valid session token.');
      }

      login(data, data.token);
      navigate('/dashboard');
    } catch (error) {
      setErrorMessage(error.message || 'Unable to login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-container login-page" style={{ justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
      <div className="glass-card animate-fade-in login-card">
        <div className="login-header">
          <h1 className="text-gradient">OK ERP Access Payment</h1>
          <p className="text-secondary login-intro">
            The login and registration system has been replaced with a payment confirmation flow. Scan the QR code below, send the payment screenshot to WhatsApp at <strong>9834470250</strong>, and you will receive the username and password within 24 hours.
          </p>
        </div>

        <div className="login-columns">
          <div className="glass-card login-plan-panel">
            <h2><ShieldCheck size={24} className="login-icon" /> Plan Details</h2>
            <div className="login-plan-list">
              {plans.map((plan) => (
                <div key={plan.name} className={`login-plan-card${plan.popular ? ' popular' : ''}`}>
                  {plan.popular && <div className="login-plan-badge">Best value</div>}
                  <div className="login-plan-card-header">
                    <div>
                      <h3>{plan.name}</h3>
                      <p>{plan.description}</p>
                    </div>
                    <span>{plan.price}</span>
                  </div>
                  <ul>
                    {plan.details.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card login-payment-panel">
            <div>
              <h2><CreditCard size={24} className="login-icon" /> Payment Instructions</h2>
              <p className="text-secondary login-payment-text">
                Scan the QR code using PhonePe or any UPI app. After payment, send the screenshot via WhatsApp to <strong>9834470250</strong>. You will receive your login username and password within 24 hours.
              </p>
              <div className="login-qr-wrapper">
                <img
                  src="/payment-qr.png"
                  alt="Payment QR Code"
                  className="login-qr-image"
                />
              </div>
              <p className="text-secondary login-payment-meta">
                UPI ID: <strong>babuanuibhav071@ibl</strong><br /> Bank: <strong>Bank of India</strong><br /> Last 4 digits: <strong>4872</strong>
              </p>
            </div>

            <div className="login-contact-panel">
              <h3><Users size={20} className="login-icon" /> Contact</h3>
              <p className="text-secondary" style={{ marginBottom: '0.75rem' }}>
                Send the payment screenshot to WhatsApp at <strong>9834470250</strong>.
              </p>
              <p className="text-secondary" style={{ fontWeight: 700 }}>You will get username & password within 24 hours.</p>
              <div className="login-contact-hint">
                <ArrowRightCircle size={18} /> Click the button to open the login form and enter your credentials.
              </div>
              <button
                className="btn btn-primary login-open-btn"
                onClick={handleLoginClick}
              >
                Open Login Form
              </button>

              {showLoginForm && (
                <form onSubmit={handleSubmit} className="login-form">
                  <div className="form-group">
                    <label htmlFor="loginEmail" className="form-label">Email / Username</label>
                    <input
                      id="loginEmail"
                      type="email"
                      className="form-input"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your login email"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="loginPassword" className="form-label">Password</label>
                    <input
                      id="loginPassword"
                      type="password"
                      className="form-input"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                    />
                  </div>
                  {errorMessage && (
                    <p className="login-error">{errorMessage}</p>
                  )}
                  <button
                    type="submit"
                    className="btn btn-primary login-submit-btn"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Logging in…' : 'Login to OK ERP'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

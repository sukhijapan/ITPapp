import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="login-container">
        <div className="login-form">
          <h1>Check Your Email</h1>
          <p>If an account exists with that email, a password reset link has been sent.</p>
          <Link to="/login">Back to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h1>Forgot Password</h1>
        <p>Enter your email address and we'll send you a link to reset your password.</p>
        {error && <p className="error">{error}</p>}
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Sending...' : 'Send Reset Link'}
        </button>
        <p style={{ marginTop: '1rem', textAlign: 'center' }}>
          <Link to="/login">Back to Login</Link>
        </p>
      </form>
    </div>
  );
};

export default ForgotPassword;

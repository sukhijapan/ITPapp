import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import PasswordInput from '../components/PasswordInput';

type PageState = 'loading' | 'valid' | 'invalid' | 'success';

const ResetPassword: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setPageState('invalid');
      return;
    }

    const validateToken = async () => {
      try {
        const response = await api.get(`/auth/reset-password/${token}/validate`);
        if (response.data.valid) {
          setPageState('valid');
        } else {
          setPageState('invalid');
        }
      } catch {
        setPageState('invalid');
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await api.post('/auth/reset-password', { token, password });
      setPageState('success');
    } catch (err: any) {
      const details = err.response?.data?.details;
      if (details && Array.isArray(details)) {
        setError(details.join('. '));
      } else {
        setError(err.response?.data?.error || 'Password reset failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (pageState === 'loading') {
    return (
      <div className="login-container">
        <div className="login-form">
          <h1>Verifying...</h1>
          <p>Validating your reset link.</p>
        </div>
      </div>
    );
  }

  if (pageState === 'invalid') {
    return (
      <div className="login-container">
        <div className="login-form">
          <h1>Invalid or Expired Link</h1>
          <p>This password reset link is no longer valid. It may have expired or already been used.</p>
          <Link to="/forgot-password">Request a new reset link</Link>
        </div>
      </div>
    );
  }

  if (pageState === 'success') {
    return (
      <div className="login-container">
        <div className="login-form">
          <h1>Password Reset Successful</h1>
          <p>Your password has been updated. You can now log in with your new password.</p>
          <button onClick={() => navigate('/login')}>Go to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h1>Set New Password</h1>
        {error && <p className="error">{error}</p>}
        <PasswordInput value={password} onChange={setPassword} label="New Password" />
        <button type="submit" disabled={submitting}>
          {submitting ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </div>
  );
};

export default ResetPassword;

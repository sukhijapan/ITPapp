import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';

type PageState = 'loading' | 'valid' | 'expired' | 'invalid';

const Register: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
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
        const response = await api.get(`/invitations/${token}/validate`);
        if (response.data.valid) {
          setEmail(response.data.email);
          setFullName(response.data.fullName || '');
          setPageState('valid');
        } else if (response.data.error === 'Token expired') {
          setPageState('expired');
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
      const response = await api.post('/auth/register-invite', {
        token,
        password,
      });
      login(response.data.token, response.data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (pageState === 'loading') {
    return (
      <div className="login-container">
        <div className="login-form">
          <h1>Setting up your account...</h1>
          <p>Validating your invitation link.</p>
        </div>
      </div>
    );
  }

  if (pageState === 'expired') {
    return (
      <div className="login-container">
        <div className="login-form">
          <h1>Invitation Expired</h1>
          <p>This invitation link has expired. Please contact the person who invited you to request a new invitation.</p>
        </div>
      </div>
    );
  }

  if (pageState === 'invalid') {
    return (
      <div className="login-container">
        <div className="login-form">
          <h1>Invalid Link</h1>
          <p>This invitation link is no longer valid. It may have already been used or the link is incorrect.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h1>Complete Registration</h1>
        {error && <p className="error">{error}</p>}
        <div className="form-group">
          <label>Full Name</label>
          <input
            type="text"
            value={fullName}
            readOnly
            aria-label="Full name"
          />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            readOnly
            aria-label="Email address"
          />
        </div>
        <PasswordInput value={password} onChange={setPassword} />
        <button type="submit" disabled={submitting}>
          {submitting ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>
    </div>
  );
};

export default Register;

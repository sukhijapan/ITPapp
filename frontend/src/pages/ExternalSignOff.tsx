import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import api from '../services/api';

const ExternalSignOff = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedStatus, setSubmittedStatus] = useState<string>('');

  useEffect(() => {
    const validateToken = async () => {
      try {
        const response = await api.get(`/external-sign-off/validate/${token}`);
        setData(response.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Invalid or expired link');
      } finally {
        setLoading(false);
      }
    };
    validateToken();
  }, [token]);

  const handleSignOff = async (status: 'Approved' | 'Rejected') => {
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/external-sign-off/execute', {
        token,
        status,
        comments: comments || `Signed off from web interface`,
      });
      setSubmittedStatus(status);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit sign-off');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', fontFamily: 'sans-serif' }}>
        Loading...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={{ maxWidth: '480px', margin: '3rem auto', padding: '2rem', background: '#fef2f2', borderRadius: '0.75rem', border: '1px solid #fecaca', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#991b1b', fontWeight: 700, marginBottom: '0.5rem' }}>
          <AlertCircle size={20} />
          Sign-off Link Error
        </div>
        <p style={{ color: '#dc2626', margin: 0 }}>{error}</p>
      </div>
    );
  }

  if (submitted) {
    const isApproved = submittedStatus === 'Approved';
    return (
      <div style={{ maxWidth: '480px', margin: '3rem auto', padding: '2.5rem', background: isApproved ? '#f0fdf4' : '#fef2f2', borderRadius: '0.75rem', border: `1px solid ${isApproved ? '#bbf7d0' : '#fecaca'}`, textAlign: 'center', fontFamily: 'sans-serif' }}>
        {isApproved ? <CheckCircle size={48} color="#16a34a" /> : <XCircle size={48} color="#dc2626" />}
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: isApproved ? '#166534' : '#991b1b', margin: '1rem 0 0.5rem' }}>
          {isApproved ? 'Approved' : 'Rejected'}
        </h2>
        <p style={{ color: isApproved ? '#15803d' : '#b91c1c', margin: 0 }}>
          Your response has been recorded. You can close this page.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '560px', margin: '2rem auto', padding: '2rem', background: '#fff', borderRadius: '0.75rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', margin: '0 0 1.5rem' }}>
        Inspection Sign-off Required
      </h1>

      {/* Context Card */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: 600 }}>Project</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>{data.point_description ? data.itp_name?.split(' - ')[0] : '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: 600 }}>Your Role</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>{data.role_name}</div>
          </div>
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: 600 }}>ITP</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>{data.itp_name}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: 600 }}>Inspection Point</div>
          <div style={{ fontSize: '0.9rem', color: '#334155', fontStyle: 'italic', marginTop: '0.25rem' }}>"{data.point_description}"</div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.375rem', padding: '0.75rem', marginBottom: '1rem', color: '#dc2626', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Comments */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>
          Comments (optional)
        </label>
        <textarea
          rows={3}
          placeholder="Add remarks if needed..."
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          disabled={submitting}
          style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box' }}
        />
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          onClick={() => handleSignOff('Approved')}
          disabled={submitting}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.875rem', background: '#166534', color: '#fff', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1 }}
        >
          <CheckCircle size={20} />
          Approve
        </button>
        <button
          onClick={() => handleSignOff('Rejected')}
          disabled={submitting}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.875rem', background: '#991b1b', color: '#fff', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1 }}
        >
          <XCircle size={20} />
          Reject
        </button>
      </div>

      <p style={{ textAlign: 'center', fontSize: '0.7rem', color: '#94a3b8', marginTop: '1.5rem' }}>
        Link expires {new Date(data.expires_at).toLocaleString()}
      </p>
    </div>
  );
};

export default ExternalSignOff;

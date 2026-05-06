import React, { useState, useEffect } from 'react';
import api from '../services/api';

interface Recipient {
  id: number;
  user_id: number | null;
  email: string;
  recipient_name: string | null;
  is_external: boolean;
  role_filter: number | null;
}

interface WPConfigSectionProps {
  projectId: number;
}

const WPConfigSection: React.FC<WPConfigSectionProps> = ({ projectId }) => {
  const [noticePeriodHours, setNoticePeriodHours] = useState<number>(24);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add recipient state
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [externalEmail, setExternalEmail] = useState('');
  const [externalName, setExternalName] = useState('');
  const [addingRecipient, setAddingRecipient] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, [projectId]);

  const fetchConfig = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/projects/${projectId}/wp-config`);
      const data = res.data.data || res.data;
      setNoticePeriodHours(data.notice_period_hours ?? 24);
      setRecipients(data.defaultRecipients || []);
    } catch (err: any) {
      setError('Failed to load witness point configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setError('');
    setSuccess('');

    if (!Number.isInteger(noticePeriodHours) || noticePeriodHours < 1 || noticePeriodHours > 168) {
      setError('Notice period must be between 1 and 168 hours');
      return;
    }

    setSaving(true);
    try {
      await api.put(`/projects/${projectId}/wp-config`, { noticePeriodHours });
      setSuccess('Configuration saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to save configuration';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleUserSearch = async (query: string) => {
    setUserSearchQuery(query);
    if (query.trim().length < 2) {
      setUserSearchResults([]);
      return;
    }
    try {
      const res = await api.get('/users', { params: { search: query } });
      const payload = res.data;
      const users = Array.isArray(payload) ? payload : payload.data || [];
      const existingEmails = recipients.map((r) => r.email.toLowerCase());
      setUserSearchResults(
        users.filter((u: any) => !existingEmails.includes(u.email.toLowerCase()))
      );
    } catch {
      setUserSearchResults([]);
    }
  };

  const addInternalRecipient = async (user: any) => {
    setAddingRecipient(true);
    setError('');
    try {
      const res = await api.post(`/projects/${projectId}/wp-config/recipients`, {
        userId: user.id,
        email: user.email,
        recipientName: user.full_name || user.fullName || user.email,
        isExternal: false,
      });
      const newRecipient = res.data.data;
      setRecipients((prev) => [...prev, newRecipient]);
      setUserSearchQuery('');
      setUserSearchResults([]);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add recipient');
    } finally {
      setAddingRecipient(false);
    }
  };

  const addExternalRecipient = async () => {
    if (!externalEmail.trim()) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(externalEmail.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    const exists = recipients.some(
      (r) => r.email.toLowerCase() === externalEmail.trim().toLowerCase()
    );
    if (exists) {
      setError('This recipient has already been added');
      return;
    }

    setAddingRecipient(true);
    setError('');
    try {
      const res = await api.post(`/projects/${projectId}/wp-config/recipients`, {
        email: externalEmail.trim(),
        recipientName: externalName.trim() || externalEmail.trim(),
        isExternal: true,
      });
      const newRecipient = res.data.data;
      setRecipients((prev) => [...prev, newRecipient]);
      setExternalEmail('');
      setExternalName('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add recipient');
    } finally {
      setAddingRecipient(false);
    }
  };

  const removeRecipient = async (recipientId: number) => {
    setError('');
    try {
      await api.delete(`/projects/${projectId}/wp-config/recipients/${recipientId}`);
      setRecipients((prev) => prev.filter((r) => r.id !== recipientId));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove recipient');
    }
  };

  if (loading) {
    return (
      <section className="section">
        <h2>Witness Point Settings</h2>
        <p style={{ color: 'var(--text-light)' }}>Loading configuration...</p>
      </section>
    );
  }

  return (
    <section className="section">
      <h2>Witness Point Settings</h2>

      {error && <div className="error-banner">{error}</div>}
      {success && (
        <div
          style={{
            padding: '0.5rem 1rem',
            background: '#dcfce7',
            color: '#166534',
            borderRadius: '0.25rem',
            marginBottom: '1rem',
            fontSize: '0.85rem',
          }}
        >
          {success}
        </div>
      )}

      {/* Notice Period Configuration */}
      <div className="form-group" style={{ maxWidth: '320px', marginBottom: '1.5rem' }}>
        <label>Notice Period (hours)</label>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="number"
            min={1}
            max={168}
            value={noticePeriodHours}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val)) {
                setNoticePeriodHours(val);
              }
            }}
            style={{ width: '100px' }}
            aria-label="Notice period in hours"
          />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
            (1–168 hours)
          </span>
          <button
            className="btn-small btn-primary"
            onClick={handleSaveConfig}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>
          Minimum notice required before a planned inspection time.
        </p>
      </div>

      {/* Default Recipients */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>
          Default Recipients
        </label>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '0.75rem' }}>
          These recipients will be pre-populated when raising witness point notifications.
        </p>

        {/* Current recipients list */}
        {recipients.length > 0 ? (
          <div style={{ marginBottom: '1rem' }}>
            {recipients.map((r) => (
              <div
                key={r.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.75rem',
                  background: '#f8fafc',
                  border: '1px solid var(--border)',
                  borderRadius: '0.25rem',
                  marginBottom: '0.25rem',
                  fontSize: '0.85rem',
                }}
              >
                <span>
                  {r.recipient_name || r.email}
                  {r.recipient_name && r.recipient_name !== r.email && (
                    <span style={{ color: 'var(--text-light)', marginLeft: '0.5rem' }}>
                      ({r.email})
                    </span>
                  )}
                  {r.is_external && (
                    <span
                      style={{
                        marginLeft: '0.5rem',
                        fontSize: '0.7rem',
                        background: '#fef3c7',
                        color: '#92400e',
                        padding: '0.1rem 0.35rem',
                        borderRadius: '0.2rem',
                        fontWeight: 600,
                      }}
                    >
                      External
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => removeRecipient(r.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#991b1b',
                    cursor: 'pointer',
                    padding: '0.2rem 0.4rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                  aria-label={`Remove ${r.recipient_name || r.email}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '1rem' }}>
            No default recipients configured.
          </p>
        )}

        {/* Add internal user */}
        <div style={{ marginBottom: '0.75rem' }}>
          <label
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-light)',
              marginBottom: '0.25rem',
              display: 'block',
            }}
          >
            Add internal user
          </label>
          <input
            type="text"
            value={userSearchQuery}
            onChange={(e) => handleUserSearch(e.target.value)}
            placeholder="Search by name or email..."
            disabled={addingRecipient}
            style={{ maxWidth: '400px' }}
          />
          {userSearchResults.length > 0 && (
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: '0.25rem',
                maxHeight: '150px',
                overflowY: 'auto',
                background: 'white',
                maxWidth: '400px',
                marginTop: '0.25rem',
              }}
            >
              {userSearchResults.map((user) => (
                <div
                  key={user.id}
                  onClick={() => addInternalRecipient(user)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    borderBottom: '1px solid var(--border)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                  role="option"
                  aria-label={`Add ${user.full_name || user.fullName || user.email}`}
                >
                  {user.full_name || user.fullName || user.email}
                  <span style={{ color: 'var(--text-light)', marginLeft: '0.5rem' }}>
                    {user.email}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add external recipient */}
        <div>
          <label
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-light)',
              marginBottom: '0.25rem',
              display: 'block',
            }}
          >
            Add external recipient
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', maxWidth: '500px' }}>
            <input
              type="text"
              value={externalName}
              onChange={(e) => setExternalName(e.target.value)}
              placeholder="Name (optional)"
              disabled={addingRecipient}
              style={{ flex: '1' }}
            />
            <input
              type="email"
              value={externalEmail}
              onChange={(e) => setExternalEmail(e.target.value)}
              placeholder="Email address"
              disabled={addingRecipient}
              style={{ flex: '1' }}
            />
            <button
              type="button"
              onClick={addExternalRecipient}
              className="btn-small"
              disabled={addingRecipient || !externalEmail.trim()}
              style={{ whiteSpace: 'nowrap' }}
            >
              {addingRecipient ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WPConfigSection;

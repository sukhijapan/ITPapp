import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';

interface Recipient {
  id?: number;
  userId?: number;
  email: string;
  recipientName: string;
  isExternal: boolean;
}

interface RaiseNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  pointId: number;
  projectId: number;
}

const RaiseNotificationModal: React.FC<RaiseNotificationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  pointId,
  projectId,
}) => {
  const [plannedTime, setPlannedTime] = useState('');
  const [location, setLocation] = useState('');
  const [scope, setScope] = useState('');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [externalEmail, setExternalEmail] = useState('');
  const [externalName, setExternalName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetchingDefaults, setFetchingDefaults] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchDefaultRecipients();
    }
  }, [isOpen, projectId]);

  const fetchDefaultRecipients = async () => {
    setFetchingDefaults(true);
    try {
      const res = await api.get(`/projects/${projectId}/wp-config`);
      if (res.data.defaultRecipients && res.data.defaultRecipients.length > 0) {
        setRecipients(
          res.data.defaultRecipients.map((r: any) => ({
            id: r.id,
            userId: r.user_id || r.userId,
            email: r.email,
            recipientName: r.recipient_name || r.recipientName || r.email,
            isExternal: r.is_external || r.isExternal || false,
          }))
        );
      }
    } catch {
      // Config may not exist yet — that's fine, start with empty recipients
    } finally {
      setFetchingDefaults(false);
    }
  };

  const handleUserSearch = (query: string) => {
    setUserSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (query.trim().length < 2) {
      setUserSearchResults([]);
      return;
    }
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await api.get('/users', { params: { search: query } });
        const users = Array.isArray(res.data) ? res.data : res.data.data || res.data.users || [];
        const existingEmails = recipients.map((r) => r.email.toLowerCase());
        setUserSearchResults(
          users.filter((u: any) => !existingEmails.includes(u.email.toLowerCase()))
        );
      } catch {
        setUserSearchResults([]);
      }
    }, 300);
  };

  const addInternalRecipient = (user: any) => {
    setRecipients((prev) => [
      ...prev,
      {
        userId: user.id,
        email: user.email,
        recipientName: user.full_name || user.fullName || user.email,
        isExternal: false,
      },
    ]);
    setUserSearchQuery('');
    setUserSearchResults([]);
  };

  const addExternalRecipient = () => {
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
    setRecipients((prev) => [
      ...prev,
      {
        email: externalEmail.trim(),
        recipientName: externalName.trim() || externalEmail.trim(),
        isExternal: true,
      },
    ]);
    setExternalEmail('');
    setExternalName('');
    setError('');
  };

  const removeRecipient = (index: number) => {
    setRecipients((prev) => prev.filter((_, i) => i !== index));
  };

  const validateForm = (): string | null => {
    if (!plannedTime) {
      return 'Planned inspection time is required';
    }
    const planned = new Date(plannedTime);
    if (planned <= new Date()) {
      return 'Planned inspection time must be in the future';
    }
    if (recipients.length === 0) {
      return 'At least one recipient is required';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await api.post('/wp-notifications', {
        pointId,
        plannedInspectionTime: new Date(plannedTime).toISOString(),
        location: location.trim() || undefined,
        scope: scope.trim() || undefined,
        recipientIds: recipients.filter((r) => !r.isExternal && r.userId).map((r) => r.userId),
        externalRecipients: recipients
          .filter((r) => r.isExternal)
          .map((r) => ({ email: r.email, name: r.recipientName })),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to create notification';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h3>Raise Witness Point Notification</h3>
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <p className="error">{error}</p>}

          <div className="form-group">
            <label>Planned Inspection Time *</label>
            <input
              type="datetime-local"
              value={plannedTime}
              onChange={(e) => setPlannedTime(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              required
            />
          </div>

          <div className="form-group">
            <label>Location Description</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Grid Line A3-B4, Level 2 slab"
            />
          </div>

          <div className="form-group">
            <label>Scope of Work</label>
            <textarea
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              placeholder="Describe the inspection scope..."
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '0.5rem',
                border: '1px solid var(--border)',
                borderRadius: '0.25rem',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                fontSize: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Recipients Section */}
          <div className="form-group">
            <label>Recipients {fetchingDefaults && <span style={{ fontWeight: 'normal', color: 'var(--text-light)' }}>(loading defaults...)</span>}</label>

            {/* Current recipients list */}
            {recipients.length > 0 && (
              <div style={{ marginBottom: '0.75rem' }}>
                {recipients.map((r, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.4rem 0.6rem',
                      background: '#f8fafc',
                      border: '1px solid var(--border)',
                      borderRadius: '0.25rem',
                      marginBottom: '0.25rem',
                      fontSize: '0.85rem',
                    }}
                  >
                    <span>
                      {r.recipientName}
                      {r.recipientName !== r.email && (
                        <span style={{ color: 'var(--text-light)', marginLeft: '0.5rem' }}>
                          ({r.email})
                        </span>
                      )}
                      {r.isExternal && (
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
                      onClick={() => removeRecipient(idx)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#991b1b',
                        cursor: 'pointer',
                        padding: '0.2rem 0.4rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                      }}
                      aria-label={`Remove ${r.recipientName}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add internal user */}
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '0.25rem', display: 'block' }}>
                Add internal user
              </label>
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => handleUserSearch(e.target.value)}
                placeholder="Search by name or email..."
                style={{ marginBottom: '0.25rem' }}
              />
              {userSearchResults.length > 0 && (
                <div
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: '0.25rem',
                    maxHeight: '120px',
                    overflowY: 'auto',
                    background: 'white',
                  }}
                >
                  {userSearchResults.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => addInternalRecipient(user)}
                      style={{
                        padding: '0.4rem 0.6rem',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        borderBottom: '1px solid var(--border)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
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
              <label style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '0.25rem', display: 'block' }}>
                Add external recipient
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <input
                  type="text"
                  value={externalName}
                  onChange={(e) => setExternalName(e.target.value)}
                  placeholder="Name (optional)"
                  style={{ flex: '1' }}
                />
                <input
                  type="email"
                  value={externalEmail}
                  onChange={(e) => setExternalEmail(e.target.value)}
                  placeholder="Email address"
                  style={{ flex: '1' }}
                />
                <button
                  type="button"
                  onClick={addExternalRecipient}
                  className="btn-small"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Sending...' : 'Raise Notification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RaiseNotificationModal;

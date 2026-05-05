import React, { useState } from 'react';
import RoleSelect from './RoleSelect';

interface InviteUserModalProps {
  onClose: () => void;
  onInvite: (email: string, roleId: number, fullName: string) => void;
}

const InviteUserModal: React.FC<InviteUserModalProps> = ({ onClose, onInvite }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState<number | ''>('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Full name is required');
      return;
    }

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!roleId) {
      setError('Please select a role');
      return;
    }

    onInvite(email.trim(), roleId, fullName.trim());
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Invite User</h3>
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <p className="error">{error}</p>}
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Smith"
              required
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
            />
          </div>
          <RoleSelect value={roleId} onChange={setRoleId} />
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Send Invitation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InviteUserModal;

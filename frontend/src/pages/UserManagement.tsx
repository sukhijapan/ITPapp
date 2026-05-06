import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import InviteUserModal from '../components/InviteUserModal';
import { ArrowLeft, UserPlus, RefreshCw, X, MoreVertical } from 'lucide-react';

interface User {
  id: number;
  full_name: string;
  email: string;
  role_name: string;
  role_id?: number;
  created_at: string;
  is_active: boolean;
}

interface Role {
  id: number;
  name: string;
}

interface PendingInvitation {
  id: number;
  email: string;
  full_name: string;
  role_name: string;
  expires_at: string;
  status: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editRoleId, setEditRoleId] = useState<number>(0);
  const [editActive, setEditActive] = useState(true);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      const payload = res.data;
      // Backend returns paginated { data: [...], total, page, pageSize }
      setUsers(Array.isArray(payload) ? payload : payload.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch users');
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await api.get('/roles');
      setRoles(res.data);
    } catch { /* roles will be empty */ }
  };

  const fetchPendingInvitations = async () => {
    try {
      const res = await api.get('/invitations/pending');
      setPendingInvitations(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch pending invitations');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchRoles(), fetchPendingInvitations()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Close menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleInvite = async (email: string, roleId: number, fullName: string) => {
    setError('');
    setMessage('');
    try {
      await api.post('/invitations', { email, role_id: roleId, full_name: fullName });
      setMessage(`Invitation sent to ${fullName} (${email})`);
      setShowInviteModal(false);
      await fetchPendingInvitations();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send invitation');
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setEditName(user.full_name);
    const role = roles.find(r => r.name === user.role_name);
    setEditRoleId(role?.id || 0);
    setEditActive(user.is_active);
    setMenuOpenId(null);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setError('');
    setMessage('');
    try {
      await api.patch(`/users/${editingUser.id}`, {
        full_name: editName,
        role_id: editRoleId,
        is_active: editActive,
      });
      setMessage(`User ${editName} updated successfully`);
      setEditingUser(null);
      await fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update user');
    }
  };

  const handleResend = async (invitationId: number) => {
    setError('');
    setMessage('');
    try {
      await api.post(`/invitations/${invitationId}/resend`);
      setMessage('Invitation resent successfully');
      await fetchPendingInvitations();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to resend invitation');
    }
  };

  const handleCancel = async (invitationId: number) => {
    setError('');
    setMessage('');
    try {
      await api.delete(`/invitations/${invitationId}`);
      setMessage('Invitation cancelled');
      await fetchPendingInvitations();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to cancel invitation');
    }
  };

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  if (loading) {
    return <div className="user-management"><p>Loading...</p></div>;
  }

  return (
    <div className="user-management">
      <header>
        <div className="header-left">
          <Link to="/" className="back-link">
            <ArrowLeft size={18} />
            Back to Dashboard
          </Link>
          <h1>User Management</h1>
        </div>
        <button className="btn-primary" onClick={() => setShowInviteModal(true)}>
          <UserPlus size={16} />
          Invite User
        </button>
      </header>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      <section className="users-section">
        <h2>Users ({users.length})</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Created</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className={!user.is_active ? 'row-inactive' : ''}>
                <td>{user.full_name}</td>
                <td>{user.email}</td>
                <td><span className="badge">{user.role_name}</span></td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                  <span className={`status-badge ${user.is_active ? 'status-active' : 'status-inactive'}`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="menu-cell">
                  <div className="menu-wrapper" ref={menuOpenId === user.id ? menuRef : null}>
                    <button
                      className="btn-icon"
                      onClick={() => setMenuOpenId(menuOpenId === user.id ? null : user.id)}
                      aria-label="User actions"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {menuOpenId === user.id && (
                      <div className="dropdown-menu">
                        <button onClick={() => openEditModal(user)}>Edit User</button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="invitations-section">
        <h2>Pending Invitations ({pendingInvitations.length})</h2>
        {pendingInvitations.length === 0 ? (
          <p className="empty-state">No pending invitations.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Expires</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingInvitations.map((invitation) => (
                <tr key={invitation.id} className={isExpired(invitation.expires_at) ? 'row-expired' : ''}>
                  <td>{invitation.full_name || '—'}</td>
                  <td>{invitation.email}</td>
                  <td><span className="badge">{invitation.role_name}</span></td>
                  <td>{new Date(invitation.expires_at).toLocaleDateString()}</td>
                  <td>
                    <span className={`status-badge ${isExpired(invitation.expires_at) ? 'status-expired' : 'status-pending'}`}>
                      {isExpired(invitation.expires_at) ? 'Expired' : 'Pending'}
                    </span>
                  </td>
                  <td className="action-buttons">
                    <button className="btn-sm btn-secondary" onClick={() => handleResend(invitation.id)} title="Resend invitation">
                      <RefreshCw size={14} /> Resend
                    </button>
                    <button className="btn-sm btn-danger" onClick={() => handleCancel(invitation.id)} title="Cancel invitation">
                      <X size={14} /> Cancel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {showInviteModal && (
        <InviteUserModal onClose={() => setShowInviteModal(false)} onInvite={handleInvite} />
      )}

      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit User</h3>
              <button className="btn-icon" onClick={() => setEditingUser(null)} aria-label="Close">✕</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }}>
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={editRoleId} onChange={(e) => setEditRoleId(Number(e.target.value))} required>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={editActive ? 'active' : 'inactive'} onChange={(e) => setEditActive(e.target.value === 'active')}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setEditingUser(null)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;

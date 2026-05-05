import React, { useEffect, useState } from 'react';
import api from '../services/api';

interface Role {
  id: number;
  name: string;
}

interface RoleSelectProps {
  value: number | '';
  onChange: (roleId: number) => void;
}

const RoleSelect: React.FC<RoleSelectProps> = ({ value, onChange }) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await api.get('/roles');
        setRoles(response.data);
      } catch {
        setError('Failed to load roles');
      } finally {
        setLoading(false);
      }
    };
    fetchRoles();
  }, []);

  if (loading) {
    return (
      <div className="form-group">
        <label>Role</label>
        <select disabled>
          <option>Loading roles...</option>
        </select>
      </div>
    );
  }

  if (error) {
    return (
      <div className="form-group">
        <label>Role</label>
        <p className="error">{error}</p>
      </div>
    );
  }

  return (
    <div className="form-group">
      <label>Role</label>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        required
      >
        <option value="">Select a role</option>
        {roles.map((role) => (
          <option key={role.id} value={role.id}>
            {role.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default RoleSelect;

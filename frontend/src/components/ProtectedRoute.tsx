import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <nav className="app-nav">
        <span className="nav-user">{user.full_name}</span>
        <button onClick={handleLogout} className="btn-logout" title="Logout">
          <LogOut size={16} /> Logout
        </button>
      </nav>
      {children}
    </>
  );
};

export default ProtectedRoute;

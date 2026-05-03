import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Folder, ClipboardList, CheckCircle } from 'lucide-react';

const Dashboard: React.FC = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const { user, logout } = useAuth();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await api.get('/projects');
        setProjects(response.data);
      } catch (err) {
        console.error('Failed to fetch projects', err);
      }
    };
    fetchProjects();
  }, []);

  return (
    <div className="dashboard">
      <header>
        <h1>Welcome, {user?.username}</h1>
        <button onClick={logout}>Logout</button>
      </header>
      
      <section className="stats">
        <div className="stat-card">
          <Folder />
          <h3>{projects.length}</h3>
          <p>Active Projects</p>
        </div>
        {/* More stats can be added here */}
      </section>

      <section className="projects-list">
        <h2>Your Projects</h2>
        <div className="grid">
          {projects.map((project) => (
            <Link to={`/projects/${project.id}`} key={project.id} className="project-card">
              <h3>{project.name}</h3>
              <p>{project.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;

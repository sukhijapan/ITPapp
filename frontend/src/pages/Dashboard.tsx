import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Folder, FileText, AlertOctagon, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';

interface Stats {
  total_itps: number;
  draft_itps: number;
  pending_itps: number;
  open_itps: number;
  closed_itps: number;
  blocking_hps: number;
  open_ncrs: number;
}

const Dashboard: React.FC = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const { user, logout } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectRes, statsRes] = await Promise.all([
          api.get('/projects'),
          api.get('/projects/stats'),
        ]);
        setProjects(projectRes.data);
        setStats(statsRes.data);
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      }
    };
    fetchData();
  }, []);

  const roleName: Record<number, string> = {
    1: 'Subcontractor', 2: 'Head Contractor', 3: 'Client', 4: 'Admin',
  };

  return (
    <div className="dashboard">
      <header>
        <div>
          <h1>Welcome, {user?.username}</h1>
          <p className="user-role-label">{roleName[user?.role_id ?? 0] ?? 'Unknown Role'}</p>
        </div>
        <button onClick={logout}>Logout</button>
      </header>

      {stats && (
        <section className="stats">
          <div className="stat-card">
            <Folder size={28} />
            <h3>{projects.length}</h3>
            <p>Projects</p>
          </div>
          <div className="stat-card">
            <FileText size={28} />
            <h3>{stats.open_itps}</h3>
            <p>Open ITPs</p>
          </div>
          <div className={`stat-card ${Number(stats.blocking_hps) > 0 ? 'stat-card--alert' : ''}`}>
            <AlertOctagon size={28} />
            <h3>{stats.blocking_hps}</h3>
            <p>Blocking Hold Points</p>
          </div>
          <Link to="/ncrs" className={`stat-card stat-card--clickable ${Number(stats.open_ncrs) > 0 ? 'stat-card--alert' : ''}`}>
            <ShieldAlert size={28} />
            <h3>{stats.open_ncrs}</h3>
            <p>Open NCRs</p>
          </Link>
          <div className="stat-card">
            <Clock size={28} />
            <h3>{stats.pending_itps}</h3>
            <p>Pending Review</p>
          </div>
          <div className="stat-card">
            <CheckCircle2 size={28} />
            <h3>{stats.closed_itps}</h3>
            <p>Closed ITPs</p>
          </div>
        </section>
      )}

      <section className="projects-list">
        <h2>Your Projects</h2>
        <div className="grid">
          {projects.map(project => (
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

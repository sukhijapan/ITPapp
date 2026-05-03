import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ClipboardList, Plus } from 'lucide-react';

const ProjectDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [instances, setInstances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDetails = async () => {
    try {
      const [projectRes, templatesRes, instancesRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/templates?project_id=${id}`),
        api.get(`/itps/instances?project_id=${id}`),
      ]);
      setProject(projectRes.data);
      setTemplates(templatesRes.data);
      setInstances(instancesRes.data);
    } catch (err) {
      console.error('Failed to fetch project details', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleCreateInstance = async (template: any) => {
    try {
      const name = prompt('Enter a name for this ITP instance:', `${template.name} - ${new Date().toLocaleDateString()}`);
      if (!name) return;

      const response = await api.post('/itps/instances', {
        template_id: template.id,
        project_id: parseInt(id!),
        name
      });
      navigate(`/itp/${response.data.id}`);
    } catch (err) {
      console.error('Failed to create instance', err);
      alert('Failed to create ITP instance');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="project-details">
      <Link to="/" className="back-link">← Back to Dashboard</Link>
      <h1>{project?.name}</h1>
      <p>{project?.description}</p>

      <section className="section">
        <div className="section-header">
          <h2>ITP Templates</h2>
          <Link to={`/projects/${id}/templates/new`} className="btn-small btn-primary">
            <Plus size={16} /> Create Template
          </Link>
        </div>
        <div className="list">
          {templates.length === 0 ? (
            <div className="list-item">No templates found. Create one to get started.</div>
          ) : (
            templates.map(t => (
              <div key={t.id} className="list-item">
                <span>{t.name}</span>
                <button 
                  className="btn-small"
                  onClick={() => handleCreateInstance(t)}
                >
                  Create Instance
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="section">
        <h2>Active ITPs</h2>
        <div className="list">
          {instances.length === 0 ? (
            <div className="list-item">No active ITPs. Create an instance from a template.</div>
          ) : (
            instances.map(i => (
              <Link to={`/itp/${i.id}`} key={i.id} className="list-item clickable">
                <span>{i.name}</span>
                <span className={`status-badge ${i.status.toLowerCase()}`}>{i.status}</span>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default ProjectDetails;

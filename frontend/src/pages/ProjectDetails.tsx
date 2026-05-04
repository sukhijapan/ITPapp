import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Plus, X } from 'lucide-react';

interface CreateFormState {
  name: string;
  lot_number: string;
  panel_no: string;
  revision: string;
  drawing_ref: string;
}

const emptyForm: CreateFormState = {
  name: '',
  lot_number: '',
  panel_no: '',
  revision: '0',
  drawing_ref: '',
};

const ProjectDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [instances, setInstances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [form, setForm] = useState<CreateFormState>(emptyForm);
  const [creating, setCreating] = useState(false);

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
      setError('Failed to load project data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const openCreateForm = (template: any) => {
    setSelectedTemplate(template);
    setForm({
      ...emptyForm,
      name: `${template.name} - ${new Date().toLocaleDateString()}`,
    });
  };

  const closeCreateForm = () => {
    setSelectedTemplate(null);
    setForm(emptyForm);
    setError('');
  };

  const handleCreateInstance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    setError('');
    try {
      const response = await api.post('/itps/instances', {
        template_id: selectedTemplate.id,
        project_id: parseInt(id!),
        name: form.name.trim(),
        lot_number: form.lot_number || undefined,
        panel_no: form.panel_no || undefined,
        revision: form.revision || undefined,
        drawing_ref: form.drawing_ref || undefined,
      });
      navigate(`/itp/${response.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create ITP instance');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="loading">Loading project...</div>;

  return (
    <div className="project-details">
      <Link to="/" className="back-link">← Back to Dashboard</Link>
      <h1>{project?.name}</h1>
      <p>{project?.description}</p>

      {error && <div className="error-banner">{error}</div>}

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
                  onClick={() => openCreateForm(t)}
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
                <span className={`status-badge ${i.status.toLowerCase().replace(/\s+/g, '-')}`}>{i.status}</span>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* Create Instance Modal */}
      {selectedTemplate && (
        <div className="modal-overlay" onClick={closeCreateForm}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>New ITP Instance — {selectedTemplate.name}</h3>
              <button className="btn-icon" onClick={closeCreateForm}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateInstance}>
              {error && <div className="error-banner">{error}</div>}
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Instance Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Lot / Panel No.</label>
                  <input
                    type="text"
                    placeholder="e.g. DW-001"
                    value={form.lot_number}
                    onChange={e => setForm(f => ({ ...f, lot_number: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Panel No.</label>
                  <input
                    type="text"
                    placeholder="e.g. P-12"
                    value={form.panel_no}
                    onChange={e => setForm(f => ({ ...f, panel_no: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Revision</label>
                  <input
                    type="text"
                    placeholder="e.g. A"
                    value={form.revision}
                    onChange={e => setForm(f => ({ ...f, revision: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Drawing Reference</label>
                  <input
                    type="text"
                    placeholder="e.g. DWG-001-A"
                    value={form.drawing_ref}
                    onChange={e => setForm(f => ({ ...f, drawing_ref: e.target.value }))}
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={closeCreateForm}>Cancel</button>
                <button type="submit" className="btn-approve" disabled={creating}>
                  {creating ? 'Creating...' : 'Create ITP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetails;

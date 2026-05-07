import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Plus, X, Library, Trash2, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import WPConfigSection from '../components/WPConfigSection';
import ReportConfigSection from '../components/ReportConfigSection';

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
  const { user } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [instances, setInstances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const errorBannerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) errorBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [error]);
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

  const handleDeleteTemplate = async (templateId: number, templateName: string) => {
    if (!confirm(`Delete template "${templateName}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/templates/${templateId}`);
      setTemplates(prev => prev.filter(t => t.id !== templateId));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete template');
    }
  };

  const handleDeactivateITP = async (instanceId: number, instanceName: string) => {
    if (!confirm(`Deactivate ITP "${instanceName}"? It will be marked as Closed and cannot be executed further.`)) return;
    try {
      await api.post(`/itps/instances/${instanceId}/deactivate`);
      setInstances(prev => prev.map(i => i.id === instanceId ? { ...i, status: 'Closed' } : i));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to deactivate ITP');
    }
  };

  const handleDeleteITP = async (instanceId: number, instanceName: string) => {
    if (!confirm(`⚠️ PERMANENTLY DELETE ITP "${instanceName}"?\n\nThis will delete all points, NCRs, media, and audit logs. This cannot be undone.`)) return;
    try {
      await api.delete(`/itps/instances/${instanceId}`);
      setInstances(prev => prev.filter(i => i.id !== instanceId));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete ITP');
    }
  };

  if (loading) return <div className="loading">Loading project...</div>;

  return (
    <div className="project-details">
      <Link to="/" className="back-link">← Back to Dashboard</Link>
      <h1>{project?.name}</h1>
      <p>{project?.description}</p>

      {error && <div ref={errorBannerRef} className="error-banner">{error}</div>}

      <section className="section">
        <div className="section-header">
          <h2>ITP Templates</h2>
          <div className="button-group">
            <Link to={`/projects/${id}/templates/library`} className="btn-small btn-secondary">
              <Library size={16} /> Browse Library
            </Link>
            <Link to={`/projects/${id}/templates/new`} className="btn-small btn-primary">
              <Plus size={16} /> Create Template
            </Link>
          </div>
        </div>
        <div className="list">
          {templates.length === 0 ? (
            <div className="list-item">No templates found. Create one to get started.</div>
          ) : (
            templates.map(t => (
              <div key={t.id} className="list-item">
                <span>{t.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button
                    className="btn-small"
                    onClick={() => openCreateForm(t)}
                  >
                    Create Instance
                  </button>
                  {user && (user.role_id === 2 || user.role_id === 4) && (
                    <button
                      className="btn-icon"
                      onClick={() => handleDeleteTemplate(t.id, t.name)}
                      title="Delete template"
                      style={{ color: '#991b1b', opacity: 0.5, transition: 'opacity 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
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
              <div key={i.id} className="list-item">
                <Link to={`/itp/${i.id}`} className="list-item-link">
                  <span>{i.name}</span>
                  <span className={`status-badge ${i.status.toLowerCase().replace(/\s+/g, '-')}`}>{i.status}</span>
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {i.status !== 'Closed' && user && (user.role_id === 2 || user.role_id === 4) && (
                    <button
                      className="btn-icon"
                      onClick={(e) => { e.preventDefault(); handleDeactivateITP(i.id, i.name); }}
                      title="Deactivate ITP"
                      style={{ color: '#92400e', opacity: 0.5, transition: 'opacity 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
                    >
                      <XCircle size={15} />
                    </button>
                  )}
                  {user && user.role_id === 4 && (
                    <button
                      className="btn-icon"
                      onClick={(e) => { e.preventDefault(); handleDeleteITP(i.id, i.name); }}
                      title="Permanently delete (POC)"
                      style={{ color: '#991b1b', opacity: 0.4, transition: 'opacity 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '0.4')}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Witness Point Settings - visible to Head Contractor (roleId 2) and Admin (roleId 4) */}
      {user && (user.role_id === 2 || user.role_id === 4) && (
        <WPConfigSection projectId={parseInt(id!)} />
      )}

      {/* Report Configuration - visible to Head Contractor (roleId 2) and Admin (roleId 4) */}
      {user && (user.role_id === 2 || user.role_id === 4) && (
        <ReportConfigSection projectId={parseInt(id!)} />
      )}

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

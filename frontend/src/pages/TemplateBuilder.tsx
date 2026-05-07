import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { Plus, Trash2, Save, MoveUp, MoveDown } from 'lucide-react';

type PointType = 'HP' | 'WP' | 'RP' | 'SP' | 'IP';

interface Point {
  sequence: number;
  description: string;
  type: PointType;
  acceptance_criteria: string;
  reference_documents: string;
  inspection_method: string;
  frequency: string;
  responsible_party: string;
  section: string;
  verifying_records: string;
  approver_role_id: number | null;
}

const ROLES = [
  { id: null, label: 'Any Role' },
  { id: 1, label: 'Subcontractor' },
  { id: 2, label: 'Head Contractor' },
  { id: 3, label: 'Client' },
  { id: 4, label: 'Admin' },
];

const emptyPoint = (seq: number): Point => ({
  sequence: seq,
  description: '',
  type: 'WP',
  acceptance_criteria: '',
  reference_documents: '',
  inspection_method: '',
  frequency: '',
  responsible_party: '',
  section: '',
  verifying_records: '',
  approver_role_id: null,
});

const TemplateBuilder: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState<Point[]>([emptyPoint(1)]);
  const [error, setError] = useState('');
  const errorBannerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) errorBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [error]);
  const [saving, setSaving] = useState(false);

  const addPoint = () => setPoints(prev => [...prev, emptyPoint(prev.length + 1)]);

  const removePoint = (index: number) => {
    setPoints(prev => prev.filter((_, i) => i !== index).map((p, i) => ({ ...p, sequence: i + 1 })));
  };

  const updatePoint = (index: number, field: keyof Point, value: any) => {
    setPoints(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const movePoint = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === points.length - 1) return;
    const next = [...points];
    const target = direction === 'up' ? index - 1 : index + 1;
    [next[index], next[target]] = [next[target], next[index]];
    setPoints(next.map((p, i) => ({ ...p, sequence: i + 1 })));
  };

  const handleSave = async () => {
    if (!name) { setError('Template name is required'); return; }
    if (points.some(p => !p.description)) { setError('All points must have a description'); return; }
    setSaving(true);
    try {
      await api.post('/templates', { project_id: parseInt(projectId!), name, description, points });
      navigate(`/projects/${projectId}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="template-builder">
      <Link to={`/projects/${projectId}`} className="back-link">← Back to Project</Link>
      <header className="builder-header">
        <h1>Create ITP Template</h1>
        <button onClick={handleSave} disabled={saving} className="btn-save">
          <Save size={18} /> {saving ? 'Saving...' : 'Save Template'}
        </button>
      </header>

      {error && <div ref={errorBannerRef} className="error-banner">{error}</div>}

      <section className="template-meta">
        <div className="form-group">
          <label>Template Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Concrete Pour Inspection" />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Overall description of the ITP scope" />
        </div>
      </section>

      <section className="points-builder">
        <h2>Inspection Points</h2>
        <div className="points-header">
          <span className="col-seq">#</span>
          <span className="col-desc">Description</span>
          <span className="col-type">Type</span>
          <span className="col-actions">Actions</span>
        </div>

        {points.map((point, index) => (
          <div key={index} className="point-item-container">
            <div className="point-row">
              <span className="col-seq">{point.sequence}</span>
              <div className="col-desc">
                <input
                  type="text"
                  value={point.description}
                  onChange={e => updatePoint(index, 'description', e.target.value)}
                  placeholder="What is being inspected?"
                />
              </div>
              <div className="col-type">
                <select value={point.type} onChange={e => updatePoint(index, 'type', e.target.value)}>
                  <option value="HP">HP — Hold Point</option>
                  <option value="WP">WP — Witness Point</option>
                  <option value="RP">RP — Review Point</option>
                  <option value="SP">SP — Surveillance</option>
                  <option value="IP">IP — Inspection</option>
                </select>
              </div>
              <div className="col-actions">
                <button onClick={() => movePoint(index, 'up')} disabled={index === 0} title="Move Up"><MoveUp size={16} /></button>
                <button onClick={() => movePoint(index, 'down')} disabled={index === points.length - 1} title="Move Down"><MoveDown size={16} /></button>
                <button onClick={() => removePoint(index)} className="btn-danger" title="Remove"><Trash2 size={16} /></button>
              </div>
            </div>

            <div className="point-details-grid">
              <div className="detail-field">
                <label>Section / Stage</label>
                <input
                  type="text"
                  value={point.section}
                  onChange={e => updatePoint(index, 'section', e.target.value)}
                  placeholder="e.g., Stage 1 — Pre-construction"
                />
              </div>
              <div className="detail-field">
                <label>Approver Role</label>
                <select
                  value={point.approver_role_id ?? ''}
                  onChange={e => updatePoint(index, 'approver_role_id', e.target.value === '' ? null : parseInt(e.target.value))}
                >
                  {ROLES.map(r => (
                    <option key={r.id ?? 'any'} value={r.id ?? ''}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div className="detail-field">
                <label>Acceptance Criteria</label>
                <input
                  type="text"
                  value={point.acceptance_criteria}
                  onChange={e => updatePoint(index, 'acceptance_criteria', e.target.value)}
                  placeholder="Criteria for conformity"
                />
              </div>
              <div className="detail-field">
                <label>Verifying Records</label>
                <input
                  type="text"
                  value={point.verifying_records}
                  onChange={e => updatePoint(index, 'verifying_records', e.target.value)}
                  placeholder="e.g., Test cert, survey report, photos"
                />
              </div>
              <div className="detail-field">
                <label>Reference Documents</label>
                <input
                  type="text"
                  value={point.reference_documents}
                  onChange={e => updatePoint(index, 'reference_documents', e.target.value)}
                  placeholder="Standards, Drawings, Specs"
                />
              </div>
              <div className="detail-field">
                <label>Inspection Method</label>
                <input
                  type="text"
                  value={point.inspection_method}
                  onChange={e => updatePoint(index, 'inspection_method', e.target.value)}
                  placeholder="Visual, Test, Measure, Document"
                />
              </div>
              <div className="detail-field">
                <label>Frequency</label>
                <input
                  type="text"
                  value={point.frequency}
                  onChange={e => updatePoint(index, 'frequency', e.target.value)}
                  placeholder="e.g., Per DW, Once"
                />
              </div>
              <div className="detail-field">
                <label>Responsible Party (RI)</label>
                <input
                  type="text"
                  value={point.responsible_party}
                  onChange={e => updatePoint(index, 'responsible_party', e.target.value)}
                  placeholder="e.g., ENG, SUP, SUR"
                />
              </div>
            </div>
          </div>
        ))}

        <button onClick={addPoint} className="btn-add">
          <Plus size={18} /> Add Point
        </button>
      </section>
    </div>
  );
};

export default TemplateBuilder;

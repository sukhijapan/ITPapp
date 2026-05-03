import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { Plus, Trash2, Save, MoveUp, MoveDown } from 'lucide-react';

interface Point {
  sequence: number;
  description: string;
  type: 'HP' | 'WP' | 'RP' | 'SP';
  acceptance_criteria: string;
  reference_documents: string;
  inspection_method: string;
  frequency: string;
  responsible_party: string;
}

const TemplateBuilder: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState<Point[]>([
    { 
      sequence: 1, 
      description: '', 
      type: 'WP',
      acceptance_criteria: '',
      reference_documents: '',
      inspection_method: '',
      frequency: '',
      responsible_party: ''
    }
  ]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const addPoint = () => {
    const newPoint: Point = {
      sequence: points.length + 1,
      description: '',
      type: 'WP',
      acceptance_criteria: '',
      reference_documents: '',
      inspection_method: '',
      frequency: '',
      responsible_party: ''
    };
    setPoints([...points, newPoint]);
  };

  const removePoint = (index: number) => {
    const newPoints = points.filter((_, i) => i !== index)
      .map((p, i) => ({ ...p, sequence: i + 1 }));
    setPoints(newPoints);
  };

  const updatePoint = (index: number, field: keyof Point, value: any) => {
    const newPoints = [...points];
    newPoints[index] = { ...newPoints[index], [field]: value };
    setPoints(newPoints);
  };

  const movePoint = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === points.length - 1) return;

    const newPoints = [...points];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newPoints[index], newPoints[targetIndex]] = [newPoints[targetIndex], newPoints[index]];
    
    // Re-sequence
    const reSequenced = newPoints.map((p, i) => ({ ...p, sequence: i + 1 }));
    setPoints(reSequenced);
  };

  const handleSave = async () => {
    if (!name) {
      setError('Template name is required');
      return;
    }
    if (points.some(p => !p.description)) {
      setError('All points must have a description');
      return;
    }

    setSaving(true);
    try {
      await api.post('/templates', {
        project_id: parseInt(projectId!),
        name,
        description,
        points
      });
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

      {error && <div className="error-banner">{error}</div>}

      <section className="template-meta">
        <div className="form-group">
          <label>Template Name</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Concrete Pour Inspection"
          />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea 
            value={description} 
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Overall description of the ITP scope"
          />
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
                  onChange={(e) => updatePoint(index, 'description', e.target.value)}
                  placeholder="What is being inspected? (Task / Activity Description)"
                />
              </div>
              <div className="col-type">
                <select 
                  value={point.type} 
                  onChange={(e) => updatePoint(index, 'type', e.target.value)}
                >
                  <option value="HP">HP (Hold Point)</option>
                  <option value="WP">WP (Witness Point)</option>
                  <option value="RP">RP (Review Point)</option>
                  <option value="SP">SP (Surveillance)</option>
                </select>
              </div>
              <div className="col-actions">
                <button onClick={() => movePoint(index, 'up')} disabled={index === 0} title="Move Up"><MoveUp size={16}/></button>
                <button onClick={() => movePoint(index, 'down')} disabled={index === points.length - 1} title="Move Down"><MoveDown size={16}/></button>
                <button onClick={() => removePoint(index)} className="btn-danger" title="Remove"><Trash2 size={16}/></button>
              </div>
            </div>
            
            <div className="point-details-grid">
              <div className="detail-field">
                <label>Acceptance Criteria</label>
                <input 
                  type="text" 
                  value={point.acceptance_criteria} 
                  onChange={(e) => updatePoint(index, 'acceptance_criteria', e.target.value)}
                  placeholder="Criteria for conformity"
                />
              </div>
              <div className="detail-field">
                <label>Reference Documents</label>
                <input 
                  type="text" 
                  value={point.reference_documents} 
                  onChange={(e) => updatePoint(index, 'reference_documents', e.target.value)}
                  placeholder="Standards, Drawings, Specifications"
                />
              </div>
              <div className="detail-field">
                <label>Inspection Method</label>
                <input 
                  type="text" 
                  value={point.inspection_method} 
                  onChange={(e) => updatePoint(index, 'inspection_method', e.target.value)}
                  placeholder="Visual, Test, Measure, etc."
                />
              </div>
              <div className="detail-field">
                <label>Frequency</label>
                <input 
                  type="text" 
                  value={point.frequency} 
                  onChange={(e) => updatePoint(index, 'frequency', e.target.value)}
                  placeholder="e.g., Per DW, Once"
                />
              </div>
              <div className="detail-field">
                <label>Responsible Party (RI)</label>
                <input 
                  type="text" 
                  value={point.responsible_party} 
                  onChange={(e) => updatePoint(index, 'responsible_party', e.target.value)}
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

import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft, ShieldAlert, CheckCircle, Clock, FileText, MapPin, Save } from 'lucide-react';

interface AuditEntry {
  id: number;
  timestamp: string;
  username: string;
  action: string;
  old_status: string | null;
  new_status: string | null;
  metadata: any;
}

interface NCRData {
  id: number;
  title: string | null;
  description: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  itp_point_id: number;
  reported_to: string | null;
  client_contact: string | null;
  contractor_contact: string | null;
  root_cause: string | null;
  proposed_disposition: string | null;
  proposed_completion_date: string | null;
  corrective_action: string | null;
  rectification_complete: string | null;
  verified_by_contractor: string | null;
  verified_by_client: string | null;
  closing_remarks: string | null;
  category: string | null;
  point_sequence: number;
  point_description: string;
  point_type: string;
  point_status: string;
  point_section: string | null;
  point_comments: string | null;
  acceptance_criteria: string | null;
  reference_documents: string | null;
  instance_id: number;
  instance_name: string;
  instance_status: string;
  lot_number: string | null;
  panel_no: string | null;
  revision: string | null;
  drawing_ref: string | null;
  project_id: number;
  project_name: string;
  created_by_name: string;
  created_by_email: string;
  created_by_role: string;
  signed_off_by_name: string | null;
  signed_off_by_role: string | null;
  signed_off_at: string | null;
  audit_trail: AuditEntry[];
}

// Editable fields that map to the Hully Bolivar NCR template
interface NCRForm {
  description: string;
  category: string;
  reported_to: string;
  client_contact: string;
  contractor_contact: string;
  root_cause: string;
  proposed_disposition: string;
  proposed_completion_date: string;
  corrective_action: string;
  rectification_complete: string;
  verified_by_contractor: string;
  verified_by_client: string;
  closing_remarks: string;
}

const NCRDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [ncr, setNcr] = useState<NCRData | null>(null);
  const [form, setForm] = useState<NCRForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState('');
  const errorBannerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) errorBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [error]);
  const [saveMsg, setSaveMsg] = useState('');
  const [dirty, setDirty] = useState(false);

  const fetchNCR = async () => {
    try {
      const res = await api.get(`/ncrs/${id}`);
      const data: NCRData = res.data;
      setNcr(data);
      setForm({
        description: data.description || '',
        category: data.category || '',
        reported_to: data.reported_to || '',
        client_contact: data.client_contact || '',
        contractor_contact: data.contractor_contact || '',
        root_cause: data.root_cause || '',
        proposed_disposition: data.proposed_disposition || '',
        proposed_completion_date: data.proposed_completion_date || '',
        corrective_action: data.corrective_action || '',
        rectification_complete: data.rectification_complete || '',
        verified_by_contractor: data.verified_by_contractor || '',
        verified_by_client: data.verified_by_client || '',
        closing_remarks: data.closing_remarks || '',
      });
      setDirty(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load NCR');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNCR(); }, [id]);

  const updateField = (field: keyof NCRForm, value: string) => {
    if (!form) return;
    setForm({ ...form, [field]: value });
    setDirty(true);
    setSaveMsg('');
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    setSaveMsg('');
    try {
      await api.put(`/ncrs/${id}`, form);
      setSaveMsg('Saved');
      setDirty(false);
      // Refresh to get latest data
      const res = await api.get(`/ncrs/${id}`);
      setNcr(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save NCR');
    } finally {
      setSaving(false);
    }
  };

  const handleResolve = async () => {
    setResolving(true);
    try {
      await api.post(`/ncrs/${id}/resolve`);
      fetchNCR();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to resolve NCR');
    } finally {
      setResolving(false);
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'Open': return <Clock size={18} className="status-icon open" />;
      case 'Closed': case 'Verified': return <CheckCircle size={18} className="status-icon closed" />;
      default: return <ShieldAlert size={18} className="status-icon" />;
    }
  };

  const daysOpen = (createdAt: string, resolvedAt: string | null) => {
    const start = new Date(createdAt);
    const end = resolvedAt ? new Date(resolvedAt) : new Date();
    return Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  };

  if (loading) return <div className="loading">Loading NCR...</div>;
  if (error && !ncr) return (
    <div className="ncr-detail-page">
      <div className="error-banner" style={{ marginTop: '2rem' }}>{error || 'NCR not found.'}</div>
    </div>
  );
  if (!ncr || !form) return null;

  const ncrRef = `NCR-${String(ncr.id).padStart(4, '0')}`;

  return (
    <div className="ncr-detail-page">
      <Link to="/ncrs" className="back-link"><ArrowLeft size={14} /> Back to NCR Register</Link>

      {/* ── Header ── */}
      <header className="ncr-detail-header">
        <div className="ncr-detail-title-row">
          <div style={{ flex: 1 }}>
            <span className="ncr-ref-badge">{ncrRef}</span>
            <h1>{ncr.title || ncr.description}</h1>
          </div>
          <div className="ncr-header-actions">
            <span className={`status-badge large ${ncr.status.toLowerCase()}`}>
              {statusIcon(ncr.status)} {ncr.status}
            </span>
            {ncr.status === 'Open' && (
              <button onClick={handleResolve} disabled={resolving} className="btn-resolve-large">
                {resolving ? 'Resolving…' : 'Resolve NCR'}
              </button>
            )}
          </div>
        </div>
        <div className="ncr-days-badge">
          {ncr.status === 'Open' || ncr.status === 'Resolved'
            ? `${daysOpen(ncr.created_at, null)} days open`
            : `Closed after ${daysOpen(ncr.created_at, ncr.resolved_at)} days`}
        </div>
      </header>

      {error && <div ref={errorBannerRef} className="error-banner">{error}</div>}

      {/* ── Save bar ── */}
      <div className="ncr-save-bar">
        <button onClick={handleSave} disabled={saving || !dirty} className="btn-save-ncr">
          <Save size={16} /> {saving ? 'Saving…' : 'Save Changes'}
        </button>
        {saveMsg && <span className="save-msg">{saveMsg}</span>}
        {dirty && !saveMsg && <span className="unsaved-hint">Unsaved changes</span>}
      </div>

      {/* ── Project Details (read-only) ── */}
      <section className="ncr-section">
        <h2>Project Details</h2>
        <div className="ncr-meta-grid">
          <div className="ncr-meta-item"><label>Project</label><p>{ncr.project_name}</p></div>
          <div className="ncr-meta-item"><label>Client / Head Contractor</label><p>{ncr.created_by_role || '-'}</p></div>
          <div className="ncr-meta-item"><label>ITP</label><p><Link to={`/itp/${ncr.instance_id}`}>{ncr.instance_name}</Link></p></div>
          <div className="ncr-meta-item"><label>Lot</label><p>{ncr.lot_number || '-'}</p></div>
          <div className="ncr-meta-item"><label>Panel</label><p>{ncr.panel_no || '-'}</p></div>
          <div className="ncr-meta-item"><label>Drawing Ref</label><p>{ncr.drawing_ref || '-'}</p></div>
        </div>
      </section>

      {/* ── NCR Details (editable) ── */}
      <section className="ncr-section">
        <h2>NCR Details</h2>
        <div className="ncr-form-grid">
          <div className="ncr-field">
            <label>Non-Conformance No</label>
            <input type="text" value={ncrRef} disabled className="ncr-input disabled" />
          </div>
          <div className="ncr-field">
            <label>NCR Title</label>
            <input type="text" value={ncr.title || ncr.description} disabled className="ncr-input disabled" />
          </div>
          <div className="ncr-field">
            <label>NCR Category</label>
            <select value={form.category} onChange={e => updateField('category', e.target.value)} className="ncr-input">
              <option value="">— Select —</option>
              <option value="Quality">Quality</option>
              <option value="Safety">Safety</option>
              <option value="Environmental">Environmental</option>
              <option value="Design">Design</option>
              <option value="Material">Material</option>
              <option value="Workmanship">Workmanship</option>
              <option value="Documentation">Documentation</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="ncr-field">
            <label>NCR Reported To</label>
            <input type="text" value={form.reported_to} onChange={e => updateField('reported_to', e.target.value)} className="ncr-input" placeholder="e.g. John Smith, Jane Doe (Company)" />
          </div>
          <div className="ncr-field">
            <label>NCR Client Contact</label>
            <input type="text" value={form.client_contact} onChange={e => updateField('client_contact', e.target.value)} className="ncr-input" placeholder="Client representative name" />
          </div>
          <div className="ncr-field">
            <label>NCR Contractor Contact</label>
            <input type="text" value={form.contractor_contact} onChange={e => updateField('contractor_contact', e.target.value)} className="ncr-input" placeholder="Contractor representative name" />
          </div>
          <div className="ncr-field">
            <label>NCR Reported By</label>
            <input type="text" value={`${ncr.created_by_name}${ncr.created_by_role ? ' (' + ncr.created_by_role + ')' : ''}`} disabled className="ncr-input disabled" />
          </div>
          <div className="ncr-field">
            <label>Date Raised</label>
            <input type="text" value={new Date(ncr.created_at).toLocaleDateString()} disabled className="ncr-input disabled" />
          </div>
          <div className="ncr-field">
            <label>Status</label>
            <input type="text" value={ncr.status} disabled className="ncr-input disabled" />
          </div>
        </div>
      </section>

      {/* ── Description ── */}
      <section className="ncr-section">
        <h2>Description of Non-Conformance</h2>
        <textarea
          className="ncr-textarea"
          rows={5}
          value={form.description}
          onChange={e => updateField('description', e.target.value)}
          placeholder="Describe the non-conformance in detail…"
        />
      </section>

      {/* ── Root Cause ── */}
      <section className="ncr-section">
        <h2>Root Cause</h2>
        <textarea
          className="ncr-textarea"
          rows={3}
          value={form.root_cause}
          onChange={e => updateField('root_cause', e.target.value)}
          placeholder="Identify the root cause of the non-conformance…"
        />
      </section>

      {/* ── Proposed Disposition ── */}
      <section className="ncr-section">
        <h2>Proposed Disposition of Non-Conformance</h2>
        <textarea
          className="ncr-textarea"
          rows={6}
          value={form.proposed_disposition}
          onChange={e => updateField('proposed_disposition', e.target.value)}
          placeholder="Describe the proposed disposition — accept as is, rework, repair, reject, etc.&#10;Include repair procedures if applicable."
        />
        <div className="ncr-form-grid" style={{ marginTop: '1rem' }}>
          <div className="ncr-field">
            <label>Proposed Date for Action Completion</label>
            <input type="text" value={form.proposed_completion_date} onChange={e => updateField('proposed_completion_date', e.target.value)} className="ncr-input" placeholder="e.g. 30/06/2025 or TBC" />
          </div>
        </div>
      </section>

      {/* ── Corrective / Preventative Action ── */}
      <section className="ncr-section">
        <h2>Corrective / Preventative Action</h2>
        <textarea
          className="ncr-textarea"
          rows={3}
          value={form.corrective_action}
          onChange={e => updateField('corrective_action', e.target.value)}
          placeholder="Describe actions to prevent recurrence…"
        />
      </section>

      {/* ── Inspection Point (read-only context) ── */}
      <section className="ncr-section">
        <h2><MapPin size={16} /> Inspection Point</h2>
        <div className="ncr-point-card">
          <div className="ncr-point-header">
            <span className="sequence">{ncr.point_sequence}</span>
            <span className={`type-badge ${ncr.point_type.toLowerCase()}`}>{ncr.point_type}</span>
            <strong>{ncr.point_description}</strong>
            <span className={`status-badge ${ncr.point_status.toLowerCase()}`}>{ncr.point_status}</span>
          </div>
          <div className="ncr-meta-grid" style={{ marginTop: '0.75rem' }}>
            {ncr.point_section && <div className="ncr-meta-item"><label>Section</label><p>{ncr.point_section}</p></div>}
            {ncr.acceptance_criteria && <div className="ncr-meta-item"><label>Acceptance Criteria</label><p>{ncr.acceptance_criteria}</p></div>}
            {ncr.reference_documents && <div className="ncr-meta-item"><label>Reference Documents</label><p>{ncr.reference_documents}</p></div>}
          </div>
        </div>
      </section>

      {/* ── NCR Completion / Close Out ── */}
      <section className="ncr-section">
        <h2>NCR Completion / Close Out</h2>
        {ncr.status === 'Open' ? (
          <div className="ncr-closeout-pending">
            <Clock size={18} />
            <div>
              <strong>Awaiting resolution</strong>
              <p>This NCR must be resolved before the inspection point can be approved.</p>
            </div>
          </div>
        ) : (
          <div className="ncr-form-grid">
            <div className="ncr-field full-width">
              <label>Rectification Complete</label>
              <input type="text" value={form.rectification_complete} onChange={e => updateField('rectification_complete', e.target.value)} className="ncr-input" placeholder="Yes / No / Partial — describe status" />
            </div>
            <div className="ncr-field">
              <label>Verified By (Contractor) — Name / Role / Date</label>
              <input type="text" value={form.verified_by_contractor} onChange={e => updateField('verified_by_contractor', e.target.value)} className="ncr-input" placeholder="e.g. Daniel Paukner / PM / 15/11/23" />
            </div>
            <div className="ncr-field">
              <label>Verified By (Client) — Name / Role / Date</label>
              <input type="text" value={form.verified_by_client} onChange={e => updateField('verified_by_client', e.target.value)} className="ncr-input" placeholder="e.g. Eddy Karim / Superintendent / 15/11/23" />
            </div>
            <div className="ncr-field full-width">
              <label>Closing Remarks</label>
              <textarea className="ncr-textarea" rows={3} value={form.closing_remarks} onChange={e => updateField('closing_remarks', e.target.value)} placeholder="Final remarks on NCR closure…" />
            </div>
            {ncr.resolved_at && (
              <div className="ncr-meta-item"><label>Closed Date</label><p>{new Date(ncr.resolved_at).toLocaleString()}</p></div>
            )}
          </div>
        )}
      </section>

      {/* ── Audit Trail (read-only) ── */}
      {ncr.audit_trail.length > 0 && (
        <section className="ncr-section">
          <h2><FileText size={16} /> Audit Trail</h2>
          <div className="ncr-audit-timeline">
            {ncr.audit_trail.map(entry => (
              <div key={entry.id} className="audit-entry">
                <div className="audit-dot" />
                <div className="audit-content">
                  <div className="audit-header">
                    <strong>{entry.username}</strong>
                    <span className="audit-action">{entry.action.replace(/_/g, ' ')}</span>
                    {entry.new_status && <span className={`status-badge sm ${entry.new_status.toLowerCase()}`}>{entry.new_status}</span>}
                  </div>
                  <time>{new Date(entry.timestamp).toLocaleString()}</time>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default NCRDetail;

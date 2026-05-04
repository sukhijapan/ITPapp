import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { CheckCircle, Clock, XCircle, FileDown, AlertTriangle, ShieldCheck, Send, Paperclip, FileText, FileSpreadsheet, File } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ROLE_NAMES: Record<number, string> = {
  1: 'Subcontractor',
  2: 'Head Contractor',
  3: 'Client',
  4: 'Admin',
};

const ITPExecution: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [itp, setItp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ncrPointId, setNcrPointId] = useState<number | null>(null);
  const [ncrDescription, setNcrDescription] = useState('');
  const [uploadingPointId, setUploadingPointId] = useState<number | null>(null);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  // Bug 3: rejection choice — 'choose' | 'comment' | 'ncr'
  const [rejectPointId, setRejectPointId] = useState<number | null>(null);
  const [rejectMode, setRejectMode] = useState<'choose' | 'comment' | 'ncr'>('choose');
  const [rejectComment, setRejectComment] = useState('');

  useEffect(() => { fetchITP(); }, [id]);

  const fetchITP = async () => {
    try {
      // 1 request: ITP instance + points + NCRs (all in one SQL query — no fan-out)
      const itpRes = await api.get(`/itps/instances/${id}`);
      const itpData = itpRes.data;

      // 1 request: all media for the instance (replaces N per-point requests)
      let allMedia: any[] = [];
      try {
        const mediaRes = await api.get(`/media/instance/${id}`);
        allMedia = mediaRes.data;
      } catch (mediaErr) {
        console.warn('Media fetch failed (non-fatal):', mediaErr);
      }

      // Map media to their points client-side
      const mediaByPoint: Record<number, any[]> = {};
      for (const m of allMedia) {
        if (!mediaByPoint[m.itp_point_id]) mediaByPoint[m.itp_point_id] = [];
        mediaByPoint[m.itp_point_id].push(m);
      }

      const pointsData = itpData.points.map((point: any) => ({
        ...point,
        ncrs:  Array.isArray(point.ncrs) ? point.ncrs : [],
        media: mediaByPoint[point.id] ?? [],
      }));

      setItp({ ...itpData, points: pointsData });
    } catch (err: any) {
      console.error('Failed to fetch ITP', err);
      const msg = err.response?.data?.error || err.message || 'Unknown error';
      setError(`Failed to load ITP: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOff = async (pointId: number, status: string) => {
    if (status === 'Rejected') {
      // Bug 3: Show rejection choice — NCR or comment-only
      setRejectPointId(pointId);
      setRejectMode('choose');
      setRejectComment('');
      setNcrDescription('');
      return;
    }
    try {
      setError('');
      await api.post(`/itps/points/${pointId}/sign-off`, { status, comments: 'Signed off from web interface' });
      fetchITP();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Sign-off failed');
    }
  };

  // Bug 3: Reject with comment only (no NCR — non-blocking additional info request)
  const handleRejectWithComment = async () => {
    if (!rejectPointId) return;
    try {
      setError('');
      await api.post(`/itps/points/${rejectPointId}/sign-off`, {
        status: 'Rejected',
        comments: rejectComment || 'Additional information required',
      });
      setRejectPointId(null);
      setRejectComment('');
      setRejectMode('choose');
      fetchITP();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Rejection failed');
    }
  };

  // Bug 3: Reject with NCR (blocking non-conformance)
  const handleRejectWithNCR = async () => {
    if (!rejectPointId) return;
    try {
      setError('');
      await api.post('/ncrs', { itp_point_id: rejectPointId, description: ncrDescription });
      setRejectPointId(null);
      setNcrDescription('');
      setRejectMode('choose');
      fetchITP();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create NCR');
    }
  };

  const handleCreateNCR = async () => {
    try {
      setError('');
      await api.post('/ncrs', { itp_point_id: ncrPointId, description: ncrDescription });
      setNcrPointId(null);
      setNcrDescription('');
      fetchITP();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create NCR');
    }
  };

  const handleResolveNCR = async (ncrId: number) => {
    try {
      await api.post(`/ncrs/${ncrId}/resolve`);
      fetchITP();
    } catch (err) {
      console.error('Failed to resolve NCR', err);
    }
  };

  const handleFileUpload = async (pointId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('itp_point_id', pointId.toString());
    setUploadingPointId(pointId);
    try {
      await api.post('/media/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      fetchITP();
    } catch {
      alert('Failed to upload file');
    } finally {
      setUploadingPointId(null);
    }
  };

  // Feature 2: Workflow actions
  const handleSubmitForReview = async () => {
    setWorkflowLoading(true);
    try {
      setError('');
      await api.post(`/itps/instances/${id}/submit`);
      fetchITP();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit for review');
    } finally {
      setWorkflowLoading(false);
    }
  };

  const handleApproveITP = async () => {
    setWorkflowLoading(true);
    try {
      setError('');
      await api.post(`/itps/instances/${id}/approve`);
      fetchITP();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to approve ITP');
    } finally {
      setWorkflowLoading(false);
    }
  };

  const handleRejectITP = async () => {
    setWorkflowLoading(true);
    try {
      setError('');
      await api.post(`/itps/instances/${id}/reject`, { reason: rejectReason });
      setShowRejectForm(false);
      setRejectReason('');
      fetchITP();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reject ITP');
    } finally {
      setWorkflowLoading(false);
    }
  };

  // Feature 4: PDF export
  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const response = await api.get(`/itps/instances/${id}/report`, { responseType: 'blob' });
      // Check if the response is actually a JSON error (server returned 200 with error)
      const contentType = String(response.headers['content-type'] || '');
      if (contentType.includes('application/json')) {
        const text = await (response.data as Blob).text();
        const json = JSON.parse(text);
        setError(json.error || 'Failed to generate PDF.');
        return;
      }
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `ITP_${itp?.name?.replace(/[^a-z0-9]/gi, '_') ?? id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      // When responseType is 'blob', axios error.response.data is a Blob — parse it
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          setError(json.error || 'Failed to generate PDF. Try again later.');
        } catch {
          setError('Failed to generate PDF. Try again later.');
        }
      } else {
        setError(err.response?.data?.error || 'Failed to generate PDF. Try again later.');
      }
    } finally {
      setExportingPdf(false);
    }
  };

  if (loading) return <div className="loading">Loading ITP Details...</div>;
  if (!itp) return (
    <div className="itp-execution">
      <div className="error-banner" style={{ marginTop: '2rem' }}>
        {error || 'ITP not found.'}
      </div>
    </div>
  );

  const userRoleId = user?.role_id ?? 0;
  const canApproveITP = [2, 3, 4].includes(userRoleId); // HC, Client, Admin
  const itpIsOpen = itp.status === 'Open';

  const groupedPoints: Record<string, any[]> = itp.points.reduce((acc: any, point: any) => {
    const section = point.section || 'General';
    if (!acc[section]) acc[section] = [];
    acc[section].push(point);
    return acc;
  }, {});

  return (
    <div className="itp-execution">
      <Link to={`/projects/${itp.project_id}`} className="back-link">← Back to Project</Link>

      <header className="itp-header">
        <div className="header-main">
          <h1>{itp.name}</h1>
          <span className={`status-badge ${itp.status.toLowerCase().replace(/\s+/g, '-')}`}>{itp.status}</span>
          <button onClick={handleExportPdf} disabled={exportingPdf} className="btn-export">
            <FileDown size={16} /> {exportingPdf ? 'Generating…' : 'Export PDF'}
          </button>
        </div>
        <div className="metadata-bar">
          <div className="meta-pill"><strong>Lot:</strong> {itp.lot_number || '-'}</div>
          <div className="meta-pill"><strong>Panel:</strong> {itp.panel_no || '-'}</div>
          <div className="meta-pill"><strong>Rev:</strong> {itp.revision || '0'}</div>
          <div className="meta-pill"><strong>Ref:</strong> {itp.drawing_ref || '-'}</div>
        </div>
      </header>

      {/* Feature 2: Workflow status banner */}
      {itp.status === 'Draft' && (
        <div className="workflow-banner draft">
          <AlertTriangle size={18} />
          <div>
            <strong>Draft — Not yet approved for execution.</strong>
            <p>Review the inspection points, then submit this ITP for approval by a Head Contractor or Client.</p>
          </div>
          <button onClick={handleSubmitForReview} disabled={workflowLoading} className="btn-workflow">
            <Send size={15} /> {workflowLoading ? 'Submitting…' : 'Submit for Review'}
          </button>
        </div>
      )}

      {itp.status === 'Pending Review' && (
        <div className="workflow-banner pending">
          <Clock size={18} />
          <div>
            <strong>Pending Review</strong>
            <p>Awaiting approval by a Head Contractor or Client before execution can begin.</p>
          </div>
          {canApproveITP && !showRejectForm && (
            <div className="workflow-actions">
              <button onClick={handleApproveITP} disabled={workflowLoading} className="btn-workflow approve">
                <ShieldCheck size={15} /> {workflowLoading ? 'Approving…' : 'Approve ITP'}
              </button>
              <button onClick={() => setShowRejectForm(true)} className="btn-workflow reject">
                <XCircle size={15} /> Reject
              </button>
            </div>
          )}
          {showRejectForm && (
            <div className="reject-form">
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection (optional)..." />
              <div className="form-actions">
                <button onClick={handleRejectITP} disabled={workflowLoading} className="btn-workflow reject">
                  {workflowLoading ? 'Rejecting…' : 'Confirm Reject'}
                </button>
                <button onClick={() => setShowRejectForm(false)} className="btn-cancel">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {itp.status === 'Closed' && (
        <div className="workflow-banner closed">
          <CheckCircle size={18} />
          <strong>ITP Closed — All inspection points have been signed off.</strong>
        </div>
      )}

      <section className="legend-section">
        <div className="legend-item"><span className="type-badge hp">HP</span> Hold Point</div>
        <div className="legend-item"><span className="type-badge wp">WP</span> Witness Point</div>
        <div className="legend-item"><span className="type-badge rp">RP</span> Review Point</div>
        <div className="legend-item"><span className="type-badge ip">IP</span> Inspection</div>
        <div className="legend-item"><span className="type-badge sp">SP</span> Surveillance</div>
      </section>

      {error && <div className="error-banner">{error}</div>}

      <div className="staged-points">
        {Object.keys(groupedPoints).map(section => (
          <div key={section} className="section-group">
            <h2 className="section-title">{section}</h2>
            <div className="points-list">
              {groupedPoints[section].map((point: any) => {
                const isSignedOff = ['Approved', 'Closed'].includes(point.status);

                // Feature 1: can the current user sign off this point?
                const requiredRoleId = point.approver_role_id;
                const canSignOff = itpIsOpen && !isSignedOff && (
                  !requiredRoleId || userRoleId === 4 || userRoleId === requiredRoleId
                );
                const roleBlocked = itpIsOpen && !isSignedOff && requiredRoleId && userRoleId !== 4 && userRoleId !== requiredRoleId;

                return (
                  <div key={point.id} className={`point-card ${isSignedOff ? 'signed-off' : ''} ${point.status === 'Rejected' ? 'rejected-card' : ''}`}>
                    <div className="point-header">
                      <div className="title-row">
                        <span className="sequence">{point.sequence}</span>
                        <span className={`type-badge ${point.type.toLowerCase()}`}>{point.type}</span>
                        <h3>{point.description}</h3>
                      </div>
                      <div className="point-header-right">
                        {point.responsible_party && (
                          <span className="ri-tag">RI: {point.responsible_party}</span>
                        )}
                        {requiredRoleId && (
                          <span className="approver-tag">
                            🔒 {ROLE_NAMES[requiredRoleId] ?? `Role ${requiredRoleId}`}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="point-meta-grid">
                      <div className="meta-item">
                        <label>Acceptance Criteria</label>
                        <p>{point.acceptance_criteria || '-'}</p>
                      </div>
                      <div className="meta-item">
                        <label>Verifying Records</label>
                        <p className="highlight">{point.verifying_records || '-'}</p>
                      </div>
                      <div className="meta-item">
                        <label>References</label>
                        <p>{point.reference_documents || '-'}</p>
                      </div>
                    </div>

                    <div className="point-body">
                      <div className="point-status-info">
                        {isSignedOff ? (
                          <div className="success-msg">
                            <CheckCircle size={16} />
                            <div style={{ flex: 1 }}>
                              <span>
                                Signed off by <strong>{point.signed_off_by_name || 'Unknown'}</strong>
                                {point.signed_off_by_role ? ` (${point.signed_off_by_role})` : ''}
                                {point.signed_off_at ? ` on ${new Date(point.signed_off_at).toLocaleString()}` : ''}
                              </span>
                              {point.comments && point.comments !== 'Signed off from web interface' && (
                                <div style={{ marginTop: '0.25rem', fontSize: '0.8rem', color: '#6b7280', fontStyle: 'italic' }}>
                                  "{point.comments}"
                                </div>
                              )}
                            </div>
                          </div>
                        ) : point.status === 'Rejected' ? (
                          <div className="error-msg">
                            <XCircle size={16} />
                            <div style={{ flex: 1 }}>
                              <span>
                                Rejected by <strong>{point.signed_off_by_name || 'Unknown'}</strong>
                                {point.signed_off_by_role ? ` (${point.signed_off_by_role})` : ''}
                                {point.signed_off_at ? ` on ${new Date(point.signed_off_at).toLocaleString()}` : ''}
                              </span>
                              {point.comments && (
                                <div style={{ marginTop: '0.25rem', fontSize: '0.8rem', color: '#78716c', fontStyle: 'italic' }}>
                                  "{point.comments}"
                                </div>
                              )}
                            </div>
                          </div>
                        ) : roleBlocked ? (
                          <div className="role-blocked-msg">
                            <AlertTriangle size={16} />
                            <span>Requires <strong>{ROLE_NAMES[requiredRoleId!]}</strong> sign-off. You are logged in as <strong>{ROLE_NAMES[userRoleId] ?? 'Unknown'}</strong>.</span>
                          </div>
                        ) : !itpIsOpen ? (
                          <div className="pending-msg"><Clock size={16} /> {itp.status === 'Draft' ? 'ITP not yet submitted for review' : itp.status === 'Pending Review' ? 'Awaiting ITP approval' : 'Pending Approval'}</div>
                        ) : (
                          <div className="pending-msg"><Clock size={16} /> Pending Approval</div>
                        )}
                      </div>

                      {canSignOff && (
                        <div className="actions">
                          <button onClick={() => handleSignOff(point.id, 'Approved')} className="btn-approve">Sign Off</button>
                          <button onClick={() => handleSignOff(point.id, 'Rejected')} className="btn-reject">Reject</button>
                        </div>
                      )}
                    </div>

                    {/* Media & Attachments */}
                    <div className="media-section">
                      <div className="media-grid">
                        {point.media?.map((m: any) => {
                          const isImage = m.file_type?.startsWith('image/');
                          const fileName = m.file_path?.split('/').pop() || 'file';
                          const ext = fileName.split('.').pop()?.toLowerCase() || '';
                          const iconForExt = () => {
                            if (['pdf'].includes(ext)) return <FileDown size={24} />;
                            if (['doc', 'docx'].includes(ext)) return <FileText size={24} />;
                            if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileSpreadsheet size={24} />;
                            return <File size={24} />;
                          };
                          return isImage ? (
                            <a key={m.id} href={m.url} target="_blank" rel="noreferrer" className="media-thumb">
                              <img src={m.url} alt="attachment" />
                            </a>
                          ) : (
                            <a key={m.id} href={m.url} target="_blank" rel="noreferrer" className="media-file">
                              {iconForExt()}
                              <span className="media-file-name">{fileName.length > 20 ? fileName.slice(0, 17) + '…' + ext : fileName}</span>
                            </a>
                          );
                        })}
                        {!isSignedOff && (
                          <label className="upload-btn" title="Upload photo, PDF, document, spreadsheet or text file">
                            {uploadingPointId === point.id ? '…' : <Paperclip size={24} />}
                            <input
                              type="file"
                              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain"
                              onChange={e => handleFileUpload(point.id, e)}
                              hidden
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* NCRs */}
                    {point.ncrs?.length > 0 && (
                      <div className="ncr-section">
                        <h4>NCRs / Defects</h4>
                        {point.ncrs.map((ncr: any) => (
                          <div
                            key={ncr.id}
                            className={`ncr-item ncr-item--clickable ${ncr.status.toLowerCase()}`}
                            onClick={() => navigate(`/ncrs/${ncr.id}`)}
                          >
                            <div className="ncr-info">
                              <span className="ncr-status">{ncr.status}</span>
                              <span className="ncr-ref">NCR-{String(ncr.id).padStart(4, '0')}</span>
                              <span>{ncr.description}</span>
                            </div>
                            {ncr.status === 'Open' && (
                              <button onClick={(e) => { e.stopPropagation(); handleResolveNCR(ncr.id); }} className="btn-resolve">Resolve</button>
                            )}
                          </div>
                        ))}
                        {/* Hint when all NCRs resolved — the regular Sign Off button handles re-approval */}
                        {point.status === 'Rejected' && point.ncrs.every((n: any) => n.status === 'Closed' || n.status === 'Verified') && (
                          <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CheckCircle size={16} color="#16a34a" />
                            <span style={{ fontSize: '0.85rem', color: '#166534' }}>All NCRs resolved. This point can now be signed off.</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Create NCR form — legacy, kept for backward compat */}
                    {ncrPointId === point.id && (
                      <div className="ncr-form">
                        <h4>Raise Non-Conformance (NCR)</h4>
                        <textarea value={ncrDescription} onChange={e => setNcrDescription(e.target.value)} placeholder="Describe the defect or reason for rejection..." />
                        <div className="form-actions">
                          <button onClick={handleCreateNCR} className="btn-save">Raise NCR</button>
                          <button onClick={() => setNcrPointId(null)} className="btn-cancel">Cancel</button>
                        </div>
                      </div>
                    )}

                    {/* Bug 3: Rejection choice — NCR or comment-only */}
                    {rejectPointId === point.id && (
                      <div className="ncr-form">
                        {rejectMode === 'choose' && (
                          <>
                            <h4>How would you like to reject this point?</h4>
                            <div className="reject-choice-buttons" style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                              <button
                                onClick={() => setRejectMode('comment')}
                                className="btn-workflow"
                                style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '2px solid #f59e0b', background: '#fffbeb', cursor: 'pointer', textAlign: 'left' }}
                              >
                                <strong style={{ display: 'block', color: '#92400e' }}>📝 Additional Info Required</strong>
                                <span style={{ fontSize: '0.8rem', color: '#78716c' }}>Non-blocking — request clarification or more information. No NCR raised.</span>
                              </button>
                              <button
                                onClick={() => setRejectMode('ncr')}
                                className="btn-workflow"
                                style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '2px solid #ef4444', background: '#fef2f2', cursor: 'pointer', textAlign: 'left' }}
                              >
                                <strong style={{ display: 'block', color: '#991b1b' }}>⚠️ Raise NCR</strong>
                                <span style={{ fontSize: '0.8rem', color: '#78716c' }}>Blocking non-conformance — must be resolved before point can be approved.</span>
                              </button>
                            </div>
                            <div className="form-actions" style={{ marginTop: '0.5rem' }}>
                              <button onClick={() => { setRejectPointId(null); setRejectMode('choose'); }} className="btn-cancel">Cancel</button>
                            </div>
                          </>
                        )}

                        {rejectMode === 'comment' && (
                          <>
                            <h4>📝 Reject — Additional Information Required</h4>
                            <textarea
                              value={rejectComment}
                              onChange={e => setRejectComment(e.target.value)}
                              placeholder="Describe what additional information or clarification is needed..."
                            />
                            <div className="form-actions">
                              <button onClick={handleRejectWithComment} className="btn-save" style={{ background: '#f59e0b' }}>
                                Reject with Comment
                              </button>
                              <button onClick={() => setRejectMode('choose')} className="btn-cancel">Back</button>
                            </div>
                          </>
                        )}

                        {rejectMode === 'ncr' && (
                          <>
                            <h4>⚠️ Raise Non-Conformance (NCR)</h4>
                            <textarea
                              value={ncrDescription}
                              onChange={e => setNcrDescription(e.target.value)}
                              placeholder="Describe the defect or non-conformance..."
                            />
                            <div className="form-actions">
                              <button onClick={handleRejectWithNCR} className="btn-save">Raise NCR</button>
                              <button onClick={() => setRejectMode('choose')} className="btn-cancel">Back</button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ITPExecution;

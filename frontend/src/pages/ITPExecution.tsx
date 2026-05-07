import React, { useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Clock, XCircle, FileDown, AlertTriangle, ShieldCheck, Send, Paperclip, FileText, FileSpreadsheet, File, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationPanel from '../components/NotificationPanel';
import { useITPExecution } from '../hooks/useITPExecution';
import type { ITPPoint } from '../types/api.types';

const ROLE_NAMES: Record<number, string> = {
  1: 'Subcontractor',
  2: 'Head Contractor',
  3: 'Client',
  4: 'Admin',
};

const ITPExecution: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const {
    itp, loading, error,
    rejectPointId, rejectMode, setRejectMode, rejectComment, setRejectComment,
    ncrDescription, setNcrDescription, ncrPointId, setNcrPointId, cancelReject,
    uploadingPointId,
    workflowLoading, rejectReason, setRejectReason, showRejectForm, setShowRejectForm, exportingPdf,
    requestSignOffPointId, setRequestSignOffPointId, externalEmail, setExternalEmail,
    externalRole, setExternalRole, requesting,
    fetchITP, handleSignOff, handleRejectWithComment, handleRejectWithNCR,
    handleCreateNCR, handleResolveNCR, handleFileUpload, handleDeleteMedia,
    handleSubmitForReview, handleApproveITP, handleRejectITP,
    handleExportPdf, handleRequestExternalSignOff, navigate,
  } = useITPExecution(id);

  useEffect(() => { fetchITP(); }, [fetchITP]);

  const errorBannerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) errorBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [error]);

  if (loading) return <div className="loading">Loading ITP Details...</div>;
  if (!itp) return (
    <div className="itp-execution">
      <div className="error-banner" style={{ marginTop: '2rem' }}>
        {error || 'ITP not found.'}
      </div>
    </div>
  );

  const userRoleId = user?.role_id ?? 0;
  const canApproveITP = [2, 3, 4].includes(userRoleId);
  const itpIsOpen = itp.status === 'Open';

  const groupedPoints: Record<string, ITPPoint[]> = itp.points.reduce((acc: Record<string, ITPPoint[]>, point: ITPPoint) => {
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

      {error && <div ref={errorBannerRef} className="error-banner">{error}</div>}

      <div className="staged-points">
        {Object.keys(groupedPoints).map(section => (
          <div key={section} className="section-group">
            <h2 className="section-title">{section}</h2>
            <div className="points-list">
              {groupedPoints[section].map((point: ITPPoint) => {
                const isSignedOff = ['Approved', 'Closed'].includes(point.status);
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

                    {point.type === 'WP' && (
                      <div style={{ margin: '0.5rem 0' }}>
                        <NotificationPanel
                          pointId={point.id}
                          pointType={point.type}
                          itpStatus={itp.status}
                          projectId={itp.project_id}
                        />
                      </div>
                    )}

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
                                Signed off by <strong>{point.signed_off_by_name || point.external_signer_email || 'Unknown'}</strong>
                                {point.signed_off_by_role ? ` (${point.signed_off_by_role})` : point.is_external_sign_off ? ' (External)' : ''}
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
                                Rejected by <strong>{point.signed_off_by_name || point.external_signer_email || 'Unknown'}</strong>
                                {point.signed_off_by_role ? ` (${point.signed_off_by_role})` : point.is_external_sign_off ? ' (External)' : ''}
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
                        {/* Pending external sign-off indicator */}
                        {point.pending_external_email && !isSignedOff && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.25rem', padding: '0.3rem 0.6rem', marginTop: '0.25rem' }}>
                            <Send size={13} />
                            <span>External sign-off requested from <strong>{point.pending_external_email}</strong> ({point.pending_external_role})</span>
                          </div>
                        )}
                        {itpIsOpen && !isSignedOff && !requestSignOffPointId && (
                          <button
                            onClick={() => {
                              setRequestSignOffPointId(point.id);
                              setExternalRole(ROLE_NAMES[point.approver_role_id!] || 'Client');
                            }}
                            className="btn-external-request"
                            title="Request sign-off from someone without an account"
                          >
                            <Send size={14} /> Request External Sign-off
                          </button>
                        )}
                      </div>

                      {canSignOff && (
                        <div className="actions">
                          <button onClick={() => handleSignOff(point.id, 'Approved')} className="btn-approve">Sign Off</button>
                          <button onClick={() => handleSignOff(point.id, 'Rejected')} className="btn-reject">Reject</button>
                        </div>
                      )}
                    </div>

                      {requestSignOffPointId === point.id && (
                        <div className="ncr-form external-request-form" style={{ maxWidth: '400px' }}>
                          <h4>Request External Sign-off</h4>
                          <form onSubmit={handleRequestExternalSignOff}>
                            <div className="form-row">
                              <label>Signer Email</label>
                              <input
                                type="email"
                                required
                                value={externalEmail}
                                onChange={e => setExternalEmail(e.target.value)}
                                placeholder="e.g. client@example.com"
                              />
                            </div>
                            <div className="form-row">
                              <label>Signer Role</label>
                              <select
                                required
                                value={externalRole}
                                onChange={e => setExternalRole(e.target.value)}
                              >
                                <option value="Client">Client</option>
                                <option value="Superintendent">Superintendent</option>
                                <option value="Head Contractor">Head Contractor</option>
                                <option value="Third-Party Inspector">Third-Party Inspector</option>
                                <option value="Design Engineer">Design Engineer</option>
                              </select>
                            </div>
                            <div className="form-actions">
                              <button type="submit" disabled={requesting} className="btn-save">
                                {requesting ? 'Sending...' : 'Send Link'}
                              </button>
                              <button type="button" onClick={() => setRequestSignOffPointId(null)} className="btn-cancel">Cancel</button>
                            </div>
                          </form>
                        </div>
                      )}

                    {/* Media & Attachments */}
                    <div className="media-section">
                      <div className="media-grid">
                        {point.media?.map((m) => {
                          const isImage = m.file_type?.startsWith('image/');
                          const fileName = m.file_path?.split('/').pop() || 'file';
                          const ext = fileName.split('.').pop()?.toLowerCase() || '';
                          const iconForExt = () => {
                            if (['pdf'].includes(ext)) return <FileDown size={24} />;
                            if (['doc', 'docx'].includes(ext)) return <FileText size={24} />;
                            if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileSpreadsheet size={24} />;
                            return <File size={24} />;
                          };
                          return (
                            <div key={m.id} className="media-item-wrapper" title={m.latitude && m.longitude ? `GPS: ${Number(m.latitude).toFixed(6)}, ${Number(m.longitude).toFixed(6)}` : undefined}>
                              {isImage ? (
                                <a href={m.url} target="_blank" rel="noreferrer" className="media-thumb">
                                  <img src={m.url} alt="attachment" />
                                </a>
                              ) : (
                                <a href={m.url} target="_blank" rel="noreferrer" className="media-file">
                                  {iconForExt()}
                                  <span className="media-file-name">{fileName.length > 20 ? fileName.slice(0, 17) + '…' + ext : fileName}</span>
                                </a>
                              )}
                              {!isSignedOff && (
                                <button className="media-delete-btn" onClick={() => handleDeleteMedia(m.id)} title="Remove attachment">
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
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
                        {point.ncrs.map((ncr) => (
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
                        {point.status === 'Rejected' && point.ncrs.every((n) => n.status === 'Closed' || n.status === 'Verified') && (
                          <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CheckCircle size={16} color="#16a34a" />
                            <span style={{ fontSize: '0.85rem', color: '#166534' }}>All NCRs resolved. This point can now be signed off.</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Create NCR form */}
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

                    {/* Rejection choice modal */}
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
                              <button onClick={cancelReject} className="btn-cancel">Cancel</button>
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

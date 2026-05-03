import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { CheckCircle, Clock, XCircle, Camera } from 'lucide-react';

const ITPExecution: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [itp, setItp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ncrPointId, setNcrPointId] = useState<number | null>(null);
  const [ncrDescription, setNcrDescription] = useState('');
  const [uploadingPointId, setUploadingPointId] = useState<number | null>(null);

  useEffect(() => {
    fetchITP();
  }, [id]);

  const fetchITP = async () => {
    try {
      const response = await api.get(`/itps/instances/${id}`);
      // Fetch NCRs and Media for each point
      const pointsData = await Promise.all(response.data.points.map(async (point: any) => {
        const [ncrRes, mediaRes] = await Promise.all([
          api.get(`/ncrs/point/${point.id}`),
          api.get(`/media/point/${point.id}`)
        ]);
        return { ...point, ncrs: ncrRes.data, media: mediaRes.data };
      }));
      setItp({ ...response.data, points: pointsData });
    } catch (err) {
      console.error('Failed to fetch ITP', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOff = async (pointId: number, status: string) => {
    if (status === 'Rejected') {
      setNcrPointId(pointId);
      return;
    }
    try {
      setError('');
      await api.post(`/itps/points/${pointId}/sign-off`, {
        status,
        comments: 'Signed off from web interface'
      });
      fetchITP();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Sign-off failed');
    }
  };

  const handleCreateNCR = async () => {
    try {
      setError('');
      await api.post('/ncrs', {
        itp_point_id: ncrPointId,
        description: ncrDescription
      });
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
      await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchITP();
    } catch (err) {
      console.error('Upload failed', err);
      alert('Failed to upload file');
    } finally {
      setUploadingPointId(null);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="itp-execution">
      <Link to={`/projects/${itp?.project_id}`} className="back-link">← Back to Project</Link>
      <header className="itp-header">
        <div>
          <h1>{itp?.name}</h1>
          <p>Status: <span className={`status-badge ${itp?.status.toLowerCase()}`}>{itp?.status}</span></p>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <div className="points-list">
        {itp?.points.map((point: any) => {
          const isSignedOff = ['Approved', 'Closed'].includes(point.status);
          
          return (
            <div key={point.id} className={`point-card ${isSignedOff ? 'signed-off' : ''} ${point.status === 'Rejected' ? 'rejected-card' : ''}`}>
              <div className="point-header">
                <span className="sequence">{point.sequence}</span>
                <span className={`type-badge ${point.type.toLowerCase()}`}>{point.type}</span>
                <h3>{point.description}</h3>
              </div>
              
              <div className="point-meta-grid">
                {point.acceptance_criteria && (
                  <div className="meta-item">
                    <label>Acceptance Criteria</label>
                    <p>{point.acceptance_criteria}</p>
                  </div>
                )}
                {point.reference_documents && (
                  <div className="meta-item">
                    <label>References</label>
                    <p>{point.reference_documents}</p>
                  </div>
                )}
                {point.inspection_method && (
                  <div className="meta-item">
                    <label>Method</label>
                    <p>{point.inspection_method}</p>
                  </div>
                )}
                {point.frequency && (
                  <div className="meta-item">
                    <label>Frequency</label>
                    <p>{point.frequency}</p>
                  </div>
                )}
                {point.responsible_party && (
                  <div className="meta-item">
                    <label>Responsible (RI)</label>
                    <p>{point.responsible_party}</p>
                  </div>
                )}
              </div>
              
              <div className="point-body">
                <div className="point-status">
                  {isSignedOff ? (
                    <div className="success-msg"><CheckCircle size={16} /> Signed off</div>
                  ) : point.status === 'Rejected' ? (
                    <div className="error-msg"><XCircle size={16} /> Rejected</div>
                  ) : (
                    <div className="pending-msg"><Clock size={16} /> Pending</div>
                  )}
                </div>
                
                {!isSignedOff && (
                  <div className="actions">
                    <button 
                      onClick={() => handleSignOff(point.id, 'Approved')}
                      className="btn-approve"
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => handleSignOff(point.id, 'Rejected')}
                      className="btn-reject"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>

              {/* Media Section */}
              <div className="media-section">
                <div className="media-grid">
                  {point.media?.map((m: any) => (
                    <a key={m.id} href={`http://localhost:3000${m.file_path}`} target="_blank" rel="noreferrer" className="media-thumb">
                      <img src={`http://localhost:3000${m.file_path}`} alt="attachment" />
                    </a>
                  ))}
                  {!isSignedOff && (
                    <label className="upload-btn">
                      {uploadingPointId === point.id ? '...' : <Camera size={24} />}
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment"
                        onChange={(e) => handleFileUpload(point.id, e)}
                        hidden
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* NCR List */}
              {point.ncrs?.length > 0 && (
                <div className="ncr-section">
                  <h4>NCRs / Defects</h4>
                  {point.ncrs.map((ncr: any) => (
                    <div key={ncr.id} className={`ncr-item ${ncr.status.toLowerCase()}`}>
                      <div className="ncr-info">
                        <span className="ncr-status">{ncr.status}</span>
                        <p>{ncr.description}</p>
                      </div>
                      {ncr.status === 'Open' && (
                        <button onClick={() => handleResolveNCR(ncr.id)} className="btn-resolve">Resolve</button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Create NCR Form */}
              {ncrPointId === point.id && (
                <div className="ncr-form">
                  <h4>Raise Non-Conformance (NCR)</h4>
                  <textarea 
                    value={ncrDescription}
                    onChange={(e) => setNcrDescription(e.target.value)}
                    placeholder="Describe the defect or reason for rejection..."
                  />
                  <div className="form-actions">
                    <button onClick={handleCreateNCR} className="btn-save">Raise NCR</button>
                    <button onClick={() => setNcrPointId(null)} className="btn-cancel">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ITPExecution;

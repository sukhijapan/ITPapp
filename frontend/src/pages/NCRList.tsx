import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { ShieldAlert, ArrowLeft, Filter } from 'lucide-react';

interface NCRRow {
  id: number;
  title: string | null;
  description: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  point_sequence: number;
  point_description: string;
  point_type: string;
  instance_id: number;
  instance_name: string;
  lot_number: string | null;
  panel_no: string | null;
  project_id: number;
  project_name: string;
  created_by_name: string;
  created_by_role: string;
}

const NCRList: React.FC = () => {
  const [ncrs, setNcrs] = useState<NCRRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const fetchNCRs = async () => {
      try {
        const res = await api.get('/ncrs');
        setNcrs(res.data);
      } catch (err) {
        console.error('Failed to fetch NCRs', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNCRs();
  }, []);

  const filtered = statusFilter === 'all'
    ? ncrs
    : ncrs.filter(n => n.status === statusFilter);

  const statusCounts = ncrs.reduce((acc, n) => {
    acc[n.status] = (acc[n.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) return <div className="loading">Loading NCRs...</div>;

  return (
    <div className="ncr-list-page">
      <Link to="/" className="back-link"><ArrowLeft size={14} /> Back to Dashboard</Link>

      <header className="ncr-list-header">
        <div>
          <h1><ShieldAlert size={24} /> Non-Conformance Reports</h1>
          <p className="subtitle">{ncrs.length} total NCR{ncrs.length !== 1 ? 's' : ''} across all projects</p>
        </div>
      </header>

      <div className="ncr-filters">
        <Filter size={16} />
        <button
          className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          All ({ncrs.length})
        </button>
        {['Open', 'Resolved', 'Verified', 'Closed'].map(s => (
          statusCounts[s] ? (
            <button
              key={s}
              className={`filter-btn ${statusFilter === s ? 'active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s} ({statusCounts[s]})
            </button>
          ) : null
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <ShieldAlert size={48} />
          <p>No NCRs found{statusFilter !== 'all' ? ` with status "${statusFilter}"` : ''}.</p>
        </div>
      ) : (
        <div className="ncr-table-wrapper">
          <table className="ncr-table">
            <thead>
              <tr>
                <th>NCR #</th>
                <th>Description</th>
                <th>Status</th>
                <th>ITP / Point</th>
                <th>Project</th>
                <th>Raised By</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ncr => (
                <tr key={ncr.id}>
                  <td>
                    <Link to={`/ncrs/${ncr.id}`} className="ncr-id-link">
                      NCR-{String(ncr.id).padStart(4, '0')}
                    </Link>
                  </td>
                  <td className="ncr-desc-cell">
                    <Link to={`/ncrs/${ncr.id}`} className="ncr-desc-link">
                      {(() => { const text = ncr.title || ncr.description; return text.length > 80 ? text.slice(0, 80) + '…' : text; })()}
                    </Link>
                  </td>
                  <td>
                    <span className={`status-badge ${ncr.status.toLowerCase()}`}>{ncr.status}</span>
                  </td>
                  <td className="ncr-context-cell">
                    <Link to={`/itp/${ncr.instance_id}`} className="ncr-context-link">
                      {ncr.instance_name}
                    </Link>
                    <span className="ncr-point-ref">
                      Pt {ncr.point_sequence} · <span className={`type-badge-sm ${ncr.point_type.toLowerCase()}`}>{ncr.point_type}</span>
                    </span>
                  </td>
                  <td>{ncr.project_name}</td>
                  <td>
                    {ncr.created_by_name}
                    {ncr.created_by_role && <span className="role-hint"> ({ncr.created_by_role})</span>}
                  </td>
                  <td className="ncr-date-cell">{new Date(ncr.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default NCRList;

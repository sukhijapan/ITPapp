import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { Search, Copy, Globe } from 'lucide-react';

interface LibraryTemplate {
  id: number;
  name: string;
  description: string;
  trade_category: string;
  version: string;
  created_by_org: string;
  clone_count: number;
}

const TemplateLibrary: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<LibraryTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrade, setSelectedTrade] = useState('All');
  const [previewId, setSelectedPreviewId] = useState<number | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);

  useEffect(() => {
    fetchLibrary();
  }, []);

  const fetchLibrary = async () => {
    try {
      const response = await api.get('/templates/library');
      setTemplates(response.data);
    } catch (err) {
      console.error('Failed to fetch library', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (id: number) => {
    if (previewId === id) {
      setSelectedPreviewId(null);
      return;
    }
    setSelectedPreviewId(id);
    setPreviewData(null);
    try {
      const res = await api.get(`/templates/${id}`);
      setPreviewData(res.data);
    } catch (err) {
      console.error('Failed to fetch preview', err);
    }
  };

  const handleClone = async (id: number) => {
    try {
      await api.post(`/templates/${id}/clone`, { project_id: projectId });
      navigate(`/projects/${projectId}`);
    } catch (err) {
      alert('Failed to clone template');
    }
  };

  const trades = ['All', ...new Set(templates.map(t => t.trade_category).filter(Boolean))];

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         t.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTrade = selectedTrade === 'All' || t.trade_category === selectedTrade;
    return matchesSearch && matchesTrade;
  });

  if (loading) return <div className="loading">Loading Template Library...</div>;

  return (
    <div className="template-library">
      <Link to={`/projects/${projectId}`} className="back-link">← Back to Project</Link>
      
      <header className="library-header">
        <div>
          <h1>Template Library</h1>
          <p>Standardized Inspection & Test Plans for every trade</p>
        </div>
      </header>

      <div className="library-filters">
        <div className="search-box">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search templates..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="trade-filters">
          {trades.map(trade => (
            <button 
              key={trade}
              className={`filter-pill ${selectedTrade === trade ? 'active' : ''}`}
              onClick={() => setSelectedTrade(trade)}
            >
              {trade}
            </button>
          ))}
        </div>
      </div>

      <div className="library-grid">
        {filteredTemplates.map(t => (
          <div key={t.id} className="library-card">
            <div className="card-top">
              <div className="card-identity">
                <span className="trade-tag">{t.trade_category || 'General'}</span>
                <span className="version-tag">v{t.version}</span>
              </div>
              <div className="popularity">
                <Copy size={12} /> {t.clone_count} uses
              </div>
            </div>
            
            <h3>{t.name}</h3>
            <p className="description">{t.description}</p>
            
            <div className="attribution">
              <Globe size={12} /> {t.created_by_org || 'Hully Bolivar'}
            </div>

            <div className="card-actions">
              <button 
                className="btn-preview"
                onClick={() => handlePreview(t.id)}
              >
                {previewId === t.id ? 'Close Preview' : 'Preview Content'}
              </button>
              <button 
                className="btn-clone"
                onClick={() => handleClone(t.id)}
              >
                Use this Template
              </button>
            </div>

            {previewId === t.id && previewData && (
              <div className="preview-container">
                {Object.entries(
                  previewData.points.reduce((acc: any, p: any) => {
                    const section = p.section || 'General';
                    if (!acc[section]) acc[section] = [];
                    acc[section].push(p);
                    return acc;
                  }, {})
                ).map(([section, points]: [string, any]) => (
                  <div key={section} className="preview-section">
                    <h4>{section}</h4>
                    <ul>
                      {points.map((p: any) => (
                        <li key={p.id}>
                          <span className={`type-badge-sm ${p.type.toLowerCase()}`}>{p.type}</span>
                          {p.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TemplateLibrary;

import React, { useEffect, useRef, useState } from 'react';
import api from '../services/api';

interface ReportConfig {
  companyName: string;
  docNumberPrefix: string;
  defaultRevision: string;
  projectSubtitle: string;
}

interface LogoMeta {
  hasLogo: boolean;
  uploadedAt: string | null;
}

interface ReportConfigSectionProps {
  projectId: number;
}

const ReportConfigSection: React.FC<ReportConfigSectionProps> = ({ projectId }) => {
  const [config, setConfig] = useState<ReportConfig>({
    companyName: '',
    docNumberPrefix: '',
    defaultRevision: '',
    projectSubtitle: '',
  });
  const [logoMeta, setLogoMeta] = useState<LogoMeta>({ hasLogo: false, uploadedAt: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const errorBannerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (error) errorBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [error]);

  useEffect(() => {
    fetchAll();
  }, [projectId]);

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [configRes, logoRes] = await Promise.all([
        api.get(`/projects/${projectId}/report-config`).catch(() => null),
        api.get(`/projects/${projectId}/logo`).catch(() => null),
      ]);

      if (configRes) {
        const d = configRes.data.data || configRes.data;
        setConfig({
          companyName: d.companyName || '',
          docNumberPrefix: d.docNumberPrefix || '',
          defaultRevision: d.defaultRevision || '',
          projectSubtitle: d.projectSubtitle || '',
        });
      }

      if (logoRes) {
        const l = logoRes.data.data || logoRes.data;
        setLogoMeta({ hasLogo: l.hasLogo ?? false, uploadedAt: l.uploadedAt ?? null });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await api.put(`/projects/${projectId}/report-config`, config);
      setSuccess('Report configuration saved');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setError('Only PNG and JPEG images are accepted');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('File size must be 2MB or less');
      return;
    }

    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('logo', file);
      await api.post(`/projects/${projectId}/logo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setLogoMeta({ hasLogo: true, uploadedAt: new Date().toISOString() });
      setSuccess('Logo uploaded successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload logo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteLogo = async () => {
    if (!confirm('Remove the project logo?')) return;
    setDeleting(true);
    setError('');
    try {
      await api.delete(`/projects/${projectId}/logo`);
      setLogoMeta({ hasLogo: false, uploadedAt: null });
      setSuccess('Logo removed');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove logo');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <section className="section">
        <h2>Report Configuration</h2>
        <p style={{ color: 'var(--text-light)' }}>Loading configuration...</p>
      </section>
    );
  }

  return (
    <section className="section">
      <h2>Report Configuration</h2>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '1rem' }}>
        Branding and document settings applied when generating PDF reports.
      </p>

      {error && (
        <div ref={errorBannerRef} className="error-banner">{error}</div>
      )}
      {success && (
        <div style={{
          padding: '0.5rem 1rem',
          background: '#dcfce7',
          color: '#166534',
          borderRadius: '0.25rem',
          marginBottom: '1rem',
          fontSize: '0.85rem',
        }}>
          {success}
        </div>
      )}

      {/* Logo */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
          Company Logo
        </label>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '0.6rem' }}>
          PNG or JPEG, max 2MB. Displayed in the top-left of every report page.
        </p>

        {logoMeta.hasLogo && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.5rem 0.75rem',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '0.25rem',
            marginBottom: '0.6rem',
            fontSize: '0.85rem',
            color: '#166534',
          }}>
            <span>✓ Logo uploaded</span>
            {logoMeta.uploadedAt && (
              <span style={{ color: 'var(--text-light)', fontSize: '0.75rem' }}>
                {new Date(logoMeta.uploadedAt).toLocaleDateString()}
              </span>
            )}
            <button
              type="button"
              onClick={handleDeleteLogo}
              disabled={deleting}
              style={{
                background: 'none',
                border: 'none',
                color: '#991b1b',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
                padding: '0.1rem 0.3rem',
              }}
            >
              {deleting ? 'Removing...' : 'Remove'}
            </button>
          </div>
        )}

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            onChange={handleLogoUpload}
            disabled={uploading}
            style={{ display: 'none' }}
            id={`logo-upload-${projectId}`}
          />
          <label
            htmlFor={`logo-upload-${projectId}`}
            className="btn-small btn-secondary"
            style={{ cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1 }}
          >
            {uploading ? 'Uploading...' : logoMeta.hasLogo ? 'Replace Logo' : 'Upload Logo'}
          </label>
        </div>
      </div>

      {/* Report config fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', maxWidth: '640px', marginBottom: '1rem' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Company Name</label>
          <input
            type="text"
            value={config.companyName}
            onChange={e => setConfig(c => ({ ...c, companyName: e.target.value }))}
            placeholder="e.g. Acme Civil Pty Ltd"
            maxLength={255}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Document Number Prefix</label>
          <input
            type="text"
            value={config.docNumberPrefix}
            onChange={e => setConfig(c => ({ ...c, docNumberPrefix: e.target.value }))}
            placeholder="e.g. 8D91"
            maxLength={50}
          />
          <p style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginTop: '0.2rem' }}>
            Alphanumeric and hyphens only
          </p>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Default Revision</label>
          <input
            type="text"
            value={config.defaultRevision}
            onChange={e => setConfig(c => ({ ...c, defaultRevision: e.target.value }))}
            placeholder="e.g. Rev 0"
            maxLength={20}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Project Subtitle</label>
          <input
            type="text"
            value={config.projectSubtitle}
            onChange={e => setConfig(c => ({ ...c, projectSubtitle: e.target.value }))}
            placeholder="e.g. Infrastructure Package 3"
            maxLength={500}
          />
        </div>
      </div>

      <button
        className="btn-small btn-primary"
        onClick={handleSaveConfig}
        disabled={saving}
      >
        {saving ? 'Saving...' : 'Save Configuration'}
      </button>
    </section>
  );
};

export default ReportConfigSection;

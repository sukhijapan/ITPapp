import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { ITPInstance } from '../types/api.types';

type RejectMode = 'choose' | 'comment' | 'ncr';

export function useITPExecution(id: string | undefined) {
  const navigate = useNavigate();
  const [itp, setItp] = useState<ITPInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Rejection point state
  const [rejectPointId, setRejectPointId] = useState<number | null>(null);
  const [rejectMode, setRejectMode] = useState<RejectMode>('choose');
  const [rejectComment, setRejectComment] = useState('');
  const [ncrDescription, setNcrDescription] = useState('');
  const [ncrPointId, setNcrPointId] = useState<number | null>(null);

  // Upload state
  const [uploadingPointId, setUploadingPointId] = useState<number | null>(null);

  // ITP workflow state
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // External sign-off state
  const [requestSignOffPointId, setRequestSignOffPointId] = useState<number | null>(null);
  const [externalEmail, setExternalEmail] = useState('');
  const [externalRole, setExternalRole] = useState('');
  const [requesting, setRequesting] = useState(false);

  const fetchITP = useCallback(async () => {
    if (!id) return;
    try {
      const itpRes = await api.get(`/itps/instances/${id}`);
      const itpData = itpRes.data;

      let allMedia: any[] = [];
      try {
        const mediaRes = await api.get(`/media/instance/${id}`);
        allMedia = mediaRes.data;
      } catch {
        // Media fetch is non-fatal
      }

      const mediaByPoint: Record<number, any[]> = {};
      for (const m of allMedia) {
        if (!mediaByPoint[m.itp_point_id]) mediaByPoint[m.itp_point_id] = [];
        mediaByPoint[m.itp_point_id].push(m);
      }

      const pointsData = itpData.points.map((point: any) => ({
        ...point,
        ncrs: Array.isArray(point.ncrs) ? point.ncrs : [],
        media: mediaByPoint[point.id] ?? [],
      }));

      setItp({ ...itpData, points: pointsData });
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Unknown error';
      setError(`Failed to load ITP: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const handleSignOff = useCallback(async (pointId: number, status: string) => {
    if (status === 'Rejected') {
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
  }, [fetchITP]);

  const handleRejectWithComment = useCallback(async () => {
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
  }, [rejectPointId, rejectComment, fetchITP]);

  const handleRejectWithNCR = useCallback(async () => {
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
  }, [rejectPointId, ncrDescription, fetchITP]);

  const handleCreateNCR = useCallback(async () => {
    try {
      setError('');
      await api.post('/ncrs', { itp_point_id: ncrPointId, description: ncrDescription });
      setNcrPointId(null);
      setNcrDescription('');
      fetchITP();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create NCR');
    }
  }, [ncrPointId, ncrDescription, fetchITP]);

  const handleResolveNCR = useCallback(async (ncrId: number) => {
    try {
      await api.post(`/ncrs/${ncrId}/resolve`);
      fetchITP();
    } catch {
      console.error('Failed to resolve NCR');
    }
  }, [fetchITP]);

  const handleFileUpload = useCallback(async (pointId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const input = e.target;
    setUploadingPointId(pointId);
    try {
      let latitude: number | null = null;
      let longitude: number | null = null;
      if ('geolocation' in navigator) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0,
            });
          });
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        } catch {
          // Geolocation optional — proceed without coordinates
        }
      }
      const { data } = await api.post('/media/upload-url', {
        filename: file.name,
        contentType: file.type || '',
        itp_point_id: pointId,
        latitude,
        longitude,
      });
      await fetch(data.uploadUrl, { method: 'PUT', body: file });
      fetchITP();
    } catch {
      alert('Failed to upload file');
    } finally {
      setUploadingPointId(null);
      input.value = ''; // Reset so same file can be re-uploaded
    }
  }, [fetchITP]);

  const handleDeleteMedia = useCallback(async (mediaId: number) => {
    if (!confirm('Remove this attachment?')) return;
    try {
      await api.delete(`/media/${mediaId}`);
      fetchITP();
    } catch {
      alert('Failed to delete attachment');
    }
  }, [fetchITP]);

  const handleSubmitForReview = useCallback(async () => {
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
  }, [id, fetchITP]);

  const handleApproveITP = useCallback(async () => {
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
  }, [id, fetchITP]);

  const handleRejectITP = useCallback(async () => {
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
  }, [id, rejectReason, fetchITP]);

  const handleExportPdf = useCallback(async () => {
    if (!itp) return;
    setExportingPdf(true);
    try {
      const response = await api.get(`/itps/instances/${id}/report`, { responseType: 'blob' });
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
      a.download = `ITP_${itp.name?.replace(/[^a-z0-9]/gi, '_') ?? id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
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
  }, [id, itp]);

  const handleRequestExternalSignOff = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestSignOffPointId) return;
    setRequesting(true);
    try {
      setError('');
      await api.post('/external-sign-off/request', {
        pointId: requestSignOffPointId,
        email: externalEmail,
        roleName: externalRole,
      });
      alert('External sign-off request sent');
      setRequestSignOffPointId(null);
      setExternalEmail('');
      setExternalRole('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send request');
    } finally {
      setRequesting(false);
    }
  }, [requestSignOffPointId, externalEmail, externalRole]);

  const cancelReject = useCallback(() => {
    setRejectPointId(null);
    setRejectMode('choose');
    setRejectComment('');
    setNcrDescription('');
  }, []);

  return {
    // Data
    itp,
    loading,
    error,
    navigate,
    // Rejection state
    rejectPointId,
    rejectMode,
    setRejectMode,
    rejectComment,
    setRejectComment,
    ncrDescription,
    setNcrDescription,
    ncrPointId,
    setNcrPointId,
    cancelReject,
    // Upload state
    uploadingPointId,
    // Workflow state
    workflowLoading,
    rejectReason,
    setRejectReason,
    showRejectForm,
    setShowRejectForm,
    exportingPdf,
    // External sign-off state
    requestSignOffPointId,
    setRequestSignOffPointId,
    externalEmail,
    setExternalEmail,
    externalRole,
    setExternalRole,
    requesting,
    // Handlers
    fetchITP,
    handleSignOff,
    handleRejectWithComment,
    handleRejectWithNCR,
    handleCreateNCR,
    handleResolveNCR,
    handleFileUpload,
    handleDeleteMedia,
    handleSubmitForReview,
    handleApproveITP,
    handleRejectITP,
    handleExportPdf,
    handleRequestExternalSignOff,
  };
}

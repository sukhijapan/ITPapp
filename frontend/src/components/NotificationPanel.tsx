import React, { useState, useEffect, useCallback } from 'react';
import { Bell, AlertTriangle, ShieldCheck, Clock, CheckCircle, XCircle, Ban } from 'lucide-react';
import api from '../services/api';
import CountdownTimer from './CountdownTimer';
import RaiseNotificationModal from './RaiseNotificationModal';

interface NotificationPanelProps {
  pointId: number;
  pointType: string;
  itpStatus: string;
  projectId: number;
}

interface NotificationData {
  id: number;
  status: 'Pending' | 'Confirmed' | 'Declined' | 'Expired' | 'Cancelled';
  planned_inspection_time: string;
  location_description?: string;
  scope_of_work?: string;
  created_at: string;
  responded_by?: number;
  responded_at?: string;
  response_reason?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
}

interface WaiverData {
  waived: boolean;
  reason: string;
  waived_at: string;
}

interface PointNotificationResponse {
  notification: NotificationData | null;
  waiver: WaiverData | null;
  signed_off: boolean;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Pending: { bg: '#fef9c3', text: '#854d0e', border: '#fde047' },
  Confirmed: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  Declined: { bg: '#ffedd5', text: '#9a3412', border: '#fdba74' },
  Expired: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  Cancelled: { bg: '#f3f4f6', text: '#4b5563', border: '#d1d5db' },
};

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  pointId,
  pointType,
  itpStatus,
  projectId,
}) => {
  const [data, setData] = useState<PointNotificationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const fetchNotificationState = useCallback(async () => {
    try {
      const res = await api.get(`/wp-notifications/point/${pointId}`);
      const payload = res.data?.data;
      
      // Backend returns { data: notificationObject } or { data: null }
      if (!payload) {
        setData({ notification: null, waiver: null, signed_off: false });
      } else if (payload.notification !== undefined) {
        // Already in expected shape
        setData(payload);
      } else {
        // Backend returns the notification object directly
        const notif = payload as NotificationData;
        const waiverStatus = (notif as any).wp_waiver_status;
        setData({
          notification: notif,
          waiver: waiverStatus ? { waived: true, reason: waiverStatus.reason || 'timer_expired', waived_at: waiverStatus.waived_at } : null,
          signed_off: false,
        });
      }
      setError('');
    } catch (err: any) {
      if (err.response?.status === 404) {
        setData({ notification: null, waiver: null, signed_off: false });
      } else {
        setError('Failed to load notification status');
      }
    } finally {
      setLoading(false);
    }
  }, [pointId]);

  useEffect(() => {
    if (pointType === 'WP') {
      fetchNotificationState();
    } else {
      setLoading(false);
    }
  }, [pointType, fetchNotificationState]);

  // Only render for WP points
  if (pointType !== 'WP') return null;

  if (loading) {
    return (
      <div className="flex items-center gap-1 text-sm text-gray-400">
        <Clock size={14} />
        <span>Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-500">{error}</div>
    );
  }

  const notification = data?.notification;
  const waiver = data?.waiver;
  const signedOff = data?.signed_off;

  const hasActiveNotification = notification && notification.status === 'Pending';
  const canRaiseNotification =
    pointType === 'WP' &&
    itpStatus === 'Open' &&
    !hasActiveNotification &&
    (!notification || ['Cancelled', 'Expired', 'Declined'].includes(notification.status));

  const handleRaiseSuccess = () => {
    setModalOpen(false);
    fetchNotificationState();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      {/* Status Badge */}
      {notification && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <StatusBadge status={notification.status} />

          {/* Countdown Timer for Pending */}
          {notification.status === 'Pending' && (
            <CountdownTimer
              plannedInspectionTime={notification.planned_inspection_time}
              status={notification.status}
            />
          )}
        </div>
      )}

      {/* Waiver Indicator */}
      {waiver && waiver.waived && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.8rem',
            color: '#9a3412',
            background: '#fff7ed',
            border: '1px solid #fed7aa',
            borderRadius: '0.25rem',
            padding: '0.2rem 0.5rem',
          }}
        >
          <ShieldCheck size={14} />
          <span>
            Waiver triggered ({waiver.reason === 'timer_expired' ? 'timer expired' : 'declined'})
          </span>
        </div>
      )}

      {/* Confirmed but not signed off indicator (Requirement 8.5) */}
      {notification?.status === 'Confirmed' && !signedOff && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.8rem',
            color: '#166534',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '0.25rem',
            padding: '0.2rem 0.5rem',
          }}
        >
          <CheckCircle size={14} />
          <span>Confirmed attendance — awaiting sign-off</span>
        </div>
      )}

      {/* Sign-off Warning Banner (Requirement 8.2) */}
      {hasActiveNotification && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.8rem',
            color: '#854d0e',
            background: '#fefce8',
            border: '1px solid #fde047',
            borderRadius: '0.25rem',
            padding: '0.3rem 0.5rem',
          }}
        >
          <AlertTriangle size={14} />
          <span>Notification is still pending — the recipient has not yet responded.</span>
        </div>
      )}

      {/* Raise Notification Button */}
      {canRaiseNotification && (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.8rem',
            padding: '0.3rem 0.6rem',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem',
            cursor: 'pointer',
            fontWeight: 500,
            width: 'fit-content',
          }}
        >
          <Bell size={14} />
          Raise Notification
        </button>
      )}

      {/* Raise Notification Modal */}
      <RaiseNotificationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleRaiseSuccess}
        pointId={pointId}
        projectId={projectId}
      />
    </div>
  );
};

/** Color-coded status badge */
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.Cancelled;

  const iconMap: Record<string, React.ReactNode> = {
    Pending: <Clock size={12} />,
    Confirmed: <CheckCircle size={12} />,
    Declined: <XCircle size={12} />,
    Expired: <AlertTriangle size={12} />,
    Cancelled: <Ban size={12} />,
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        fontSize: '0.75rem',
        fontWeight: 600,
        padding: '0.15rem 0.5rem',
        borderRadius: '9999px',
        background: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
      }}
    >
      {iconMap[status]}
      {status}
    </span>
  );
};

export default NotificationPanel;

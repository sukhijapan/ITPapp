import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, AlertCircle, CalendarClock, MapPin, FileText } from 'lucide-react';
import api from '../services/api';

type ResponseType = 'confirm' | 'decline' | 'reschedule';

interface NotificationContext {
  notification_id: number;
  project_name: string;
  itp_name: string;
  point_description: string;
  planned_inspection_time: string;
  location_description: string;
  scope_of_work: string;
  recipient_name: string;
  expires_at: string;
}

const WitnessPointResponse = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<NotificationContext | null>(null);
  const [responseType, setResponseType] = useState<ResponseType | null>(null);
  const [reason, setReason] = useState('');
  const [requestedTime, setRequestedTime] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      try {
        const response = await api.get(`/wp-notifications/token/${token}/validate`);
        const raw = response.data?.data || response.data;
        // Map camelCase backend response to snake_case interface
        setData({
          notification_id: raw.notificationId ?? raw.notification_id,
          project_name: raw.projectName ?? raw.project_name ?? '',
          itp_name: raw.itpName ?? raw.itp_name ?? '',
          point_description: raw.pointDescription ?? raw.point_description ?? '',
          planned_inspection_time: raw.plannedInspectionTime ?? raw.planned_inspection_time ?? '',
          location_description: raw.location ?? raw.location_description ?? '',
          scope_of_work: raw.scope ?? raw.scope_of_work ?? '',
          recipient_name: raw.recipientName ?? raw.recipient_name ?? '',
          expires_at: raw.expiresAt ?? raw.expires_at ?? '',
        });
      } catch (err: any) {
        setError(err.response?.data?.error || 'Invalid or expired response link');
      } finally {
        setLoading(false);
      }
    };
    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!responseType) return;

    if (responseType === 'decline' && !reason.trim()) {
      setError('Please provide a reason for declining.');
      return;
    }

    if (responseType === 'reschedule' && !requestedTime) {
      setError('Please select a proposed new inspection time.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await api.post(`/wp-notifications/token/${token}/respond`, {
        responseType,
        reason: responseType === 'decline' ? reason.trim() : undefined,
        requestedTime: responseType === 'reschedule' ? requestedTime : undefined,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-500 text-lg">Loading...</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-red-50 rounded-lg border border-red-200">
        <div className="flex items-center gap-2 text-red-700 font-bold mb-2">
          <AlertCircle size={20} />
          Response Link Error
        </div>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (submitted) {
    const successMessages: Record<ResponseType, { title: string; message: string }> = {
      confirm: {
        title: 'Attendance Confirmed',
        message: 'Your attendance has been confirmed. The contractor has been notified.',
      },
      decline: {
        title: 'Attendance Declined',
        message: 'Your response has been recorded. The witness point will proceed with an auto-waiver.',
      },
      reschedule: {
        title: 'Reschedule Requested',
        message: 'Your reschedule request has been sent to the contractor for review.',
      },
    };

    const msg = successMessages[responseType!];

    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-green-50 rounded-lg border border-green-200 text-center">
        <CheckCircle size={48} className="mx-auto text-green-600 mb-4" />
        <h2 className="text-2xl font-bold text-green-800 mb-2">{msg.title}</h2>
        <p className="text-green-700">{msg.message}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-xl shadow-lg border border-gray-100">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Witness Point Inspection Notification</h1>
      <p className="text-gray-500 mb-6">
        You have been invited to attend an upcoming inspection. Please respond below.
      </p>

      {/* Notification Context */}
      <div className="bg-blue-50 p-6 rounded-lg mb-8">
        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <p className="text-blue-600 font-medium">Project</p>
            <p className="text-gray-900 font-bold">{data!.project_name}</p>
          </div>
          <div>
            <p className="text-blue-600 font-medium">ITP</p>
            <p className="text-gray-900 font-bold">{data!.itp_name}</p>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-blue-600 font-medium flex items-center gap-1">
            <FileText size={14} />
            Inspection Point
          </p>
          <p className="text-gray-800 italic">"{data!.point_description}"</p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <p className="text-blue-600 font-medium flex items-center gap-1">
              <CalendarClock size={14} />
              Planned Inspection Time
            </p>
            <p className="text-gray-900 font-bold">
              {new Date(data!.planned_inspection_time).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-blue-600 font-medium flex items-center gap-1">
              <MapPin size={14} />
              Location
            </p>
            <p className="text-gray-900 font-bold">{data!.location_description || 'Not specified'}</p>
          </div>
        </div>

        {data!.scope_of_work && (
          <div>
            <p className="text-blue-600 font-medium">Scope of Work</p>
            <p className="text-gray-800">{data!.scope_of_work}</p>
          </div>
        )}
      </div>

      {/* Response Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Your Response</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setResponseType('confirm'); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border font-bold transition-all ${
                responseType === 'confirm'
                  ? 'bg-green-600 border-green-600 text-white'
                  : 'bg-white border-gray-300 text-gray-600 hover:border-green-600'
              }`}
            >
              <CheckCircle size={18} />
              Confirm Attendance
            </button>
            <button
              type="button"
              onClick={() => { setResponseType('decline'); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border font-bold transition-all ${
                responseType === 'decline'
                  ? 'bg-red-600 border-red-600 text-white'
                  : 'bg-white border-gray-300 text-gray-600 hover:border-red-600'
              }`}
            >
              <XCircle size={18} />
              Decline
            </button>
            <button
              type="button"
              onClick={() => { setResponseType('reschedule'); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border font-bold transition-all ${
                responseType === 'reschedule'
                  ? 'bg-amber-600 border-amber-600 text-white'
                  : 'bg-white border-gray-300 text-gray-600 hover:border-amber-600'
              }`}
            >
              <CalendarClock size={18} />
              Request Reschedule
            </button>
          </div>
        </div>

        {/* Decline reason textarea */}
        {responseType === 'decline' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Declining <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              rows={4}
              placeholder="Please provide a reason for declining attendance..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>
        )}

        {/* Reschedule datetime picker */}
        {responseType === 'reschedule' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proposed New Inspection Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              value={requestedTime}
              onChange={(e) => setRequestedTime(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              The contractor will be notified of your proposed time.
            </p>
          </div>
        )}

        {/* Inline error */}
        {error && data && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Submit button */}
        {responseType && (
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Response'}
          </button>
        )}
      </form>

      {/* Expiry notice */}
      <div className="mt-8 pt-6 border-t border-gray-100 flex items-center gap-2 text-gray-400 text-xs justify-center">
        <Clock size={14} />
        This link expires on {new Date(data!.expires_at).toLocaleString()}
      </div>
    </div>
  );
};

export default WitnessPointResponse;

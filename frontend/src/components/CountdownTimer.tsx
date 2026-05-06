import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  plannedInspectionTime: string;
  status: string;
}

function calculateRemaining(plannedInspectionTime: string): { hours: number; minutes: number; seconds: number; expired: boolean } {
  const now = Date.now();
  const target = new Date(plannedInspectionTime).getTime();
  const diff = target - now;

  if (diff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { hours, minutes, seconds, expired: false };
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ plannedInspectionTime, status }) => {
  const [remaining, setRemaining] = useState(() => calculateRemaining(plannedInspectionTime));

  useEffect(() => {
    if (status !== 'Pending') return;

    const update = () => setRemaining(calculateRemaining(plannedInspectionTime));
    update();

    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [plannedInspectionTime, status]);

  if (status !== 'Pending') {
    return null;
  }

  if (remaining.expired) {
    return (
      <div className="flex items-center gap-2 text-red-600 font-semibold text-sm">
        <Clock size={16} />
        <span>Expired</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-yellow-700 font-mono text-sm">
      <Clock size={16} />
      <span>{pad(remaining.hours)}:{pad(remaining.minutes)}:{pad(remaining.seconds)}</span>
    </div>
  );
};

export default React.memo(CountdownTimer);

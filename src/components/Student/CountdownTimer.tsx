import React, { useState, useEffect, useRef } from 'react';
import { Clock, AlertTriangle, BellRing, Hourglass, RotateCcw } from 'lucide-react';

interface CountdownTimerProps {
  initialMinutes: number;
  testMode?: 'TEST' | 'PRACTICE';
  sectionName?: string;
  sessionKey?: string;
  onTimeExpire?: () => void;
  className?: string;
  compact?: boolean;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  initialMinutes,
  testMode = 'TEST',
  sectionName,
  sessionKey,
  onTimeExpire,
  className = '',
  compact = false
}) => {
  // Construct a stable storage key based on sessionKey or sectionName
  const cleanKey = (sessionKey || sectionName || 'general_timer').replace(/[^a-zA-Z0-9]/g, '_');
  const storageKey = `ielts_timer_target_${cleanKey}`;

  const getOrInitEndTime = (): number => {
    const existing = sessionStorage.getItem(storageKey);
    if (existing) {
      const parsed = parseInt(existing, 10);
      // Validate that it's a valid timestamp
      if (!isNaN(parsed) && parsed > Date.now()) {
        return parsed;
      }
    }
    // Initialize new end time
    const newEndTime = Date.now() + Math.max(1, initialMinutes * 60) * 1000;
    sessionStorage.setItem(storageKey, newEndTime.toString());
    return newEndTime;
  };

  const [endTime, setEndTime] = useState<number>(getOrInitEndTime);
  const [secondsLeft, setSecondsLeft] = useState<number>(() => 
    Math.max(0, Math.floor((getOrInitEndTime() - Date.now()) / 1000))
  );
  const [hasWarned5Min, setHasWarned5Min] = useState<boolean>(false);
  const hasExpiredRef = useRef(false);

  // Sync if initialMinutes changes and no active valid timer exists
  useEffect(() => {
    const targetTime = getOrInitEndTime();
    setEndTime(targetTime);
    setSecondsLeft(Math.max(0, Math.floor((targetTime - Date.now()) / 1000)));
  }, [initialMinutes, cleanKey]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      setSecondsLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        if (!hasExpiredRef.current) {
          hasExpiredRef.current = true;
          if (onTimeExpire) {
            onTimeExpire();
          }
        }
      }

      // Trigger subtle beep or warning at 5 minutes mark (300 seconds)
      if (remaining === 300 && !hasWarned5Min) {
        setHasWarned5Min(true);
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 520;
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
        } catch (e) {
          // AudioContext silent
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime, onTimeExpire, hasWarned5Min]);

  const handleResetTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newTarget = Date.now() + Math.max(1, initialMinutes * 60) * 1000;
    sessionStorage.setItem(storageKey, newTarget.toString());
    setEndTime(newTarget);
    setSecondsLeft(initialMinutes * 60);
    hasExpiredRef.current = false;
    setHasWarned5Min(false);
  };

  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;

  const formattedTime = hours > 0
    ? `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    : `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const isCritical = secondsLeft <= 300; // <= 5 mins
  const isWarning = secondsLeft > 300 && secondsLeft <= 600; // <= 10 mins

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-2xl text-xs font-black transition-all ${
        isCritical
          ? 'bg-rose-100 text-rose-700 border border-rose-300 animate-pulse shadow-sm shadow-rose-200'
          : isWarning
          ? 'bg-amber-100 text-amber-800 border border-amber-300'
          : 'bg-[#E2DDEC] text-[#3C2A63] border border-purple-200/80'
      } ${className}`}>
        {isCritical ? (
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 animate-bounce" />
        ) : (
          <Clock className="w-3.5 h-3.5 text-[#6B51A5]" />
        )}
        <span className="font-mono text-xs tracking-wider">{formattedTime}</span>
        {sectionName && <span className="text-[10px] opacity-75 hidden sm:inline">({sectionName})</span>}
        
        {testMode === 'PRACTICE' && (
          <button
            type="button"
            onClick={handleResetTimer}
            className="p-1 text-purple-600 hover:text-purple-900 transition rounded-md"
            title="Đếm lại thời gian"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white border rounded-2xl p-3.5 shadow-md flex items-center justify-between gap-4 transition-all ${
      isCritical
        ? 'border-rose-300 bg-rose-50/50 shadow-rose-100 ring-2 ring-rose-400/40'
        : isWarning
        ? 'border-amber-300 bg-amber-50/40'
        : 'border-purple-100 bg-white'
    } ${className}`}>
      
      {/* Left info */}
      <div className="flex items-center space-x-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
          isCritical
            ? 'bg-rose-100 text-rose-700 animate-pulse'
            : isWarning
            ? 'bg-amber-100 text-amber-700'
            : 'bg-purple-100 text-[#6B51A5]'
        }`}>
          {isCritical ? (
            <BellRing className="w-5 h-5 text-rose-600 animate-bounce" />
          ) : (
            <Hourglass className="w-5 h-5" />
          )}
        </div>

        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#7C68A5]">
              {sectionName ? `Time Remaining: ${sectionName}` : 'Exam Time Remaining'}
            </span>
            {testMode === 'TEST' && (
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-extrabold border border-rose-200">
                LOCKED
              </span>
            )}
          </div>
          <div className="flex items-baseline space-x-2">
            <span className={`font-mono text-xl sm:text-2xl font-black tracking-tight ${
              isCritical ? 'text-rose-600' : isWarning ? 'text-amber-700' : 'text-[#3C2A63]'
            }`}>
              {formattedTime}
            </span>
            <span className="text-[11px] text-[#7C68A5] font-medium">
              {isCritical ? '⚠️ Time almost up!' : isWarning ? 'Under 10 minutes left' : 'Continuous timer active'}
            </span>
          </div>
        </div>
      </div>

      {testMode === 'PRACTICE' && (
        <button
          type="button"
          onClick={handleResetTimer}
          className="px-3 py-1.5 bg-[#F5F2F9] hover:bg-[#E2DDEC] text-[#503A7A] border border-purple-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          title="Đặt lại đồng hồ đếm ngược"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#6B51A5]" />
          <span className="hidden sm:inline">Reset Timer</span>
        </button>
      )}
    </div>
  );
};


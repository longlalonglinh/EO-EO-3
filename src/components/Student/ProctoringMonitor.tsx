import React, { useEffect, useState, useRef } from 'react';
import { ShieldAlert, Lock, Maximize2, Radio } from 'lucide-react';
import { CheatLog } from '../../types';

interface ProctoringMonitorProps {
  submissionId: string;
  sbd: string;
  examCode: string;
  testMode: 'TEST' | 'PRACTICE';
  onViolationCountChange?: (count: number) => void;
}

export const ProctoringMonitor: React.FC<ProctoringMonitorProps> = ({
  submissionId,
  sbd,
  examCode,
  testMode,
  onViolationCountChange
}) => {
  const [violationCount, setViolationCount] = useState(0);
  const [isLocked30s, setIsLocked30s] = useState(false);
  const [lockCountdown, setLockCountdown] = useState(30);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);

  const lockTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Monitor Fullscreen Status
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const requestFullscreenMode = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    }
  };

  const trigger30sLock = () => {
    if (lockTimerRef.current) {
      clearInterval(lockTimerRef.current);
    }

    setIsLocked30s(true);
    setLockCountdown(30);

    let current = 30;
    lockTimerRef.current = setInterval(() => {
      current -= 1;
      if (current <= 0) {
        if (lockTimerRef.current) clearInterval(lockTimerRef.current);
        setIsLocked30s(false);
        setLockCountdown(30);
      } else {
        setLockCountdown(current);
      }
    }, 1000);
  };

  // Record Violation directly to LocalStorage
  const recordViolation = (reason: string) => {
    if (testMode !== 'TEST') return; // Only strictly record in TEST mode

    const newLog: CheatLog = {
      log_id: 'log_' + Date.now(),
      submission_id: submissionId,
      sbd: sbd,
      exam_code: examCode,
      violation_type: reason,
      timestamp: new Date().toISOString()
    };

    // Save to LocalStorage
    const existing = localStorage.getItem('ielts_cheat_logs');
    const logsArr: CheatLog[] = existing ? JSON.parse(existing) : [];
    logsArr.push(newLog);
    localStorage.setItem('ielts_cheat_logs', JSON.stringify(logsArr));

    setViolationCount((prev) => prev + 1);

    setWarningMsg(`⚠️ PROCTORING VIOLATION: ${reason}`);
    setTimeout(() => {
      setWarningMsg(null);
    }, 4000);
  };

  // Safely notify parent component and handle lock after render when violationCount updates
  useEffect(() => {
    if (violationCount > 0) {
      if (onViolationCountChange) {
        onViolationCountChange(violationCount);
      }

      if (violationCount >= 3 && !isLocked30s) {
        trigger30sLock();
      }
    }
  }, [violationCount]);

  // Clean up lock timer on unmount
  useEffect(() => {
    return () => {
      if (lockTimerRef.current) {
        clearInterval(lockTimerRef.current);
      }
    };
  }, []);

  // Attach Security Listeners (Right Click, F12, Tab Change / Blur)
  useEffect(() => {
    if (testMode !== 'TEST') return;

    // Disable Right Click (Context Menu)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      recordViolation('Right Click action (Context Menu)');
    };

    // Disable F12 and DevTools Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.ctrlKey && e.key === 'U')
      ) {
        e.preventDefault();
        recordViolation('Developer Shortcut / F12 Inspect');
      }
    };

    // Tab Blur / Switch Window
    const handleWindowBlur = () => {
      recordViolation('Tab switched / Left exam window (window.onblur)');
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [testMode, submissionId, sbd, examCode]);

  if (testMode !== 'TEST') return null;

  return (
    <>
      {/* Top Proctoring Bar */}
      <div className="bg-white border-b border-purple-100/80 px-4 py-2 flex items-center justify-between text-xs text-[#3C2A63] shadow-sm">
        <div className="flex items-center space-x-3">
          <span className="flex items-center gap-1.5 font-extrabold text-rose-700 animate-pulse">
            <Radio className="w-3.5 h-3.5 text-rose-600" />
            LIVE PROCTORING ACTIVE
          </span>
          <span className="hidden sm:inline border-l border-purple-200 pl-3 font-medium">
            Candidate ID: <strong className="text-[#3C2A63] font-extrabold">{sbd}</strong>
          </span>
          <span className="hidden sm:inline border-l border-purple-200 pl-3 font-medium">
            Exam: <strong className="text-[#6B51A5] font-extrabold">{examCode}</strong>
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {/* Fullscreen Button */}
          {!isFullscreen && (
            <button
              onClick={requestFullscreenMode}
              className="px-3 py-1 bg-[#6B51A5] hover:bg-[#503A7A] text-white rounded-xl font-extrabold flex items-center gap-1 transition shadow-sm cursor-pointer"
            >
              <Maximize2 className="w-3 h-3" />
              Enable Fullscreen
            </button>
          )}

          {/* Violation Badge */}
          <span className={`px-3 py-1 rounded-xl font-extrabold border ${
            violationCount === 0
              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
              : 'bg-rose-100 text-rose-800 border-rose-200'
          }`}>
            Tab Switch Violations: {violationCount} / 3
          </span>
        </div>
      </div>

      {/* Floating Warning Banner */}
      {warningMsg && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-rose-600 text-white font-extrabold rounded-2xl shadow-xl flex items-center space-x-2 border border-rose-400 animate-bounce text-xs">
          <ShieldAlert className="w-4 h-4" />
          <span>{warningMsg}</span>
        </div>
      )}

      {/* 30-Second Lock Screen Overlay */}
      {isLocked30s && (
        <div className="fixed inset-0 bg-[#3C2A63]/95 z-[9999] backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="w-20 h-20 bg-rose-500/20 border border-rose-400/40 rounded-3xl flex items-center justify-center mb-6 animate-pulse">
            <Lock className="w-10 h-10 text-rose-400" />
          </div>

          <h2 className="text-3xl font-black text-white mb-2 tracking-tight">
            EXAM WINDOW IS TEMPORARILY LOCKED!
          </h2>
          <p className="text-sm text-rose-200 max-w-md mb-6 leading-relaxed font-medium">
            The automated proctoring system detected 3 or more tab switches / window blur events ({violationCount} violations).
          </p>

          {/* Countdown Clock */}
          <div className="w-28 h-28 rounded-full border-4 border-rose-400/50 flex items-center justify-center mb-6 bg-rose-950/40">
            <span className="text-4xl font-black text-rose-300">{lockCountdown}s</span>
          </div>

          <p className="text-xs text-purple-200 font-medium">
            Please remain on this screen. Your exam will resume automatically when the timer reaches zero.
          </p>
        </div>
      )}
    </>
  );
};

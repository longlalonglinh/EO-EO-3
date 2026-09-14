import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  BookOpen, 
  AlertCircle, 
  History, 
  ArrowRight, 
  Lock, 
  CheckCircle2, 
  Clock, 
  FileText,
  Sparkles,
  HelpCircle,
  UserCheck,
  Building2,
  SlidersHorizontal,
  Settings,
  Activity,
  RefreshCw
} from 'lucide-react';
import { prefetchExam, DEFAULT_API_URL } from '../../services/api';

interface LoginInstructionsProps {
  onLogin: (sbd: string, code: string, mode: 'TEST' | 'PRACTICE', reviewPrevious: boolean) => void;
  onSwitchToAdmin?: () => void;
  onOpenPracticeHub?: () => void;
  onOpenDiagnostics?: () => void;
  isLoadingExam?: boolean;
  gasUrl?: string;
}

export const LoginInstructions: React.FC<LoginInstructionsProps> = ({ 
  onLogin, 
  onSwitchToAdmin,
  onOpenPracticeHub,
  onOpenDiagnostics,
  isLoadingExam = false,
  gasUrl = DEFAULT_API_URL
}) => {
  const [sbd, setSbd] = useState('');
  const [examCode, setExamCode] = useState('IELTS01');
  const [selectedMode, setSelectedMode] = useState<'TEST' | 'PRACTICE'>('TEST');
  const [reviewPrevious, setReviewPrevious] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);

  const activeCode = examCode.trim().toUpperCase();

  // Prefetch exam when component mounts so data is ready in memory
  useEffect(() => {
    if (activeCode) {
      prefetchExam(gasUrl, activeCode).catch(() => {});
    }
  }, [gasUrl]);

  // Debounced prefetch whenever student types or updates the exam code
  useEffect(() => {
    if (!activeCode) return;
    const timer = setTimeout(() => {
      prefetchExam(gasUrl, activeCode).catch(() => {});
    }, 350);
    return () => clearTimeout(timer);
  }, [activeCode, gasUrl]);

  // Sync internal submitting state when external loading finishes
  useEffect(() => {
    if (!isLoadingExam && isSubmittingLogin) {
      const resetTimer = setTimeout(() => setIsSubmittingLogin(false), 800);
      return () => clearTimeout(resetTimer);
    }
  }, [isLoadingExam, isSubmittingLogin]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSbd = sbd.trim();
    const cleanCode = activeCode.trim();

    if (!cleanSbd) {
      setErrorMsg('Vui lòng nhập họ tên hoặc Số báo danh (SBD) của thí sinh.');
      return;
    }
    if (!cleanCode) {
      setErrorMsg('Vui lòng nhập mã đề thi.');
      return;
    }

    // Direct Admin Redirection Check via SBD / Code (for teachers/admins)
    const upperSbd = cleanSbd.toUpperCase();
    const upperCode = cleanCode.toUpperCase();
    if (
      (upperSbd === 'ADMIN' || upperSbd === 'ADMIN123' || upperSbd === 'TEACHER') &&
      (upperCode === 'ADMIN' || upperCode === 'ADMIN123' || upperCode === 'TEACHER' || upperCode === '123456')
    ) {
      if (onSwitchToAdmin) {
        onSwitchToAdmin();
        return;
      }
    }

    setErrorMsg('');
    setIsSubmittingLogin(true);
    onLogin(cleanSbd, cleanCode, selectedMode, reviewPrevious);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in py-2 font-sans text-[#3C2A63]">
      
      {/* Top Hero Banner */}
      <div className="bg-white border border-purple-100 rounded-[28px] p-6 md:p-8 shadow-sm relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-purple-200/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-80 h-80 bg-emerald-200/30 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[#3C2A63] tracking-tight">
              IELTS Online Testing &amp; Practice System
            </h1>
            <p className="text-xs text-[#7C68A5] mt-1 font-medium">
              Examination platform &amp; adaptive vocabulary/grammar practice for learners
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Secure</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Authentication Card */}
        <div className="md:col-span-5 bg-white border border-purple-100 rounded-[28px] p-6 shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-5">
            <div className="border-b border-purple-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#3C2A63] flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#6B51A5]" />
                  <span>Candidate Verification</span>
                </h2>
                <p className="text-xs text-[#7C68A5] mt-0.5">Enter candidate ID / name and test code</p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center space-x-2 animate-shake font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* SBD / Student Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#3C2A63]">
                  Candidate Name / ID (SBD) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={sbd}
                    onChange={(e) => setSbd(e.target.value)}
                    placeholder="e.g., John Doe (or HV01, TS12345)"
                    className="w-full pl-10 pr-4 py-3 bg-[#F5F2F9] border border-purple-200 rounded-2xl text-sm text-[#3C2A63] placeholder-[#7C68A5] focus:outline-none focus:border-[#6B51A5] transition-all font-medium"
                    required
                  />
                  <UserCheck className="w-4 h-4 text-[#7C68A5] absolute left-3.5 top-3.5 pointer-events-none" />
                </div>
                <span className="text-[11px] text-[#7C68A5] block">
                  Your practice results and scores will be tracked under your profile.
                </span>
              </div>

              {/* Exam Code */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#3C2A63]">
                  Test Code / Practice Set <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={examCode}
                    onChange={(e) => setExamCode(e.target.value)}
                    placeholder="e.g., IELTS01, ON_TAP_01, VOCAB_B2..."
                    className="w-full pl-10 pr-4 py-3 bg-[#F5F2F9] border border-purple-200 rounded-2xl text-sm text-[#3C2A63] placeholder-[#7C68A5] focus:outline-none focus:border-[#6B51A5] transition-all font-mono font-bold"
                    required
                  />
                  <SlidersHorizontal className="w-4 h-4 text-[#7C68A5] absolute left-3.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              {/* Mode Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#3C2A63]">
                  Session Mode:
                </label>
                <div className="grid grid-cols-2 gap-2 bg-[#F5F2F9] p-1 rounded-2xl border border-purple-200">
                  <button
                    type="button"
                    onClick={() => setSelectedMode('TEST')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      selectedMode === 'TEST'
                        ? 'bg-white text-amber-800 shadow-sm border border-amber-200'
                        : 'text-[#7C68A5] hover:text-[#3C2A63]'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Official Test</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMode('PRACTICE')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      selectedMode === 'PRACTICE'
                        ? 'bg-white text-emerald-800 shadow-sm border border-emerald-200'
                        : 'text-[#7C68A5] hover:text-[#3C2A63]'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Practice Mode</span>
                  </button>
                </div>
              </div>

              {/* PRACTICE Mode Option: Review Previous Submission */}
              {selectedMode === 'PRACTICE' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                  <label className="flex items-center space-x-2.5 text-xs font-medium text-emerald-900 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={reviewPrevious}
                      onChange={(e) => setReviewPrevious(e.target.checked)}
                      className="w-4 h-4 rounded-md border-emerald-300 text-[#6B51A5] focus:ring-[#6B51A5] accent-[#6B51A5] cursor-pointer"
                    />
                    <span className="flex items-center gap-1.5 font-bold">
                      <History className="w-4 h-4 text-emerald-700" />
                      Review previous submission and score report
                    </span>
                  </label>
                </div>
              )}

              {/* Primary Submit Button with Instant Visual Feedback */}
              <button
                type="submit"
                disabled={isSubmittingLogin || isLoadingExam}
                className={`w-full h-12 bg-[#6B51A5] hover:bg-[#503A7A] text-white font-bold rounded-2xl text-sm transition-all shadow-md shadow-[#6B51A5]/20 flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.98] ${
                  (isSubmittingLogin || isLoadingExam) ? 'opacity-90 cursor-wait' : ''
                }`}
              >
                {isSubmittingLogin || isLoadingExam ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white shrink-0" />
                    <span>Đang vào phòng thi... (Loading exam)</span>
                  </>
                ) : (
                  <>
                    <span>
                      {selectedMode === 'TEST' 
                        ? 'VÀO THI CHÍNH THỨC • START TEST' 
                        : 'VÀO ÔN TẬP • START PRACTICE'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Shortcut to Practice Exercises Hub */}
              <button
                type="button"
                onClick={() => {
                  if (onOpenPracticeHub) {
                    onOpenPracticeHub();
                  } else {
                    onLogin(sbd || 'HV01', 'ON_TAP_01', 'PRACTICE', false);
                  }
                }}
                className="w-full py-2.5 px-3 bg-purple-50 hover:bg-purple-100/70 border border-purple-200 text-xs font-bold text-[#6B51A5] rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#6B51A5]" />
                <span>Practice Questions Hub</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Regulations & Technical Guidelines */}
        <div className="md:col-span-7 bg-white border border-purple-100 rounded-[28px] p-6 shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-purple-100 pb-3">
              <h2 className="text-base font-bold text-[#3C2A63] flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#6B51A5]" />
                <span>Exam Regulations &amp; Guidelines</span>
              </h2>
              <p className="text-xs text-[#7C68A5] mt-0.5">Please review before starting an exam or practice session</p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 bg-[#F5F2F9] border border-purple-100 rounded-2xl space-y-1.5">
                <div className="flex items-center space-x-2 text-amber-800 font-bold">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>1. Anti-Cheat Monitoring (TEST MODE)</span>
                </div>
                <p className="text-[#503A7A] leading-relaxed pl-6">
                  In official test mode, right-click and copy functions are disabled, and tab-switching events are strictly logged.
                </p>
              </div>

              <div className="p-4 bg-[#F5F2F9] border border-purple-100 rounded-2xl space-y-1.5">
                <div className="flex items-center space-x-2 text-emerald-800 font-bold">
                  <Clock className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>2. Listening Audio Stream &amp; Single Play</span>
                </div>
                <p className="text-[#503A7A] leading-relaxed pl-6">
                  Listening sections replicate computer-delivered IELTS exam conditions with unseekable audio streams.
                </p>
              </div>

              <div className="p-4 bg-[#F5F2F9] border border-purple-100 rounded-2xl space-y-1.5">
                <div className="flex items-center space-x-2 text-blue-800 font-bold">
                  <BookOpen className="w-4 h-4 shrink-0 text-blue-600" />
                  <span>3. Split-Screen Reading Interface</span>
                </div>
                <p className="text-[#503A7A] leading-relaxed pl-6">
                  Reading passages appear on the left with questions on the right, accompanied by three highlighter tools.
                </p>
              </div>

              <div className="p-4 bg-[#F5F2F9] border border-purple-100 rounded-2xl space-y-1.5">
                <div className="flex items-center space-x-2 text-purple-800 font-bold">
                  <FileText className="w-4 h-4 shrink-0 text-[#6B51A5]" />
                  <span>4. Writing Editor &amp; Live Word Counter</span>
                </div>
                <p className="text-[#503A7A] leading-relaxed pl-6">
                  Writing editors provide real-time word counting and continuous automatic local drafts.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-purple-50/80 border border-purple-200 rounded-2xl flex items-center justify-between text-xs text-[#503A7A]">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>System configured with automated progress tracking.</span>
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};

import React, { useState } from 'react';
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
  Settings
} from 'lucide-react';

interface LoginInstructionsProps {
  onLogin: (sbd: string, code: string, reviewPrevious: boolean) => void;
  onSwitchToAdmin?: () => void;
}

export const LoginInstructions: React.FC<LoginInstructionsProps> = ({ onLogin, onSwitchToAdmin }) => {
  const [sbd, setSbd] = useState('');
  const [examCode, setExamCode] = useState('IELTS01');
  const [reviewPrevious, setReviewPrevious] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const activeCode = examCode.trim().toUpperCase();

  // Mode detection math: (digits % 2 !== 0) -> TEST, (digits % 2 === 0) -> PRACTICE
  const calculateMode = (codeStr: string): 'TEST' | 'PRACTICE' => {
    if (codeStr.startsWith('TEST')) return 'TEST';
    if (codeStr.startsWith('PRAC')) return 'PRACTICE';
    
    const digits = codeStr.replace(/\D/g, '');
    if (digits.length > 0) {
      const num = parseInt(digits, 10);
      return num % 2 !== 0 ? 'TEST' : 'PRACTICE';
    }
    const charSum = codeStr.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return charSum % 2 !== 0 ? 'TEST' : 'PRACTICE';
  };

  const detectedMode = calculateMode(activeCode);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSbd = sbd.trim();
    const cleanCode = activeCode.trim();

    if (!cleanSbd) {
      setErrorMsg('Please enter your Candidate Registration Number (SBD).');
      return;
    }
    if (!cleanCode) {
      setErrorMsg('Please enter the Exam Code.');
      return;
    }

    // Direct Admin Redirection Check via SBD / Code
    const upperSbd = cleanSbd.toUpperCase();
    const upperCode = cleanCode.toUpperCase();
    if ((upperSbd === 'ADMIN123' || upperSbd === 'ADMIN') && (upperCode === 'ADMIN123' || upperCode === 'ADMIN')) {
      if (onSwitchToAdmin) {
        onSwitchToAdmin();
        return;
      }
    }

    setErrorMsg('');
    onLogin(cleanSbd, cleanCode, reviewPrevious);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in py-2">
      
      {/* Material Design 3 Hero Surface Container */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-[28px] p-6 md:p-8 shadow-2xl relative overflow-hidden backdrop-blur-md">
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 text-left max-w-2xl">
            {/* M3 Assist Chip */}
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-xs font-semibold text-indigo-300">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>EO EO Testing • Online Examination System</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Candidate Login &amp; Technical Instructions
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Enter your Candidate Number (SBD) and Exam Code to initiate your session. Mode routing: <strong className="text-amber-300">Odd Code = TEST MODE</strong> and <strong className="text-emerald-300">Even Code = PRACTICE MODE</strong>.
            </p>
          </div>

          {/* M3 Mode Indicator Chips */}
          <div className="flex flex-wrap md:flex-col gap-2 shrink-0 w-full md:w-auto">
            <div className="flex-1 md:flex-initial px-4 py-2.5 bg-slate-950/80 rounded-2xl border border-amber-500/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-medium text-slate-300">TEST MODE</span>
              </div>
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[11px] font-bold rounded-md">Odd Code</span>
            </div>

            <div className="flex-1 md:flex-initial px-4 py-2.5 bg-slate-950/80 rounded-2xl border border-emerald-500/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-medium text-slate-300">PRACTICE MODE</span>
              </div>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[11px] font-bold rounded-md">Even Code</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* M3 Form Card */}
        <div className="md:col-span-5 bg-slate-900/90 border border-slate-800 rounded-[28px] p-6 shadow-xl space-y-5 flex flex-col justify-between">
          <div className="space-y-5">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  <span>Candidate Authentication</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Enter Registration ID &amp; Exam Code to begin</p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-center space-x-2 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* M3 Outlined Input 1: SBD */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Candidate Number (SBD) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={sbd}
                    onChange={(e) => setSbd(e.target.value)}
                    placeholder="e.g. TS12345"
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700/80 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    required
                  />
                  <UserCheck className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              {/* M3 Outlined Input 2: Exam Code */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Exam Code <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={examCode}
                    onChange={(e) => setExamCode(e.target.value)}
                    placeholder="e.g. IELTS01, TEST01, PRAC02..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700/80 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    required
                  />
                  <SlidersHorizontal className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              {/* Mode Preview M3 Container */}
              <div className="p-3.5 bg-slate-950/90 border border-slate-800 rounded-2xl flex items-center justify-between gap-2">
                <div className="text-xs">
                  <span className="text-slate-400 block text-[11px]">Detected Mode:</span>
                  <span className="font-bold text-white text-sm tracking-wide">{activeCode}</span>
                </div>
                <div>
                  {activeCode === 'ADMIN123' ? (
                    <span className="px-3 py-1 bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold rounded-xl flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      ADMIN MODE
                    </span>
                  ) : detectedMode === 'TEST' ? (
                    <span className="px-3 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold rounded-xl flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      TEST (Odd Code)
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      PRACTICE (Even Code)
                    </span>
                  )}
                </div>
              </div>

              {/* PRACTICE Mode Option: Review Previous Submission Checkbox (M3 Style) */}
              {detectedMode === 'PRACTICE' && activeCode !== 'ADMIN123' && (
                <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl space-y-2">
                  <label className="flex items-center space-x-2.5 text-xs font-medium text-emerald-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={reviewPrevious}
                      onChange={(e) => setReviewPrevious(e.target.checked)}
                      className="w-4 h-4 rounded-md border-slate-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900 accent-emerald-500 cursor-pointer"
                    />
                    <span className="flex items-center gap-1.5 font-bold">
                      <History className="w-4 h-4 text-emerald-400" />
                      Review Previous Submissions (Exam History)
                    </span>
                  </label>
                  <p className="text-[11px] text-slate-400 pl-6 leading-tight">
                    Enable this option to review your existing scores, essay responses, and answers submitted under this SBD and Exam Code.
                  </p>
                </div>
              )}

              {/* M3 Filled Primary Action Button */}
              <button
                type="submit"
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.98]"
              >
                <span>Start Exam Session</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Regulations & Technical Guidelines */}
        <div className="md:col-span-7 bg-slate-900/90 border border-slate-800 rounded-[28px] p-6 shadow-xl space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-400" />
                <span>Exam Regulations &amp; Technical Guidelines</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Please review the 3-skill examination procedures before starting</p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1.5">
                <div className="flex items-center space-x-2 text-amber-300 font-bold">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>1. Automated Proctoring (TEST MODE)</span>
                </div>
                <p className="text-slate-400 leading-relaxed pl-6">
                  In TEST MODE, fullscreen mode is enforced, right-click context menu and developer shortcut keys are disabled. Tab switching is strictly tracked. Exceeding 3 violations triggers a 30-second lock.
                </p>
              </div>

              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1.5">
                <div className="flex items-center space-x-2 text-emerald-300 font-bold">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>2. Listening Module &amp; Locked Audio Track</span>
                </div>
                <p className="text-slate-400 leading-relaxed pl-6">
                  Audio playback disables seeking (NO SEEKING) and can only be played once following standard IELTS computer-delivered test rules.
                </p>
              </div>

              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1.5">
                <div className="flex items-center space-x-2 text-blue-300 font-bold">
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <span>3. Reading Module &amp; Split-Screen Workspace</span>
                </div>
                <p className="text-slate-400 leading-relaxed pl-6">
                  A 50:50 adjustable split-screen allows reading passages on the left while answering questions on the right, equipped with a <strong>Multi-Color Highlighter</strong> tool (Yellow, Green, Blue).
                </p>
              </div>

              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1.5">
                <div className="flex items-center space-x-2 text-purple-300 font-bold">
                  <FileText className="w-4 h-4 shrink-0" />
                  <span>4. Writing Module &amp; Continuous Auto-Save</span>
                </div>
                <p className="text-slate-400 leading-relaxed pl-6">
                  The writing editor completely blocks paste actions, disables browser spellcheck, counts words in real-time, and continuously saves responses to local storage.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl flex items-center justify-between text-xs text-indigo-300">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>System is ready. Enter your Registration Number and click Start!</span>
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};


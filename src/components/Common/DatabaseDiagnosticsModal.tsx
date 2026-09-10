import React, { useState } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  UploadCloud, 
  Copy, 
  Check, 
  ExternalLink, 
  X, 
  Database, 
  Server, 
  FileSpreadsheet, 
  HelpCircle,
  Sparkles,
  Info
} from 'lucide-react';
import { 
  FullDiagnosticReport, 
  runDatabaseDiagnostics, 
  seedExamToGoogleSheets 
} from '../../services/dbDiagnostics';
import { gasScriptCodeTemplate } from '../../data/gasScriptCode';

interface DatabaseDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiUrl: string;
  initialExamCode?: string;
  onApplyExam?: (examData: any) => void;
}

export const DatabaseDiagnosticsModal: React.FC<DatabaseDiagnosticsModalProps> = ({
  isOpen,
  onClose,
  apiUrl,
  initialExamCode = 'TEST01',
  onApplyExam
}) => {
  const [examCodeInput, setExamCodeInput] = useState(initialExamCode);
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<FullDiagnosticReport | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [showScriptModal, setShowScriptModal] = useState(false);

  if (!isOpen) return null;

  const handleRunDiagnostics = async () => {
    setIsRunning(true);
    setSeedResult(null);
    try {
      const res = await runDatabaseDiagnostics(apiUrl, examCodeInput.trim() || 'TEST01');
      setReport(res);
    } catch (err: any) {
      console.error('Diagnostics failed:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSeedExam = async () => {
    setIsSeeding(true);
    setSeedResult(null);
    try {
      const res = await seedExamToGoogleSheets(apiUrl);
      setSeedResult(res);
      // Re-run diagnostic automatically to see the new questions!
      if (res.success) {
        setTimeout(handleRunDiagnostics, 1500);
      }
    } catch (err: any) {
      setSeedResult({
        success: false,
        message: err.message || 'Error uploading exam to Google Sheets.'
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(gasScriptCodeTemplate);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Database &amp; Connection Diagnostics</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Google Sheets GAS
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Automated network inspection, REST protocol tests, and question extractor
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* Diagnostic Controls */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="flex-1 w-full">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Target Exam Code:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={examCodeInput}
                    onChange={(e) => setExamCodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. TEST01, IELTS01, PRAC01..."
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase tracking-wide"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-mono">
                    EXAM_CODE
                  </span>
                </div>
              </div>

              <button
                onClick={handleRunDiagnostics}
                disabled={isRunning}
                className="w-full sm:w-auto mt-auto h-[42px] px-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
                <span>{isRunning ? 'Running checks...' : 'Start Diagnostics'}</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-500 truncate flex items-center gap-1">
              <Server className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              <span className="truncate">Connection URL: {apiUrl || '(Not configured)'}</span>
            </div>
          </div>

          {/* Diagnostic Results Display */}
          {report ? (
            <div className="space-y-4 animate-fade-in">
              
              {/* Overall Status Banner */}
              <div className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
                report.overallStatus === 'OPTIMAL'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                  : report.overallStatus === 'DEGRADED'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
              }`}>
                {report.overallStatus === 'OPTIMAL' ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
                ) : report.overallStatus === 'DEGRADED' ? (
                  <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="text-xs font-bold uppercase tracking-wider">
                    Overall Status: {report.overallStatus}
                  </div>
                  <p className="text-xs leading-relaxed opacity-90">
                    {report.summary}
                  </p>
                </div>
              </div>

              {/* Step by Step Breakdown */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Step-by-Step Diagnostic Inspection</span>
                </div>

                <div className="space-y-2">
                  {report.steps.map((s, idx) => (
                    <div 
                      key={s.id || idx}
                      className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-2.5">
                        {s.status === 'SUCCESS' && (
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                        )}
                        {s.status === 'WARNING' && (
                          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                        )}
                        {s.status === 'ERROR' && (
                          <XCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                        )}
                        {s.status === 'INFO' && (
                          <Info className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
                        )}

                        <div>
                          <div className="font-bold text-white text-xs">{s.title}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{s.message}</div>
                        </div>
                      </div>

                      {typeof s.durationMs === 'number' && (
                        <span className="text-[10px] font-mono text-slate-500 shrink-0">
                          {s.durationMs}ms
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Fixes */}
              {report.recommendedFixes.length > 0 && (
                <div className="p-4 bg-slate-950/80 border border-indigo-500/20 rounded-2xl space-y-2">
                  <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Recommended Solutions:</span>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-5 leading-relaxed">
                    {report.recommendedFixes.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Buttons for Auto-Fixing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleSeedExam}
                  disabled={isSeeding}
                  className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>{isSeeding ? 'Uploading to Sheets...' : 'Seed Sample Exam to Google Sheets'}</span>
                </button>

                <button
                  onClick={handleCopyScript}
                  className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedScript ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedScript ? 'GAS Script Copied!' : 'Copy Enhanced GAS Script'}</span>
                </button>
              </div>

              {seedResult && (
                <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  seedResult.success 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}>
                  {seedResult.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  <span>{seedResult.message}</span>
                </div>
              )}

              {/* Safe Offline Fallback Notice */}
              <div className="p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-xl text-[11px] text-indigo-300 leading-relaxed">
                💡 <strong>Continuous Reliability:</strong> Even if Google Sheets returns 0 questions or experiences network delays, the testing engine automatically loads standard authentic IELTS questions (Reading, Listening, Writing) so candidates are never interrupted!
              </div>

            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 space-y-3">
              <Database className="w-10 h-10 text-slate-600 mx-auto animate-pulse" />
              <div className="text-xs font-medium">
                Click <strong>"Start Diagnostics"</strong> to run automated connection and data checks.
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            Google Apps Script Web App Integration
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

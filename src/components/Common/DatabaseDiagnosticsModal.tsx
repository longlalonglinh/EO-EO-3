import React, { useState, useEffect } from 'react';
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
  Sparkles, 
  Zap, 
  Clock, 
  Save, 
  ArrowRight, 
  HelpCircle,
  Headphones,
  BookOpen,
  FileText
} from 'lucide-react';
import { 
  FullDiagnosticReport, 
  runDatabaseDiagnostics, 
  seedExamToGoogleSheets 
} from '../../services/dbDiagnostics';
import { 
  extractSpreadsheetId, 
  getStoredSpreadsheetId, 
  setStoredSpreadsheetId, 
  testGvizConnection, 
  fetchExamViaGviz 
} from '../../services/gvizService';
import { saveServerConfig, fetchServerConfig } from '../../services/api';
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
  const [activeTab, setActiveTab] = useState<'gviz' | 'gas'>('gviz');
  const [examCodeInput, setExamCodeInput] = useState(initialExamCode);

  // GViz Engine State
  const [spreadsheetInput, setSpreadsheetInput] = useState<string>('');
  const [isTestingGviz, setIsTestingGviz] = useState<boolean>(false);
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);
  const [saveConfigSuccess, setSaveConfigSuccess] = useState<boolean>(false);
  const [gvizTestResult, setGvizTestResult] = useState<{
    success: boolean;
    latencyMs: number;
    message: string;
    examsFound: number;
    examData?: any;
    listeningCount?: number;
    readingCount?: number;
  } | null>(null);

  // GAS Diagnostics State
  const [isRunningGas, setIsRunningGas] = useState<boolean>(false);
  const [report, setReport] = useState<FullDiagnosticReport | null>(null);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [seedResult, setSeedResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);

  // Load configured spreadsheet ID on mount or modal open
  useEffect(() => {
    if (!isOpen) return;
    const localId = getStoredSpreadsheetId();
    if (localId) {
      setSpreadsheetInput(localId);
    } else {
      fetchServerConfig().then((cfg) => {
        if (cfg?.spreadsheet_id) {
          setSpreadsheetInput(cfg.spreadsheet_id);
          setStoredSpreadsheetId(cfg.spreadsheet_id);
        }
      }).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const extractedId = extractSpreadsheetId(spreadsheetInput);

  // --- Handlers for GViz ---
  const handleSaveSpreadsheetId = async () => {
    setIsSavingConfig(true);
    setSaveConfigSuccess(false);
    try {
      if (extractedId) {
        setStoredSpreadsheetId(extractedId);
        await saveServerConfig({ spreadsheet_id: extractedId });
      } else {
        setStoredSpreadsheetId('');
        await saveServerConfig({ spreadsheet_id: '' });
      }
      setSaveConfigSuccess(true);
      setTimeout(() => setSaveConfigSuccess(false), 2500);
    } catch (err) {
      console.warn('Could not save spreadsheet ID to server config:', err);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleRunGvizSpeedTest = async () => {
    if (!extractedId) {
      setGvizTestResult({
        success: false,
        latencyMs: 0,
        message: 'Vui lòng nhập Google Spreadsheet ID hoặc đường link bảng tính hợp lệ trước khi test.',
        examsFound: 0
      });
      return;
    }

    setIsTestingGviz(true);
    setGvizTestResult(null);

    try {
      // 1. Connection check & exams count
      const connResult = await testGvizConnection(extractedId);

      // 2. Sample exam fetch for target exam code
      const targetCode = examCodeInput.trim() || 'TEST01';
      const examResult = await fetchExamViaGviz(extractedId, targetCode);

      const effectiveLatency = examResult.latencyMs || connResult.latencyMs;

      if (examResult.success && examResult.exam) {
        const exam = examResult.exam;
        const listeningCount = (exam.listening_questions || []).length;
        const readingCount = (exam.reading_questions || []).length;

        setGvizTestResult({
          success: true,
          latencyMs: effectiveLatency,
          message: `Kết nối GViz thành công! Đã trích xuất hoàn chỉnh đề [${targetCode}] trong ${effectiveLatency}ms.`,
          examsFound: connResult.examsFound || 1,
          examData: exam,
          listeningCount,
          readingCount
        });
      } else if (connResult.success) {
        setGvizTestResult({
          success: true,
          latencyMs: connResult.latencyMs,
          message: `${connResult.message}. Lưu ý: Mã đề [${targetCode}] chưa có trong tab EXAMS.`,
          examsFound: connResult.examsFound
        });
      } else {
        setGvizTestResult({
          success: false,
          latencyMs: connResult.latencyMs,
          message: connResult.message,
          examsFound: 0
        });
      }
    } catch (err: any) {
      setGvizTestResult({
        success: false,
        latencyMs: 0,
        message: `Lỗi kết nối GViz: ${err.message || 'Không thể truy cập Google Sheets.'}`,
        examsFound: 0
      });
    } finally {
      setIsTestingGviz(false);
    }
  };

  const handleApplyGvizExamToApp = () => {
    if (gvizTestResult?.examData && onApplyExam) {
      onApplyExam(gvizTestResult.examData);
      onClose();
    }
  };

  // --- Handlers for GAS ---
  const handleRunGasDiagnostics = async () => {
    setIsRunningGas(true);
    setSeedResult(null);
    try {
      const res = await runDatabaseDiagnostics(apiUrl, examCodeInput.trim() || 'TEST01');
      setReport(res);
    } catch (err: any) {
      console.error('GAS Diagnostics failed:', err);
    } finally {
      setIsRunningGas(false);
    }
  };

  const handleSeedExam = async () => {
    setIsSeeding(true);
    setSeedResult(null);
    try {
      const res = await seedExamToGoogleSheets(apiUrl);
      setSeedResult(res);
      if (res.success) {
        setTimeout(handleRunGasDiagnostics, 1500);
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
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Zap className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Database &amp; Protocol Diagnostics</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  GViz &amp; GAS Edge Engine
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Kiểm tra tốc độ truy vấn trực tiếp Google Sheets và chẩn đoán giao thức REST
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

        {/* Tab Selector */}
        <div className="px-6 pt-3 pb-0 bg-slate-950/40 border-b border-slate-800 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('gviz')}
            className={`pb-2.5 px-3 text-xs font-black border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'gviz'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Google Visualization API (GViz/TQ - Siêu tốc &lt;200ms)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gas')}
            className={`pb-2.5 px-3 text-xs font-black border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'gas'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            <span>Apps Script REST Diagnostic</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">

          {/* ================================= TAB 1: GVIZ ENGINE ================================= */}
          {activeTab === 'gviz' && (
            <div className="space-y-4">
              
              {/* Architecture Highlight Banner */}
              <div className="p-4 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-extrabold text-indigo-300">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Google Visualization Query Protocol (`gviz/tq`)</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Truy vấn đề thi trực tiếp qua hạ tầng <strong>Google C++ Edge Engine &amp; CDN</strong>. Bỏ qua hoàn toàn độ trễ khởi động V8 của Apps Script, hạ thời gian tải đề thi từ <strong>2s – 5s</strong> xuống còn <strong>~50ms – 200ms</strong>, không tốn hạn ngạch tài khoản Google.
                </p>
              </div>

              {/* Spreadsheet ID Configuration Input */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Google Spreadsheet ID hoặc URL Bảng tính:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={spreadsheetInput}
                      onChange={(e) => setSpreadsheetInput(e.target.value)}
                      placeholder="Dán URL bảng tính (https://docs.google.com/spreadsheets/d/.../edit) hoặc ID"
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <FileSpreadsheet className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
                  </div>
                </div>

                {/* Extracted ID Preview & Save Controls */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pt-1">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <span className="font-semibold text-slate-400">ID trích xuất:</span>
                    {extractedId ? (
                      <span className="font-mono text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-500/30">
                        {extractedId}
                      </span>
                    ) : (
                      <span className="italic text-slate-500">Chưa nhập hoặc không hợp lệ</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveSpreadsheetId}
                    disabled={isSavingConfig}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20"
                  >
                    {saveConfigSuccess ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{saveConfigSuccess ? 'Đã lưu cấu hình!' : 'Lưu Spreadsheet ID'}</span>
                  </button>
                </div>
              </div>

              {/* Speed Test Controls */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  <div className="flex-1 w-full">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Mã đề kiểm tra (Target Exam Code):
                    </label>
                    <input
                      type="text"
                      value={examCodeInput}
                      onChange={(e) => setExamCodeInput(e.target.value.toUpperCase())}
                      placeholder="e.g. TEST01, IELTS01..."
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleRunGvizSpeedTest}
                    disabled={isTestingGviz || !extractedId}
                    className="w-full sm:w-auto mt-auto h-[40px] px-5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <RefreshCw className={`w-4 h-4 ${isTestingGviz ? 'animate-spin' : ''}`} />
                    <span>{isTestingGviz ? 'Đang đo tốc độ...' : 'Test kết nối GViz (Speed Test)'}</span>
                  </button>
                </div>
              </div>

              {/* Speed Test Result Display */}
              {gvizTestResult && (
                <div className={`p-4 rounded-2xl border space-y-3 animate-fade-in ${
                  gvizTestResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      {gvizTestResult.success ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                          <span>{gvizTestResult.success ? 'GViz Kết Nối Xuất Sắc' : 'Kết Nối GViz Thất Bại'}</span>
                          {gvizTestResult.latencyMs > 0 && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-extrabold border ${
                              gvizTestResult.latencyMs <= 200
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                                : 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                            }`}>
                              ⚡ {gvizTestResult.latencyMs}ms {gvizTestResult.latencyMs <= 200 ? '(<200ms Siêu Tốc)' : ''}
                            </span>
                          )}
                        </div>
                        <p className="text-xs leading-relaxed opacity-90 mt-1">
                          {gvizTestResult.message}
                        </p>
                      </div>
                    </div>

                    <span className="text-[11px] font-mono px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 shrink-0">
                      {gvizTestResult.examsFound} đề thi trong Sheet
                    </span>
                  </div>

                  {/* If target exam details were loaded */}
                  {gvizTestResult.examData && (
                    <div className="p-3 bg-slate-900/90 border border-emerald-500/20 rounded-xl space-y-2 text-xs text-slate-300">
                      <div className="flex items-center justify-between text-white font-bold">
                        <span>Đề thi: {gvizTestResult.examData.title || gvizTestResult.examData.exam_code}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-900/60 text-purple-200 border border-purple-500/30">
                          {gvizTestResult.examData.exam_type || 'full_test'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Headphones className="w-3.5 h-3.5 text-purple-400" />
                          <span>Listening: <strong>{gvizTestResult.listeningCount || 0} câu</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                          <span>Reading: <strong>{gvizTestResult.readingCount || 0} câu</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <FileText className="w-3.5 h-3.5 text-purple-400" />
                          <span>Writing: <strong>{gvizTestResult.examData.writing_task1_prompt ? 'Có đề bài' : 'Trống'}</strong></span>
                        </div>
                      </div>

                      {onApplyExam && (
                        <div className="pt-2 border-t border-slate-800 flex justify-end">
                          <button
                            type="button"
                            onClick={handleApplyGvizExamToApp}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
                          >
                            <span>Áp dụng đề thi vào phiên làm việc ngay</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Step-by-step Setup Helper */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2 text-xs text-slate-400">
                <div className="font-bold text-slate-300 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Cách thiết lập quyền truy cập Google Sheet cho GViz:</span>
                </div>
                <ol className="list-decimal pl-5 space-y-1 text-[11px] leading-relaxed text-slate-400">
                  <li>Mở file Google Sheet chứa dữ liệu đề thi IELTS.</li>
                  <li>Bấm nút <strong>Chia sẻ (Share)</strong> ở góc trên bên phải.</li>
                  <li>Chuyển quyền sang: <strong>Bất kỳ ai có đường liên kết (Anyone with the link)</strong> với vai trò <strong>Người xem (Viewer)</strong>.</li>
                  <li>Sao chép link bảng tính và dán vào ô bên trên, sau đó bấm <em>Lưu Spreadsheet ID</em>.</li>
                </ol>
              </div>

            </div>
          )}

          {/* ================================= TAB 2: GAS REST DIAGNOSTICS ================================= */}
          {activeTab === 'gas' && (
            <div className="space-y-4">
              
              {/* Diagnostic Controls */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  <div className="flex-1 w-full">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Mã đề kiểm tra (Target Exam Code):
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
                    onClick={handleRunGasDiagnostics}
                    disabled={isRunningGas}
                    className="w-full sm:w-auto mt-auto h-[42px] px-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRunningGas ? 'animate-spin' : ''}`} />
                    <span>{isRunningGas ? 'Running checks...' : 'Chạy Chẩn Đoán GAS'}</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                  <Server className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <span className="truncate">GAS URL: {apiUrl || '(Chưa cấu hình)'}</span>
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
                        Trạng thái tổng thể: {report.overallStatus}
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
                      <span>Chi tiết các bước kiểm tra</span>
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

                  {/* Action Buttons for Auto-Fixing */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={handleSeedExam}
                      disabled={isSeeding}
                      className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20"
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>{isSeeding ? 'Đang tải lên Sheets...' : 'Tải đề mẫu lên Google Sheets'}</span>
                    </button>

                    <button
                      onClick={handleCopyScript}
                      className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {copiedScript ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedScript ? 'Đã sao chép mã GAS!' : 'Sao chép mã Google Apps Script'}</span>
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

                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 space-y-3">
                  <Database className="w-10 h-10 text-slate-600 mx-auto animate-pulse" />
                  <div className="text-xs font-medium">
                    Bấm <strong>"Chạy Chẩn Đoán GAS"</strong> để kiểm tra kết nối với Google Apps Script Web App.
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            Hệ thống Khảo thí IELTS CBT Trực Tuyến &bull; Google Visualization &amp; GAS Integration
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};

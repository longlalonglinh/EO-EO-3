import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  RefreshCw, 
  Users, 
  FileText, 
  CheckCircle2, 
  Search, 
  Filter, 
  Clock, 
  Activity,
  LayoutList,
  Table as TableIcon
} from 'lucide-react';
import { CheatLog, SubmissionRecord } from '../../types';
import { fetchSubmissions, fetchCheatLogs, deduplicateSubmissions, deduplicateCheatLogs, DEFAULT_API_URL } from '../../services/api';
import { formatSubmissionTime } from '../../utils/dateFormatter';

interface MonitoringDashboardProps {
  apiUrl?: string;
  gasUrl?: string;
  onOpenDiagnostics?: () => void;
}

export const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({ 
  apiUrl, 
  gasUrl, 
  onOpenDiagnostics 
}) => {
  const effectiveApiUrl = apiUrl || gasUrl || DEFAULT_API_URL;
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [cheatLogs, setCheatLogs] = useState<CheatLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubTab, setActiveTab] = useState<'submissions' | 'cheatlogs'>('submissions');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch submissions
      const subRes = await fetchSubmissions(effectiveApiUrl);
      if (subRes.success && subRes.data) {
        setSubmissions(deduplicateSubmissions(subRes.data));
      }

      // Fetch cheat logs
      const logRes = await fetchCheatLogs(effectiveApiUrl);
      if (logRes.success && logRes.data) {
        setCheatLogs(deduplicateCheatLogs(logRes.data));
      }
    } catch (err) {
      console.error('Error fetching admin monitoring data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [effectiveApiUrl]);

  const term = String(searchTerm || '').toLowerCase().trim();

  const filteredSubmissions = submissions.filter((s) => {
    if (!term) return true;
    const sbd = String(s?.sbd ?? '').toLowerCase();
    const examCode = String(s?.exam_code ?? '').toLowerCase();
    const subId = String(s?.submission_id ?? '').toLowerCase();
    return sbd.includes(term) || examCode.includes(term) || subId.includes(term);
  });

  const filteredLogs = cheatLogs.filter((l) => {
    if (!term) return true;
    const sbd = String(l?.sbd ?? '').toLowerCase();
    const examCode = String(l?.exam_code ?? '').toLowerCase();
    const violation = String(l?.violation_type ?? '').toLowerCase();
    return sbd.includes(term) || examCode.includes(term) || violation.includes(term);
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* Top Header & Refresh Control */}
      <div className="bg-white border border-purple-100/80 rounded-3xl p-4 sm:p-6 shadow-xl shadow-purple-950/5 flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#3C2A63] flex items-center gap-2">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-[#6B51A5] shrink-0" />
            <span>Candidate Proctoring &amp; Monitoring Dashboard</span>
          </h2>
          <p className="text-xs text-[#7C68A5] font-medium mt-1">
            Real-time examination records synchronized directly with Google Apps Script REST backend.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenDiagnostics && (
            <button
              onClick={onOpenDiagnostics}
              className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-extrabold text-xs rounded-2xl shadow-xs flex items-center space-x-2 transition cursor-pointer"
            >
              <Activity className="w-4 h-4 text-indigo-600 animate-pulse" />
              <span>DB Diagnostics</span>
            </button>
          )}

          {/* Manual Refresh Button */}
          <button
            onClick={loadData}
            disabled={loading}
            className="px-5 py-2.5 bg-[#6B51A5] hover:bg-[#583F8F] text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-purple-950/10 flex items-center space-x-2 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Refreshing...' : 'Refresh Records'}</span>
          </button>
        </div>
      </div>

      {/* Filter, Search & View Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Sub-tabs */}
        <div className="flex bg-[#E2DDEC] p-1.5 rounded-2xl space-x-1">
          <button
            onClick={() => setActiveTab('submissions')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeSubTab === 'submissions'
                ? 'bg-[#6B51A5] text-white shadow-md'
                : 'text-[#3C2A63] hover:text-[#503A7A]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Submissions ({submissions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('cheatlogs')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeSubTab === 'cheatlogs'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-[#3C2A63] hover:text-[#503A7A]'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Security Alerts ({cheatLogs.length})</span>
          </button>
        </div>

        {/* Search Field & View Mode Toggle */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-[#7C68A5] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search candidate, exam code..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-purple-200/80 rounded-2xl text-xs text-[#3C2A63] font-medium placeholder-[#7C68A5] focus:outline-none focus:ring-2 focus:ring-[#6B51A5] transition-all shadow-xs"
            />
          </div>

          <div className="hidden sm:flex bg-[#E2DDEC] p-1 rounded-xl">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg transition ${viewMode === 'cards' ? 'bg-white text-[#3C2A63] shadow-xs' : 'text-[#7C68A5]'}`}
              title="Cards View"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition ${viewMode === 'table' ? 'bg-white text-[#3C2A63] shadow-xs' : 'text-[#7C68A5]'}`}
              title="Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* SUBMISSIONS VIEW */}
      {activeSubTab === 'submissions' && (
        <>
          {/* Mobile Card List (visible on small screens or when cards mode selected) */}
          <div className={`${viewMode === 'table' ? 'hidden' : 'block md:hidden'} space-y-3`}>
            {filteredSubmissions.length === 0 ? (
              <div className="bg-white border border-purple-100 rounded-3xl p-8 text-center text-xs text-[#7C68A5] italic">
                No candidate submissions found matching your search.
              </div>
            ) : (
              filteredSubmissions.map((sub, idx) => (
                <div 
                  key={`${sub.submission_id || 'sub'}-${idx}`}
                  className="bg-white border border-purple-100/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-extrabold text-[#3C2A63] flex items-center gap-1.5">
                        <span>Candidate: {sub.sbd}</span>
                        <span className="text-xs font-mono font-bold text-[#6B51A5]">({sub.exam_code})</span>
                      </div>
                      <div className="text-[11px] font-mono text-[#7C68A5] truncate max-w-[200px]">
                        ID: {sub.submission_id}
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border shrink-0 ${
                      sub.writing_status === 'GRADED'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-amber-100 text-amber-800 border-amber-200'
                    }`}>
                      {sub.writing_status || 'PENDING'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-[#F8F6FC] p-2.5 rounded-xl border border-purple-100/60 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#7C68A5] block">Listening:</span>
                      <strong className="text-emerald-700 font-extrabold">
                        {sub.listening_score ?? sub.listening_raw_score ?? 0} / 40
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#7C68A5] block">Reading:</span>
                      <strong className="text-[#6B51A5] font-extrabold">
                        {sub.reading_score ?? sub.reading_raw_score ?? 0} / 40
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#7C68A5] pt-1 border-t border-purple-50">
                    <div className="flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-[#6B51A5] shrink-0" />
                      <span>{formatSubmissionTime(sub)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Table View (Desktop default, or mobile if table selected) */}
          <div className={`${viewMode === 'cards' ? 'hidden md:block' : 'block'} bg-white border border-purple-100/80 rounded-3xl overflow-hidden shadow-xl shadow-purple-950/5`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#3C2A63]">
                <thead className="bg-[#F8F6FC] border-b border-purple-100 text-[#503A7A] font-extrabold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Submission ID</th>
                    <th className="py-3.5 px-4">Candidate ID</th>
                    <th className="py-3.5 px-4">Exam Code</th>
                    <th className="py-3.5 px-4">Listening</th>
                    <th className="py-3.5 px-4">Reading</th>
                    <th className="py-3.5 px-4">Writing Status</th>
                    <th className="py-3.5 px-4">Submission Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-100/60">
                  {filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-[#7C68A5] italic">
                        No candidate submissions found.
                      </td>
                    </tr>
                  ) : (
                    filteredSubmissions.map((sub, idx) => (
                      <tr key={`${sub.submission_id || 'sub'}-row-${idx}`} className="hover:bg-[#F8F6FC] transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#6B51A5]">
                          {sub.submission_id}
                        </td>
                        <td className="py-3 px-4 font-bold text-[#3C2A63]">{sub.sbd}</td>
                        <td className="py-3 px-4 font-medium">{sub.exam_code}</td>
                        <td className="py-3 px-4 font-extrabold text-emerald-700">
                          {sub.listening_score ?? sub.listening_raw_score ?? 0} / 40
                        </td>
                        <td className="py-3 px-4 font-extrabold text-[#6B51A5]">
                          {sub.reading_score ?? sub.reading_raw_score ?? 0} / 40
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            sub.writing_status === 'GRADED'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border-amber-200'
                          }`}>
                            {sub.writing_status || 'PENDING_TEACHER'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#503A7A] font-semibold">
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-50 border border-purple-200/60 text-xs font-mono text-[#503A7A]">
                            <Clock className="w-3 h-3 text-[#6B51A5] shrink-0" />
                            <span>{formatSubmissionTime(sub)}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* CHEAT LOGS VIEW */}
      {activeSubTab === 'cheatlogs' && (
        <>
          {/* Mobile Cards for Alerts */}
          <div className="block md:hidden space-y-3">
            {filteredLogs.length === 0 ? (
              <div className="bg-white border border-purple-100 rounded-3xl p-8 text-center text-xs text-[#7C68A5] italic">
                No proctoring violations recorded.
              </div>
            ) : (
              filteredLogs.map((log, idx) => (
                <div 
                  key={`${log.log_id || 'log'}-${idx}`}
                  className="bg-white border border-rose-100 rounded-2xl p-4 shadow-sm space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-bold text-[#3C2A63]">
                        Candidate: {log.sbd} <span className="font-mono text-xs text-[#6B51A5]">({log.exam_code})</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#7C68A5]">{log.log_id}</span>
                    </div>

                    <div className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-rose-600" />
                      <span>{log.violation_type}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] font-mono text-[#503A7A] pt-1">
                    <Clock className="w-3.5 h-3.5 text-[#6B51A5]" />
                    <span>{formatSubmissionTime(log)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block bg-white border border-purple-100/80 rounded-3xl overflow-hidden shadow-xl shadow-purple-950/5">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#3C2A63]">
                <thead className="bg-[#F8F6FC] border-b border-purple-100 text-[#503A7A] font-extrabold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Log ID</th>
                    <th className="py-3.5 px-4">Candidate ID</th>
                    <th className="py-3.5 px-4">Exam Code</th>
                    <th className="py-3.5 px-4">Violation Type</th>
                    <th className="py-3.5 px-4">Recorded Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-100/60">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-[#7C68A5] italic">
                        No proctoring violations recorded.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log, idx) => (
                      <tr key={`${log.log_id || 'log'}-row-${idx}`} className="hover:bg-[#F8F6FC] transition-colors">
                        <td className="py-3 px-4 font-mono text-[#7C68A5]">{log.log_id}</td>
                        <td className="py-3 px-4 font-bold text-[#3C2A63]">{log.sbd}</td>
                        <td className="py-3 px-4 font-medium">{log.exam_code}</td>
                        <td className="py-3 px-4 font-bold text-rose-700 flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                          <span>{log.violation_type}</span>
                        </td>
                        <td className="py-3 px-4 text-[#503A7A] font-semibold">
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-50 border border-purple-200/60 text-xs font-mono text-[#503A7A]">
                            <Clock className="w-3 h-3 text-[#6B51A5] shrink-0" />
                            <span>{formatSubmissionTime(log)}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

    </div>
  );
};

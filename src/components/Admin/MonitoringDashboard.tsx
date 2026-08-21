import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, Users, FileText, CheckCircle2, Search, Filter, Clock } from 'lucide-react';
import { CheatLog, SubmissionRecord } from '../../types';
import { fetchSubmissions, fetchCheatLogs } from '../../services/api';
import { formatSubmissionTime } from '../../utils/dateFormatter';

interface MonitoringDashboardProps {
  apiUrl: string;
}

export const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({ apiUrl }) => {
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [cheatLogs, setCheatLogs] = useState<CheatLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubTab, setActiveTab] = useState<'submissions' | 'cheatlogs'>('submissions');

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch submissions
      const subRes = await fetchSubmissions(apiUrl);
      if (subRes.success && subRes.data) {
        setSubmissions(subRes.data);
      }

      // Fetch cheat logs
      const logRes = await fetchCheatLogs(apiUrl);
      if (logRes.success && logRes.data) {
        setCheatLogs(logRes.data);
      }
    } catch (err) {
      console.error('Error fetching admin monitoring data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Static fetch once on load or manual refresh
  useEffect(() => {
    loadData();
  }, [apiUrl]);

  const filteredSubmissions = submissions.filter(
    (s) =>
      s.sbd.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.exam_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.submission_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLogs = cheatLogs.filter(
    (l) =>
      l.sbd.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.exam_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.violation_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Top Header & Refresh Control */}
      <div className="bg-white border border-purple-100/80 rounded-3xl p-6 shadow-xl shadow-purple-950/5 flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur">
        <div>
          <h2 className="text-xl font-extrabold text-[#3C2A63] flex items-center gap-2">
            <Users className="w-6 h-6 text-[#6B51A5]" />
            <span>Bảng Giám Sát Thí Sinh & Nhật Ký Vi Phạm</span>
          </h2>
          <p className="text-xs text-[#7C68A5] font-medium mt-1">
            Dữ liệu fetch trực tiếp từ Google Apps Script backend REST API.
          </p>
        </div>

        {/* Manual Refresh Button */}
        <button
          onClick={loadData}
          disabled={loading}
          className="px-6 py-3 bg-[#6B51A5] hover:bg-[#583F8F] text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-purple-950/10 flex items-center space-x-2 transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Đang Tải Dữ Liệu...' : 'Làm Mới Dữ Liệu (Refresh)'}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Sub-tabs */}
        <div className="flex bg-[#E2DDEC] p-1.5 rounded-2xl space-x-1">
          <button
            onClick={() => setActiveTab('submissions')}
            className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'submissions'
                ? 'bg-[#6B51A5] text-white shadow-md'
                : 'text-[#3C2A63] hover:text-[#503A7A]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Bài Nộp ({submissions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('cheatlogs')}
            className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'cheatlogs'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-[#3C2A63] hover:text-[#503A7A]'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Log Gian Lận ({cheatLogs.length})</span>
          </button>
        </div>

        {/* Search Field */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#7C68A5] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo SBD, Mã Đề..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-purple-200/80 rounded-2xl text-xs text-[#3C2A63] font-medium placeholder-[#7C68A5] focus:outline-none focus:ring-2 focus:ring-[#6B51A5] transition-all shadow-sm"
          />
        </div>
      </div>

      {/* SUBMISSIONS TABLE */}
      {activeSubTab === 'submissions' && (
        <div className="bg-white border border-purple-100/80 rounded-3xl overflow-hidden shadow-xl shadow-purple-950/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#3C2A63]">
              <thead className="bg-[#F8F6FC] border-b border-purple-100 text-[#503A7A] font-extrabold uppercase tracking-wider">
                <tr>
                  <th className="py-4 px-5">Submission ID</th>
                  <th className="py-4 px-5">SBD</th>
                  <th className="py-4 px-5">Mã Đề</th>
                  <th className="py-4 px-5">Listening</th>
                  <th className="py-4 px-5">Reading</th>
                  <th className="py-4 px-5">Writing Status</th>
                  <th className="py-4 px-5">Thời Gian Nộp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100/60">
                {filteredSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-[#7C68A5] italic">
                      Chưa có dữ liệu bài nộp nào.
                    </td>
                  </tr>
                ) : (
                  filteredSubmissions.map((sub) => (
                    <tr key={sub.submission_id} className="hover:bg-[#F8F6FC] transition-colors">
                      <td className="py-3.5 px-5 font-mono font-bold text-[#6B51A5]">
                        {sub.submission_id}
                      </td>
                      <td className="py-3.5 px-5 font-bold text-[#3C2A63]">{sub.sbd}</td>
                      <td className="py-3.5 px-5 font-medium">{sub.exam_code}</td>
                      <td className="py-3.5 px-5 font-extrabold text-emerald-700">
                        {sub.listening_score ?? sub.listening_raw_score ?? 0} / 40
                      </td>
                      <td className="py-3.5 px-5 font-extrabold text-[#6B51A5]">
                        {sub.reading_score ?? sub.reading_raw_score ?? 0} / 40
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                          sub.writing_status === 'GRADED'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}>
                          {sub.writing_status || 'PENDING_TEACHER'}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-[#503A7A] font-semibold">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 border border-purple-200/60 text-xs font-mono text-[#503A7A]">
                          <Clock className="w-3.5 h-3.5 text-[#6B51A5] shrink-0" />
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
      )}

      {/* CHEAT LOGS TABLE */}
      {activeSubTab === 'cheatlogs' && (
        <div className="bg-white border border-purple-100/80 rounded-3xl overflow-hidden shadow-xl shadow-purple-950/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#3C2A63]">
              <thead className="bg-[#F8F6FC] border-b border-purple-100 text-[#503A7A] font-extrabold uppercase tracking-wider">
                <tr>
                  <th className="py-4 px-5">Log ID</th>
                  <th className="py-4 px-5">SBD</th>
                  <th className="py-4 px-5">Mã Đề</th>
                  <th className="py-4 px-5">Loại Vi Phạm (CheatLog)</th>
                  <th className="py-4 px-5">Thời Gian Ghi Nhận</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100/60">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-[#7C68A5] italic">
                      Không có vi phạm gian lận nào được ghi nhận.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.log_id} className="hover:bg-[#F8F6FC] transition-colors">
                      <td className="py-3.5 px-5 font-mono text-[#7C68A5]">{log.log_id}</td>
                      <td className="py-3.5 px-5 font-bold text-[#3C2A63]">{log.sbd}</td>
                      <td className="py-3.5 px-5 font-medium">{log.exam_code}</td>
                      <td className="py-3.5 px-5 font-bold text-rose-700 flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                        <span>{log.violation_type}</span>
                      </td>
                      <td className="py-3.5 px-5 text-[#503A7A] font-semibold">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 border border-purple-200/60 text-xs font-mono text-[#503A7A]">
                          <Clock className="w-3.5 h-3.5 text-[#6B51A5] shrink-0" />
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
      )}

    </div>
  );
};

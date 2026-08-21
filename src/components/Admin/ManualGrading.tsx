import React, { useState, useEffect } from 'react';
import { FileEdit, Copy, Check, Save, UserCheck, Send, Sparkles, Clock } from 'lucide-react';
import { SubmissionRecord, GradingForm } from '../../types';
import { fetchSubmissions, saveWritingScore } from '../../services/api';
import { formatSubmissionTime } from '../../utils/dateFormatter';

interface ManualGradingProps {
  apiUrl: string;
}

export const ManualGrading: React.FC<ManualGradingProps> = ({ apiUrl }) => {
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [selectedSub, setSelectedSub] = useState<SubmissionRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedZalo, setCopiedZalo] = useState(false);
  const [gradingForm, setGradingForm] = useState<GradingForm>({
    tr: 6.0,
    cc: 6.0,
    lr: 6.0,
    gra: 6.0,
    overall_writing: 6.0,
    feedback: ''
  });

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const res = await fetchSubmissions(apiUrl);
      if (res.success && res.data) {
        setSubmissions(res.data);
        // Default select first pending teacher record
        const pending = res.data.find((s) => s.writing_status === 'PENDING_TEACHER');
        if (pending) {
          setSelectedSub(pending);
        } else if (res.data.length > 0) {
          setSelectedSub(res.data[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, [apiUrl]);

  // Recalculate Overall Writing score (Average of 4 criteria rounded to nearest 0.5)
  useEffect(() => {
    const avg = (gradingForm.tr + gradingForm.cc + gradingForm.lr + gradingForm.gra) / 4;
    const rounded = Math.round(avg * 2) / 2;
    setGradingForm((prev) => ({ ...prev, overall_writing: rounded }));
  }, [gradingForm.tr, gradingForm.cc, gradingForm.lr, gradingForm.gra]);

  const handleSaveGrading = async () => {
    if (!selectedSub) return;
    setLoading(true);
    try {
      const res = await saveWritingScore(apiUrl, selectedSub.submission_id, gradingForm);
      if (res.success) {
        alert(`✅ Đã lưu điểm Writing cho bài nộp ${selectedSub.sbd} thành công!`);
        loadSubmissions();
      } else {
        alert(`❌ Lưu thất bại: ${res.message}`);
      }
    } catch (err) {
      console.error('Error saving score:', err);
    } finally {
      setLoading(false);
    }
  };

  // Format Zalo Copy Text according to teacher standards
  const generateZaloFormattedText = () => {
    if (!selectedSub) return '';

    return `
========================================
📝 KẾT QUẢ CHẤM BÀI WRITING IELTS - SBD: ${selectedSub.sbd}
========================================
📌 Thí sinh: ${selectedSub.sbd}
📌 Mã đề thi: ${selectedSub.exam_code}
📌 Mã bài nộp: ${selectedSub.submission_id}

🎧 Điểm Listening (Raw): ${selectedSub.listening_score} / 40
📖 Điểm Reading (Raw): ${selectedSub.reading_score} / 40

✍️ ĐIỂM CHI TIẾT WRITING 4 TIÊU CHÍ:
- Task Response (TR): ${gradingForm.tr}
- Coherence & Cohesion (CC): ${gradingForm.cc}
- Lexical Resource (LR): ${gradingForm.lr}
- Grammatical Range & Accuracy (GRA): ${gradingForm.gra}
=> ĐIỂM TỔNG WRITING OVERALL: ${gradingForm.overall_writing}

💬 NHẬN XÉT CỦA GIÁO VIÊN:
${gradingForm.feedback || 'Bài làm đạt yêu cầu, cần chú ý bổ sung từ vựng nâng cao và liên kết câu chặt chẽ hơn.'}
========================================
`.trim();
  };

  const handleCopyZalo = () => {
    const zaloText = generateZaloFormattedText();
    navigator.clipboard.writeText(zaloText);
    setCopiedZalo(true);
    setTimeout(() => {
      setCopiedZalo(false);
    }, 3000);
  };

  const pendingCount = submissions.filter((s) => s.writing_status === 'PENDING_TEACHER').length;

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="bg-white border border-purple-100/80 rounded-3xl p-6 shadow-xl shadow-purple-950/5 flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur">
        <div>
          <h2 className="text-xl font-extrabold text-[#3C2A63] flex items-center gap-2">
            <FileEdit className="w-6 h-6 text-[#6B51A5]" />
            <span>Công Cụ Chấm Điểm Bài Viết (Writing Manual Grading)</span>
          </h2>
          <p className="text-xs text-[#7C68A5] font-medium mt-1">
            Đang có <strong className="text-amber-800 font-bold">{pendingCount}</strong> bài nộp trạng thái <strong className="text-amber-800 font-bold">PENDING_TEACHER</strong>
          </p>
        </div>

        {/* Copy for Zalo Button */}
        {selectedSub && (
          <button
            onClick={handleCopyZalo}
            className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-emerald-950/10 flex items-center space-x-2 transition cursor-pointer"
          >
            {copiedZalo ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
            <span>{copiedZalo ? 'Đã Copy Định Dạng Zalo!' : 'Copy Xuất Kết Quả Qua Zalo'}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Sidebar: List of Submissions */}
        <div className="lg:col-span-4 bg-white border border-purple-100/80 rounded-3xl p-5 shadow-xl shadow-purple-950/5 space-y-3">
          <h3 className="text-xs font-extrabold text-[#3C2A63] uppercase tracking-wider px-1">
            Danh Sách Thí Sinh Nộp Bài ({submissions.length})
          </h3>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {submissions.map((sub) => {
              const isSelected = selectedSub?.submission_id === sub.submission_id;
              const isPending = sub.writing_status === 'PENDING_TEACHER';

              return (
                <div
                  key={sub.submission_id}
                  onClick={() => setSelectedSub(sub)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#6B51A5] border-[#6B51A5] text-white shadow-md'
                      : 'bg-[#F8F6FC] border-purple-100 text-[#3C2A63] hover:bg-[#E2DDEC]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="font-extrabold text-sm flex items-center gap-2">
                      <span>SBD: {sub.sbd}</span>
                      <span className={`text-[10px] font-mono ${isSelected ? 'text-purple-200' : 'text-[#7C68A5]'}`}>
                        ({sub.exam_code})
                      </span>
                    </div>
                    <div className={`text-[11px] font-medium ${isSelected ? 'text-purple-100' : 'text-[#7C68A5]'}`}>
                      Nghe: {sub.listening_score ?? sub.listening_raw_score ?? 0}/40 | Đọc: {sub.reading_score ?? sub.reading_raw_score ?? 0}/40
                    </div>
                    <div className={`text-[10px] font-mono flex items-center gap-1 ${isSelected ? 'text-purple-200' : 'text-[#9684B8]'}`}>
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>{formatSubmissionTime(sub)}</span>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                    isPending
                      ? isSelected
                        ? 'bg-amber-100 text-amber-900 border-amber-200'
                        : 'bg-amber-100 text-amber-800 border-amber-200'
                      : isSelected
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}>
                    {isPending ? 'PENDING' : 'GRADED'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Main Content: Student Essay Text & Grading Form */}
        <div className="lg:col-span-8 space-y-6">
          {selectedSub ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Student Essay Text Panel */}
              <div className="bg-white border border-purple-100/80 rounded-3xl p-5 shadow-xl shadow-purple-950/5 space-y-4">
                <div className="border-b border-purple-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <h4 className="text-xs font-extrabold text-[#6B51A5] uppercase tracking-wider">
                      Bài Làm Viết - Thí sinh: {selectedSub.sbd} ({selectedSub.exam_code})
                    </h4>
                    <div className="flex items-center gap-1 text-[11px] text-[#7C68A5] font-mono mt-0.5">
                      <Clock className="w-3 h-3 text-[#6B51A5]" />
                      <span>Nộp lúc: {formatSubmissionTime(selectedSub)}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#7C68A5] font-mono font-medium">{selectedSub.submission_id}</span>
                </div>

                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  <div>
                    <span className="text-xs font-extrabold text-[#3C2A63] block mb-1">Writing Task 1:</span>
                    <div className="p-3.5 bg-[#F8F6FC] border border-purple-100 rounded-2xl text-xs text-[#3C2A63] leading-relaxed font-mono whitespace-pre-wrap">
                      {selectedSub.writing_task1 || '(Thí sinh chưa nhập bài viết Task 1)'}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-extrabold text-[#3C2A63] block mb-1">Writing Task 2:</span>
                    <div className="p-3.5 bg-[#F8F6FC] border border-purple-100 rounded-2xl text-xs text-[#3C2A63] leading-relaxed font-mono whitespace-pre-wrap">
                      {selectedSub.writing_task2 || '(Thí sinh chưa nhập bài viết Task 2)'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 Criteria Form Panel */}
              <div className="bg-white border border-purple-100/80 rounded-3xl p-5 shadow-xl shadow-purple-950/5 space-y-4">
                <div className="border-b border-purple-100 pb-3 flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">
                    Chấm Điểm 4 Tiêu Chí
                  </h4>
                  <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
                    Overall: {gradingForm.overall_writing}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* TR */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-[#503A7A]">Task Response (TR)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="9"
                      value={gradingForm.tr}
                      onChange={(e) => setGradingForm({ ...gradingForm, tr: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2 bg-[#F8F6FC] border border-purple-200/80 rounded-xl text-xs font-bold text-[#3C2A63] focus:outline-none focus:ring-2 focus:ring-[#6B51A5]"
                    />
                  </div>

                  {/* CC */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-[#503A7A]">Coherence & Cohesion (CC)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="9"
                      value={gradingForm.cc}
                      onChange={(e) => setGradingForm({ ...gradingForm, cc: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2 bg-[#F8F6FC] border border-purple-200/80 rounded-xl text-xs font-bold text-[#3C2A63] focus:outline-none focus:ring-2 focus:ring-[#6B51A5]"
                    />
                  </div>

                  {/* LR */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-[#503A7A]">Lexical Resource (LR)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="9"
                      value={gradingForm.lr}
                      onChange={(e) => setGradingForm({ ...gradingForm, lr: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2 bg-[#F8F6FC] border border-purple-200/80 rounded-xl text-xs font-bold text-[#3C2A63] focus:outline-none focus:ring-2 focus:ring-[#6B51A5]"
                    />
                  </div>

                  {/* GRA */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-[#503A7A]">Grammar & Accuracy (GRA)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="9"
                      value={gradingForm.gra}
                      onChange={(e) => setGradingForm({ ...gradingForm, gra: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2 bg-[#F8F6FC] border border-purple-200/80 rounded-xl text-xs font-bold text-[#3C2A63] focus:outline-none focus:ring-2 focus:ring-[#6B51A5]"
                    />
                  </div>
                </div>

                {/* Feedback */}
                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold text-[#503A7A]">Nhận Xét / Feedback Cho Thí Sinh:</label>
                  <textarea
                    rows={4}
                    value={gradingForm.feedback}
                    onChange={(e) => setGradingForm({ ...gradingForm, feedback: e.target.value })}
                    placeholder="Viết nhận xét ưu khuyết điểm của bài làm..."
                    className="w-full p-3.5 bg-[#F8F6FC] border border-purple-200/80 rounded-2xl text-xs text-[#3C2A63] font-medium placeholder-[#7C68A5] focus:outline-none focus:ring-2 focus:ring-[#6B51A5]"
                  />
                </div>

                {/* Save Score Button */}
                <button
                  type="button"
                  onClick={handleSaveGrading}
                  disabled={loading}
                  className="w-full py-3.5 bg-[#6B51A5] hover:bg-[#583F8F] text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-purple-950/10 flex items-center justify-center space-x-2 transition cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{loading ? 'Đang Lưu Bảng Điểm...' : 'Lưu Kết Quả Chấm Writing'}</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="p-8 text-center bg-white border border-purple-100/80 rounded-3xl text-[#7C68A5] italic">
              Vui lòng chọn một thí sinh từ danh sách bên trái để chấm điểm bài viết.
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

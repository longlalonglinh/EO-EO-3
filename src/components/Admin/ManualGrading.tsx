import React, { useState, useEffect } from 'react';
import { FileEdit, Copy, Check, Save, UserCheck, Send, Sparkles, Clock, ArrowLeft, ChevronRight, ListFilter } from 'lucide-react';
import { SubmissionRecord, GradingForm } from '../../types';
import { fetchSubmissions, saveWritingScore, deduplicateSubmissions, DEFAULT_API_URL } from '../../services/api';
import { formatSubmissionTime } from '../../utils/dateFormatter';

interface ManualGradingProps {
  apiUrl?: string;
  gasUrl?: string;
}

export const ManualGrading: React.FC<ManualGradingProps> = ({ apiUrl, gasUrl }) => {
  const effectiveApiUrl = apiUrl || gasUrl || DEFAULT_API_URL;
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [selectedSub, setSelectedSub] = useState<SubmissionRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedZalo, setCopiedZalo] = useState(false);
  const [mobileTab, setMobileTab] = useState<'list' | 'grading'>('list');
  const [filterPendingOnly, setFilterPendingOnly] = useState(false);
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
      const res = await fetchSubmissions(effectiveApiUrl);
      if (res.success && res.data) {
        const clean = deduplicateSubmissions(res.data);
        setSubmissions(clean);
        // Default select first pending teacher record
        const pending = clean.find((s) => s.writing_status === 'PENDING_TEACHER');
        if (pending) {
          setSelectedSub(pending);
        } else if (clean.length > 0) {
          setSelectedSub(clean[0]);
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
  }, [effectiveApiUrl]);

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
      const res = await saveWritingScore(effectiveApiUrl, selectedSub.submission_id, gradingForm);
      if (res.success) {
        alert(`✅ Writing score for candidate ${selectedSub.sbd} saved successfully!`);
        loadSubmissions();
      } else {
        alert(`❌ Failed to save score: ${res.message}`);
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
📝 IELTS WRITING ASSESSMENT REPORT - ID: ${selectedSub.sbd}
========================================
📌 Candidate: ${selectedSub.sbd}
📌 Exam Code: ${selectedSub.exam_code}
📌 Submission ID: ${selectedSub.submission_id}

🎧 Listening Score (Raw): ${selectedSub.listening_score} / 40
📖 Reading Score (Raw): ${selectedSub.reading_score} / 40

✍️ DETAILED WRITING 4-CRITERIA SCORES:
- Task Response (TR): ${gradingForm.tr}
- Coherence & Cohesion (CC): ${gradingForm.cc}
- Lexical Resource (LR): ${gradingForm.lr}
- Grammatical Range & Accuracy (GRA): ${gradingForm.gra}
=> OVERALL WRITING BAND SCORE: ${gradingForm.overall_writing}

💬 INSTRUCTOR FEEDBACK:
${gradingForm.feedback || 'The essay meets task requirements. Focus on incorporating higher-level lexical items and refining paragraph cohesion.'}
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
  const filteredSubmissions = filterPendingOnly
    ? submissions.filter((s) => s.writing_status === 'PENDING_TEACHER')
    : submissions;

  const handleSelectCandidate = (sub: SubmissionRecord) => {
    setSelectedSub(sub);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setMobileTab('grading');
    }
  };

  const criteriaPresets = [5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0];

  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* Top Header */}
      <div className="bg-white border border-purple-100/80 rounded-3xl p-4 sm:p-6 shadow-xl shadow-purple-950/5 flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#3C2A63] flex items-center gap-2">
            <FileEdit className="w-5 h-5 sm:w-6 sm:h-6 text-[#6B51A5] shrink-0" />
            <span>Manual Writing Assessment &amp; Grading Desk</span>
          </h2>
          <p className="text-xs text-[#7C68A5] font-medium mt-1">
            Currently <strong className="text-amber-800 font-bold">{pendingCount}</strong> submissions with status <strong className="text-amber-800 font-bold">PENDING_TEACHER</strong>
          </p>
        </div>

        {/* Copy for Zalo Button */}
        {selectedSub && (
          <button
            onClick={handleCopyZalo}
            className="w-full md:w-auto px-5 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-emerald-950/10 flex items-center justify-center space-x-2 transition cursor-pointer"
          >
            {copiedZalo ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
            <span>{copiedZalo ? 'Report Copied to Clipboard!' : 'Export Student Report (Zalo/Message)'}</span>
          </button>
        )}
      </div>

      {/* Mobile Tab Switcher (< lg) */}
      <div className="lg:hidden flex items-center bg-[#E2DDEC] p-1.5 rounded-2xl">
        <button
          type="button"
          onClick={() => setMobileTab('list')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === 'list'
              ? 'bg-[#6B51A5] text-white shadow-md'
              : 'text-[#3C2A63] hover:text-[#503A7A]'
          }`}
        >
          <ListFilter className="w-4 h-4" />
          <span>Submissions ({filteredSubmissions.length})</span>
          {pendingCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-200 text-amber-900 font-extrabold">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('grading')}
          disabled={!selectedSub}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === 'grading'
              ? 'bg-[#6B51A5] text-white shadow-md'
              : 'text-[#3C2A63] hover:text-[#503A7A] disabled:opacity-40'
          }`}
        >
          <FileEdit className="w-4 h-4" />
          <span>Grade {selectedSub ? `(${selectedSub.sbd})` : 'Essay'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Sidebar: List of Submissions */}
        <div className={`lg:col-span-4 bg-white border border-purple-100/80 rounded-3xl p-4 sm:p-5 shadow-xl shadow-purple-950/5 space-y-3 ${
          mobileTab === 'grading' ? 'hidden lg:block' : 'block'
        }`}>
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-extrabold text-[#3C2A63] uppercase tracking-wider">
              Candidate Submissions ({submissions.length})
            </h3>
            <button
              type="button"
              onClick={() => setFilterPendingOnly(!filterPendingOnly)}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition ${
                filterPendingOnly
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-purple-50 text-[#6B51A5] border-purple-200'
              }`}
            >
              {filterPendingOnly ? 'Pending Only' : 'Show All'}
            </button>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredSubmissions.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#7C68A5] italic">
                No submissions found.
              </div>
            ) : (
              filteredSubmissions.map((sub, idx) => {
                const isSelected = selectedSub?.submission_id === sub.submission_id;
                const isPending = sub.writing_status === 'PENDING_TEACHER';

                return (
                  <div
                    key={`${sub.submission_id || 'sub'}-${idx}`}
                    onClick={() => handleSelectCandidate(sub)}
                    className={`p-3.5 sm:p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#6B51A5] border-[#6B51A5] text-white shadow-md'
                        : 'bg-[#F8F6FC] border-purple-100 text-[#3C2A63] hover:bg-[#E2DDEC]'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="font-extrabold text-sm flex items-center gap-2">
                        <span>Candidate: {sub.sbd}</span>
                        <span className={`text-[10px] font-mono ${isSelected ? 'text-purple-200' : 'text-[#7C68A5]'}`}>
                          ({sub.exam_code})
                        </span>
                      </div>
                      <div className={`text-[11px] font-medium ${isSelected ? 'text-purple-100' : 'text-[#7C68A5]'}`}>
                        Listening: {sub.listening_score ?? sub.listening_raw_score ?? 0}/40 | Reading: {sub.reading_score ?? sub.reading_raw_score ?? 0}/40
                      </div>
                      <div className={`text-[10px] font-mono flex items-center gap-1 ${isSelected ? 'text-purple-200' : 'text-[#9684B8]'}`}>
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>{formatSubmissionTime(sub)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
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
                      <ChevronRight className={`w-4 h-4 lg:hidden ${isSelected ? 'text-white' : 'text-[#7C68A5]'}`} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Main Content: Student Essay Text & Grading Form */}
        <div className={`lg:col-span-8 space-y-4 sm:space-y-6 ${
          mobileTab === 'list' ? 'hidden lg:block' : 'block'
        }`}>
          {selectedSub ? (
            <div className="space-y-4 sm:space-y-6">
              
              {/* Back to list button on mobile */}
              <div className="lg:hidden flex items-center justify-between bg-white border border-purple-100 rounded-2xl p-3 shadow-xs">
                <button
                  type="button"
                  onClick={() => setMobileTab('list')}
                  className="text-xs font-extrabold text-[#6B51A5] flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Candidate List</span>
                </button>
                <span className="text-xs font-mono text-[#7C68A5]">
                  {selectedSub.sbd} - {selectedSub.exam_code}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                
                {/* Student Essay Text Panel */}
                <div className="bg-white border border-purple-100/80 rounded-3xl p-4 sm:p-5 shadow-xl shadow-purple-950/5 space-y-4">
                  <div className="border-b border-purple-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <h4 className="text-xs font-extrabold text-[#6B51A5] uppercase tracking-wider">
                        Writing Submission - Candidate: {selectedSub.sbd} ({selectedSub.exam_code})
                      </h4>
                      <div className="flex items-center gap-1 text-[11px] text-[#7C68A5] font-mono mt-0.5">
                        <Clock className="w-3 h-3 text-[#6B51A5]" />
                        <span>Submitted at: {formatSubmissionTime(selectedSub)}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-[#7C68A5] font-mono font-medium truncate max-w-[150px]">{selectedSub.submission_id}</span>
                  </div>

                  <div className="space-y-4 max-h-[450px] sm:max-h-[500px] overflow-y-auto pr-1 sm:pr-2">
                    <div>
                      <span className="text-xs font-extrabold text-[#3C2A63] block mb-1">Writing Task 1 Response:</span>
                      <div className="p-3.5 bg-[#F8F6FC] border border-purple-100 rounded-2xl text-xs text-[#3C2A63] leading-relaxed font-mono whitespace-pre-wrap">
                        {selectedSub.writing_task1 || '(Candidate did not provide a Task 1 response)'}
                      </div>
                    </div>

                    <div>
                      <span className="text-xs font-extrabold text-[#3C2A63] block mb-1">Writing Task 2 Response:</span>
                      <div className="p-3.5 bg-[#F8F6FC] border border-purple-100 rounded-2xl text-xs text-[#3C2A63] leading-relaxed font-mono whitespace-pre-wrap">
                        {selectedSub.writing_task2 || '(Candidate did not provide a Task 2 response)'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4 Criteria Form Panel */}
                <div className="bg-white border border-purple-100/80 rounded-3xl p-4 sm:p-5 shadow-xl shadow-purple-950/5 space-y-4">
                  <div className="border-b border-purple-100 pb-3 flex items-center justify-between">
                    <h4 className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">
                      4-Criteria Band Scoring
                    </h4>
                    <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
                      Overall: {gradingForm.overall_writing}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* TR */}
                    <div className="space-y-1 bg-[#F8F6FC] p-2.5 rounded-2xl border border-purple-100">
                      <div className="flex justify-between items-center">
                        <label className="text-[11px] font-extrabold text-[#503A7A]">Task Response (TR)</label>
                        <span className="text-xs font-black text-[#6B51A5]">{gradingForm.tr}</span>
                      </div>
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        max="9"
                        value={gradingForm.tr}
                        onChange={(e) => setGradingForm({ ...gradingForm, tr: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-1.5 bg-white border border-purple-200/80 rounded-xl text-xs font-bold text-[#3C2A63] focus:outline-none focus:ring-2 focus:ring-[#6B51A5]"
                      />
                      <div className="flex flex-wrap gap-1 pt-1">
                        {criteriaPresets.map((sc) => (
                          <button
                            key={sc}
                            type="button"
                            onClick={() => setGradingForm(p => ({ ...p, tr: sc }))}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                              gradingForm.tr === sc ? 'bg-[#6B51A5] text-white' : 'bg-white text-[#503A7A] border border-purple-200'
                            }`}
                          >
                            {sc}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* CC */}
                    <div className="space-y-1 bg-[#F8F6FC] p-2.5 rounded-2xl border border-purple-100">
                      <div className="flex justify-between items-center">
                        <label className="text-[11px] font-extrabold text-[#503A7A]">Coherence &amp; Cohesion (CC)</label>
                        <span className="text-xs font-black text-[#6B51A5]">{gradingForm.cc}</span>
                      </div>
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        max="9"
                        value={gradingForm.cc}
                        onChange={(e) => setGradingForm({ ...gradingForm, cc: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-1.5 bg-white border border-purple-200/80 rounded-xl text-xs font-bold text-[#3C2A63] focus:outline-none focus:ring-2 focus:ring-[#6B51A5]"
                      />
                      <div className="flex flex-wrap gap-1 pt-1">
                        {criteriaPresets.map((sc) => (
                          <button
                            key={sc}
                            type="button"
                            onClick={() => setGradingForm(p => ({ ...p, cc: sc }))}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                              gradingForm.cc === sc ? 'bg-[#6B51A5] text-white' : 'bg-white text-[#503A7A] border border-purple-200'
                            }`}
                          >
                            {sc}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* LR */}
                    <div className="space-y-1 bg-[#F8F6FC] p-2.5 rounded-2xl border border-purple-100">
                      <div className="flex justify-between items-center">
                        <label className="text-[11px] font-extrabold text-[#503A7A]">Lexical Resource (LR)</label>
                        <span className="text-xs font-black text-[#6B51A5]">{gradingForm.lr}</span>
                      </div>
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        max="9"
                        value={gradingForm.lr}
                        onChange={(e) => setGradingForm({ ...gradingForm, lr: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-1.5 bg-white border border-purple-200/80 rounded-xl text-xs font-bold text-[#3C2A63] focus:outline-none focus:ring-2 focus:ring-[#6B51A5]"
                      />
                      <div className="flex flex-wrap gap-1 pt-1">
                        {criteriaPresets.map((sc) => (
                          <button
                            key={sc}
                            type="button"
                            onClick={() => setGradingForm(p => ({ ...p, lr: sc }))}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                              gradingForm.lr === sc ? 'bg-[#6B51A5] text-white' : 'bg-white text-[#503A7A] border border-purple-200'
                            }`}
                          >
                            {sc}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* GRA */}
                    <div className="space-y-1 bg-[#F8F6FC] p-2.5 rounded-2xl border border-purple-100">
                      <div className="flex justify-between items-center">
                        <label className="text-[11px] font-extrabold text-[#503A7A]">Grammar &amp; Accuracy (GRA)</label>
                        <span className="text-xs font-black text-[#6B51A5]">{gradingForm.gra}</span>
                      </div>
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        max="9"
                        value={gradingForm.gra}
                        onChange={(e) => setGradingForm({ ...gradingForm, gra: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-1.5 bg-white border border-purple-200/80 rounded-xl text-xs font-bold text-[#3C2A63] focus:outline-none focus:ring-2 focus:ring-[#6B51A5]"
                      />
                      <div className="flex flex-wrap gap-1 pt-1">
                        {criteriaPresets.map((sc) => (
                          <button
                            key={sc}
                            type="button"
                            onClick={() => setGradingForm(p => ({ ...p, gra: sc }))}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                              gradingForm.gra === sc ? 'bg-[#6B51A5] text-white' : 'bg-white text-[#503A7A] border border-purple-200'
                            }`}
                          >
                            {sc}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Feedback */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-[#503A7A]">Teacher Comments &amp; Feedback:</label>
                    <textarea
                      rows={4}
                      value={gradingForm.feedback}
                      onChange={(e) => setGradingForm({ ...gradingForm, feedback: e.target.value })}
                      placeholder="Provide constructive feedback, strengths, and areas for improvement..."
                      className="w-full p-3.5 bg-[#F8F6FC] border border-purple-200/80 rounded-2xl text-xs sm:text-sm text-[#3C2A63] font-medium placeholder-[#7C68A5] focus:outline-none focus:ring-2 focus:ring-[#6B51A5]"
                    />
                  </div>

                  {/* Save Score Button */}
                  <button
                    type="button"
                    onClick={handleSaveGrading}
                    disabled={loading}
                    className="w-full py-3.5 bg-[#6B51A5] hover:bg-[#583F8F] text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-purple-950/10 flex items-center justify-center space-x-2 transition cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{loading ? 'Saving Grade...' : 'Save Writing Grade & Comments'}</span>
                  </button>
                </div>

              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-white border border-purple-100/80 rounded-3xl text-[#7C68A5] italic">
              Please select a candidate submission from the list on the left to grade their essay.
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

import React, { useState } from 'react';
import { ExamData } from '../../types';
import { 
  Eye, 
  Edit3, 
  Code, 
  Save, 
  Headphones, 
  BookOpen, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Copy, 
  Download, 
  Sparkles,
  Layers,
  Clock,
  Music,
  Check,
  RotateCcw
} from 'lucide-react';
import { DEFAULT_EXAMS } from '../../data/defaultExams';

interface PreviewModuleProps {
  initialExamData?: ExamData;
  onSaveToGas?: (examData: ExamData) => void;
  gasUrl?: string;
}

export const PreviewModule: React.FC<PreviewModuleProps> = ({
  initialExamData,
  onSaveToGas,
  gasUrl
}) => {
  const currentInitial = initialExamData || (DEFAULT_EXAMS[0] as unknown as ExamData);
  const [exam, setExam] = useState<ExamData>(currentInitial);
  const [rawJson, setRawJson] = useState<string>(JSON.stringify(currentInitial, null, 2));
  const [activeTab, setActiveTab] = useState<'overview' | 'json'>('overview');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [copied, setCopied] = useState(false);

  // Sync state
  const updateExamData = (updated: ExamData) => {
    setExam(updated);
    setRawJson(JSON.stringify(updated, null, 2));
    setJsonError(null);
  };

  const handleJsonChange = (text: string) => {
    setRawJson(text);
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object') {
        setExam(parsed);
        setJsonError(null);
      }
    } catch (e: any) {
      setJsonError('Invalid JSON syntax: ' + e.message);
    }
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(rawJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([rawJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exam.exam_code || 'IELTS_EXAM'}_data.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetToDefault = () => {
    updateExamData(DEFAULT_EXAMS[0] as unknown as ExamData);
  };

  const handleFieldChange = (field: keyof ExamData, value: any) => {
    updateExamData({
      ...exam,
      [field]: value
    });
  };

  const handleSave = async () => {
    if (onSaveToGas) {
      onSaveToGas(exam);
    }
    setSaveStatus('saving');
    try {
      if (gasUrl && !gasUrl.includes('AKfycbx_mock')) {
        await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'upload_exam',
            exam_data: exam
          })
        });
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const totalListeningQuestions = exam.listening_questions?.length || 0;
  const totalReadingQuestions = exam.reading_questions?.length || 0;
  const totalPassages = exam.passages?.length || (exam.passage_text ? 1 : 0);

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="bg-white border border-purple-100/80 rounded-3xl p-6 shadow-xl shadow-purple-950/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-[#3C2A63] flex items-center gap-2">
            <Eye className="w-5 h-5 text-[#6B51A5]" />
            Exam Structure Review &amp; Configuration
          </h2>
          <p className="text-xs text-[#7C68A5] font-medium mt-1">
            Review specifications, parameters, and directly edit JSON schema source code.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-[#E2DDEC] p-1 rounded-2xl flex items-center">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-[#6B51A5] text-white shadow-md'
                  : 'text-[#3C2A63] hover:text-[#503A7A]'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Overview &amp; Config</span>
            </button>
            <button
              onClick={() => setActiveTab('json')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'json'
                  ? 'bg-[#6B51A5] text-white shadow-md'
                  : 'text-[#3C2A63] hover:text-[#503A7A]'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>JSON Schema</span>
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-emerald-950/10 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saveStatus === 'saving' ? 'Saving...' : 'Save Exam Config'}</span>
          </button>
        </div>
      </div>

      {saveStatus === 'saved' && (
        <div className="p-3.5 bg-emerald-100 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-extrabold flex items-center gap-2 animate-fade-in">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-700" />
          <span>Exam configuration saved successfully into the system!</span>
        </div>
      )}

      {/* Metrics Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-purple-100 rounded-3xl p-4 shadow-sm">
          <div className="flex items-center space-x-2 text-[#6B51A5] mb-1">
            <Headphones className="w-4 h-4" />
            <span className="text-xs font-bold text-[#7C68A5]">Listening</span>
          </div>
          <p className="text-xl font-black text-[#3C2A63]">{totalListeningQuestions} <span className="text-xs font-normal text-[#7C68A5]">questions (4 Parts)</span></p>
        </div>

        <div className="bg-white border border-purple-100 rounded-3xl p-4 shadow-sm">
          <div className="flex items-center space-x-2 text-[#6B51A5] mb-1">
            <BookOpen className="w-4 h-4" />
            <span className="text-xs font-bold text-[#7C68A5]">Reading</span>
          </div>
          <p className="text-xl font-black text-[#3C2A63]">{totalReadingQuestions} <span className="text-xs font-normal text-[#7C68A5]">questions ({totalPassages} Passages)</span></p>
        </div>

        <div className="bg-white border border-purple-100 rounded-3xl p-4 shadow-sm">
          <div className="flex items-center space-x-2 text-[#6B51A5] mb-1">
            <FileText className="w-4 h-4" />
            <span className="text-xs font-bold text-[#7C68A5]">Writing</span>
          </div>
          <p className="text-xl font-black text-[#3C2A63]">2 <span className="text-xs font-normal text-[#7C68A5]">Tasks (Task 1 &amp; 2)</span></p>
        </div>

        <div className="bg-white border border-purple-100 rounded-3xl p-4 shadow-sm">
          <div className="flex items-center space-x-2 text-[#6B51A5] mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-bold text-[#7C68A5]">Duration</span>
          </div>
          <p className="text-xl font-black text-[#3C2A63]">{exam.duration_mins || 150} <span className="text-xs font-normal text-[#7C68A5]">Minutes</span></p>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'overview' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Column: General Configuration */}
          <div className="bg-white border border-purple-100/80 rounded-3xl p-6 shadow-xl shadow-purple-950/5 space-y-5">
            <h3 className="text-xs font-extrabold text-[#6B51A5] uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4" />
              1. General Examination Information &amp; Settings
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[#503A7A] font-extrabold mb-1">Exam Code</label>
                <input
                  type="text"
                  value={exam.exam_code}
                  onChange={(e) => handleFieldChange('exam_code', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F8F6FC] border border-purple-200/80 rounded-xl text-[#3C2A63] font-bold focus:outline-none focus:ring-2 focus:ring-[#6B51A5]"
                />
              </div>

              <div>
                <label className="block text-[#503A7A] font-extrabold mb-1">Testing Mode</label>
                <select
                  value={exam.test_type || 'TEST'}
                  onChange={(e) => handleFieldChange('test_type', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F8F6FC] border border-purple-200/80 rounded-xl text-[#3C2A63] font-bold focus:outline-none focus:ring-2 focus:ring-[#6B51A5]"
                >
                  <option value="TEST">TEST (Formal Test Mode)</option>
                  <option value="PRACTICE">PRACTICE (Self-Paced Practice Mode)</option>
                </select>
              </div>
            </div>

            <div className="text-xs">
              <label className="block text-[#503A7A] font-extrabold mb-1">Exam Title</label>
              <input
                type="text"
                value={exam.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F8F6FC] border border-purple-200/80 rounded-xl text-[#3C2A63] font-bold focus:outline-none focus:ring-2 focus:ring-[#6B51A5]"
              />
            </div>

            <div className="text-xs">
              <label className="block text-[#503A7A] font-extrabold mb-1 flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-emerald-700" />
                Listening Audio Stream URL (.mp3 format)
              </label>
              <input
                type="text"
                value={exam.audio_url || ''}
                onChange={(e) => handleFieldChange('audio_url', e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 bg-[#F8F6FC] border border-purple-200/80 rounded-xl text-[#3C2A63] font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            {/* Audio Stream Player Preview */}
            {exam.audio_url && (
              <div className="p-3.5 bg-[#F8F6FC] border border-purple-100 rounded-2xl space-y-1.5">
                <span className="text-[11px] font-bold text-[#503A7A]">Audio Stream Stream Verification:</span>
                <audio controls className="w-full h-8 rounded">
                  <source src={exam.audio_url} type="audio/mpeg" />
                  Your browser does not support audio playback.
                </audio>
              </div>
            )}
          </div>

          {/* Right Column: Writing Prompts & Passages Summary */}
          <div className="bg-white border border-purple-100/80 rounded-3xl p-6 shadow-xl shadow-purple-950/5 space-y-5">
            <h3 className="text-xs font-extrabold text-[#6B51A5] uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4" />
              2. Writing Section Prompts (Tasks 1 &amp; 2)
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[#503A7A] font-extrabold mb-1">Writing Task 1 Prompt (Report / Letter / Diagram)</label>
                <textarea
                  value={exam.writing_task1_prompt || ''}
                  onChange={(e) => handleFieldChange('writing_task1_prompt', e.target.value)}
                  rows={3}
                  className="w-full p-3.5 bg-[#F8F6FC] border border-purple-200/80 rounded-2xl text-[#3C2A63] font-medium focus:outline-none focus:ring-2 focus:ring-[#6B51A5]"
                />
              </div>

              <div>
                <label className="block text-[#503A7A] font-extrabold mb-1">Writing Task 2 Prompt (Discursive Essay)</label>
                <textarea
                  value={exam.writing_task2_prompt || ''}
                  onChange={(e) => handleFieldChange('writing_task2_prompt', e.target.value)}
                  rows={4}
                  className="w-full p-3.5 bg-[#F8F6FC] border border-purple-200/80 rounded-2xl text-[#3C2A63] font-medium focus:outline-none focus:ring-2 focus:ring-[#6B51A5]"
                />
              </div>
            </div>
          </div>

        </div>
      ) : (
        /* Direct JSON Schema Editor */
        <div className="bg-white border border-purple-100/80 rounded-3xl p-6 shadow-xl shadow-purple-950/5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-purple-100 pb-3">
            <div>
              <h3 className="text-xs font-extrabold text-[#6B51A5] uppercase tracking-wider flex items-center gap-2">
                <Code className="w-4 h-4" />
                <span>Full Examination JSON Schema (Direct Editor)</span>
              </h3>
              <p className="text-[11px] text-[#7C68A5] mt-0.5">
                Directly edit exam structure, add or modify questions, or export schema format.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyJson}
                className="px-3.5 py-1.5 bg-[#F8F6FC] hover:bg-[#E2DDEC] text-[#3C2A63] border border-purple-200 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
              </button>

              <button
                onClick={handleDownloadJson}
                className="px-3.5 py-1.5 bg-[#F8F6FC] hover:bg-[#E2DDEC] text-[#3C2A63] border border-purple-200 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .json</span>
              </button>

              <button
                onClick={handleResetToDefault}
                className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer"
                title="Reset to standard 40-question template"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Default</span>
              </button>
            </div>
          </div>

          {jsonError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{jsonError}</span>
            </div>
          )}

          <div className="relative">
            <textarea
              value={rawJson}
              onChange={(e) => handleJsonChange(e.target.value)}
              rows={26}
              className="w-full p-4 bg-[#1e1b2e] text-[#f1f0f7] font-mono text-xs rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#6B51A5] leading-relaxed select-all"
            />
          </div>
        </div>
      )}

    </div>
  );
};

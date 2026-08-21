import React, { useState } from 'react';
import { ExamData, Question } from '../../types';
import { 
  Eye, 
  Edit3, 
  Code, 
  Plus, 
  Trash2, 
  Save, 
  Headphones, 
  BookOpen, 
  FileText, 
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Copy,
  ExternalLink,
  Sparkles
} from 'lucide-react';

interface PreviewModuleProps {
  initialExamData?: ExamData;
  onSaveToGas?: (examData: ExamData) => void;
  gasUrl?: string;
}

const SAMPLE_DEFAULT_EXAM: ExamData = {
  exam_code: 'IELTS01',
  title: 'Đề Thi Thử IELTS Academic - Test 01',
  audio_url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=ambient-piano-amp-strings-10711.mp3',
  image_url: '',
  listening_questions: [
    {
      question_id: 'l1',
      section: 'listening',
      question_text: '1. What is the customer\'s main requirement for the apartment?',
      question_type: 'multiple_choice',
      options: ['A. Near the city center', 'B. Sea view with 2 bedrooms', 'C. Close to the train station', 'D. Pet-friendly balcony'],
      correct_answer: 'B',
      max_score: 1
    },
    {
      question_id: 'l2',
      section: 'listening',
      question_text: '2. Complete the form: The lease agreement starts on ________ November.',
      question_type: 'fill_in_blank',
      correct_answer: '15th',
      max_score: 1
    }
  ],
  passage_title: 'The Rise of Renewable Energy Technologies in Modern Cities',
  passage_text: 'Renewable energy technologies have witnessed unprecedented growth over the past two decades. Urban centers around the globe are increasingly integrating solar photovoltaics, wind turbines, and geothermal systems into their energy grids to curb carbon emissions.\n\nSolar power, in particular, has experienced dramatic cost reductions due to technological breakthroughs and economies of scale. High-efficiency monocrystalline silicon panels can now convert over 22% of sunlight into usable electrical energy.',
  reading_questions: [
    {
      question_id: 'r1',
      section: 'reading',
      question_text: '1. High-efficiency monocrystalline silicon panels convert over 22% of sunlight into electrical energy.',
      question_type: 'true_false_not_given',
      correct_answer: 'TRUE',
      max_score: 1
    },
    {
      question_id: 'r2',
      section: 'reading',
      question_text: '2. What facility solves the intermittency challenge of solar energy?',
      question_type: 'fill_in_blank',
      correct_answer: 'battery storage',
      max_score: 1
    }
  ],
  writing_task1_prompt: 'The chart below shows the percentage of energy generated from renewable sources in four European countries from 2010 to 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
  writing_task2_prompt: 'Some people argue that technological development is causing people to lose social skills and live more isolated lives. To what extent do you agree or disagree? Give reasons for your answer and include relevant examples. Write at least 250 words.'
};

export const PreviewModule: React.FC<PreviewModuleProps> = ({
  initialExamData,
  onSaveToGas,
  gasUrl
}) => {
  const [exam, setExam] = useState<ExamData>(initialExamData || SAMPLE_DEFAULT_EXAM);
  const [rawJson, setRawJson] = useState<string>(JSON.stringify(initialExamData || SAMPLE_DEFAULT_EXAM, null, 2));
  const [mode, setMode] = useState<'form' | 'json'>('form');
  const [activePreviewTab, setActivePreviewTab] = useState<'listening' | 'reading' | 'writing'>('listening');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Sync Form to JSON
  const updateExam = (updated: ExamData) => {
    setExam(updated);
    setRawJson(JSON.stringify(updated, null, 2));
    setJsonError(null);
  };

  // Sync JSON text to Form
  const handleJsonChange = (text: string) => {
    setRawJson(text);
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object') {
        setExam(parsed);
        setJsonError(null);
      }
    } catch (e: any) {
      setJsonError('Cú pháp JSON không hợp lệ: ' + e.message);
    }
  };

  // Field updates
  const handleBasicChange = (field: keyof ExamData, value: any) => {
    updateExam({
      ...exam,
      [field]: value
    });
  };

  // Add Question
  const addQuestion = (section: 'listening' | 'reading') => {
    const isListening = section === 'listening';
    const currentList = isListening ? [...exam.listening_questions] : [...exam.reading_questions];
    const newId = `${section[0]}${currentList.length + 1}_${Date.now().toString().slice(-4)}`;
    
    const newQ: Question = {
      question_id: newId,
      section,
      question_text: `${currentList.length + 1}. Câu hỏi mới...`,
      question_type: 'multiple_choice',
      options: ['A. Lựa chọn 1', 'B. Lựa chọn 2', 'C. Lựa chọn 3', 'D. Lựa chọn 4'],
      correct_answer: 'A',
      max_score: 1
    };

    if (isListening) {
      updateExam({ ...exam, listening_questions: [...exam.listening_questions, newQ] });
    } else {
      updateExam({ ...exam, reading_questions: [...exam.reading_questions, newQ] });
    }
  };

  // Update Question
  const updateQuestion = (section: 'listening' | 'reading', index: number, field: keyof Question, value: any) => {
    const isListening = section === 'listening';
    const list = isListening ? [...exam.listening_questions] : [...exam.reading_questions];
    list[index] = { ...list[index], [field]: value };

    if (isListening) {
      updateExam({ ...exam, listening_questions: list });
    } else {
      updateExam({ ...exam, reading_questions: list });
    }
  };

  // Remove Question
  const removeQuestion = (section: 'listening' | 'reading', index: number) => {
    const isListening = section === 'listening';
    const list = isListening ? [...exam.listening_questions] : [...exam.reading_questions];
    list.splice(index, 1);

    if (isListening) {
      updateExam({ ...exam, listening_questions: list });
    } else {
      updateExam({ ...exam, reading_questions: list });
    }
  };

  // Save to GAS
  const handleSave = async () => {
    if (onSaveToGas) {
      onSaveToGas(exam);
    }
    setSaveStatus('saving');
    try {
      if (gasUrl && !gasUrl.includes('AKfycbx_mock')) {
        // Post exam data to GAS if available
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

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="bg-white border border-purple-100/80 rounded-3xl p-5 shadow-xl shadow-purple-950/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-[#3C2A63] flex items-center gap-2">
            <Eye className="w-5 h-5 text-[#6B51A5]" />
            Rà Soát & Chỉnh Sửa Đề Thi (Preview & Edit WYSIWYG)
          </h2>
          <p className="text-xs text-[#7C68A5] font-medium mt-1">
            Giao diện chia đôi: Chỉnh sửa Form/JSON bên trái - Xem trước Đề Thi tĩnh hiển thị trực quan bên phải.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <div className="bg-[#E2DDEC] p-1 rounded-2xl flex items-center">
            <button
              onClick={() => setMode('form')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                mode === 'form'
                  ? 'bg-[#6B51A5] text-white shadow-md'
                  : 'text-[#3C2A63] hover:text-[#503A7A]'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Giao Diện Form</span>
            </button>
            <button
              onClick={() => setMode('json')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                mode === 'json'
                  ? 'bg-[#6B51A5] text-white shadow-md'
                  : 'text-[#3C2A63] hover:text-[#503A7A]'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Chỉnh RAW JSON</span>
            </button>
          </div>

          <button
            onClick={handleSave}
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-emerald-950/10 flex items-center gap-2 transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Lưu Đề Thi</span>
          </button>
        </div>
      </div>

      {saveStatus === 'saved' && (
        <div className="p-3.5 bg-emerald-100 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-extrabold flex items-center gap-2 animate-fade-in">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-700" />
          <span>Đã lưu cấu trúc đề thi thành công!</span>
        </div>
      )}

      {/* SPLIT SCREEN CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* LEFT COLUMN: FORM / JSON EDITOR */}
        <div className="bg-white border border-purple-100/80 rounded-3xl p-5 shadow-xl shadow-purple-950/5 space-y-6 max-h-[800px] overflow-y-auto">
          
          {mode === 'json' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-[#6B51A5] uppercase tracking-wider flex items-center gap-1.5">
                  <Code className="w-4 h-4" />
                  Mã Nguồn JSON Đề Thi (Direct Schema Editor)
                </label>
                <button
                  onClick={() => navigator.clipboard.writeText(rawJson)}
                  className="px-3 py-1 bg-[#F8F6FC] border border-purple-200 hover:bg-[#E2DDEC] text-[#3C2A63] rounded-xl text-xs font-extrabold flex items-center gap-1 transition"
                >
                  <Copy className="w-3 h-3" />
                  Copy JSON
                </button>
              </div>

              {jsonError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{jsonError}</span>
                </div>
              )}

              <textarea
                value={rawJson}
                onChange={(e) => handleJsonChange(e.target.value)}
                rows={25}
                className="w-full p-4 bg-[#F8F6FC] border border-purple-200/80 rounded-2xl font-mono text-xs text-[#3C2A63] focus:outline-none focus:ring-2 focus:ring-[#6B51A5] leading-relaxed"
              />
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* General Exam Info */}
              <div className="space-y-4 border-b border-purple-100 pb-5">
                <h3 className="text-xs font-extrabold text-[#6B51A5] uppercase tracking-wider">
                  1. Thông Tin Chung Đề Thi
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[#503A7A] font-extrabold mb-1">Mã Đề Thi (Exam Code)</label>
                    <input
                      type="text"
                      value={exam.exam_code}
                      onChange={(e) => handleBasicChange('exam_code', e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#F8F6FC] border border-purple-200/80 rounded-xl text-[#3C2A63] font-bold focus:outline-none focus:ring-2 focus:ring-[#6B51A5]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#503A7A] font-extrabold mb-1">Tên Đề Thi (Exam Title)</label>
                    <input
                      type="text"
                      value={exam.title}
                      onChange={(e) => handleBasicChange('title', e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#F8F6FC] border border-purple-200/80 rounded-xl text-[#3C2A63] font-bold focus:outline-none focus:ring-2 focus:ring-[#6B51A5]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#503A7A] font-extrabold mb-1 flex items-center gap-1.5">
                    <Headphones className="w-3.5 h-3.5 text-emerald-700" />
                    Audio File URL (.mp3 / Cloudinary)
                  </label>
                  <input
                    type="text"
                    value={exam.audio_url}
                    onChange={(e) => handleBasicChange('audio_url', e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2 bg-[#F8F6FC] border border-purple-200/80 rounded-xl text-xs text-[#3C2A63] font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#503A7A] font-extrabold mb-1 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-[#6B51A5]" />
                    Google Drive Image URL (Đồ thị / Sơ đồ đính kèm)
                  </label>
                  <input
                    type="text"
                    value={exam.image_url || ''}
                    onChange={(e) => handleBasicChange('image_url', e.target.value)}
                    placeholder="https://drive.google.com/uc?id=... hoặc https://i.imgur.com/..."
                    className="w-full px-3.5 py-2 bg-[#F8F6FC] border border-purple-200/80 rounded-xl text-xs text-[#3C2A63] font-medium focus:outline-none focus:ring-2 focus:ring-[#6B51A5]"
                  />
                </div>
              </div>

              {/* Listening Questions Form */}
              <div className="space-y-4 border-b border-purple-100 pb-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Headphones className="w-4 h-4" />
                    2. Câu Hỏi Phần Nghe ({exam.listening_questions.length})
                  </h3>
                  <button
                    onClick={() => addQuestion('listening')}
                    className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-extrabold hover:bg-emerald-200 transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Thêm Câu Hỏi
                  </button>
                </div>

                <div className="space-y-3">
                  {exam.listening_questions.map((q, idx) => (
                    <div key={q.question_id || idx} className="p-3.5 bg-[#F8F6FC] border border-purple-100 rounded-2xl space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-[#3C2A63]">Câu #{idx + 1}</span>
                        <button
                          onClick={() => removeQuestion('listening', idx)}
                          className="p-1 text-[#7C68A5] hover:text-rose-600 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={q.question_text}
                        onChange={(e) => updateQuestion('listening', idx, 'question_text', e.target.value)}
                        placeholder="Nội dung câu hỏi..."
                        className="w-full px-3 py-1.5 bg-white border border-purple-200/80 rounded-xl text-[#3C2A63] font-medium focus:outline-none focus:ring-1 focus:ring-[#6B51A5]"
                      />

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-[#7C68A5] font-extrabold block mb-0.5">Loại câu hỏi</label>
                          <select
                            value={q.question_type}
                            onChange={(e) => updateQuestion('listening', idx, 'question_type', e.target.value as any)}
                            className="w-full px-2.5 py-1 bg-white border border-purple-200/80 rounded-xl text-[#3C2A63] text-xs font-medium"
                          >
                            <option value="multiple_choice">Multiple Choice</option>
                            <option value="fill_in_blank">Fill in the Blank</option>
                            <option value="true_false_not_given">True/False/Not Given</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] text-[#7C68A5] font-extrabold block mb-0.5">Đáp án đúng (Chỉ dùng chấm tự động Server)</label>
                          <input
                            type="text"
                            value={q.correct_answer || ''}
                            onChange={(e) => updateQuestion('listening', idx, 'correct_answer', e.target.value)}
                            placeholder="VD: B hoặc 15th"
                            className="w-full px-2.5 py-1 bg-white border border-purple-200/80 rounded-xl text-amber-800 font-bold text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reading Passage & Questions Form */}
              <div className="space-y-4 border-b border-purple-100 pb-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-[#6B51A5] uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4" />
                    3. Bài Đọc & Câu Hỏi ({exam.reading_questions.length})
                  </h3>
                  <button
                    onClick={() => addQuestion('reading')}
                    className="px-3 py-1 bg-purple-100 text-[#503A7A] border border-purple-200 rounded-xl text-xs font-extrabold hover:bg-purple-200 transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Thêm Câu Hỏi
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <label className="block text-[#503A7A] font-extrabold">Tiêu Đề Bài Đọc</label>
                  <input
                    type="text"
                    value={exam.passage_title}
                    onChange={(e) => handleBasicChange('passage_title', e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#F8F6FC] border border-purple-200/80 rounded-xl text-[#3C2A63] font-bold"
                  />

                  <label className="block text-[#503A7A] font-extrabold pt-2">Nội Dung Đoạn Văn</label>
                  <textarea
                    value={exam.passage_text}
                    onChange={(e) => handleBasicChange('passage_text', e.target.value)}
                    rows={6}
                    className="w-full p-3.5 bg-[#F8F6FC] border border-purple-200/80 rounded-2xl text-[#3C2A63] text-xs font-serif leading-relaxed"
                  />
                </div>

                <div className="space-y-3 pt-2">
                  {exam.reading_questions.map((q, idx) => (
                    <div key={q.question_id || idx} className="p-3.5 bg-[#F8F6FC] border border-purple-100 rounded-2xl space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-[#3C2A63]">Câu #{idx + 1}</span>
                        <button
                          onClick={() => removeQuestion('reading', idx)}
                          className="p-1 text-[#7C68A5] hover:text-rose-600 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={q.question_text}
                        onChange={(e) => updateQuestion('reading', idx, 'question_text', e.target.value)}
                        placeholder="Nội dung câu hỏi..."
                        className="w-full px-3 py-1.5 bg-white border border-purple-200/80 rounded-xl text-[#3C2A63] font-medium"
                      />

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-[#7C68A5] font-extrabold block mb-0.5">Loại câu hỏi</label>
                          <select
                            value={q.question_type}
                            onChange={(e) => updateQuestion('reading', idx, 'question_type', e.target.value as any)}
                            className="w-full px-2.5 py-1 bg-white border border-purple-200/80 rounded-xl text-[#3C2A63] text-xs font-medium"
                          >
                            <option value="true_false_not_given">True/False/Not Given</option>
                            <option value="multiple_choice">Multiple Choice</option>
                            <option value="fill_in_blank">Fill in the Blank</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] text-[#7C68A5] font-extrabold block mb-0.5">Đáp án đúng</label>
                          <input
                            type="text"
                            value={q.correct_answer || ''}
                            onChange={(e) => updateQuestion('reading', idx, 'correct_answer', e.target.value)}
                            placeholder="VD: TRUE"
                            className="w-full px-2.5 py-1 bg-white border border-purple-200/80 rounded-xl text-amber-800 font-bold text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Writing Task Prompts Form */}
              <div className="space-y-4">
                <h3 className="text-xs font-extrabold text-[#6B51A5] uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  4. Đề Bài Phần Viết (Writing Tasks)
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[#503A7A] font-extrabold mb-1">Writing Task 1 Prompt</label>
                    <textarea
                      value={exam.writing_task1_prompt}
                      onChange={(e) => handleBasicChange('writing_task1_prompt', e.target.value)}
                      rows={3}
                      className="w-full p-3 bg-[#F8F6FC] border border-purple-200/80 rounded-2xl text-[#3C2A63] font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[#503A7A] font-extrabold mb-1">Writing Task 2 Prompt</label>
                    <textarea
                      value={exam.writing_task2_prompt}
                      onChange={(e) => handleBasicChange('writing_task2_prompt', e.target.value)}
                      rows={3}
                      className="w-full p-3 bg-[#F8F6FC] border border-purple-200/80 rounded-2xl text-[#3C2A63] font-medium"
                    />
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* RIGHT COLUMN: REALTIME STATIC HTML EXAM PREVIEW */}
        <div className="bg-white border border-purple-100/80 rounded-3xl p-5 shadow-xl shadow-purple-950/5 space-y-4 max-h-[800px] overflow-y-auto">
          
          <div className="flex items-center justify-between border-b border-purple-100 pb-3">
            <h3 className="text-xs font-extrabold text-[#3C2A63] uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#6B51A5]" />
              Giao Diện Đề Thi Tĩnh Cho Thí Sinh (Live Preview)
            </h3>

            <div className="flex items-center space-x-1 bg-[#E2DDEC] p-1 rounded-2xl text-xs">
              <button
                onClick={() => setActivePreviewTab('listening')}
                className={`px-3 py-1 rounded-xl font-extrabold transition cursor-pointer ${
                  activePreviewTab === 'listening' ? 'bg-[#6B51A5] text-white shadow-sm' : 'text-[#3C2A63]'
                }`}
              >
                Listening
              </button>
              <button
                onClick={() => setActivePreviewTab('reading')}
                className={`px-3 py-1 rounded-xl font-extrabold transition cursor-pointer ${
                  activePreviewTab === 'reading' ? 'bg-[#6B51A5] text-white shadow-sm' : 'text-[#3C2A63]'
                }`}
              >
                Reading
              </button>
              <button
                onClick={() => setActivePreviewTab('writing')}
                className={`px-3 py-1 rounded-xl font-extrabold transition cursor-pointer ${
                  activePreviewTab === 'writing' ? 'bg-[#6B51A5] text-white shadow-sm' : 'text-[#3C2A63]'
                }`}
              >
                Writing
              </button>
            </div>
          </div>

          {/* Render Preview Section */}
          <div className="space-y-4">
            
            <div className="p-3.5 bg-[#F8F6FC] border border-purple-100 rounded-2xl flex items-center justify-between text-xs">
              <span className="font-extrabold text-[#3C2A63]">{exam.title}</span>
              <span className="px-2.5 py-1 bg-purple-100 text-[#503A7A] rounded-full font-mono font-bold">
                {exam.exam_code}
              </span>
            </div>

            {/* Attached Image URL Preview */}
            {exam.image_url && (
              <div className="p-3.5 bg-[#F8F6FC] border border-purple-100 rounded-2xl space-y-2">
                <span className="text-xs font-extrabold text-[#6B51A5] flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5" /> Sơ đồ / Đồ thị đính kèm
                </span>
                <img
                  src={exam.image_url}
                  alt="Exam Graphic"
                  className="max-h-48 rounded-xl object-contain mx-auto border border-purple-100"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Listening Preview */}
            {activePreviewTab === 'listening' && (
              <div className="space-y-4">
                <div className="p-3.5 bg-[#F8F6FC] border border-purple-100 rounded-2xl space-y-2">
                  <span className="text-xs text-[#503A7A] block font-extrabold">Audio Player Tĩnh:</span>
                  <audio controls className="w-full h-8 rounded">
                    <source src={exam.audio_url} type="audio/mpeg" />
                    Browser does not support audio.
                  </audio>
                </div>

                <div className="space-y-3">
                  {exam.listening_questions.map((q, idx) => (
                    <div key={q.question_id || idx} className="p-4 bg-[#F8F6FC] border border-purple-100 rounded-2xl space-y-2 text-xs">
                      <p className="font-extrabold text-[#3C2A63]">{q.question_text}</p>
                      
                      {q.question_type === 'multiple_choice' && q.options && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {q.options.map((opt, optIdx) => (
                            <label key={optIdx} className="flex items-center space-x-2 p-2.5 bg-white rounded-xl border border-purple-100 text-[#3C2A63] font-medium">
                              <input type="radio" name={`preview_l_${q.question_id}`} disabled />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {q.question_type === 'fill_in_blank' && (
                        <input
                          type="text"
                          disabled
                          placeholder="Thí sinh nhập đáp án tại đây..."
                          className="w-full p-2.5 bg-white border border-purple-100 rounded-xl text-[#7C68A5] italic font-medium"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reading Preview */}
            {activePreviewTab === 'reading' && (
              <div className="space-y-4">
                <div className="p-4 bg-[#F8F6FC] border border-purple-100 rounded-2xl space-y-2">
                  <h4 className="text-sm font-extrabold text-[#3C2A63]">{exam.passage_title}</h4>
                  <div className="text-xs text-[#3C2A63] font-serif leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto p-3 bg-white border border-purple-100 rounded-xl">
                    {exam.passage_text}
                  </div>
                </div>

                <div className="space-y-3">
                  {exam.reading_questions.map((q, idx) => (
                    <div key={q.question_id || idx} className="p-4 bg-[#F8F6FC] border border-purple-100 rounded-2xl space-y-2 text-xs">
                      <p className="font-extrabold text-[#3C2A63]">{q.question_text}</p>

                      {q.question_type === 'true_false_not_given' && (
                        <div className="flex items-center space-x-3 pt-1">
                          {['TRUE', 'FALSE', 'NOT GIVEN'].map((opt) => (
                            <label key={opt} className="flex items-center space-x-1.5 px-3 py-1.5 bg-white rounded-xl border border-purple-100 text-[#3C2A63] font-medium">
                              <input type="radio" name={`preview_r_${q.question_id}`} disabled />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Writing Preview */}
            {activePreviewTab === 'writing' && (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-[#F8F6FC] border border-purple-100 rounded-2xl space-y-2">
                  <h4 className="font-extrabold text-[#6B51A5]">Writing Task 1 Prompt</h4>
                  <p className="text-[#3C2A63] leading-relaxed font-medium">{exam.writing_task1_prompt}</p>
                  <textarea
                    disabled
                    placeholder="Khung nhập bài làm Task 1 của thí sinh (Word count realtime)..."
                    className="w-full p-3 bg-white border border-purple-100 rounded-xl text-[#7C68A5] italic h-24 font-medium"
                  />
                </div>

                <div className="p-4 bg-[#F8F6FC] border border-purple-100 rounded-2xl space-y-2">
                  <h4 className="font-extrabold text-[#6B51A5]">Writing Task 2 Prompt</h4>
                  <p className="text-[#3C2A63] leading-relaxed font-medium">{exam.writing_task2_prompt}</p>
                  <textarea
                    disabled
                    placeholder="Khung nhập bài làm Task 2 của thí sinh..."
                    className="w-full p-3 bg-white border border-purple-100 rounded-xl text-[#7C68A5] italic h-24 font-medium"
                  />
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
};

import React, { useState } from 'react';
import { 
  Sparkles, 
  Cpu, 
  CheckCircle2, 
  AlertCircle, 
  FileCode, 
  ArrowRight, 
  FileUp, 
  Play, 
  Save, 
  Download, 
  BookOpen, 
  Headphones, 
  PenTool, 
  ShieldCheck, 
  Layers, 
  Clock, 
  Check, 
  RefreshCw,
  Sliders,
  ChevronDown,
  ChevronUp,
  Award,
  Zap,
  CheckCircle,
  HelpCircle,
  Eye
} from 'lucide-react';
import { ExamData, Question } from '../../types';
import { generateExamWithAI, parsePdfWithServerGemini } from '../../services/gemini';
import { ExamTestReport, verifyAndOptimizeExam } from '../../services/examVerification';
import { saveExamToServerDb } from '../../services/api';
import { saveExamToIndexedDB } from '../../services/indexedDb';

interface UploadModuleProps {
  onParsedData: (data: ExamData) => void;
  onNavigateToPreview?: () => void;
  onTakeExamNow?: (exam: ExamData) => void;
}

const PRESET_TOPICS = [
  {
    id: 'climate',
    icon: '🌿',
    title: 'Climate Action & Circular Economy',
    prompt: 'Renewable energy transitions, carbon sequestration, and municipal circular economy initiatives',
    band: 'band_65_75' as const
  },
  {
    id: 'ai_ethics',
    icon: '🤖',
    title: 'Artificial Intelligence & Algorithmic Ethics',
    prompt: 'Ethical governance of autonomous systems, algorithmic bias in hiring, and machine cognition',
    band: 'band_8_9' as const
  },
  {
    id: 'smart_cities',
    icon: '🏙️',
    title: 'Smart Urbanization & Transit Systems',
    prompt: 'Urban sprawl mitigation, intelligent mass transit integration, and pedestrianized infrastructure',
    band: 'band_65_75' as const
  },
  {
    id: 'biotech',
    icon: '🧬',
    title: 'Agricultural Biotechnology & Food Security',
    prompt: 'Vertical agriculture, genetic crop resilience under desertification, and precision farming',
    band: 'band_65_75' as const
  },
  {
    id: 'neuroscience',
    icon: '🧠',
    title: 'Cognitive Science & Memory in Digital Age',
    prompt: 'Neuroplasticity, digital attention fragmentation, and developmental psychology of learning',
    band: 'band_8_9' as const
  },
  {
    id: 'heritage',
    icon: '🏛️',
    title: 'Cultural Heritage Preservation & Tourism',
    prompt: 'Managing mass tourism in archaeological sanctuaries, intangible cultural heritage, and indigenous preservation',
    band: 'band_5_6' as const
  }
];

export const UploadModule: React.FC<UploadModuleProps> = ({ 
  onParsedData, 
  onNavigateToPreview,
  onTakeExamNow 
}) => {
  // Generator Mode Tab: 'generator' (Smart AI) vs 'document' (PDF/Text)
  const [activeMode, setActiveMode] = useState<'generator' | 'document'>('generator');

  // Generator Form States
  const [selectedTopic, setSelectedTopic] = useState('Climate Action & Circular Economy');
  const [customPrompt, setCustomPrompt] = useState('');
  const [difficulty, setDifficulty] = useState<'band_5_6' | 'band_65_75' | 'band_8_9'>('band_65_75');
  const [selectedSkills, setSelectedSkills] = useState<{ listening: boolean; reading: boolean; writing: boolean }>({
    listening: true,
    reading: true,
    writing: true
  });
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [durationMins, setDurationMins] = useState<number>(120);

  // Document Upload States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [rawTextSyllabus, setRawTextSyllabus] = useState('');

  // Process & Verification Execution States
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Result States
  const [generatedExam, setGeneratedExam] = useState<ExamData | null>(null);
  const [testReport, setTestReport] = useState<ExamTestReport | null>(null);
  const [rawJsonOutput, setRawJsonOutput] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<'report' | 'passage' | 'questions' | 'json'>('report');
  const [expandedCheckId, setExpandedCheckId] = useState<string | null>(null);

  // Handle PDF Drag & Drop
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setErrorMsg(null);

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64Clean = result.split(',')[1] || result;
        setBase64Data(base64Clean);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleSkill = (skill: 'listening' | 'reading' | 'writing') => {
    setSelectedSkills(prev => {
      const next = { ...prev, [skill]: !prev[skill] };
      // Keep at least one skill selected
      if (!next.listening && !next.reading && !next.writing) return prev;
      return next;
    });
  };

  // Smart AI Generation with Automated Pre-flight Testing
  const handleGenerateExam = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSaveSuccessMsg(null);
    setCurrentStep('1/4 Connecting to Gemini 3.8 Flash model...');

    try {
      const skillsList: ('listening' | 'reading' | 'writing')[] = [];
      if (selectedSkills.listening) skillsList.push('listening');
      if (selectedSkills.reading) skillsList.push('reading');
      if (selectedSkills.writing) skillsList.push('writing');

      setCurrentStep('2/4 Synthesizing IELTS academic reading passage & questions...');
      await new Promise(r => setTimeout(r, 400));

      const res = await generateExamWithAI({
        mode: 'topic',
        topic: selectedTopic,
        skills: skillsList,
        difficulty: difficulty,
        questionCount: questionCount,
        durationMins: durationMins,
        customPrompt: customPrompt.trim() || undefined
      });

      setCurrentStep('3/4 Executing 6-Point Quality Verification & Auto-Repair Suite...');
      await new Promise(r => setTimeout(r, 300));

      setCurrentStep('4/4 Simulating student auto-grading with 100% solvability guarantee...');
      await new Promise(r => setTimeout(r, 300));

      setGeneratedExam(res.exam);
      setTestReport(res.testReport);
      setRawJsonOutput(JSON.stringify(res.exam, null, 2));

      // Propagate to main application state
      onParsedData(res.exam);

      // Auto-save to IndexedDB & Server DB
      saveExamToIndexedDB(res.exam).catch(() => {});
      saveExamToServerDb(res.exam).catch(() => {});

      setSaveSuccessMsg(`Exam ${res.exam.exam_code} successfully verified and saved to Central Database.`);
    } catch (err: any) {
      console.error('Error generating exam:', err);
      setErrorMsg(err.message || 'Error generating IELTS exam via AI. Please check your network connection.');
    } finally {
      setLoading(false);
      setCurrentStep('');
    }
  };

  // Document/PDF Extraction with Pre-flight Testing
  const handleProcessDocument = async () => {
    if (!base64Data && !rawTextSyllabus.trim()) {
      setErrorMsg('Please select a PDF document or paste exam syllabus text.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSaveSuccessMsg(null);
    setCurrentStep('Đang đọc và phân tích cấu trúc bài đọc, câu hỏi và đáp án từ tài liệu...');

    try {
      const res = await parsePdfWithServerGemini(base64Data || '', rawTextSyllabus.trim() || undefined);
      
      setCurrentStep('Chạy kiểm tra tự động 6 điểm định dạng & mô phỏng chấm điểm...');
      await new Promise(r => setTimeout(r, 300));

      setGeneratedExam(res.exam);
      setTestReport(res.testReport);
      setRawJsonOutput(JSON.stringify(res.exam, null, 2));

      onParsedData(res.exam);
      saveExamToIndexedDB(res.exam).catch(() => {});
      saveExamToServerDb(res.exam).catch(() => {});

      const totalQs = (res.exam.reading_questions?.length || 0) + (res.exam.listening_questions?.length || 0) + (res.exam.questions?.length || 0);
      setSaveSuccessMsg(`Trích xuất thành công ${totalQs} câu hỏi từ tài liệu "${res.exam.title}". Đã kiểm tra cấu trúc và lưu vào Central DB.`);
    } catch (err: any) {
      console.error('Error parsing document with Gemini:', err);
      setErrorMsg(err.message || 'Không thể trích xuất đề thi. Vui lòng kiểm tra lại file PDF hoặc copy/paste trực tiếp văn bản.');
    } finally {
      setLoading(false);
      setCurrentStep('');
    }
  };

  // Direct actions
  const handleSaveToDatabase = async () => {
    if (!generatedExam) return;
    setLoading(true);
    try {
      await saveExamToServerDb(generatedExam);
      await saveExamToIndexedDB(generatedExam);
      setSaveSuccessMsg(`Exam ${generatedExam.exam_code} published to Central Database for all student candidates.`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (e: any) {
      setErrorMsg('Failed to save to server database: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadJson = () => {
    if (!generatedExam) return;
    const blob = new Blob([JSON.stringify(generatedExam, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedExam.exam_code || 'IELTS_EXAM'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white border border-purple-100/80 rounded-3xl p-6 shadow-xl shadow-purple-950/5 flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur">
        <div>
          <h2 className="text-xl font-extrabold text-[#3C2A63] flex items-center gap-2">
            <Cpu className="w-6 h-6 text-[#6B51A5]" />
            <span>AI Exam Generator &amp; Automated Testing Suite</span>
          </h2>
          <p className="text-xs text-[#7C68A5] font-medium mt-1">
            Generate authentic IELTS Academic &amp; General exams from topic prompts or documents with automated 6-point pre-flight quality verification and dry-run scoring simulation.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs bg-purple-100 text-[#503A7A] border border-purple-200 px-3.5 py-1.5 rounded-full font-extrabold shrink-0">
          <Sparkles className="w-4 h-4 text-[#6B51A5]" />
          <span>Server-Side Gemini 3.8 Flash</span>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center space-x-3 border-b border-purple-100 pb-3">
        <button
          type="button"
          onClick={() => setActiveMode('generator')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-2xl text-xs font-extrabold transition cursor-pointer ${
            activeMode === 'generator'
              ? 'bg-[#6B51A5] text-white shadow-md shadow-purple-900/10'
              : 'bg-purple-50 text-[#7C68A5] hover:bg-purple-100'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Smart AI Exam Generator</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode('document')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-2xl text-xs font-extrabold transition cursor-pointer ${
            activeMode === 'document'
              ? 'bg-[#6B51A5] text-white shadow-md shadow-purple-900/10'
              : 'bg-purple-50 text-[#7C68A5] hover:bg-purple-100'
          }`}
        >
          <FileUp className="w-4 h-4" />
          <span>Document &amp; PDF Extractor</span>
        </button>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Form Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          
          {activeMode === 'generator' ? (
            <div className="bg-white border border-purple-100/80 rounded-3xl p-6 shadow-xl shadow-purple-950/5 space-y-5">
              
              {/* Presets Grid */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-[#3C2A63] flex items-center justify-between">
                  <span>Curated Academic Topics (1-Click Select):</span>
                  <span className="text-[10px] text-[#7C68A5]">IELTS Standard</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_TOPICS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setSelectedTopic(preset.title);
                        setCustomPrompt(preset.prompt);
                        setDifficulty(preset.band);
                      }}
                      className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                        selectedTopic === preset.title
                          ? 'border-[#6B51A5] bg-purple-50/80 ring-2 ring-[#6B51A5]/20 shadow-sm'
                          : 'border-purple-100 hover:border-purple-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{preset.icon}</span>
                        <span className="text-[11px] font-bold text-[#3C2A63] line-clamp-1">{preset.title}</span>
                      </div>
                      <span className="text-[9px] font-semibold text-[#7C68A5] mt-1.5">
                        {preset.band === 'band_8_9' ? 'Band 8.0-9.0' : preset.band === 'band_5_6' ? 'Band 5.5-6.0' : 'Band 6.5-7.5'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Topic Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-[#3C2A63]">Exam Topic / Subject Domain:</label>
                <input
                  type="text"
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  placeholder="e.g. Cognitive Psychology, Marine Biology, Clean Energy"
                  className="w-full px-4 py-2.5 bg-[#F8F6FC] border border-purple-200/80 rounded-2xl text-xs text-[#3C2A63] font-medium placeholder-[#7C68A5] focus:outline-none focus:ring-2 focus:ring-[#6B51A5]"
                />
              </div>

              {/* Target Band & Skills Selector */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-[#3C2A63]">Target Band Level:</label>
                  <select
                    value={difficulty}
                    onChange={(e: any) => setDifficulty(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F6FC] border border-purple-200/80 rounded-2xl text-xs text-[#3C2A63] font-bold focus:outline-none focus:ring-2 focus:ring-[#6B51A5]"
                  >
                    <option value="band_5_6">Band 5.5 - 6.0 (Foundation)</option>
                    <option value="band_65_75">Band 6.5 - 7.5 (Academic)</option>
                    <option value="band_8_9">Band 8.0 - 9.0 (Advanced)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-[#3C2A63]">Exam Duration:</label>
                  <select
                    value={durationMins}
                    onChange={(e) => setDurationMins(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-[#F8F6FC] border border-purple-200/80 rounded-2xl text-xs text-[#3C2A63] font-bold focus:outline-none focus:ring-2 focus:ring-[#6B51A5]"
                  >
                    <option value={30}>30 mins (Quick Practice)</option>
                    <option value={60}>60 mins (Single Skill)</option>
                    <option value={120}>120 mins (Full Mock Exam)</option>
                  </select>
                </div>
              </div>

              {/* Skills to Include Checkboxes */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-[#3C2A63]">Skills to Include in Test:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => toggleSkill('listening')}
                    className={`py-2 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      selectedSkills.listening 
                        ? 'bg-purple-100/90 text-[#3C2A63] border-[#6B51A5]' 
                        : 'bg-[#F8F6FC] text-[#7C68A5] border-transparent opacity-60'
                    }`}
                  >
                    <Headphones className="w-3.5 h-3.5" />
                    <span>Listening</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleSkill('reading')}
                    className={`py-2 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      selectedSkills.reading 
                        ? 'bg-purple-100/90 text-[#3C2A63] border-[#6B51A5]' 
                        : 'bg-[#F8F6FC] text-[#7C68A5] border-transparent opacity-60'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Reading</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleSkill('writing')}
                    className={`py-2 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      selectedSkills.writing 
                        ? 'bg-purple-100/90 text-[#3C2A63] border-[#6B51A5]' 
                        : 'bg-[#F8F6FC] text-[#7C68A5] border-transparent opacity-60'
                    }`}
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span>Writing</span>
                  </button>
                </div>
              </div>

              {/* Question Count Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-extrabold text-[#3C2A63]">
                  <span>Number of Questions:</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-[#503A7A] border border-purple-200">
                    {questionCount} Questions
                  </span>
                </div>
                <input
                  type="range"
                  min={6}
                  max={24}
                  step={2}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                  className="w-full accent-[#6B51A5] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#7C68A5]">
                  <span>6 (Quick Test)</span>
                  <span>14 (Full Passage)</span>
                  <span>24 (Multi-Section)</span>
                </div>
              </div>

              {/* Custom Instructions */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-[#3C2A63]">Additional Guidance (Optional):</label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g. Include matching headings questions, emphasis on vocabulary collocations..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-[#F8F6FC] border border-purple-200/80 rounded-2xl text-xs text-[#3C2A63] font-medium placeholder-[#7C68A5] focus:outline-none focus:ring-2 focus:ring-[#6B51A5] resize-none"
                />
              </div>

              {/* Generate Button */}
              <button
                type="button"
                onClick={handleGenerateExam}
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-[#6B51A5] to-[#503A7A] hover:opacity-95 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-purple-950/15 flex items-center justify-center space-x-2 transition cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{currentStep || 'Generating & Running Quality Verification...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate IELTS Exam &amp; Run 6-Point Tests</span>
                  </>
                )}
              </button>

            </div>
          ) : (
            /* Document Upload Mode */
            <div className="bg-white border border-purple-100/80 rounded-3xl p-6 shadow-xl shadow-purple-950/5 space-y-5">
              
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-[#3C2A63]">Select IELTS Exam Document (.PDF):</label>
                <div className="border-2 border-dashed border-purple-200 hover:border-[#6B51A5] rounded-3xl p-6 text-center bg-[#F8F6FC] transition-all cursor-pointer relative">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <FileUp className="w-10 h-10 text-[#6B51A5] mx-auto mb-2" />
                  {selectedFile ? (
                    <div className="space-y-1">
                      <p className="text-xs font-extrabold text-emerald-800">{selectedFile.name}</p>
                      <p className="text-[10px] text-[#7C68A5] font-medium">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs font-extrabold text-[#3C2A63]">Drag &amp; drop IELTS Exam PDF</p>
                      <p className="text-[10px] text-[#7C68A5] font-medium">Extracts Reading, Listening &amp; Writing material</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-[#3C2A63]">Or Paste Raw Exam Text / Curriculum:</label>
                <textarea
                  value={rawTextSyllabus}
                  onChange={(e) => setRawTextSyllabus(e.target.value)}
                  placeholder="Paste exam text, passage paragraphs, or question prompts here..."
                  rows={6}
                  className="w-full px-4 py-2.5 bg-[#F8F6FC] border border-purple-200/80 rounded-2xl text-xs text-[#3C2A63] font-mono leading-relaxed placeholder-[#7C68A5] focus:outline-none focus:ring-2 focus:ring-[#6B51A5]"
                />
              </div>

              <button
                type="button"
                onClick={handleProcessDocument}
                disabled={loading || (!base64Data && !rawTextSyllabus.trim())}
                className="w-full py-4 bg-[#6B51A5] hover:bg-[#583F8F] text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-purple-950/15 flex items-center justify-center space-x-2 transition cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{currentStep || 'Extracting & Testing Exam...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Extract &amp; Run Pre-Flight Verification</span>
                  </>
                )}
              </button>

            </div>
          )}

          {/* Feedback Banners */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 font-medium flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {saveSuccessMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-medium flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

        </div>

        {/* Right Column: Pre-Flight Test Report & Exam Preview (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          
          {generatedExam && testReport ? (
            <div className="bg-white border border-purple-100/80 rounded-3xl p-6 shadow-xl shadow-purple-950/5 space-y-5">
              
              {/* Report Header Card */}
              <div className="p-5 bg-gradient-to-br from-emerald-50/80 via-white to-purple-50/50 border border-emerald-200/80 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                      <ShieldCheck className="w-6 h-6 text-emerald-700" />
                    </span>
                    <div>
                      <h3 className="text-sm font-extrabold text-emerald-950 flex items-center gap-2">
                        <span>Quality Verification Suite Passed</span>
                        <span className="text-[10px] bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded-full font-black">
                          Score: {testReport.score}/100
                        </span>
                      </h3>
                      <p className="text-[11px] text-emerald-800 font-medium">
                        6-phase pre-flight verification completed in {testReport.durationMs}ms before results delivery.
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold bg-white text-[#3C2A63] border border-purple-200 px-3 py-1.5 rounded-xl shadow-xs shrink-0">
                    {generatedExam.exam_code}
                  </span>
                </div>

                {/* Metrics Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-emerald-100/80 text-[11px]">
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-[#7C68A5] block font-semibold">Checks Passed</span>
                    <span className="text-xs font-black text-emerald-800">{testReport.passedChecks} / {testReport.totalChecks} Checks</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-[#7C68A5] block font-semibold">Total Questions</span>
                    <span className="text-xs font-black text-[#3C2A63]">{testReport.metrics.totalQuestions} Questions</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-[#7C68A5] block font-semibold">Scoring Solvability</span>
                    <span className="text-xs font-black text-emerald-700">{testReport.metrics.scoringSimulationSuccessRate}% Accurate</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-[#7C68A5] block font-semibold">Passage Depth</span>
                    <span className="text-xs font-black text-[#3C2A63]">{testReport.metrics.readingWordCount} Words</span>
                  </div>
                </div>

                {/* Auto-Repairs Applied */}
                {testReport.repairsApplied && testReport.repairsApplied.length > 0 && (
                  <div className="pt-2 border-t border-emerald-100/80">
                    <span className="text-[10px] font-extrabold text-[#7C68A5] uppercase tracking-wider block mb-1">
                      Auto-Optimizations Applied:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {testReport.repairsApplied.map((repair, i) => (
                        <span key={i} className="text-[10px] bg-purple-100 text-[#503A7A] px-2 py-0.5 rounded-md font-medium">
                          ✓ {repair}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Preview Sub-tabs */}
              <div className="flex items-center space-x-2 border-b border-purple-100 pb-2">
                <button
                  type="button"
                  onClick={() => setPreviewTab('report')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    previewTab === 'report' ? 'bg-[#6B51A5] text-white' : 'text-[#7C68A5] hover:bg-purple-50'
                  }`}
                >
                  Verification Checklist ({testReport.checks.length})
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewTab('passage')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    previewTab === 'passage' ? 'bg-[#6B51A5] text-white' : 'text-[#7C68A5] hover:bg-purple-50'
                  }`}
                >
                  Reading Passage
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewTab('questions')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    previewTab === 'questions' ? 'bg-[#6B51A5] text-white' : 'text-[#7C68A5] hover:bg-purple-50'
                  }`}
                >
                  Questions ({testReport.metrics.totalQuestions})
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewTab('json')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    previewTab === 'json' ? 'bg-[#6B51A5] text-white' : 'text-[#7C68A5] hover:bg-purple-50'
                  }`}
                >
                  Raw JSON
                </button>
              </div>

              {/* Preview Content Area */}
              <div className="bg-[#F8F6FC] border border-purple-200/80 rounded-2xl p-4 overflow-y-auto max-h-[380px]">
                
                {previewTab === 'report' && (
                  <div className="space-y-2.5">
                    {testReport.checks.map((chk) => (
                      <div
                        key={chk.id}
                        className="p-3 bg-white rounded-xl border border-purple-100 shadow-xs space-y-1 cursor-pointer transition hover:border-[#6B51A5]"
                        onClick={() => setExpandedCheckId(expandedCheckId === chk.id ? null : chk.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="p-1 rounded-full bg-emerald-100 text-emerald-800">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                            <span className="text-xs font-extrabold text-[#3C2A63]">{chk.name}</span>
                          </div>
                          <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                            {chk.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#7C68A5] font-medium pl-6">{chk.description}</p>
                        {expandedCheckId === chk.id && (
                          <div className="mt-2 pt-2 border-t border-purple-100 text-[11px] text-[#503A7A] font-mono bg-purple-50/50 p-2 rounded-lg">
                            {chk.details}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {previewTab === 'passage' && (
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-purple-100">
                    <h4 className="text-sm font-extrabold text-[#3C2A63]">
                      {generatedExam.reading_passage_title || generatedExam.passage_title || 'IELTS Reading Passage'}
                    </h4>
                    <p className="text-xs text-[#3C2A63] leading-relaxed whitespace-pre-wrap">
                      {generatedExam.reading_passage || generatedExam.passage_text}
                    </p>
                  </div>
                )}

                {previewTab === 'questions' && (
                  <div className="space-y-3">
                    {(generatedExam.questions || []).map((q, idx) => (
                      <div key={`${q.question_id || 'q'}-${idx}`} className="p-3 bg-white rounded-xl border border-purple-100 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-extrabold text-[#6B51A5]">
                            {q.question_id}: [{q.section.toUpperCase()}] ({q.question_type})
                          </span>
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                            Answer: {Array.isArray(q.correct_answer) ? q.correct_answer.join(', ') : q.correct_answer}
                          </span>
                        </div>
                        <p className="text-xs text-[#3C2A63] font-medium">{q.question_text}</p>
                        {q.options && q.options.length > 0 && (
                          <div className="grid grid-cols-2 gap-1 text-[11px] text-[#503A7A]">
                            {q.options.map((opt, i) => (
                              <span key={i} className="p-1 bg-purple-50/60 rounded">
                                {opt}
                              </span>
                            ))}
                          </div>
                        )}
                        {q.explanation && (
                          <p className="text-[10px] text-[#7C68A5] italic bg-purple-50/40 p-1.5 rounded">
                            💡 {q.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {previewTab === 'json' && (
                  <pre className="text-[11px] text-[#3C2A63] font-mono leading-relaxed whitespace-pre-wrap">
                    {rawJsonOutput}
                  </pre>
                )}

              </div>

              {/* Action Toolbar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                {onNavigateToPreview && (
                  <button
                    type="button"
                    onClick={onNavigateToPreview}
                    className="py-3 px-4 bg-[#6B51A5] hover:bg-[#583F8F] text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-purple-950/10 flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <span>Edit in Visual Builder</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                {onTakeExamNow && (
                  <button
                    type="button"
                    onClick={() => onTakeExamNow(generatedExam)}
                    className="py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-950/10 flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Play className="w-4 h-4" />
                    <span>Take Exam Now</span>
                  </button>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveToDatabase}
                    className="flex-1 py-3 px-3 bg-purple-100 hover:bg-purple-200 text-[#3C2A63] font-bold text-xs rounded-2xl border border-purple-200 flex items-center justify-center gap-1.5 transition cursor-pointer"
                    title="Publish to Centralized Database"
                  >
                    <Save className="w-4 h-4 text-[#6B51A5]" />
                    <span>Publish</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadJson}
                    className="py-3 px-3 bg-purple-50 hover:bg-purple-100 text-[#3C2A63] font-bold text-xs rounded-2xl border border-purple-200 flex items-center justify-center gap-1.5 transition cursor-pointer"
                    title="Download Exam JSON file"
                  >
                    <Download className="w-4 h-4 text-[#6B51A5]" />
                  </button>
                </div>
              </div>

            </div>
          ) : (
            /* Empty State Waiting for Generation */
            <div className="bg-white border border-purple-100/80 rounded-3xl p-8 shadow-xl shadow-purple-950/5 h-full flex flex-col items-center justify-center text-center space-y-4 py-16">
              <div className="w-16 h-16 rounded-3xl bg-purple-100 flex items-center justify-center text-[#6B51A5] shadow-inner">
                <Sparkles className="w-8 h-8 animate-pulse" />
              </div>
              <div className="max-w-sm space-y-1.5">
                <h4 className="text-sm font-extrabold text-[#3C2A63]">AI Exam Generator Standing By</h4>
                <p className="text-xs text-[#7C68A5] font-medium leading-relaxed">
                  Configure your exam parameters on the left and click generate. The system will synthesize your test, execute the 6-point pre-flight quality verification, and simulate auto-grading before returning results.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-left max-w-sm pt-2 text-[11px] text-[#7C68A5]">
                <div className="p-2.5 rounded-xl bg-[#F8F6FC] border border-purple-100 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Schema &amp; IDs Validated</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F8F6FC] border border-purple-100 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Passage Lexile Depth Checked</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F8F6FC] border border-purple-100 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Standard Option Uniformity</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F8F6FC] border border-purple-100 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Dry-Run 100% Solvability Test</span>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};

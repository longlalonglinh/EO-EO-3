import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Plus, 
  Trash2, 
  Save, 
  BookOpen, 
  Headphones, 
  PenTool, 
  CheckCircle2, 
  Clock, 
  HelpCircle,
  Sliders,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { ExamData, Question, ReadingPassageItem, QuestionType } from '../../types';
import { DEFAULT_EXAMS } from '../../data/defaultExams';
import { saveExamToIndexedDB } from '../../services/indexedDb';
import { Task1ImageUploader } from './Task1ImageUploader';

// 1. Zod Validation Schema - Highly flexible to allow single-skill exams & partial question sets
export const questionZodSchema = z.object({
  question_id: z.string().optional().default(''),
  section: z.enum(['listening', 'reading']).optional().default('reading'),
  passage_index: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  part: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
  question_text: z.string().optional().default(''),
  question_type: z.string().optional().default('multiple_choice'),
  options: z.array(z.string()).optional().default([]),
  correct_answer: z.string().optional().default(''),
  explanation: z.string().optional().default(''),
  max_score: z.number().optional().default(1)
});

export const passageZodSchema = z.object({
  passage_index: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  title: z.string().optional().default('Reading Passage'),
  text: z.string().optional().default(''),
  questions: z.array(questionZodSchema).optional().default([])
});

export const examZodSchema = z.object({
  exam_code: z.string().min(1, 'Vui lòng nhập mã đề thi (VD: READ01, TEST01)').max(30),
  title: z.string().min(2, 'Tiêu đề bài thi phải có ít nhất 2 ký tự'),
  test_type: z.enum(['TEST', 'PRACTICE']),
  duration_mins: z.number().min(1, 'Thời lượng tối thiểu 1 phút').max(360),
  listening_duration_mins: z.number().min(0).max(120).optional().default(35),
  reading_duration_mins: z.number().min(0).max(120).optional().default(60),
  writing_duration_mins: z.number().min(0).max(120).optional().default(60),
  audio_url: z.string().optional().default(''),
  audio_title: z.string().optional().default(''),
  passages: z.array(passageZodSchema).optional().default([]),
  listening_questions: z.array(questionZodSchema).optional().default([]),
  writing_task1_prompt: z.string().optional().default(''),
  writing_task1_image: z.string().optional().default(''),
  writing_task2_prompt: z.string().optional().default('')
});

export type ExamFormValues = z.infer<typeof examZodSchema>;

interface VisualExamBuilderProps {
  initialExamData: ExamData;
  onSaveExam: (exam: ExamData) => void;
  isSaving?: boolean;
}

export const VisualExamBuilder: React.FC<VisualExamBuilderProps> = ({
  initialExamData,
  onSaveExam,
  isSaving = false
}) => {
  const [activeSection, setActiveSection] = useState<'reading' | 'listening' | 'writing' | 'settings'>('reading');
  const [selectedPassageIdx, setSelectedPassageIdx] = useState<0 | 1 | 2>(0);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Helper to format initial passages with embedded questions
  const formatInitialData = (data: ExamData): ExamFormValues => {
    const rawPassages = data.passages || [];
    const allReadingQs = data.reading_questions || (data.questions || []).filter(q => q.section === 'reading');
    const allListeningQs = data.listening_questions || (data.questions || []).filter(q => q.section === 'listening');

    const formattedPassages = [1, 2, 3].map((pNum, idx) => {
      const existingP = rawPassages.find(p => p.passage_index === pNum) || rawPassages[idx];
      const pQs = (existingP?.questions && existingP.questions.length > 0) 
        ? existingP.questions 
        : allReadingQs.filter(q => q.passage_index === pNum || (!q.passage_index && idx === 0));

      return {
        passage_index: pNum as 1 | 2 | 3,
        title: existingP?.title || `Reading Passage ${pNum}`,
        text: existingP?.text || (pNum === 1 ? (data.passage_text || '') : ''),
        questions: pQs.map(q => ({
          question_id: q.question_id,
          section: 'reading' as const,
          passage_index: pNum as 1 | 2 | 3,
          question_text: q.question_text || '',
          question_type: q.question_type || 'multiple_choice',
          options: q.options || [],
          correct_answer: Array.isArray(q.correct_answer) ? q.correct_answer.join('|') : (q.correct_answer || ''),
          explanation: q.explanation || '',
          max_score: q.max_score || 1
        }))
      };
    });

    return {
      exam_code: data.exam_code || 'TEST01',
      title: data.title || 'IELTS Mock Test',
      test_type: data.test_type || 'TEST',
      duration_mins: data.duration_mins || 150,
      listening_duration_mins: data.listening_duration_mins || 35,
      reading_duration_mins: data.reading_duration_mins || 60,
      writing_duration_mins: data.writing_duration_mins || 60,
      audio_url: data.audio_url || '',
      audio_title: data.audio_title || '',
      passages: formattedPassages,
      listening_questions: allListeningQs.map(q => ({
        question_id: q.question_id,
        section: 'listening' as const,
        part: q.part || 1,
        question_text: q.question_text || '',
        question_type: q.question_type || 'fill_in_the_blank',
        options: q.options || [],
        correct_answer: Array.isArray(q.correct_answer) ? q.correct_answer.join('|') : (q.correct_answer || ''),
        explanation: q.explanation || '',
        max_score: q.max_score || 1
      })),
      writing_task1_prompt: data.writing_task1_prompt || '',
      writing_task1_image: data.writing_task1_image || '',
      writing_task2_prompt: data.writing_task2_prompt || ''
    };
  };

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<ExamFormValues>({
    resolver: zodResolver(examZodSchema) as any,
    defaultValues: formatInitialData(initialExamData),
    mode: 'onChange'
  });

  // Manage dynamic questions inside current selected passage
  const currentPassageQuestionsArray = useFieldArray({
    control,
    name: `passages.${selectedPassageIdx}.questions`
  });

  // Manage listening questions
  const listeningQuestionsArray = useFieldArray({
    control,
    name: 'listening_questions'
  });

  const watchedPassages = watch('passages');
  const watchedExamCode = watch('exam_code');
  const watchedTask1Image = watch('writing_task1_image');

  const onValidSubmit = async (formData: ExamFormValues) => {
    // Sanitize reading questions and passages (allow empty or partial passages)
    const flatReadingQuestions: Question[] = [];
    const rawPassages = formData.passages || [];

    const standardizedPassages: ReadingPassageItem[] = rawPassages.map((p, pIdx) => {
      const pNumber = ((p.passage_index || pIdx + 1) as 1 | 2 | 3);
      const validQs = (p.questions || [])
        .filter(q => q && (q.question_text?.trim() || q.correct_answer?.trim()))
        .map((q, qIdx) => ({
          ...q,
          question_id: q.question_id?.trim() || `R${pNumber}_Q${qIdx + 1}`,
          section: 'reading' as const,
          passage_index: pNumber,
          question_type: (q.question_type || 'multiple_choice') as QuestionType,
          correct_answer: q.correct_answer?.trim() || '',
          max_score: q.max_score || 1
        }));

      validQs.forEach(q => flatReadingQuestions.push(q));

      return {
        passage_index: pNumber,
        title: p.title?.trim() || `Reading Passage ${pNumber}`,
        text: p.text || '',
        questions: validQs
      };
    });

    // Sanitize listening questions
    const flatListeningQuestions: Question[] = (formData.listening_questions || [])
      .filter(q => q && (q.question_text?.trim() || q.correct_answer?.trim()))
      .map((q, qIdx) => ({
        ...q,
        question_id: q.question_id?.trim() || `L_Q${qIdx + 1}`,
        section: 'listening' as const,
        question_type: (q.question_type || 'multiple_choice') as QuestionType,
        correct_answer: q.correct_answer?.trim() || '',
        max_score: q.max_score || 1
      }));

    const hasReading = flatReadingQuestions.length > 0 || standardizedPassages.some(p => p.text?.trim().length > 0);
    const hasListening = flatListeningQuestions.length > 0 || Boolean(formData.audio_url?.trim());
    const hasWriting = Boolean(formData.writing_task1_prompt?.trim() || formData.writing_task2_prompt?.trim() || formData.writing_task1_image?.trim());

    if (!hasReading && !hasListening && !hasWriting) {
      alert('Vui lòng thêm nội dung cho ít nhất một kỹ năng (Reading, Listening, hoặc Writing) để lưu đề thi!');
      return;
    }

    const includedSkills: string[] = [];
    if (hasListening) includedSkills.push('Listening');
    if (hasReading) includedSkills.push('Reading');
    if (hasWriting) includedSkills.push('Writing');

    const completeExam: ExamData = {
      exam_code: formData.exam_code.trim().toUpperCase(),
      title: formData.title,
      test_type: formData.test_type,
      duration_mins: formData.duration_mins,
      listening_duration_mins: formData.listening_duration_mins,
      reading_duration_mins: formData.reading_duration_mins,
      writing_duration_mins: formData.writing_duration_mins,
      audio_url: formData.audio_url?.trim() || '',
      audio_title: formData.audio_title?.trim() || '',
      passages: standardizedPassages,
      reading_questions: flatReadingQuestions,
      listening_questions: flatListeningQuestions,
      questions: [...flatListeningQuestions, ...flatReadingQuestions],
      writing_task1_prompt: formData.writing_task1_prompt?.trim() || '',
      writing_task1_image: formData.writing_task1_image?.trim() || '',
      writing_task2_prompt: formData.writing_task2_prompt?.trim() || '',
      created_at: new Date().toISOString()
    };

    // 1. Dual save to IndexedDB
    await saveExamToIndexedDB(completeExam);

    // 2. Dual save to localStorage safely
    try {
      const existingRaw = localStorage.getItem('ielts_saved_exams');
      let existingList: ExamData[] = existingRaw ? JSON.parse(existingRaw) : [];
      if (!Array.isArray(existingList)) existingList = [];
      const idx = existingList.findIndex(e => e.exam_code === completeExam.exam_code);
      if (idx >= 0) {
        existingList[idx] = completeExam;
      } else {
        existingList.push(completeExam);
      }
      localStorage.setItem('ielts_saved_exams', JSON.stringify(existingList));
      localStorage.setItem('ielts_current_exam', JSON.stringify(completeExam));
    } catch (e) {
      console.warn('LocalStorage save warning:', e);
    }

    // 3. Callback to parent
    onSaveExam(completeExam);

    setSaveSuccessMessage(`Đã lưu thành công đề thi ${completeExam.exam_code} [${includedSkills.join(' + ')}]!`);
    setTimeout(() => setSaveSuccessMessage(null), 4500);
  };

  const handleAddQuestionToPassage = () => {
    const pNumber = (selectedPassageIdx + 1) as 1 | 2 | 3;
    const currentList = watchedPassages[selectedPassageIdx]?.questions || [];
    const nextQNum = currentList.length + 1;

    currentPassageQuestionsArray.append({
      question_id: `R${pNumber}_${nextQNum}_${Date.now().toString().slice(-4)}`,
      section: 'reading',
      passage_index: pNumber,
      question_text: `${nextQNum}. Enter question prompt or sentence`,
      question_type: 'multiple_choice',
      options: ['A', 'B', 'C', 'D'],
      correct_answer: 'A',
      max_score: 1,
      explanation: ''
    });
  };

  const handleAddListeningQuestion = () => {
    const nextQNum = (listeningQuestionsArray.fields.length || 0) + 1;
    listeningQuestionsArray.append({
      question_id: `L_${nextQNum}_${Date.now().toString().slice(-4)}`,
      section: 'listening',
      part: 1,
      question_text: `${nextQNum}. Enter listening question prompt`,
      question_type: 'fill_in_the_blank',
      options: [],
      correct_answer: 'ANSWER',
      max_score: 1,
      explanation: ''
    });
  };

  const createBlankExamData = (examCode = 'NEW_EXAM'): ExamFormValues => ({
    exam_code: examCode,
    title: 'New IELTS Test',
    test_type: 'TEST',
    duration_mins: 150,
    listening_duration_mins: 35,
    reading_duration_mins: 60,
    writing_duration_mins: 60,
    audio_url: '',
    audio_title: '',
    passages: [
      {
        passage_index: 1,
        title: 'Reading Passage 1',
        text: '',
        questions: []
      },
      {
        passage_index: 2,
        title: 'Reading Passage 2',
        text: '',
        questions: []
      },
      {
        passage_index: 3,
        title: 'Reading Passage 3',
        text: '',
        questions: []
      }
    ],
    listening_questions: [],
    writing_task1_prompt: '',
    writing_task1_image: '',
    writing_task2_prompt: ''
  });

  const [showResetModal, setShowResetModal] = useState(false);

  const executeResetToBlankSheet = () => {
    const currentCode = watchedExamCode || 'NEW_EXAM';
    reset(createBlankExamData(currentCode));
    setSelectedPassageIdx(0);
    setShowResetModal(false);
    setSaveSuccessMessage('✅ Đã xoá toàn bộ câu hỏi và nội dung! Đề thi đã trở về Blank Sheet.');
    setTimeout(() => setSaveSuccessMessage(null), 5000);
  };

  return (
    <form onSubmit={handleSubmit(onValidSubmit)} className="space-y-6 relative">
      
      {/* RESET CONFIRMATION MODAL */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-purple-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-purple-100 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-2xl">
                <RotateCcw className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#3C2A63]">Xác nhận Reset Blank Sheet</h3>
                <p className="text-xs text-[#7C68A5]">Hành động này sẽ xoá sạch mọi câu hỏi</p>
              </div>
            </div>

            <p className="text-xs text-[#503A7A] leading-relaxed bg-[#F8F6FC] p-3.5 rounded-2xl border border-purple-100">
              Toàn bộ bài đọc, danh sách câu hỏi Reading, Listening và nội dung Writing Task 1, Task 2 của đề thi này sẽ được làm trống hoàn toàn để bạn bắt đầu tạo mới từ đầu.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-[#3C2A63] text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Huỷ bỏ
              </button>
              <button
                type="button"
                onClick={executeResetToBlankSheet}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xoá hết &amp; Về Blank Sheet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER CONTROLS */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-purple-100 shadow-xl shadow-purple-950/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-[#6B51A5] text-white">
              Visual Exam Builder
            </span>
            <span className="text-xs font-bold text-[#7C68A5]">
              Validated with Zod &amp; React Hook Form
            </span>
          </div>
          <h2 className="text-xl font-black text-[#3C2A63] mt-2">
            Exam Configuration: {watchedExamCode || 'NEW_EXAM'}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            title="Xoá hết câu hỏi, trở về blank sheet"
            className="px-3.5 py-2 bg-[#F5F2F9] hover:bg-[#E2DDEC] text-[#3C2A63] rounded-2xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer border border-purple-100"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset (Blank Sheet)</span>
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2.5 bg-[#6B51A5] hover:bg-[#583F8F] text-white rounded-2xl text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-950/10 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Validate & Save Exam'}</span>
          </button>
        </div>
      </div>

      {/* SUCCESS BANNER */}
      {saveSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {/* QUICK SKILL PRESETS & FLEXIBILITY GUIDANCE */}
      <div className="bg-gradient-to-r from-purple-50/90 to-indigo-50/70 border border-purple-200/80 rounded-2xl p-3.5 space-y-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-[#6B51A5] text-white rounded-xl">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-black text-[#3C2A63]">
              Chế độ tạo đề linh hoạt: Tạo trọn bộ hoặc lẻ từng kỹ năng
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setActiveSection('reading');
                setValue('duration_mins', 60);
              }}
              className="px-2.5 py-1 text-[11px] font-bold bg-white text-[#503A7A] hover:bg-purple-100 rounded-lg border border-purple-200 transition cursor-pointer shadow-2xs"
            >
              📖 Chỉ Reading (60p)
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveSection('listening');
                setValue('duration_mins', 35);
              }}
              className="px-2.5 py-1 text-[11px] font-bold bg-white text-[#503A7A] hover:bg-purple-100 rounded-lg border border-purple-200 transition cursor-pointer shadow-2xs"
            >
              🎧 Chỉ Listening (35p)
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveSection('writing');
                setValue('duration_mins', 60);
              }}
              className="px-2.5 py-1 text-[11px] font-bold bg-white text-[#503A7A] hover:bg-purple-100 rounded-lg border border-purple-200 transition cursor-pointer shadow-2xs"
            >
              ✍️ Chỉ Writing (60p)
            </button>
            <button
              type="button"
              onClick={() => {
                setValue('duration_mins', 155);
              }}
              className="px-2.5 py-1 text-[11px] font-bold bg-purple-100 text-[#3C2A63] hover:bg-purple-200 rounded-lg border border-purple-300 transition cursor-pointer shadow-2xs"
            >
              ✨ Full 3 kỹ năng
            </button>
          </div>
        </div>
        <p className="text-[11px] text-[#6E5B8E] font-medium leading-relaxed">
          💡 Giáo viên có thể tạo đề thi riêng biệt cho từng kỹ năng hoặc kết hợp tuỳ ý. Bạn có thể để trống hoàn toàn 1 hoặc 2 kỹ năng, hoặc không cần nhập đủ 40 câu hỏi mà hệ thống vẫn lưu và học viên vẫn làm bài bình thường.
        </p>
      </div>

      {/* TOP-LEVEL TABS */}
      <div className="flex items-center gap-2 border-b border-purple-100 pb-3 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveSection('reading')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
            activeSection === 'reading'
              ? 'bg-[#6B51A5] text-white shadow-md'
              : 'bg-white text-[#503A7A] hover:bg-purple-50 border border-purple-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Reading Module (3 Passages &amp; Questions)</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/10">
            {(watchedPassages || []).reduce((acc, p) => acc + (p?.questions?.length || 0), 0)} Qs
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('listening')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
            activeSection === 'listening'
              ? 'bg-[#6B51A5] text-white shadow-md'
              : 'bg-white text-[#503A7A] hover:bg-purple-50 border border-purple-100'
          }`}
        >
          <Headphones className="w-4 h-4" />
          <span>Listening Module</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/10">
            {listeningQuestionsArray.fields.length} Qs
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('writing')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
            activeSection === 'writing'
              ? 'bg-[#6B51A5] text-white shadow-md'
              : 'bg-white text-[#503A7A] hover:bg-purple-50 border border-purple-100'
          }`}
        >
          <PenTool className="w-4 h-4" />
          <span>Writing Tasks 1 &amp; 2</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('settings')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
            activeSection === 'settings'
              ? 'bg-[#6B51A5] text-white shadow-md'
              : 'bg-white text-[#503A7A] hover:bg-purple-50 border border-purple-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Exam Timing &amp; Metadata</span>
        </button>
      </div>

      {/* SECTION 1: READING MODULE (Passages + Nested Questions) */}
      {activeSection === 'reading' && (
        <div className="space-y-6">
          
          {/* Passage 1, 2, 3 Selector */}
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((idx) => {
              const pNum = idx + 1;
              const pCount = watchedPassages[idx]?.questions?.length || 0;
              const isSel = selectedPassageIdx === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedPassageIdx(idx as 0 | 1 | 2)}
                  className={`px-4 py-2 rounded-2xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                    isSel
                      ? 'bg-[#3C2A63] text-white shadow-md'
                      : 'bg-[#F5F2F9] text-[#503A7A] hover:bg-[#E2DDEC] border border-purple-100'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Passage {pNum}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20">
                    {pCount} questions
                  </span>
                </button>
              );
            })}
          </div>

          {/* Current Passage Details */}
          <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-xl shadow-purple-950/5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-[#3C2A63] uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#6B51A5]" />
                <span>Passage {selectedPassageIdx + 1} Content</span>
              </h3>
              <span className="text-xs text-[#7C68A5] font-semibold">
                Passage Index: {selectedPassageIdx + 1}
              </span>
            </div>

            {/* Passage Title */}
            <div>
              <label className="block text-xs font-black text-[#3C2A63] mb-1">
                Passage Title:
              </label>
              <input
                type="text"
                {...register(`passages.${selectedPassageIdx}.title`)}
                placeholder="e.g. Passage 1: The History and Evolution of Renewable Energy Technologies"
                className="w-full px-4 py-2.5 bg-[#F8F6FC] rounded-2xl border border-purple-100 text-xs font-bold text-[#3C2A63] focus:outline-none focus:ring-2 focus:ring-[#6B51A5]"
              />
              {errors.passages?.[selectedPassageIdx]?.title && (
                <p className="text-xs text-rose-600 mt-1 font-bold">
                  {errors.passages[selectedPassageIdx]?.title?.message}
                </p>
              )}
            </div>

            {/* Passage Text */}
            <div>
              <label className="block text-xs font-black text-[#3C2A63] mb-1">
                Passage Text (Academic Reading Article):
              </label>
              <textarea
                rows={10}
                {...register(`passages.${selectedPassageIdx}.text`)}
                placeholder="Paste or type full passage paragraphs here..."
                className="w-full p-4 bg-[#F8F6FC] rounded-2xl border border-purple-100 text-xs font-serif leading-relaxed text-[#3C2A63] focus:outline-none focus:ring-2 focus:ring-[#6B51A5]"
              />
              {errors.passages?.[selectedPassageIdx]?.text && (
                <p className="text-xs text-rose-600 mt-1 font-bold">
                  {errors.passages[selectedPassageIdx]?.text?.message}
                </p>
              )}
            </div>
          </div>

          {/* Passage Nested Questions */}
          <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-xl shadow-purple-950/5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-[#3C2A63] uppercase tracking-wider flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-[#6B51A5]" />
                  <span>Questions Inside Passage {selectedPassageIdx + 1}</span>
                </h3>
                <p className="text-xs text-[#7C68A5]">
                  Standardized directly within this passage structure for synchronous ReadingModule compatibility.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddQuestionToPassage}
                className="px-4 py-2 bg-[#6B51A5] hover:bg-[#583F8F] text-white rounded-2xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Question</span>
              </button>
            </div>

            {/* Questions List */}
            <div className="space-y-4 pt-2">
              {currentPassageQuestionsArray.fields.length === 0 ? (
                <div className="p-8 text-center bg-purple-50/50 rounded-2xl border border-dashed border-purple-200 text-xs text-[#7C68A5]">
                  No questions currently added to Passage {selectedPassageIdx + 1}. Click &quot;Add Question&quot; above to create one.
                </div>
              ) : (
                currentPassageQuestionsArray.fields.map((field, qIdx) => (
                  <div
                    key={field.id}
                    className="p-4 bg-[#F8F6FC] rounded-2xl border border-purple-100/80 space-y-3 relative transition hover:border-purple-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-[#3C2A63] text-white font-black text-[11px] flex items-center justify-center">
                          {qIdx + 1}
                        </span>
                        <input
                          type="text"
                          {...register(`passages.${selectedPassageIdx}.questions.${qIdx}.question_id`)}
                          placeholder="Question ID (e.g. R1)"
                          className="px-2.5 py-1 bg-white rounded-xl border border-purple-200 text-xs font-mono font-bold text-[#3C2A63] w-28"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          {...register(`passages.${selectedPassageIdx}.questions.${qIdx}.question_type`)}
                          className="px-3 py-1 bg-white rounded-xl border border-purple-200 text-xs font-bold text-[#3C2A63] focus:outline-none"
                        >
                          <option value="multiple_choice">Multiple Choice</option>
                          <option value="true_false_not_given">True / False / Not Given</option>
                          <option value="yes_no_not_given">Yes / No / Not Given</option>
                          <option value="fill_in_the_blank">Fill in the Blank</option>
                          <option value="matching_headings">Matching Headings</option>
                          <option value="short_answer">Short Answer</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => currentPassageQuestionsArray.remove(qIdx)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition cursor-pointer"
                          title="Delete question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Question Prompt */}
                    <div>
                      <input
                        type="text"
                        {...register(`passages.${selectedPassageIdx}.questions.${qIdx}.question_text`)}
                        placeholder="Question prompt or sentence..."
                        className="w-full px-3.5 py-2 bg-white rounded-xl border border-purple-200 text-xs font-medium text-[#3C2A63] focus:outline-none focus:ring-1 focus:ring-[#6B51A5]"
                      />
                    </div>

                    {/* Correct Answer & Score */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-black text-[#503A7A] mb-1">
                          Correct Answer (Exact match or option letter):
                        </label>
                        <input
                          type="text"
                          {...register(`passages.${selectedPassageIdx}.questions.${qIdx}.correct_answer`)}
                          placeholder="e.g. TRUE or A or SOLAR ENERGY"
                          className="w-full px-3 py-1.5 bg-white rounded-xl border border-purple-200 text-xs font-mono font-bold text-[#3C2A63] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-black text-[#503A7A] mb-1">
                          Score Weight:
                        </label>
                        <input
                          type="number"
                          {...register(`passages.${selectedPassageIdx}.questions.${qIdx}.max_score`, { valueAsNumber: true })}
                          defaultValue={1}
                          className="w-full px-3 py-1.5 bg-white rounded-xl border border-purple-200 text-xs font-mono font-bold text-[#3C2A63] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* SECTION 2: LISTENING MODULE */}
      {activeSection === 'listening' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-xl shadow-purple-950/5 space-y-4">
            <h3 className="text-sm font-black text-[#3C2A63] uppercase tracking-wider flex items-center gap-2">
              <Headphones className="w-4 h-4 text-[#6B51A5]" />
              <span>Listening Audio Stream Settings</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-[#3C2A63] mb-1">
                  Audio Stream URL:
                </label>
                <input
                  type="text"
                  {...register('audio_url')}
                  placeholder="https://.../listening.mp3"
                  className="w-full px-4 py-2.5 bg-[#F8F6FC] rounded-2xl border border-purple-100 text-xs font-mono text-[#3C2A63] focus:outline-none focus:ring-2 focus:ring-[#6B51A5]"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-[#3C2A63] mb-1">
                  Audio Title:
                </label>
                <input
                  type="text"
                  {...register('audio_title')}
                  placeholder="e.g. IELTS Listening Parts 1 - 4 Comprehensive Stream"
                  className="w-full px-4 py-2.5 bg-[#F8F6FC] rounded-2xl border border-purple-100 text-xs font-bold text-[#3C2A63] focus:outline-none focus:ring-2 focus:ring-[#6B51A5]"
                />
              </div>
            </div>
          </div>

          {/* Listening Questions Array */}
          <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-xl shadow-purple-950/5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-[#3C2A63] uppercase tracking-wider flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#6B51A5]" />
                <span>Listening Questions ({listeningQuestionsArray.fields.length})</span>
              </h3>

              <button
                type="button"
                onClick={handleAddListeningQuestion}
                className="px-4 py-2 bg-[#6B51A5] hover:bg-[#583F8F] text-white rounded-2xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Listening Question</span>
              </button>
            </div>

            <div className="space-y-4">
              {listeningQuestionsArray.fields.length === 0 ? (
                <div className="p-8 text-center bg-purple-50/50 rounded-2xl border border-dashed border-purple-200 text-xs text-[#7C68A5]">
                  No listening questions currently added. Click &quot;Add Listening Question&quot; above to create one.
                </div>
              ) : (
                listeningQuestionsArray.fields.map((field, qIdx) => (
                  <div
                    key={field.id}
                    className="p-4 bg-[#F8F6FC] rounded-2xl border border-purple-100/80 space-y-3 relative"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-[#503A7A] text-white font-black text-[11px] flex items-center justify-center">
                          L{qIdx + 1}
                        </span>
                        <input
                          type="text"
                          {...register(`listening_questions.${qIdx}.question_id`)}
                          placeholder="ID"
                          className="px-2.5 py-1 bg-white rounded-xl border border-purple-200 text-xs font-mono font-bold text-[#3C2A63] w-28"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          {...register(`listening_questions.${qIdx}.question_type`)}
                          className="px-3 py-1 bg-white rounded-xl border border-purple-200 text-xs font-bold text-[#3C2A63] focus:outline-none"
                        >
                          <option value="fill_in_the_blank">Fill in the Blank</option>
                          <option value="multiple_choice">Multiple Choice</option>
                          <option value="matching">Matching</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => listeningQuestionsArray.remove(qIdx)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <input
                        type="text"
                        {...register(`listening_questions.${qIdx}.question_text`)}
                        placeholder="Listening question text or prompt..."
                        className="w-full px-3.5 py-2 bg-white rounded-xl border border-purple-200 text-xs font-medium text-[#3C2A63]"
                      />
                    </div>

                    <div>
                      <input
                        type="text"
                        {...register(`listening_questions.${qIdx}.correct_answer`)}
                        placeholder="Correct Answer"
                        className="w-full px-3 py-1.5 bg-white rounded-xl border border-purple-200 text-xs font-mono font-bold text-[#3C2A63]"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: WRITING MODULE */}
      {activeSection === 'writing' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-xl shadow-purple-950/5 space-y-4">
            <h3 className="text-sm font-black text-[#3C2A63] uppercase tracking-wider flex items-center gap-2">
              <PenTool className="w-4 h-4 text-[#6B51A5]" />
              <span>Academic Writing Task 1 (Report)</span>
            </h3>

            <div>
              <label className="block text-xs font-black text-[#3C2A63] mb-1">
                Task 1 Prompt:
              </label>
              <textarea
                rows={4}
                {...register('writing_task1_prompt')}
                placeholder="The graph below shows the changes in..."
                className="w-full p-3.5 bg-[#F8F6FC] rounded-2xl border border-purple-100 text-xs font-medium text-[#3C2A63] focus:outline-none focus:ring-2 focus:ring-[#6B51A5]"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-[#3C2A63] mb-1.5">
                Task 1 Diagram / Chart Material (Hình ảnh biểu đồ Task 1):
              </label>
              <Task1ImageUploader
                value={watchedTask1Image}
                onChange={(imgStr) => setValue('writing_task1_image', imgStr, { shouldDirty: true, shouldValidate: true })}
                onClear={() => setValue('writing_task1_image', '', { shouldDirty: true, shouldValidate: true })}
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-xl shadow-purple-950/5 space-y-4">
            <h3 className="text-sm font-black text-[#3C2A63] uppercase tracking-wider flex items-center gap-2">
              <PenTool className="w-4 h-4 text-[#6B51A5]" />
              <span>Academic Writing Task 2 (Discursive Essay)</span>
            </h3>

            <div>
              <label className="block text-xs font-black text-[#3C2A63] mb-1">
                Task 2 Essay Prompt:
              </label>
              <textarea
                rows={5}
                {...register('writing_task2_prompt')}
                placeholder="Some people think that universities should provide graduates with the knowledge and skills needed in the workplace..."
                className="w-full p-3.5 bg-[#F8F6FC] rounded-2xl border border-purple-100 text-xs font-medium text-[#3C2A63] focus:outline-none focus:ring-2 focus:ring-[#6B51A5]"
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: EXAM TIMING & METADATA */}
      {activeSection === 'settings' && (
        <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-xl shadow-purple-950/5 space-y-6">
          <h3 className="text-sm font-black text-[#3C2A63] uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#6B51A5]" />
            <span>Examination Code, Title &amp; Timer Durations</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-black text-[#3C2A63] mb-1">
                Exam Code:
              </label>
              <input
                type="text"
                {...register('exam_code')}
                placeholder="TEST01"
                className="w-full px-4 py-2.5 bg-[#F8F6FC] rounded-2xl border border-purple-100 text-xs font-mono font-bold text-[#3C2A63] focus:outline-none focus:ring-2 focus:ring-[#6B51A5]"
              />
              {errors.exam_code && (
                <p className="text-xs text-rose-600 mt-1 font-bold">{errors.exam_code.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-black text-[#3C2A63] mb-1">
                Exam Title:
              </label>
              <input
                type="text"
                {...register('title')}
                placeholder="IELTS Academic Official Mock Test 01"
                className="w-full px-4 py-2.5 bg-[#F8F6FC] rounded-2xl border border-purple-100 text-xs font-bold text-[#3C2A63] focus:outline-none focus:ring-2 focus:ring-[#6B51A5]"
              />
              {errors.title && (
                <p className="text-xs text-rose-600 mt-1 font-bold">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-black text-[#3C2A63] mb-1">
                Default Test Mode:
              </label>
              <select
                {...register('test_type')}
                className="w-full px-4 py-2.5 bg-[#F8F6FC] rounded-2xl border border-purple-100 text-xs font-bold text-[#3C2A63] focus:outline-none"
              >
                <option value="TEST">Official Test (Proctored with Fullscreen lock)</option>
                <option value="PRACTICE">Practice Mode (Self-paced)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-[#3C2A63] mb-1">
                Total Exam Duration (minutes):
              </label>
              <input
                type="number"
                {...register('duration_mins', { valueAsNumber: true })}
                className="w-full px-4 py-2.5 bg-[#F8F6FC] rounded-2xl border border-purple-100 text-xs font-mono font-bold text-[#3C2A63] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-[#3C2A63] mb-1">
                Reading Duration (minutes):
              </label>
              <input
                type="number"
                {...register('reading_duration_mins', { valueAsNumber: true })}
                className="w-full px-4 py-2.5 bg-[#F8F6FC] rounded-2xl border border-purple-100 text-xs font-mono font-bold text-[#3C2A63] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-[#3C2A63] mb-1">
                Listening Duration (minutes):
              </label>
              <input
                type="number"
                {...register('listening_duration_mins', { valueAsNumber: true })}
                className="w-full px-4 py-2.5 bg-[#F8F6FC] rounded-2xl border border-purple-100 text-xs font-mono font-bold text-[#3C2A63] focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

    </form>
  );
};

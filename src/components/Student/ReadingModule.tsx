import React, { useState, useRef } from 'react';
import { HighlightingTool, Question, ReadingPassageItem } from '../../types';
import { 
  Paintbrush, 
  Eraser, 
  MoveHorizontal, 
  CheckCircle, 
  ListChecks, 
  BookOpen, 
  HelpCircle, 
  FileText, 
  CheckCircle2, 
  AlertTriangle,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { CountdownTimer } from './CountdownTimer';

interface ReadingModuleProps {
  passageTitle?: string;
  passageText: string;
  passages?: ReadingPassageItem[];
  questions: Question[];
  userAnswers: Record<string, string>;
  onAnswerChange: (questionId: string, value: string) => void;
  testMode?: 'TEST' | 'PRACTICE';
  durationMins?: number;
}

export const ReadingModule: React.FC<ReadingModuleProps> = ({
  passageTitle,
  passageText,
  passages,
  questions,
  userAnswers,
  onAnswerChange,
  testMode = 'TEST',
  durationMins = 60
}) => {
  const [leftWidth, setLeftWidth] = useState(50); // 50% split default
  const [isResizing, setIsResizing] = useState(false);
  const [activeColor, setActiveColor] = useState<'yellow' | 'green' | 'blue'>('yellow');
  const [highlights, setHighlights] = useState<HighlightingTool[]>([]);
  const [activePassageIndex, setActivePassageIndex] = useState<1 | 2 | 3>(1);
  const passageContainerRef = useRef<HTMLDivElement | null>(null);

  // Group questions into standard IELTS Passages:
  // Passage 1: Q1 - Q13
  // Passage 2: Q14 - Q26
  // Passage 3: Q27 - Q40
  const getPassageForQuestion = (q: Question, idx: number): 1 | 2 | 3 => {
    if (q.passage_index && [1, 2, 3].includes(q.passage_index)) return q.passage_index as 1 | 2 | 3;
    if (idx < 13) return 1;
    if (idx < 26) return 2;
    return 3;
  };

  const questionsWithPassage = questions.map((q, idx) => ({
    ...q,
    computedPassage: getPassageForQuestion(q, idx),
    originalIndex: idx + 1
  }));

  const displayedQuestions = questionsWithPassage.filter(q => q.computedPassage === activePassageIndex);

  // Determine current active passage text and title
  const currentPassageData = passages && passages.length > 0
    ? (passages.find(p => p.passage_index === activePassageIndex) || passages[0])
    : {
        title: passageTitle || `Reading Passage ${activePassageIndex}`,
        text: passageText
      };

  // Handle Resizer Drag
  const handleMouseDown = () => {
    setIsResizing(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isResizing) return;
    const newWidth = (e.clientX / window.innerWidth) * 100;
    if (newWidth >= 25 && newWidth <= 75) {
      setLeftWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  // Multi-color highlighter logic
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) return;

    const selectedText = selection.toString().trim();
    if (selectedText.length < 2) return;

    const colorHexMap = {
      yellow: '#fef08a', // Tailwind yellow-200
      green: '#86efac',  // Tailwind green-300
      blue: '#93c5fd',   // Tailwind blue-300
    };

    const newHighlight: HighlightingTool = {
      id: 'hl_' + Date.now(),
      text: selectedText,
      color: activeColor,
      color_hex: colorHexMap[activeColor],
    };

    setHighlights((prev) => [...prev, newHighlight]);
    selection.removeAllRanges(); // clear selection box
  };

  const handleRemoveHighlight = (id: string) => {
    setHighlights((prev) => prev.filter((h) => h.id !== id));
  };

  const clearAllHighlights = () => {
    setHighlights([]);
  };

  // Helper to render passage with highlighted spans
  const renderHighlightedPassage = (textToRender: string) => {
    if (highlights.length === 0) {
      return (
        <div className="whitespace-pre-wrap leading-loose text-[#2D1E4B] font-serif text-[15px] font-medium space-y-4">
          {textToRender}
        </div>
      );
    }

    // Replace highlighted terms safely
    let htmlContent = textToRender;
    highlights.forEach((hl) => {
      const regex = new RegExp(`(${hl.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      htmlContent = htmlContent.replace(
        regex,
        `<mark style="background-color: ${hl.color_hex}; color: #0f172a; padding: 2px 4px; border-radius: 4px; font-weight: 600;">$1</mark>`
      );
    });

    return (
      <div
        className="whitespace-pre-wrap leading-loose text-[#2D1E4B] font-serif text-[15px] font-medium space-y-4"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    );
  };

  const scrollToQuestion = (questionId: string) => {
    const el = document.getElementById(`rq_box_${questionId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="space-y-4">
      
      {/* TOP COUNTDOWN TIMER BAR */}
      <CountdownTimer
        initialMinutes={durationMins}
        testMode={testMode}
        sectionName="ACADEMIC READING (40 Questions / 3 Passages)"
      />

      {/* PASSAGE TABS & QUESTION MATRIX BAR */}
      <div className="bg-white border border-purple-100/80 rounded-3xl p-4 shadow-xl shadow-purple-950/5 flex flex-wrap items-center justify-between gap-3">
        
        {/* 3 Passage Switcher Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {[1, 2, 3].map((pIdx) => {
            const pQuestions = questionsWithPassage.filter(q => q.computedPassage === pIdx);
            const answeredCount = pQuestions.filter(q => !!userAnswers[q.question_id]).length;
            const isActive = activePassageIndex === pIdx;

            return (
              <button
                key={pIdx}
                type="button"
                onClick={() => setActivePassageIndex(pIdx as 1 | 2 | 3)}
                className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-[#6B51A5] text-white shadow-md'
                    : 'bg-[#F5F2F9] text-[#503A7A] hover:bg-[#E2DDEC] border border-purple-100'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Passage {pIdx}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : answeredCount === pQuestions.length && pQuestions.length > 0
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-purple-200/80 text-[#503A7A]'
                }`}>
                  {answeredCount}/{pQuestions.length || 13}
                </span>
              </button>
            );
          })}
        </div>

        {/* Global Answered Summary */}
        <div className="text-xs text-[#7C68A5] font-medium flex items-center gap-3">
          <span>
            Answered: <strong className="text-[#6B51A5] font-black">{Object.keys(userAnswers).filter(k => questions.some(q => q.question_id === k && !!userAnswers[k])).length}</strong> / {questions.length} questions
          </span>
        </div>

      </div>

      {/* SPLIT SCREEN WORKSPACE */}
      <div
        className="flex flex-col md:flex-row h-[calc(100vh-13rem)] min-h-[580px] bg-white rounded-3xl border border-purple-100/80 overflow-hidden shadow-xl shadow-purple-950/5 select-none"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        
        {/* LEFT COLUMN: READING PASSAGE & MULTI-COLOR HIGHLIGHTER */}
        <div
          style={{ width: `${leftWidth}%` }}
          className="h-full flex flex-col bg-[#F8F6FC] border-r border-purple-100 overflow-hidden"
        >
          {/* Passage Toolbar */}
          <div className="p-3 bg-white border-b border-purple-100 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2">
              <Paintbrush className="w-4 h-4 text-[#6B51A5]" />
              <span className="text-xs font-extrabold text-[#3C2A63] uppercase tracking-wider">Highlight Tool:</span>
              
              {/* Color Pickers */}
              <div className="flex items-center space-x-1.5 ml-2">
                <button
                  type="button"
                  onClick={() => setActiveColor('yellow')}
                  className={`w-6 h-6 rounded-full bg-yellow-300 border-2 transition ${
                    activeColor === 'yellow' ? 'border-[#3C2A63] scale-110 shadow' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                  title="Yellow Highlight"
                />
                <button
                  type="button"
                  onClick={() => setActiveColor('green')}
                  className={`w-6 h-6 rounded-full bg-green-400 border-2 transition ${
                    activeColor === 'green' ? 'border-[#3C2A63] scale-110 shadow' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                  title="Green Highlight"
                />
                <button
                  type="button"
                  onClick={() => setActiveColor('blue')}
                  className={`w-6 h-6 rounded-full bg-blue-400 border-2 transition ${
                    activeColor === 'blue' ? 'border-[#3C2A63] scale-110 shadow' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                  title="Blue Highlight"
                />
              </div>
            </div>

            {highlights.length > 0 && (
              <button
                onClick={clearAllHighlights}
                className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
              >
                <Eraser className="w-3 h-3" />
                Clear {highlights.length} Highlights
              </button>
            )}
          </div>

          {/* Scrollable Passage Text */}
          <div
            ref={passageContainerRef}
            onMouseUp={handleTextSelection}
            className="flex-1 p-6 sm:p-8 overflow-y-auto select-text font-serif leading-relaxed text-[#3C2A63]"
          >
            <div className="mb-4 pb-3 border-b border-purple-200">
              <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-100 text-[#503A7A] uppercase tracking-wider">
                Passage {activePassageIndex}
              </span>
              <h2 className="text-xl font-extrabold text-[#3C2A63] font-sans mt-2">
                {currentPassageData.title}
              </h2>
            </div>
            {renderHighlightedPassage(currentPassageData.text)}
          </div>

          {/* Active Highlight Chips */}
          {highlights.length > 0 && (
            <div className="p-2.5 bg-white border-t border-purple-100 max-h-20 overflow-y-auto flex flex-wrap gap-1.5 text-xs shrink-0">
              {highlights.map((hl) => (
                <span
                  key={hl.id}
                  className="px-2.5 py-0.5 rounded-lg text-slate-950 font-bold flex items-center gap-1 shadow-sm text-[11px]"
                  style={{ backgroundColor: hl.color_hex }}
                >
                  <span className="max-w-[100px] truncate">{hl.text}</span>
                  <button
                    onClick={() => handleRemoveHighlight(hl.id)}
                    className="hover:text-rose-700 font-black ml-1 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* DRAGGABLE RESIZER BAR */}
        <div
          onMouseDown={handleMouseDown}
          className="w-2 bg-[#E2DDEC] hover:bg-[#6B51A5] cursor-col-resize flex items-center justify-center border-x border-purple-100 transition-all shrink-0"
          title="Drag to adjust split view ratio"
        >
          <MoveHorizontal className="w-3 h-3 text-[#7C68A5]" />
        </div>

        {/* RIGHT COLUMN: READING QUESTIONS */}
        <div
          style={{ width: `${100 - leftWidth}%` }}
          className="h-full flex flex-col bg-white overflow-hidden"
        >
          {/* Header & Question Matrix for active passage */}
          <div className="p-3.5 bg-[#F8F6FC] border-b border-purple-100 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <span className="text-xs font-extrabold text-[#3C2A63] uppercase tracking-wider">
              Passage {activePassageIndex} Questions ({displayedQuestions.length} questions)
            </span>

            {/* Quick jump question numbers */}
            <div className="flex flex-wrap gap-1">
              {displayedQuestions.map((q) => {
                const isAns = !!userAnswers[q.question_id];
                return (
                  <button
                    key={q.question_id}
                    type="button"
                    onClick={() => scrollToQuestion(q.question_id)}
                    className={`w-6 h-6 rounded-lg text-[10px] font-black transition cursor-pointer flex items-center justify-center ${
                      isAns
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#E2DDEC] hover:bg-[#D9D3E4] text-[#3C2A63]'
                    }`}
                    title={`Question ${q.originalIndex}`}
                  >
                    {q.originalIndex}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scrollable Questions List */}
          <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-6">
            {displayedQuestions.length === 0 ? (
              <p className="text-sm text-[#7C68A5] italic">No questions available for this section.</p>
            ) : (
              displayedQuestions.map((q) => {
                const isAnswered = !!userAnswers[q.question_id];

                return (
                  <div
                    key={q.question_id}
                    id={`rq_box_${q.question_id}`}
                    className={`p-5 rounded-2xl border transition-all ${
                      isAnswered
                        ? 'bg-[#F8F6FC] border-purple-200 shadow-sm'
                        : 'bg-[#FAF8FD] border-purple-100 hover:border-purple-300'
                    }`}
                  >
                    {/* Question Header & Type */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-start gap-2">
                        <span className="w-6 h-6 rounded-lg bg-[#6B51A5] text-white font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {q.originalIndex}
                        </span>
                        <span className="font-extrabold text-[#3C2A63] text-sm leading-relaxed">
                          {q.question_text}
                        </span>
                      </div>

                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-100 text-[#503A7A] font-extrabold uppercase border border-purple-200 shrink-0">
                        {q.question_type.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {/* Word Limit or Specific Instruction Banner */}
                    {(q.instruction || q.word_limit) && (
                      <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-900 font-semibold flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>{q.instruction || `Requirement: ${q.word_limit}`}</span>
                      </div>
                    )}

                    {/* DẠNG 1: MULTIPLE CHOICE (4 choices A, B, C, D) */}
                    {q.question_type === 'multiple_choice' && q.options && (
                      <div className="space-y-2 pt-1">
                        {q.options.map((opt) => {
                          const optLetter = opt.charAt(0);
                          const isSelected = userAnswers[q.question_id] === optLetter;
                          return (
                            <label
                              key={opt}
                              className={`flex items-center space-x-3 p-3 rounded-2xl border text-xs cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-[#6B51A5] border-[#6B51A5] text-white font-bold shadow-md'
                                  : 'bg-[#E2DDEC] border-purple-200/80 text-[#3C2A63] hover:bg-[#D9D3E4]'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`rq_${q.question_id}`}
                                value={optLetter}
                                checked={isSelected}
                                onChange={() => onAnswerChange(q.question_id, optLetter)}
                                className="w-4 h-4 text-[#6B51A5] bg-white border-purple-300 focus:ring-[#6B51A5]"
                              />
                              <span>{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* DẠNG 2: IDENTIFYING INFORMATION (TRUE / FALSE / NOT GIVEN) */}
                    {q.question_type === 'true_false_not_given' && (
                      <div className="space-y-2 pt-1">
                        <div className="flex flex-wrap gap-2">
                          {[
                            { val: 'TRUE', label: 'TRUE' },
                            { val: 'FALSE', label: 'FALSE' },
                            { val: 'NOT GIVEN', label: 'NOT GIVEN' }
                          ].map((item) => {
                            const isSelected = userAnswers[q.question_id] === item.val;
                            return (
                              <button
                                key={item.val}
                                type="button"
                                onClick={() => onAnswerChange(q.question_id, item.val)}
                                className={`px-4 py-2.5 rounded-2xl border text-xs font-black transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#6B51A5] text-white border-[#6B51A5] shadow-md scale-105'
                                    : 'bg-[#E2DDEC] border-purple-200 text-[#3C2A63] hover:bg-[#D9D3E4]'
                                }`}
                              >
                                {item.val}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* DẠNG 3: IDENTIFYING WRITER'S VIEWS/CLAIMS (YES / NO / NOT GIVEN) */}
                    {q.question_type === 'yes_no_not_given' && (
                      <div className="space-y-2 pt-1">
                        <div className="flex flex-wrap gap-2">
                          {[
                            { val: 'YES', label: 'YES' },
                            { val: 'NO', label: 'NO' },
                            { val: 'NOT GIVEN', label: 'NOT GIVEN' }
                          ].map((item) => {
                            const isSelected = userAnswers[q.question_id] === item.val;
                            return (
                              <button
                                key={item.val}
                                type="button"
                                onClick={() => onAnswerChange(q.question_id, item.val)}
                                className={`px-4 py-2.5 rounded-2xl border text-xs font-black transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105'
                                    : 'bg-[#E2DDEC] border-purple-200 text-[#3C2A63] hover:bg-[#D9D3E4]'
                                }`}
                              >
                                {item.val}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* DẠNG 4: MATCHING HEADINGS (List of Headings i, ii, iii, iv...) */}
                    {q.question_type === 'matching_headings' && (
                      <div className="space-y-3 pt-1">
                        <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-xs text-[#503A7A]">
                          <strong className="block mb-1.5 font-extrabold text-[#3C2A63]">List of Headings:</strong>
                          {q.headings_list && q.headings_list.length > 0 ? (
                            <div className="space-y-1">
                              {q.headings_list.map((hd) => (
                                <div key={hd.id} className="flex items-start gap-1.5 font-serif">
                                  <span className="font-bold text-[#6B51A5]">{hd.id}.</span>
                                  <span>{hd.text}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span>Select the Roman numeral heading (i, ii, iii, iv...) that best fits the paragraph.</span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'].map((roman) => {
                            const isSelected = userAnswers[q.question_id] === roman;
                            return (
                              <button
                                key={roman}
                                type="button"
                                onClick={() => onAnswerChange(q.question_id, roman)}
                                className={`w-9 h-9 rounded-xl border font-serif text-xs font-black transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#6B51A5] text-white border-[#6B51A5] shadow-md'
                                    : 'bg-[#E2DDEC] border-purple-200 text-[#3C2A63] hover:bg-[#D9D3E4]'
                                }`}
                              >
                                {roman}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* DẠNG 5: MATCHING INFORMATION (Paragraph A, B, C, D, E, F, G...) */}
                    {q.question_type === 'matching_information' && (
                      <div className="space-y-2 pt-1">
                        <span className="text-[11px] font-bold text-[#7C68A5] block">
                          Select the paragraph containing information (Paragraph A, B, C...):
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {['Paragraph A', 'Paragraph B', 'Paragraph C', 'Paragraph D', 'Paragraph E', 'Paragraph F', 'Paragraph G'].map((para) => {
                            const paraLetter = para.replace('Paragraph ', '');
                            const isSelected = userAnswers[q.question_id] === paraLetter;
                            return (
                              <button
                                key={para}
                                type="button"
                                onClick={() => onAnswerChange(q.question_id, paraLetter)}
                                className={`px-3.5 py-2 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#6B51A5] text-white border-[#6B51A5] shadow-md'
                                    : 'bg-[#E2DDEC] border-purple-200 text-[#3C2A63] hover:bg-[#D9D3E4]'
                                }`}
                              >
                                {para}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* DẠNG 6 & 7: MATCHING FEATURES & MATCHING SENTENCE ENDINGS */}
                    {(q.question_type === 'matching_features' || q.question_type === 'matching_sentence_endings' || q.question_type === 'matching') && (
                      <div className="space-y-2 pt-1">
                        {q.matching_options && q.matching_options.length > 0 ? (
                          <div className="space-y-1.5">
                            {q.matching_options.map((mOpt) => {
                              const isSelected = userAnswers[q.question_id] === mOpt.id;
                              return (
                                <button
                                  key={mOpt.id}
                                  type="button"
                                  onClick={() => onAnswerChange(q.question_id, mOpt.id)}
                                  className={`w-full p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                                    isSelected
                                      ? 'bg-[#6B51A5] text-white border-[#6B51A5] shadow-md'
                                      : 'bg-[#E2DDEC] border-purple-200 text-[#3C2A63] hover:bg-[#D9D3E4]'
                                  }`}
                                >
                                  <span><strong>{mOpt.id}.</strong> {mOpt.text}</span>
                                  {isSelected && <CheckCircle2 className="w-4 h-4 text-white shrink-0 ml-2" />}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((optL) => {
                              const isSelected = userAnswers[q.question_id] === optL;
                              return (
                                <button
                                  key={optL}
                                  type="button"
                                  onClick={() => onAnswerChange(q.question_id, optL)}
                                  className={`w-9 h-9 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-[#6B51A5] text-white border-[#6B51A5] shadow-md'
                                      : 'bg-[#E2DDEC] border-purple-200 text-[#3C2A63] hover:bg-[#D9D3E4]'
                                  }`}
                                >
                                  {optL}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* DẠNG 8, 9, 10, 11: SENTENCE COMPLETION / SUMMARY / TABLE / FLOW-CHART / DIAGRAM / SHORT-ANSWER */}
                    {(q.question_type === 'sentence_completion' ||
                      q.question_type === 'summary_completion' ||
                      q.question_type === 'diagram_label_completion' ||
                      q.question_type === 'short_answer_questions' ||
                      q.question_type === 'form_note_table_flowchart_completion' ||
                      q.question_type === 'fill_in_blank') && (
                      <div className="pt-1">
                        <input
                          type="text"
                          value={userAnswers[q.question_id] || ''}
                          onChange={(e) => onAnswerChange(q.question_id, e.target.value)}
                          placeholder="Type exact words extracted directly from the text..."
                          className="w-full px-4 py-3 bg-[#E2DDEC] border border-purple-200 rounded-2xl text-xs text-[#3C2A63] font-bold placeholder-[#7C68A5] focus:outline-none focus:ring-2 focus:ring-[#6B51A5] transition-all"
                        />
                      </div>
                    )}

                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

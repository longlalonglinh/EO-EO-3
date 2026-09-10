import React, { useState } from 'react';
import { Question } from '../../types';
import { 
  CheckCircle2, 
  AlertTriangle, 
  ChevronDown, 
  GripVertical, 
  X,
  FileText,
  HelpCircle,
  Sparkles
} from 'lucide-react';

interface IELTSQuestionCardProps {
  question: Question;
  questionNumber: number;
  userAnswer: string; // or comma separated string for multi-choice
  onAnswerChange: (questionId: string, answer: string) => void;
  headingsList?: { id: string; text: string }[];
}

export const IELTSQuestionCard: React.FC<IELTSQuestionCardProps> = ({
  question,
  questionNumber,
  userAnswer = '',
  onAnswerChange,
  headingsList = []
}) => {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  // Check if answer is filled
  const isFilled = Boolean(userAnswer && userAnswer.trim().length > 0);

  // Determine if question is multi-choice (Pick 2 or Pick 3)
  const isMultiSelect = question.question_type === 'multiple_choice_multi' || 
    (question.instruction && /choose (two|three|2|3)/i.test(question.instruction)) ||
    (question.word_limit && /choose (two|three|2|3)/i.test(question.word_limit));

  // Helper for multi-select answer toggling (stored as comma-separated, e.g. "A, B")
  const handleMultiSelectToggle = (letter: string) => {
    const currentList = userAnswer
      ? userAnswer.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
      : [];
    
    let newList: string[];
    if (currentList.includes(letter.toUpperCase())) {
      newList = currentList.filter(l => l !== letter.toUpperCase());
    } else {
      newList = [...currentList, letter.toUpperCase()].sort();
    }
    onAnswerChange(question.question_id, newList.join(', '));
  };

  // Check if option letter is selected in multi-select
  const isMultiSelected = (letter: string) => {
    if (!userAnswer) return false;
    const currentList = userAnswer.split(',').map(s => s.trim().toUpperCase());
    return currentList.includes(letter.toUpperCase());
  };

  // Clean heading / feature lists
  const availableHeadings = question.headings_list && question.headings_list.length > 0
    ? question.headings_list
    : headingsList;

  const isGapFill = [
    'sentence_completion',
    'summary_completion',
    'diagram_label_completion',
    'plan_map_diagram_labelling',
    'short_answer_questions',
    'form_note_table_flowchart_completion',
    'fill_in_blank'
  ].includes(question.question_type);

  let maxWords: number | null = null;
  if (isGapFill && question.word_limit) {
    const wl = question.word_limit.toLowerCase();
    if (wl.includes('one') || wl.includes('1')) maxWords = 1;
    else if (wl.includes('two') || wl.includes('2')) maxWords = 2;
    else if (wl.includes('three') || wl.includes('3')) maxWords = 3;
    else if (wl.includes('four') || wl.includes('4')) maxWords = 4;
  }
  const currentWordCount = userAnswer ? userAnswer.trim().split(/\s+/).filter(Boolean).length : 0;
  const isOverLimit = maxWords !== null && currentWordCount > maxWords;

  const wordBankItems: string[] = [];
  if (isGapFill) {
    if (question.options && question.options.length > 0) {
      wordBankItems.push(...question.options);
    } else if (question.matching_options && question.matching_options.length > 0) {
      wordBankItems.push(...question.matching_options.map(m => m.id));
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedData = e.dataTransfer.getData('text/plain');
    if (droppedData) {
      onAnswerChange(question.question_id, droppedData);
    }
  };

  // Inline Gap Filling renderer
  const renderQuestionTextInline = (text: string) => {
    // Only apply inline input for gap fill types
    if (!isGapFill) {
      return <span className="leading-relaxed">{text}</span>;
    }

    const blankRegex = /(_{3,}|\.{3,}|\[\.+\]|\[\s*_+\s*\])/g;
    const parts = text.split(blankRegex);

    if (parts.length === 1) {
      // No blank found, just return the text
      return <span className="leading-relaxed">{text}</span>;
    }

    let inputRendered = false;

    return (
      <span className="leading-loose">
        {parts.map((part, i) => {
          if (i % 2 !== 0) { // Odd index is the blank delimiter
            if (!inputRendered) {
              inputRendered = true;
              return (
                <input
                  key={i}
                  type="text"
                  value={userAnswer || ''}
                  onChange={(e) => onAnswerChange(question.question_id, e.target.value)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  placeholder="Type answer..."
                  className={`inline-block w-32 md:w-40 px-3 py-1.5 mx-1.5 text-sm bg-[#FAF4F8] border rounded-lg font-bold placeholder-[#A38DBE] focus:outline-none focus:ring-2 focus:bg-white text-center shadow-inner transition-all align-middle ${
                    isOverLimit ? 'border-rose-400 text-rose-700 focus:ring-rose-200' : 'border-pink-200 text-[#3C2A63] focus:ring-[#6B51A5]'
                  }`}
                />
              );
            } else {
              return <span key={i} className="px-2 text-slate-400">______</span>;
            }
          }
          return <span key={i}>{part}</span>;
        })}
      </span>
    );
  };

  return (
    <div
      id={`q_box_${question.question_id}`}
      className={`relative overflow-hidden p-5 md:p-6 rounded-3xl border transition-all space-y-4 shadow-sm ${
        isFilled
          ? 'bg-[#F8F6FC] border-purple-200/90 shadow-purple-950/5'
          : 'bg-[#FAF8FD] border-purple-100 hover:border-purple-300'
      }`}
    >
      {/* RED THEME - Instruction or Word Limit Banner */}
      {(question.instruction || question.word_limit) && (
        <div className="px-5 py-2.5 bg-[#D32F2F] text-white text-xs md:text-sm font-bold flex items-center gap-2 -mx-5 -mt-5 mb-4 md:-mx-6 md:-mt-6 shadow-sm">
          <span>{question.instruction || `Requirement: ${question.word_limit}`}</span>
        </div>
      )}

      {/* Question Header Badge & Type */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <span className="w-7 h-7 rounded-xl bg-[#503A7A] text-white font-black text-xs flex items-center justify-center font-mono shrink-0 shadow-sm">
            {questionNumber}
          </span>
          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-100 text-[#503A7A] font-extrabold uppercase border border-purple-200 shrink-0">
            {question.question_type.replace(/_/g, ' ')}
          </span>
          {isMultiSelect && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-extrabold border border-indigo-200">
              MULTIPLE CHOICES
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {isFilled && (
            <span className="flex items-center space-x-1 text-emerald-800 bg-emerald-100 border border-emerald-200 text-xs font-bold px-2.5 py-0.5 rounded-xl">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>Answered</span>
            </span>
          )}
        </div>
      </div>

      {/* Question Main Text */}
      {question.question_text && (
        <div className="font-extrabold text-[#3C2A63] text-sm md:text-base">
          {renderQuestionTextInline(question.question_text)}
        </div>
      )}

      {/* Word Bank (Drag & Drop) */}
      {isGapFill && wordBankItems.length > 0 && (
        <div className="mt-4 p-4 bg-[#F8F6FC] rounded-2xl border border-purple-200 shadow-sm">
          <div className="text-xs font-extrabold text-[#503A7A] mb-3 uppercase tracking-wider flex items-center gap-2">
            <GripVertical className="w-4 h-4" />
            Word Bank (Drag &amp; drop into blank)
          </div>
          <div className="flex flex-wrap gap-2.5">
            {wordBankItems.map((opt, oIdx) => (
              <div
                key={oIdx}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', opt);
                }}
                className="px-4 py-2 bg-white border border-purple-200 rounded-xl text-sm font-bold text-[#3C2A63] cursor-grab active:cursor-grabbing hover:border-[#6B51A5] hover:shadow-md transition-all select-none"
              >
                {opt}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Word Limit Warning Message */}
      {isGapFill && isOverLimit && (
        <div className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4" />
          You entered {currentWordCount} words (Exceeds limit of {maxWords} words).
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. MULTIPLE CHOICE (RADIO / CHECKBOX SELECTION)           */}
      {/* ========================================================= */}
      {(question.question_type === 'multiple_choice' || question.question_type === 'multiple_choice_multi') && question.options && (
        <div className="space-y-2.5 pt-1">
          {isMultiSelect ? (
            // MULTI-SELECT (CHECKBOX - CHOOSE MULTIPLE OPTIONS)
            <div className="space-y-2">
              <span className="text-xs text-[#7C68A5] font-bold block mb-1">
                Check all applicable options (Multiple selections allowed):
              </span>
              {question.options.map((opt, optIdx) => {
                const letterMatch = opt.match(/^([A-Z])[\.\s]/);
                const letter = letterMatch ? letterMatch[1] : String.fromCharCode(65 + optIdx);
                const isChecked = isMultiSelected(letter);

                return (
                  <label
                    key={optIdx}
                    className={`flex items-center space-x-3 p-3.5 rounded-2xl border text-xs md:text-sm cursor-pointer transition-all ${
                      isChecked
                        ? 'bg-[#6B51A5] border-[#6B51A5] text-white font-bold shadow-md'
                        : 'bg-white border-purple-200/80 text-[#3C2A63] hover:bg-[#F3EFF9]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleMultiSelectToggle(letter)}
                      className="w-4 h-4 rounded text-[#6B51A5] border-purple-300 focus:ring-[#6B51A5]"
                    />
                    <span className="flex-1">{opt}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            // SINGLE-SELECT (RADIO BUTTON - CHOOSE ONE OPTION)
            <div className="space-y-2">
              {question.options.map((opt, optIdx) => {
                const letterMatch = opt.match(/^([A-Z])[\.\s]/);
                const letter = letterMatch ? letterMatch[1] : String.fromCharCode(65 + optIdx);
                const isSelected = userAnswer.trim().toUpperCase() === letter.toUpperCase() || userAnswer.trim() === opt.trim();

                return (
                  <label
                    key={optIdx}
                    className={`flex items-center space-x-3 p-3.5 rounded-2xl border text-xs md:text-sm cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#6B51A5] border-[#6B51A5] text-white font-bold shadow-md'
                        : 'bg-white border-purple-200/80 text-[#3C2A63] hover:bg-[#F3EFF9]'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`radio_q_${question.question_id}`}
                      checked={isSelected}
                      onChange={() => onAnswerChange(question.question_id, letter)}
                      className="w-4 h-4 text-[#6B51A5] border-purple-300 focus:ring-[#6B51A5]"
                    />
                    <span className="flex-1">{opt}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. TRUE / FALSE / NOT GIVEN & YES / NO / NOT GIVEN        */}
      {/* ========================================================= */}
      {(question.question_type === 'true_false_not_given' || question.question_type === 'yes_no_not_given') && (
        <div className="space-y-3 pt-1">
          {/* Only keep Radio Options for 1 single method constraint */}
          <div className="flex flex-wrap items-center gap-2.5">
            {(question.question_type === 'true_false_not_given' 
              ? ['TRUE', 'FALSE', 'NOT GIVEN'] 
              : ['YES', 'NO', 'NOT GIVEN']
            ).map((val) => {
              const isSelected = userAnswer.trim().toUpperCase() === val;
              return (
                <label
                  key={val}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-black transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#6B51A5] text-white border-[#6B51A5] shadow-md scale-105 ring-2 ring-purple-300'
                      : 'bg-white border-purple-200 text-[#3C2A63] hover:bg-[#F3EFF9]'
                  }`}
                >
                  <input
                    type="radio"
                    name={`tfng_${question.question_id}`}
                    checked={isSelected}
                    onChange={() => onAnswerChange(question.question_id, val)}
                    className="w-3.5 h-3.5 text-[#6B51A5]"
                  />
                  <span>{val}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. MATCHING HEADINGS (LIST OF HEADINGS & DASHED DROP BOX) */}
      {/* ========================================================= */}
      {question.question_type === 'matching_headings' && (
        <div className="space-y-3 pt-1">
          {/* List of Headings Display Box */}
          {availableHeadings && availableHeadings.length > 0 && (
            <div className="p-4 bg-purple-50/90 rounded-2xl border border-purple-200 text-xs text-[#503A7A]">
              <strong className="block mb-2 font-extrabold text-[#3C2A63] flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#6B51A5]" />
                LIST OF HEADINGS
              </strong>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableHeadings.map((hd) => (
                  <div 
                    key={hd.id}
                    draggable
                    onDragStart={() => setDraggedItem(hd.id)}
                    onClick={() => onAnswerChange(question.question_id, hd.id)}
                    className="p-2 bg-white rounded-xl border border-purple-100 shadow-sm flex items-start gap-2 cursor-grab active:cursor-grabbing hover:border-purple-300 transition"
                  >
                    <span className="font-bold text-[#6B51A5] font-serif shrink-0">{hd.id}.</span>
                    <span className="text-[#3C2A63] font-medium leading-tight">{hd.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Single method: Dashed Drop Box (Removed quick buttons) */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-[#7C68A5] block">
              Drag and drop heading (or click) into the box below:
            </span>

            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedItem) {
                  onAnswerChange(question.question_id, draggedItem);
                  setDraggedItem(null);
                }
              }}
              className={`p-4 rounded-2xl border-2 border-dashed transition flex flex-wrap items-center justify-between gap-3 ${
                userAnswer
                  ? 'border-[#6B51A5] bg-purple-50/50'
                  : 'border-purple-300 bg-white hover:border-purple-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-[#7C68A5]">SELECTED:</span>
                {userAnswer ? (
                  <span className="px-3 py-1 bg-[#6B51A5] text-white rounded-xl text-xs font-black font-serif shadow-sm">
                    {userAnswer}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 italic font-medium">[ Drop heading into this box ]</span>
                )}
              </div>

              {userAnswer && (
                <button
                  type="button"
                  onClick={() => onAnswerChange(question.question_id, '')}
                  className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. MATCHING FEATURES / INFO / SENTENCE ENDINGS (BUBBLES ONLY)  */}
      {/* ========================================================= */}
      {(question.question_type === 'matching_features' || 
        question.question_type === 'matching_information' || 
        question.question_type === 'matching_sentence_endings' || 
        question.question_type === 'matching') && (
        <div className="space-y-3 pt-1">
          {/* Display options box if matching_options exist */}
          {question.matching_options && question.matching_options.length > 0 && (
            <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-200 text-xs space-y-1.5">
              <strong className="block text-[#3C2A63] font-extrabold mb-1">LIST OF OPTIONS:</strong>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {question.matching_options.map((mOpt) => (
                  <div key={mOpt.id} className="flex items-start gap-1.5">
                    <span className="font-extrabold text-[#6B51A5]">{mOpt.id}.</span>
                    <span className="text-[#3C2A63] font-medium">{mOpt.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Only Bubble buttons (removed redundant Dropdown) */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-[#7C68A5]">Select corresponding letter:</span>
            <div className="flex flex-wrap gap-2">
              {(question.matching_options && question.matching_options.length > 0
                ? question.matching_options.map(o => o.id)
                : ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
              ).map((optKey) => {
                const isSelected = userAnswer.toUpperCase() === optKey.toUpperCase();
                return (
                  <button
                    key={optKey}
                    type="button"
                    onClick={() => onAnswerChange(question.question_id, optKey)}
                    className={`w-10 h-10 rounded-full border text-sm font-black transition cursor-pointer flex items-center justify-center ${
                      isSelected
                        ? 'bg-[#6B51A5] text-white border-[#6B51A5] shadow-md scale-105'
                        : 'bg-white border-purple-200 text-[#3C2A63] hover:bg-[#F3EFF9]'
                    }`}
                  >
                    {optKey}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5, 6, 7. GAP FILLING, DIAGRAM & SHORT ANSWER TEXT INPUTS  */}
      {/* ========================================================= */}
      {(question.question_type === 'sentence_completion' ||
        question.question_type === 'summary_completion' ||
        question.question_type === 'diagram_label_completion' ||
        question.question_type === 'plan_map_diagram_labelling' ||
        question.question_type === 'short_answer_questions' ||
        question.question_type === 'form_note_table_flowchart_completion' ||
        question.question_type === 'fill_in_blank') && (
        <div className="space-y-2 pt-1">
          {/* Only render fallback input if no inline blank was found (handled by renderQuestionTextInline) */}
          {(!question.question_text || question.question_text.split(/(_{3,}|\.{3,}|\[\.+\]|\[\s*_+\s*\])/g).length === 1) && (
            <div className="relative">
              <input
                type="text"
                value={userAnswer || ''}
                onChange={(e) => onAnswerChange(question.question_id, e.target.value)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                placeholder="Type answer here (Copy & paste or drag & drop allowed)..."
                className={`w-full px-4 py-3 bg-[#FAF4F8] border rounded-2xl text-xs sm:text-sm font-bold placeholder-[#A38DBE] focus:outline-none focus:ring-2 focus:bg-white transition-all shadow-inner ${
                  isOverLimit ? 'border-rose-400 text-rose-700 focus:ring-rose-200' : 'border-pink-200/90 text-[#3C2A63] focus:ring-[#6B51A5]'
                }`}
              />
              <span className="text-[11px] text-[#7C68A5] italic font-medium block mt-2">
                * Tip: You can copy text from the reading passage, paste, or drag and drop directly into the blank.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


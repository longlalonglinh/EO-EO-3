import React, { useState, useEffect, useRef } from 'react';
import { PracticeCard } from '../../../types/practice';
import { 
  Volume2, 
  Check, 
  X, 
  HelpCircle, 
  ArrowRight, 
  RotateCcw, 
  Lightbulb, 
  Star, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  KeyRound,
  ShieldCheck,
  ChevronRight,
  BookOpen
} from 'lucide-react';

interface PracticeCardViewProps {
  card: PracticeCard;
  cardIndex: number;
  totalCards: number;
  onNext: (isCorrect: boolean) => void;
  onPrev?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  isMastered?: boolean;
}

export const PracticeCardView: React.FC<PracticeCardViewProps> = ({
  card,
  cardIndex,
  totalCards,
  onNext,
  onPrev,
  isFirst = false,
  isLast = false,
  isMastered = false
}) => {
  const [userInput, setUserInput] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);

  // Reset state when card changes
  useEffect(() => {
    setUserInput('');
    setIsSubmitted(false);
    setIsCorrect(false);
    setShowHint(false);
    setShowExplanation(false);

    // Auto-focus input on card transition
    setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
  }, [card.id]);

  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.88;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleCheckAnswer = (e?: React.FormEvent, overrideInput?: string) => {
    if (e) e.preventDefault();
    if (isSubmitted) {
      // If already submitted, next card
      onNext(isCorrect);
      return;
    }

    const trimmed = (overrideInput !== undefined ? overrideInput : userInput).trim().toLowerCase();
    if (!trimmed) return;

    // Check against target & accepted answers
    const validAnswers = [
      card.cloze_target.toLowerCase().trim(),
      ...(card.accepted_answers || []).map(a => a.toLowerCase().trim())
    ];

    const correct = validAnswers.some(ans => ans === trimmed);
    setIsCorrect(correct);
    setIsSubmitted(true);
    setShowExplanation(true);

    // Speak sentence on submission
    const completeSentence = card.sentence_en.replace(/_+/g, card.cloze_target);
    handleSpeak(completeSentence);
  };

  const handleSelectOption = (opt: string) => {
    if (isSubmitted) return;
    setUserInput(opt);
    // Instant submission and immediate explanation box on option click
    handleCheckAnswer(undefined, opt);
  };

  // Render sentence with cloze gap
  const renderSentenceWithInput = () => {
    const parts = card.sentence_en.split(/_+/);
    if (parts.length < 2) {
      return (
        <div className="text-base md:text-lg font-medium text-slate-100">
          {card.sentence_en}
        </div>
      );
    }

    return (
      <div className="text-lg md:text-2xl font-medium text-slate-100 leading-loose flex flex-wrap items-center gap-x-2 gap-y-3 font-sans">
        <span>{parts[0]}</span>
        
        {/* Inline Cloze Input / Result */}
        <span className="inline-flex items-center relative">
          <input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={(e) => !isSubmitted && setUserInput(e.target.value)}
            disabled={isSubmitted}
            placeholder={card.target_word ? `${card.target_word.charAt(0)}...` : '...'}
            className={`min-w-[140px] max-w-[220px] px-3.5 py-1.5 rounded-xl text-center font-bold text-lg md:text-xl border transition-all duration-200 focus:outline-none ${
              !isSubmitted
                ? 'bg-slate-900 border-indigo-500/60 text-indigo-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30'
                : isCorrect
                ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/20'
                : 'bg-rose-950/60 border-rose-500 text-rose-300 shadow-md shadow-rose-500/20 line-through'
            }`}
          />

          {isSubmitted && !isCorrect && (
            <span className="ml-2 px-3 py-1 bg-emerald-900/80 border border-emerald-500 rounded-xl text-emerald-200 font-bold text-base md:text-lg animate-fade-in font-sans">
              {card.cloze_target}
            </span>
          )}
        </span>

        <span>{parts.slice(1).join(' ')}</span>
      </div>
    );
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4 animate-fade-in">
      
      {/* Main Flashcard Container */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-md relative overflow-hidden">
        
        {/* Subtle Ambient Glow */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Card Header */}
        <div className="relative z-10 flex items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div className="flex items-center space-x-3">
            <span className="px-3 py-1 bg-slate-800 border border-slate-700 text-slate-300 font-mono text-xs font-bold rounded-xl">
              Card {cardIndex + 1} / {totalCards}
            </span>

            {card.part_of_speech && (
              <span className="px-2.5 py-0.5 bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 text-xs font-semibold rounded-lg uppercase">
                {card.part_of_speech}
              </span>
            )}

            {isMastered && (
              <span className="flex items-center space-x-1 px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold rounded-lg">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>Mastered</span>
              </span>
            )}
          </div>
        </div>

        {/* Card Body */}
        <div className="relative z-10 py-8 space-y-6">
          
          {/* Vietnamese Translation / Meaning Guide */}
          <div className="flex items-start justify-between gap-3 p-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Nghĩa câu / Ngữ cảnh tiếng Việt:
              </span>
              <p className="text-sm md:text-base font-medium text-slate-200 leading-relaxed">
                {card.sentence_vi}
              </p>
              {card.hints && showHint && (
                <p className="text-xs text-amber-300 mt-2 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 shrink-0" />
                  <span>Gợi ý: {card.hints}</span>
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              {!showHint && card.hints && (
                <button
                  onClick={() => setShowHint(true)}
                  className="p-2 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded-xl transition text-xs flex items-center gap-1"
                  title="Xem gợi ý từ loại / nghĩa"
                >
                  <Lightbulb className="w-4 h-4" />
                </button>
              )}
              
              <button
                onClick={() => handleSpeak(card.sentence_en.replace(/_+/g, card.cloze_target))}
                className="p-2 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 rounded-xl transition"
                title="Nghe phát âm chuẩn"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Interactive Sentence with Cloze Gap */}
          <form onSubmit={handleCheckAnswer} className="space-y-6">
            <div className="p-6 bg-slate-950/90 border border-slate-800 rounded-2xl">
              {renderSentenceWithInput()}
            </div>

            {/* Multiple Choice Options */}
            {card.options && card.options.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {isSubmitted ? 'Các lựa chọn đáp án:' : 'Chọn đáp án nhanh:'}
                </span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  {card.options.map((opt, idx) => {
                    const optLower = opt.toLowerCase().trim();
                    const isTarget = optLower === card.cloze_target.toLowerCase().trim() || 
                      (card.accepted_answers || []).some(a => a.toLowerCase().trim() === optLower);
                    const isUserChoice = userInput.toLowerCase().trim() === optLower;

                    let btnStyle = 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800 hover:border-slate-600 hover:text-white cursor-pointer';

                    if (isSubmitted) {
                      if (isTarget) {
                        btnStyle = 'bg-emerald-900/60 border-emerald-500 text-emerald-300 font-bold shadow-sm shadow-emerald-500/20';
                      } else if (isUserChoice && !isCorrect) {
                        btnStyle = 'bg-rose-950/60 border-rose-500 text-rose-300 line-through opacity-80';
                      } else {
                        btnStyle = 'bg-slate-900/50 border-slate-800 text-slate-500 opacity-60';
                      }
                    } else if (isUserChoice) {
                      btnStyle = 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20';
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectOption(opt)}
                        disabled={isSubmitted}
                        className={`p-3 text-xs font-semibold rounded-xl border text-center transition flex items-center justify-center gap-1.5 ${btnStyle}`}
                      >
                        {isSubmitted && isTarget && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        {isSubmitted && isUserChoice && !isCorrect && <X className="w-3.5 h-3.5 text-rose-400" />}
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-slate-500">
                {!isSubmitted ? (
                  <span>Nhấn <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono text-[10px]">Enter</kbd> để kiểm tra đáp án</span>
                ) : (
                  <span>Nhấn <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono text-[10px]">Enter</kbd> hoặc nút kế tiếp để qua câu mới</span>
                )}
              </div>

              <div className="flex items-center space-x-3">
                {!isSubmitted ? (
                  <button
                    type="submit"
                    disabled={!userInput.trim()}
                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-40 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 flex items-center space-x-2 transition"
                  >
                    <span>Kiểm tra</span>
                    <Check className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onNext(isCorrect)}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center space-x-2 transition"
                  >
                    <span>{isLast ? 'Hoàn thành bài ôn' : 'Câu tiếp theo'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </form>

          {/* Explanation Drawer after submission */}
          {showExplanation && (
            <div className={`p-5 rounded-2xl border transition-all animate-fade-in space-y-3 ${
              isCorrect
                ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-200'
                : 'bg-rose-950/30 border-rose-800/50 text-rose-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 font-bold text-sm">
                  {isCorrect ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span>Chính xác! Cấu trúc câu rất chuẩn.</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-rose-400" />
                      <span>Chưa chính xác. Đáp án đúng là: <strong>{card.cloze_target}</strong></span>
                    </>
                  )}
                </div>
              </div>

              {card.explanation && (
                <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-sans pt-1">
                  {card.explanation}
                </p>
              )}

              {card.grammar_points && card.grammar_points.length > 0 && (
                <div className="pt-2 border-t border-slate-800/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Điểm ngữ pháp cần nhớ:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {card.grammar_points.map((pt, idx) => (
                      <span key={idx} className="text-xs px-2.5 py-1 bg-slate-900/80 border border-slate-700/80 rounded-lg text-indigo-300 font-medium">
                        ✓ {pt}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

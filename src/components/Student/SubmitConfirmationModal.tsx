import React from 'react';
import { AlertTriangle, CheckCircle2, X, Send, Headphones, BookOpen, FileText } from 'lucide-react';

interface SubmitConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSubmit: () => void;
  isSubmitting: boolean;
  totalListening: number;
  answeredListening: number;
  totalReading: number;
  answeredReading: number;
  hasListening: boolean;
  hasReading: boolean;
  hasWriting: boolean;
  writingTask1Words: number;
  writingTask2Words: number;
}

export const SubmitConfirmationModal: React.FC<SubmitConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirmSubmit,
  isSubmitting,
  totalListening,
  answeredListening,
  totalReading,
  answeredReading,
  hasListening,
  hasReading,
  hasWriting,
  writingTask1Words,
  writingTask2Words
}) => {
  if (!isOpen) return null;

  const totalQuestions = (hasListening ? totalListening : 0) + (hasReading ? totalReading : 0);
  const totalAnswered = (hasListening ? answeredListening : 0) + (hasReading ? answeredReading : 0);
  const unansweredCount = Math.max(0, totalQuestions - totalAnswered);

  const hasWritingWarnings = hasWriting && (
    (writingTask1Words > 0 && writingTask1Words < 150) || 
    (writingTask2Words > 0 && writingTask2Words < 250) ||
    (writingTask1Words === 0 && writingTask2Words === 0)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white border border-purple-100 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl shadow-purple-950/20 space-y-6 relative"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-purple-100 text-[#503A7A] rounded-2xl shrink-0">
            <Send className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-[#3C2A63]">
              Submit Examination?
            </h3>
            <p className="text-xs text-[#7C68A5] font-medium">
              Please review your completion status before final submission.
            </p>
          </div>
        </div>

        {/* Completion Progress Cards */}
        <div className="space-y-3">
          {hasListening && (
            <div className="p-3.5 bg-[#FAF8FE] border border-purple-100 rounded-2xl flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Headphones className="w-4 h-4 text-[#6B51A5]" />
                <span className="text-xs font-bold text-[#3C2A63]">Listening Section</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-extrabold text-[#503A7A] font-mono">
                  {answeredListening} / {totalListening} answered
                </span>
                {answeredListening === totalListening ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                    {totalListening - answeredListening} left
                  </span>
                )}
              </div>
            </div>
          )}

          {hasReading && (
            <div className="p-3.5 bg-[#FAF8FE] border border-purple-100 rounded-2xl flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <BookOpen className="w-4 h-4 text-[#6B51A5]" />
                <span className="text-xs font-bold text-[#3C2A63]">Reading Section</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-extrabold text-[#503A7A] font-mono">
                  {answeredReading} / {totalReading} answered
                </span>
                {answeredReading === totalReading ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                    {totalReading - answeredReading} left
                  </span>
                )}
              </div>
            </div>
          )}

          {hasWriting && (
            <div className="p-3.5 bg-[#FAF8FE] border border-purple-100 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <FileText className="w-4 h-4 text-[#6B51A5]" />
                  <span className="text-xs font-bold text-[#3C2A63]">Academic Writing</span>
                </div>
                <span className="text-xs font-bold text-[#7C68A5]">Task 1 &amp; 2</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-purple-100/60">
                <div className="bg-white p-2 rounded-xl border border-purple-100">
                  <span className="text-[10px] text-[#7C68A5] block font-semibold">Task 1 (Target 150+)</span>
                  <span className={`font-black font-mono ${writingTask1Words >= 150 ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {writingTask1Words} words
                  </span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-purple-100">
                  <span className="text-[10px] text-[#7C68A5] block font-semibold">Task 2 (Target 250+)</span>
                  <span className={`font-black font-mono ${writingTask2Words >= 250 ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {writingTask2Words} words
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Warning If Questions Left Unanswered */}
        {unansweredCount > 0 && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start space-x-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">You have {unansweredCount} unanswered questions.</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                In IELTS, there is no penalty for wrong answers. We strongly encourage guessing all questions before submitting.
              </p>
            </div>
          </div>
        )}

        {/* Writing warning if empty or very short */}
        {hasWritingWarnings && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-2.5 text-xs text-rose-900">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Writing essays are below recommended word counts.</p>
              <p className="text-[11px] text-rose-700 mt-0.5">
                Ensure both Task 1 (150 words) and Task 2 (250 words) are adequately developed to avoid band score penalties.
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-[#F5F2F9] hover:bg-[#E2DDEC] text-[#503A7A] font-extrabold text-xs rounded-xl border border-purple-200 transition cursor-pointer"
          >
            Keep Working
          </button>

          <button
            type="button"
            onClick={onConfirmSubmit}
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-[#6B51A5] hover:bg-[#503A7A] text-white font-black text-xs rounded-xl shadow-md shadow-purple-950/20 transition flex items-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Submitting...' : 'Confirm Final Submission'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

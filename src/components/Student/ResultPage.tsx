import React from 'react';
import { Award, CheckCircle2, Clock, RotateCcw, FileText, Headphones, BookOpen, AlertCircle, Sparkles, Home, ArrowLeft } from 'lucide-react';
import { SubmissionResponse } from '../../types';

interface ResultPageProps {
  result: SubmissionResponse;
  testMode: 'TEST' | 'PRACTICE';
  onRestartPractice?: () => void;
  onReturnHome?: () => void;
}

export const ResultPage: React.FC<ResultPageProps> = ({
  result,
  testMode,
  onRestartPractice,
  onReturnHome
}) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-8 px-4">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#6B51A5] via-[#503A7A] to-[#3C2A63] border border-purple-200 rounded-3xl p-8 shadow-xl text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Award className="w-64 h-64 text-white" />
        </div>

        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 bg-white/20 text-white rounded-full border border-white/30 text-xs font-extrabold uppercase tracking-wider backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-purple-200" />
            <span>EXAMINATION SUBMISSION RESULT</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-black text-white">
            EXAM COMPLETED SUCCESSFULLY!
          </h1>
          <p className="text-sm text-purple-100 max-w-xl mx-auto font-medium">
            Submission ID: <strong className="text-white font-bold">{result.submission_id}</strong>
          </p>
        </div>
      </div>

      {/* Raw Score Display Cards (Listening & Reading) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Listening Raw Score */}
        <div className="bg-white border border-purple-100/80 rounded-3xl p-6 shadow-xl shadow-purple-950/5 flex flex-col items-center justify-between text-center space-y-4 hover:border-emerald-300 transition-all">
          <div className="p-4 bg-emerald-100 text-emerald-800 rounded-2xl border border-emerald-200">
            <Headphones className="w-8 h-8" />
          </div>

          <div>
            <h4 className="text-xs font-extrabold text-[#7C68A5] uppercase tracking-wider">LISTENING RAW SCORE</h4>
            <div className="text-4xl font-black text-emerald-700 mt-2">
              {result.listening_score} <span className="text-xl text-[#7C68A5]">/ 40</span>
            </div>
          </div>

          <span className="text-[11px] text-emerald-800 font-extrabold bg-emerald-100 px-3.5 py-1 rounded-full border border-emerald-200">
            Server-side Auto-Graded
          </span>
        </div>

        {/* Reading Raw Score */}
        <div className="bg-white border border-purple-100/80 rounded-3xl p-6 shadow-xl shadow-purple-950/5 flex flex-col items-center justify-between text-center space-y-4 hover:border-purple-300 transition-all">
          <div className="p-4 bg-purple-100 text-[#503A7A] rounded-2xl border border-purple-200">
            <BookOpen className="w-8 h-8" />
          </div>

          <div>
            <h4 className="text-xs font-extrabold text-[#7C68A5] uppercase tracking-wider">READING RAW SCORE</h4>
            <div className="text-4xl font-black text-[#6B51A5] mt-2">
              {result.reading_score} <span className="text-xl text-[#7C68A5]">/ 40</span>
            </div>
          </div>

          <span className="text-[11px] text-emerald-800 font-extrabold bg-purple-100 px-3.5 py-1 rounded-full border border-purple-200">
            Server-side Auto-Graded
          </span>
        </div>

        {/* Writing Status (Pending Teacher) */}
        <div className="bg-white border border-purple-100/80 rounded-3xl p-6 shadow-xl shadow-purple-950/5 flex flex-col items-center justify-between text-center space-y-4 hover:border-amber-300 transition-all">
          <div className="p-4 bg-amber-100 text-amber-800 rounded-2xl border border-amber-200">
            <FileText className="w-8 h-8" />
          </div>

          <div>
            <h4 className="text-xs font-extrabold text-[#7C68A5] uppercase tracking-wider">WRITING STATUS</h4>
            <div className="text-base font-extrabold text-amber-800 mt-2 bg-amber-100 border border-amber-200 px-3.5 py-1.5 rounded-2xl inline-block">
              {result.writing_status || 'PENDING_TEACHER'}
            </div>
          </div>

          <span className="text-[11px] text-amber-800 font-extrabold bg-amber-100 px-3.5 py-1 rounded-full border border-amber-200">
            Pending Teacher Evaluation
          </span>
        </div>

      </div>

      {/* Info Note */}
      <div className="p-5 bg-white border border-purple-100/80 rounded-3xl text-xs text-[#503A7A] flex items-start space-x-3 shadow-sm">
        <AlertCircle className="w-5 h-5 text-[#6B51A5] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-extrabold text-[#3C2A63]">Grading &amp; Assessment Information:</p>
          <p className="leading-relaxed">
            Listening and Reading raw scores were automatically evaluated and calculated by the system. The 4 Writing assessment criteria (TR, CC, LR, GRA) will be reviewed directly by instructors.
          </p>
        </div>
      </div>

      {/* Action Buttons: Return Home / Restart Practice */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
        {onReturnHome && (
          <button
            onClick={onReturnHome}
            className="px-7 py-3.5 bg-[#6B51A5] hover:bg-[#583F8F] text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-purple-950/10 flex items-center space-x-2 transition cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Return to Candidate Portal</span>
          </button>
        )}

        {testMode === 'PRACTICE' && onRestartPractice && (
          <button
            onClick={onRestartPractice}
            className="px-7 py-3.5 bg-[#E2DDEC] hover:bg-[#D9D3E4] text-[#3C2A63] font-extrabold text-sm rounded-2xl border border-purple-200/80 flex items-center space-x-2 transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retake Practice Test</span>
          </button>
        )}
      </div>

    </div>
  );
};

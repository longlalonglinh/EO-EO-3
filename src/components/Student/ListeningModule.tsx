import React, { useState, useRef, useEffect } from 'react';
import { Question } from '../../types';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Headphones, 
  CheckCircle2, 
  AlertTriangle,
  ChevronRight,
  Info
} from 'lucide-react';
import { CountdownTimer } from './CountdownTimer';

interface ListeningModuleProps {
  audioUrl?: string;
  questions: Question[];
  userAnswers: Record<string, string>;
  onAnswerChange: (questionId: string, value: string) => void;
  testMode?: 'TEST' | 'PRACTICE';
  durationMins?: number;
}

export const ListeningModule: React.FC<ListeningModuleProps> = ({
  audioUrl = 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=ambient-piano-amp-strings-10711.mp3',
  questions,
  userAnswers,
  onAnswerChange,
  testMode = 'TEST',
  durationMins = 30
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [activePart, setActivePart] = useState<1 | 2 | 3 | 4>(1);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Group questions into IELTS Parts (Part 1, 2, 3, 4)
  const getPartForQuestion = (q: Question, idx: number): 1 | 2 | 3 | 4 => {
    if (q.part && [1, 2, 3, 4].includes(q.part)) return q.part as 1 | 2 | 3 | 4;
    if (idx < 10) return 1;
    if (idx < 20) return 2;
    if (idx < 30) return 3;
    return 4;
  };

  const questionsWithPart = questions.map((q, idx) => ({
    ...q,
    computedPart: getPartForQuestion(q, idx)
  }));

  const filteredQuestions = questionsWithPart.filter(q => q.computedPart === activePart);

  // Calculate answered stats
  const totalQuestions = questions.length;
  const answeredCount = questions.filter(q => Boolean(userAnswers[q.question_id]?.trim())).length;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration || 0);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(e => console.warn('Audio play prevented:', e));
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      
      {/* TOP COUNTDOWN TIMER BAR */}
      <CountdownTimer
        initialMinutes={durationMins}
        testMode={testMode}
        sectionName="ACADEMIC LISTENING (40 Questions / 4 Parts)"
      />

      {/* AUDIO PLAYER & CONTROLS BANNER */}
      <div className="bg-white border border-purple-100/80 rounded-3xl p-5 shadow-xl shadow-purple-950/5 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Playback Controls & Progress */}
        <div className="flex items-center space-x-3 w-full md:w-auto flex-1 max-w-2xl">
          <button
            type="button"
            onClick={togglePlay}
            className="w-12 h-12 rounded-2xl bg-[#6B51A5] hover:bg-[#503A7A] text-white flex items-center justify-center shadow-lg shadow-purple-950/10 transition shrink-0 active:scale-95 cursor-pointer"
            title={isPlaying ? 'Tạm dừng Audio' : 'Phát Audio'}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5 fill-current" />}
          </button>

          <audio ref={audioRef} src={audioUrl} preload="metadata" />

          <div className="flex-1 min-w-[180px]">
            <div className="flex justify-between text-[11px] font-mono font-bold text-[#7C68A5] mb-1.5">
              <span>{formatTime(currentTime)}</span>
              <span className="flex items-center gap-1">
                <Headphones className="w-3 h-3 text-[#6B51A5]" />
                {formatTime(duration)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-[#E2DDEC] rounded-lg appearance-none cursor-pointer accent-[#6B51A5]"
            />
          </div>

          {/* Playback Speed & Volume */}
          <div className="flex items-center space-x-2 shrink-0">
            <select
              value={playbackRate}
              onChange={(e) => handleRateChange(parseFloat(e.target.value))}
              className="bg-[#F5F2F9] border border-purple-100 text-[#503A7A] text-xs font-bold rounded-xl px-2.5 py-2 focus:outline-none focus:border-[#6B51A5] font-mono cursor-pointer"
              title="Tốc độ phát audio"
            >
              <option value={0.75}>0.75x</option>
              <option value={1}>1.0x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
            </select>

            <button
              type="button"
              onClick={toggleMute}
              className="p-2 text-[#503A7A] hover:bg-[#E2DDEC] rounded-xl transition cursor-pointer"
              title={isMuted ? 'Bật âm thanh' : 'Tắt tiếng'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Global Progress Pill */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="text-xs text-[#7C68A5] font-medium flex items-center gap-2">
            <span>Đã trả lời:</span>
            <span className="px-3 py-1 bg-purple-100 border border-purple-200 rounded-full text-xs font-black text-[#503A7A] font-mono">
              {answeredCount} / {totalQuestions}
            </span>
          </div>
        </div>

      </div>

      {/* PART TABS & QUESTION JUMP BAR */}
      <div className="bg-white border border-purple-100/80 rounded-3xl p-4 shadow-xl shadow-purple-950/5 flex flex-wrap items-center justify-between gap-3">
        
        {/* 4 Part Switcher Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {([1, 2, 3, 4] as const).map((partNum) => {
            const partQuestions = questionsWithPart.filter(q => q.computedPart === partNum);
            const partAnswered = partQuestions.filter(q => Boolean(userAnswers[q.question_id]?.trim())).length;
            const isActive = activePart === partNum;

            if (partQuestions.length === 0 && partNum > 1 && questions.length <= 10) return null;

            return (
              <button
                key={partNum}
                type="button"
                onClick={() => setActivePart(partNum)}
                className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-[#6B51A5] text-white shadow-md'
                    : 'bg-[#F5F2F9] text-[#503A7A] hover:bg-[#E2DDEC] border border-purple-100'
                }`}
              >
                <Headphones className="w-3.5 h-3.5" />
                <span>Part {partNum}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : partAnswered === partQuestions.length && partQuestions.length > 0
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-purple-200/80 text-[#503A7A]'
                }`}>
                  {partAnswered}/{partQuestions.length || 10}
                </span>
              </button>
            );
          })}
        </div>

        {/* Question Numbers Quick Navigator */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {filteredQuestions.map((q, idx) => {
            const isFilled = Boolean(userAnswers[q.question_id]?.trim());
            return (
              <button
                key={q.question_id}
                type="button"
                onClick={() => {
                  const el = document.getElementById(`lq_box_${q.question_id}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className={`w-7 h-7 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                  isFilled
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-[#F5F2F9] text-[#503A7A] hover:bg-[#E2DDEC] border border-purple-100'
                }`}
                title={`Nhảy tới Câu ${idx + 1}`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

      </div>

      {/* MAIN QUESTIONS WORKSPACE */}
      <div className="bg-white rounded-3xl border border-purple-100/80 p-6 md:p-8 shadow-xl shadow-purple-950/5 space-y-6">
        
        {/* Section Header with Info Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-purple-100">
          <div>
            <h3 className="text-base font-extrabold text-[#3C2A63] flex items-center gap-2">
              <Headphones className="w-5 h-5 text-[#6B51A5]" />
              <span>Part {activePart} Questions ({filteredQuestions.length} Questions)</span>
            </h3>
            <p className="text-xs text-[#7C68A5] font-medium mt-0.5">
              Listen carefully to the recording and answer questions 1 to {filteredQuestions.length}.
            </p>
          </div>

          <div className="flex items-center space-x-1.5 text-xs text-[#7C68A5] bg-[#FAF8FE] border border-[#EBE4F7] px-3 py-1.5 rounded-xl">
            <Info className="w-3.5 h-3.5 text-[#6B51A5] shrink-0" />
            <span>Điền hoặc chọn đáp án trực tiếp vào từng câu hỏi bên dưới</span>
          </div>
        </div>

        {/* Questions Render List */}
        {filteredQuestions.length === 0 ? (
          <div className="p-12 text-center bg-[#FAF8FE] border border-[#EBE4F7] rounded-3xl">
            <Headphones className="w-12 h-12 text-[#7C68A5] mx-auto mb-3 opacity-60" />
            <p className="text-[#503A7A] text-sm font-bold">Chưa có câu hỏi nào cho Part {activePart}.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredQuestions.map((q, idx) => {
              const currentVal = userAnswers[q.question_id] || '';
              const isFilled = Boolean(currentVal.trim());

              return (
                <div
                  key={q.question_id}
                  id={`lq_box_${q.question_id}`}
                  className={`p-5 md:p-6 bg-[#FAF8FE] border rounded-2xl transition duration-200 space-y-4 shadow-sm ${
                    isFilled 
                      ? 'border-[#D6CBE8] bg-[#FAF8FE]' 
                      : 'border-[#EBE4F7] hover:border-[#D6CBE8]'
                  }`}
                >
                  {/* Question Item Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center space-x-2.5">
                      <span className="w-7 h-7 rounded-xl bg-[#503A7A] text-white font-black text-xs flex items-center justify-center font-mono shadow-sm">
                        {idx + 1}
                      </span>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-100 text-[#503A7A] font-extrabold uppercase border border-purple-200 shrink-0">
                        {q.question_type.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {isFilled && (
                        <span className="flex items-center space-x-1 text-emerald-800 bg-emerald-100 border border-emerald-200 text-xs font-bold px-2.5 py-0.5 rounded-xl">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Đã trả lời</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Instruction Notice if any */}
                  {q.instruction && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-bold flex items-start gap-2">
                      <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>{q.instruction}</span>
                    </div>
                  )}

                  {/* Question Main Text */}
                  <p className="text-[#2D1E4B] text-sm md:text-[15px] font-bold leading-relaxed">
                    {q.question_text}
                  </p>

                  {/* Options List or Text Input */}
                  {q.options && q.options.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {q.options.map((opt, optIdx) => {
                        const optLetter = opt.charAt(0).toUpperCase();
                        const isSelected = currentVal.trim().toUpperCase() === optLetter || currentVal === opt;

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => onAnswerChange(q.question_id, optLetter)}
                            className={`w-full text-left p-3.5 rounded-xl border text-xs md:text-sm font-bold transition flex items-center space-x-3 cursor-pointer ${
                              isSelected
                                ? 'bg-[#503A7A] border-[#503A7A] text-white shadow-md ring-2 ring-purple-300'
                                : 'bg-white border-[#E0D7F5] text-[#3C2A63] hover:bg-[#F2EEF9] hover:border-[#6B51A5]'
                            }`}
                          >
                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 font-mono ${
                              isSelected
                                ? 'bg-white text-[#503A7A]'
                                : 'bg-[#E2DDEC] text-[#3C2A63]'
                            }`}>
                              {optLetter}
                            </span>
                            <span className="flex-1">{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-2">
                      <input
                        type="text"
                        value={currentVal}
                        onChange={(e) => onAnswerChange(q.question_id, e.target.value)}
                        placeholder="Nhập đáp án của bạn tại đây..."
                        className="w-full px-4 py-3 bg-white border border-[#D6CBE8] rounded-xl text-[#2C1D4D] font-medium placeholder-slate-400 text-sm focus:outline-none focus:border-[#6B51A5] focus:ring-2 focus:ring-purple-200 transition shadow-inner"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Next / Prev Part Navigation Buttons */}
        <div className="flex justify-between items-center pt-4 border-t border-purple-100">
          <button
            type="button"
            disabled={activePart === 1}
            onClick={() => setActivePart(prev => (prev > 1 ? (prev - 1 as 1 | 2 | 3 | 4) : prev))}
            className="px-4 py-2.5 bg-[#F5F2F9] hover:bg-[#E2DDEC] disabled:opacity-40 disabled:cursor-not-allowed text-[#503A7A] text-xs font-extrabold rounded-xl border border-purple-200 transition flex items-center gap-1.5 cursor-pointer"
          >
            ← Part trước
          </button>

          <button
            type="button"
            disabled={activePart === 4}
            onClick={() => setActivePart(prev => (prev < 4 ? (prev + 1 as 1 | 2 | 3 | 4) : prev))}
            className="px-5 py-2.5 bg-[#6B51A5] hover:bg-[#503A7A] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-extrabold rounded-xl transition shadow-md shadow-purple-950/10 flex items-center gap-1.5 cursor-pointer"
          >
            <span>Part tiếp theo</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
};

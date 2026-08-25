import React, { useState, useEffect } from 'react';
import { CustomPracticeDeck, PracticeUserStats, PracticeCard } from '../../../types/practice';
import { 
  Sparkles, 
  Flame, 
  Target, 
  Award, 
  RotateCcw, 
  Play, 
  BookOpen, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  History, 
  ArrowLeft, 
  ShieldCheck, 
  ChevronRight, 
  PlusCircle, 
  Globe, 
  BarChart3,
  TrendingUp,
  RefreshCw,
  LogOut,
  FolderOpen
} from 'lucide-react';
import { practiceService } from '../../../services/practiceService';
import { PracticeCardView } from './PracticeCardView';

interface PracticeDashboardProps {
  initialDeckId?: string;
  candidateSbd?: string;
  onExitToLogin: () => void;
  onOpenDeckManager?: () => void;
  gasUrl?: string;
}

export const PracticeDashboard: React.FC<PracticeDashboardProps> = ({
  initialDeckId = 'ON_TAP_01',
  candidateSbd = 'LEARNER_01',
  onExitToLogin,
  onOpenDeckManager,
  gasUrl
}) => {
  const [allDecks, setAllDecks] = useState<CustomPracticeDeck[]>([]);
  const [activeDeck, setActiveDeck] = useState<CustomPracticeDeck | null>(null);
  const [userStats, setUserStats] = useState<PracticeUserStats>(practiceService.getUserStats());
  const [isLoadingDeck, setIsLoadingDeck] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Active Session State
  const [isPracticing, setIsPracticing] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [sessionResults, setSessionResults] = useState<Record<string, boolean>>({});
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Security / Proctoring Integrity Tracker
  const [securityViolations, setSecurityViolations] = useState<number>(0);
  const [securityNotice, setSecurityNotice] = useState<string | null>(null);

  // Load Decks & User Stats
  const loadDeckData = async (targetId: string) => {
    setIsLoadingDeck(true);
    setLoadError(null);
    try {
      const decks = practiceService.getAllDecks();
      setAllDecks(decks);

      const deck = await practiceService.getDeckById(targetId, gasUrl);
      if (deck) {
        setActiveDeck(deck);
      } else {
        setLoadError(`Không tìm thấy bộ đề ôn tập với mã: "${targetId}".`);
      }
    } catch (e: any) {
      console.error('Error loading deck:', e);
      setLoadError('Không thể tải dữ liệu bộ đề ôn tập.');
    } finally {
      setIsLoadingDeck(false);
    }
  };

  useEffect(() => {
    loadDeckData(initialDeckId);
    setUserStats(practiceService.getUserStats());
  }, [initialDeckId]);

  // Anti-Cheat & Security Monitoring (No timer, but security maintained)
  useEffect(() => {
    if (!isPracticing) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setSecurityViolations(prev => {
          const nextCount = prev + 1;
          // Log to local storage
          const logsRaw = localStorage.getItem('ielts_cheat_logs');
          const logs = logsRaw ? JSON.parse(logsRaw) : [];
          logs.push({
            sbd: candidateSbd,
            exam_code: activeDeck?.deck_id || 'PRACTICE',
            type: 'TAB_SWITCH',
            timestamp: new Date().toISOString(),
            message: `Learner switched tab during practice session (count: ${nextCount})`
          });
          localStorage.setItem('ielts_cheat_logs', JSON.stringify(logs));
          return nextCount;
        });

        setSecurityNotice('⚠️ Cảnh báo an ninh: Bạn vừa rời khỏi màn hình ôn tập!');
        setTimeout(() => setSecurityNotice(null), 4000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPracticing, candidateSbd, activeDeck?.deck_id]);

  const handleStartPractice = (deckToStart?: CustomPracticeDeck) => {
    const deck = deckToStart || activeDeck;
    if (!deck || deck.cards.length === 0) return;
    setActiveDeck(deck);
    setCurrentCardIndex(0);
    setSessionResults({});
    setSessionCompleted(false);
    setIsPracticing(true);
  };

  const handleNextCard = (isCorrect: boolean) => {
    if (!activeDeck) return;
    const currentCard = activeDeck.cards[currentCardIndex];
    const newResults = {
      ...sessionResults,
      [currentCard.id]: isCorrect
    };
    setSessionResults(newResults);

    if (currentCardIndex + 1 < activeDeck.cards.length) {
      setCurrentCardIndex(prev => prev + 1);
    } else {
      // Complete Session
      const totalCards = activeDeck.cards.length;
      const correctCount = Object.values(newResults).filter(Boolean).length;
      const updatedStats = practiceService.recordPracticeSession(
        activeDeck.deck_id,
        activeDeck.title,
        totalCards,
        correctCount,
        newResults
      );
      setUserStats(updatedStats);
      setSessionCompleted(true);
    }
  };

  const calculateDeckMastery = (deck: CustomPracticeDeck) => {
    if (!deck.cards || deck.cards.length === 0) return 0;
    const masteredCount = deck.cards.filter(c => userStats.cards_state[c.id]?.mastered).length;
    return Math.round((masteredCount / deck.cards.length) * 100);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Top Lingvist-Style Deck & Language Header Ribbon */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 md:px-8 py-3 shrink-0 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Left: Language & Deck Indicator */}
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              onClick={() => {
                if (isPracticing) {
                  setIsPracticing(false);
                } else {
                  onExitToLogin();
                }
              }}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{isPracticing ? 'Dừng bài ôn' : 'Đăng xuất'}</span>
            </button>

            <div className="h-5 w-px bg-slate-700 hidden sm:block" />

            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center font-bold text-xs">
                EN
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-sm font-bold text-white tracking-tight">
                    {activeDeck?.title || 'Đề Ôn Tập Tự Chọn'}
                  </h2>
                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-mono font-bold">
                    {activeDeck?.level || 'B1-B2'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {activeDeck?.target_language || 'English'} từ {activeDeck?.native_language || 'Vietnamese'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Security Badge & Candidate Info */}
          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <div className="flex items-center space-x-1.5 px-3 py-1 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-slate-300 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Bảo mật: Hoạt động</span>
            </div>

            {onOpenDeckManager && (
              <button
                onClick={onOpenDeckManager}
                className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 rounded-xl text-xs font-semibold transition flex items-center gap-1"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Quản lý Đề</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Security Warning Notification Banner */}
      {securityNotice && (
        <div className="bg-rose-500/20 border-b border-rose-500/40 px-4 py-2 text-center text-xs text-rose-300 font-bold flex items-center justify-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span>{securityNotice}</span>
        </div>
      )}

      {/* MAIN VIEW: PRACTICING VS DASHBOARD */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 flex flex-col justify-center">
        
        {isLoadingDeck ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
            <p className="text-sm font-medium text-slate-300">Đang tải bộ đề ôn tập tự chọn...</p>
          </div>
        ) : loadError ? (
          <div className="max-w-md mx-auto p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4">
            <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
            <h3 className="text-base font-bold text-white">{loadError}</h3>
            <p className="text-xs text-slate-400">Vui lòng kiểm tra lại mã đề hoặc chọn một bộ đề có sẵn bên dưới.</p>
            <button
              onClick={() => loadDeckData('ON_TAP_01')}
              className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold transition hover:bg-indigo-500"
            >
              Thử lại với Đề Mặc Định (ON_TAP_01)
            </button>
          </div>
        ) : isPracticing && activeDeck ? (
          
          /* ACTIVE PRACTICE SESSION */
          !sessionCompleted ? (
            <div className="space-y-6">
              {/* Progress Bar & Header */}
              <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-slate-400 mb-1.5 font-mono">
                    <span>Tiến độ bài ôn: {currentCardIndex + 1} / {activeDeck.cards.length}</span>
                    <span>{Math.round(((currentCardIndex + 1) / activeDeck.cards.length) * 100)}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                      style={{ width: `${((currentCardIndex + 1) / activeDeck.cards.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Active Card */}
              <PracticeCardView
                card={activeDeck.cards[currentCardIndex]}
                cardIndex={currentCardIndex}
                totalCards={activeDeck.cards.length}
                onNext={handleNextCard}
                isLast={currentCardIndex === activeDeck.cards.length - 1}
                isMastered={Boolean(userStats.cards_state[activeDeck.cards[currentCardIndex]?.id]?.mastered)}
              />
            </div>
          ) : (
            
            /* SESSION COMPLETION SUMMARY */
            <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <Award className="w-8 h-8 text-slate-950" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white tracking-tight">
                  Hoàn Thành Bài Ôn Tập!
                </h3>
                <p className="text-xs text-slate-400">
                  Bạn đã hoàn tất tất cả {activeDeck.cards.length} câu trong bộ đề <strong>{activeDeck.title}</strong>.
                </p>
              </div>

              {/* Score Box */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-950/80 border border-slate-800 rounded-2xl">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Số câu đúng</span>
                  <p className="text-xl font-bold text-emerald-400 font-mono mt-0.5">
                    {Object.values(sessionResults).filter(Boolean).length} / {activeDeck.cards.length}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Độ chính xác</span>
                  <p className="text-xl font-bold text-indigo-400 font-mono mt-0.5">
                    {Math.round((Object.values(sessionResults).filter(Boolean).length / activeDeck.cards.length) * 100)}%
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2.5 pt-2">
                <button
                  onClick={() => handleStartPractice()}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Ôn tập lại bộ đề này</span>
                </button>

                <button
                  onClick={() => setIsPracticing(false)}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs border border-slate-700 transition"
                >
                  Quay lại Dashboard ôn tập
                </button>
              </div>
            </div>
          )

        ) : (
          
          /* LINGVIST-STYLE DASHBOARD */
          <div className="space-y-8 animate-fade-in">
            
            {/* Top Row: Lingvist Daily Goal Circle & 4 Metric Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left: Big Lingvist Daily Progress Hero (5 Cols) */}
              <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl flex flex-col justify-between relative overflow-hidden backdrop-blur-md">
                <div className="space-y-2">
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-xs font-semibold text-indigo-300">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Mục tiêu hàng ngày</span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                    {activeDeck?.title || 'Bộ đề ôn tập hiện tại'}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2">
                    {activeDeck?.description}
                  </p>
                </div>

                {/* Progress Wheel Simulation */}
                <div className="my-6 flex items-center justify-center">
                  <div className="relative w-40 h-40 flex items-center justify-center">
                    {/* Background Circle */}
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        className="text-slate-800"
                        strokeWidth="8"
                        stroke="currentColor"
                        fill="transparent"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        className="text-indigo-500"
                        strokeWidth="8"
                        strokeDasharray={251.2}
                        strokeDashoffset={251.2 - (251.2 * (activeDeck ? calculateDeckMastery(activeDeck) : 50)) / 100}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                      />
                    </svg>

                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className="text-2xl md:text-3xl font-black text-white font-mono">
                        {activeDeck?.cards.length || 0}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        Từ cần ôn
                      </span>
                    </div>
                  </div>
                </div>

                {/* Primary Start CTA Button */}
                <button
                  onClick={() => handleStartPractice()}
                  className="w-full py-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/30 flex items-center justify-center space-x-2 transition transform active:scale-[0.98]"
                >
                  <Play className="w-5 h-5 fill-white" />
                  <span className="text-sm">Bắt đầu ôn tập ngay</span>
                </button>
              </div>

              {/* Right: 4 Metrics Grid (7 Cols) */}
              <div className="lg:col-span-7 grid grid-cols-2 gap-4">
                
                {/* Metric 1: Streak */}
                <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-3xl flex flex-col justify-between shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Chuỗi ngày ôn</span>
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                      <Flame className="w-4 h-4 fill-amber-400" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="text-3xl font-black text-white font-mono">
                      {userStats.daily_streak}
                    </span>
                    <span className="text-xs text-slate-400 ml-1.5 font-medium">ngày</span>
                    <p className="text-[11px] text-slate-500 mt-1">Kỷ lục cao nhất: {userStats.best_streak} ngày</p>
                  </div>
                </div>

                {/* Metric 2: Practiced Today */}
                <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-3xl flex flex-col justify-between shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Đã học hôm nay</span>
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                      <Target className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="text-3xl font-black text-white font-mono">
                      {userStats.words_practiced_today}
                    </span>
                    <span className="text-xs text-slate-400 ml-1.5 font-medium">từ / câu</span>
                    <p className="text-[11px] text-emerald-400 mt-1">Đang duy trì phong độ tốt</p>
                  </div>
                </div>

                {/* Metric 3: Correct repeats */}
                <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-3xl flex flex-col justify-between shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tỷ lệ lặp lại đúng</span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="text-3xl font-black text-white font-mono">
                      {userStats.correct_repeats_pct}%
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1">Độ ghi nhớ dài hạn</p>
                  </div>
                </div>

                {/* Metric 4: Mastered words */}
                <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-3xl flex flex-col justify-between shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Từ đã thành thạo</span>
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                      <Award className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="text-3xl font-black text-white font-mono">
                      {userStats.total_cards_mastered}
                    </span>
                    <span className="text-xs text-slate-400 ml-1.5 font-medium">thẻ</span>
                    <p className="text-[11px] text-purple-300 mt-1">Đạt chuẩn nhớ sâu</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom Row: Decks Carousel / Selector */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Danh Sách Bộ Đề Ôn Tập Tự Chọn
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">({allDecks.length} bộ đề)</span>
                </div>

                {onOpenDeckManager && (
                  <button
                    onClick={onOpenDeckManager}
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Tạo đề mới</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {allDecks.map(deck => {
                  const isCurrent = activeDeck?.deck_id === deck.deck_id;
                  const mastery = calculateDeckMastery(deck);

                  return (
                    <div
                      key={deck.deck_id}
                      onClick={() => setActiveDeck(deck)}
                      className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 ${
                        isCurrent
                          ? 'bg-slate-900 border-indigo-500/80 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-semibold uppercase tracking-wider">
                            {deck.category}
                          </span>
                          <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                            {deck.deck_id}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-white line-clamp-1 mb-1">
                          {deck.title}
                        </h4>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {deck.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="text-xs text-slate-400">
                          {deck.cards.length} câu hỏi • <strong className="text-emerald-400">{mastery}%</strong>
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartPractice(deck);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1 transition ${
                            isCurrent
                              ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          <span>Luyện tập</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
};

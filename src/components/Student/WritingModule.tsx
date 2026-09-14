import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldAlert, 
  Save, 
  FileText, 
  Image as ImageIcon, 
  Maximize2, 
  X,
  AlertTriangle,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { 
  saveWritingDraftToIndexedDB, 
  getWritingDraftFromIndexedDB 
} from '../../services/indexedDb';
import { CountdownTimer } from './CountdownTimer';

interface WritingModuleProps {
  task1Prompt?: string;
  task1Image?: string;
  onTask1ImageChange?: (image: string) => void;
  task2Prompt?: string;
  task1Text: string;
  task2Text: string;
  onTask1Change: (text: string) => void;
  onTask2Change: (text: string) => void;
  submissionId?: string;
  examCode?: string;
  candidateId?: string;
  testMode?: 'TEST' | 'PRACTICE';
  durationMins?: number;
  onTimeExpire?: () => void;
}

export const WritingModule: React.FC<WritingModuleProps> = ({
  task1Prompt,
  task1Image,
  task2Prompt,
  task1Text,
  task2Text,
  onTask1Change,
  onTask2Change,
  submissionId,
  examCode = 'IELTS01',
  candidateId = 'STUDENT',
  testMode = 'TEST',
  durationMins = 60,
  onTimeExpire
}) => {
  const [activeTab, setActiveTab] = useState<'task1' | 'task2'>('task1');
  const [pasteWarning, setErrorPasteWarning] = useState<string | null>(null);
  const [autoSaveTime, setAutoSaveTime] = useState<string>('');
  const [restoredNotice, setRestoredNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Image zoom modal
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const cleanTask1Image = (task1Image && typeof task1Image === 'string' && task1Image.trim().length > 0) ? task1Image.trim() : null;

  // Split-view and small screen responsive states
  const [splitRatio, setSplitRatio] = useState<number>(45); // 45% left (prompt), 55% right (editor)
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [mobileWritingView, setMobileWritingView] = useState<'editor' | 'prompt'>('editor');
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
  const writingSplitContainerRef = useRef<HTMLDivElement | null>(null);

  // Track window resizing for 13-inch screens and browser zoom
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Split drag handle listener
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !writingSplitContainerRef.current) return;
      const rect = writingSplitContainerRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const percentage = (relativeX / rect.width) * 100;
      if (percentage >= 25 && percentage <= 75) {
        setSplitRatio(percentage);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isResizing || !writingSplitContainerRef.current || !e.touches[0]) return;
      const rect = writingSplitContainerRef.current.getBoundingClientRect();
      const relativeX = e.touches[0].clientX - rect.left;
      const percentage = (relativeX / rect.width) * 100;
      if (percentage >= 25 && percentage <= 75) {
        setSplitRatio(percentage);
      }
    };

    const handleEnd = () => {
      if (isResizing) setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleTouchMove, { passive: true });
      window.addEventListener('touchend', handleEnd);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    } else {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing]);

  // Track initial hydration to prevent overwriting stored draft with empty props
  const hasHydratedRef = useRef(false);

  // Requirement 5: Realtime Word Counter using regex \b\S+\b
  const countWords = (str: string): number => {
    if (!str) return 0;
    const matches = str.match(/\b\S+\b/g);
    return matches ? matches.length : 0;
  };

  const task1WordCount = countWords(task1Text);
  const task2WordCount = countWords(task2Text);

  // Requirement 5: Restore unsubmitted draft from IndexedDB/LocalStorage on reload
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const draft = await getWritingDraftFromIndexedDB(examCode, candidateId);
        if (isMounted && draft && !hasHydratedRef.current) {
          let hasRestored = false;
          if ((!task1Text || task1Text.trim() === '') && draft.task1 && draft.task1.trim() !== '') {
            onTask1Change(draft.task1);
            hasRestored = true;
          }
          if ((!task2Text || task2Text.trim() === '') && draft.task2 && draft.task2.trim() !== '') {
            onTask2Change(draft.task2);
            hasRestored = true;
          }

          if (hasRestored) {
            setRestoredNotice('Unsubmitted writing draft restored from IndexedDB local storage.');
          }
        }
      } catch (err) {
        console.warn('Failed to restore writing draft from IndexedDB:', err);
      } finally {
        hasHydratedRef.current = true;
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [examCode, candidateId]);

  // Requirement 5: Debounced write after 1000ms from the last keystroke
  useEffect(() => {
    if (!hasHydratedRef.current && !task1Text && !task2Text) return;

    setIsSaving(true);
    const handler = setTimeout(async () => {
      try {
        await saveWritingDraftToIndexedDB(examCode, candidateId, {
          task1: task1Text,
          task2: task2Text
        });
        const now = new Date();
        setAutoSaveTime(now.toLocaleTimeString());
      } catch (err) {
        console.warn('Auto-save writing draft failed:', err);
      } finally {
        setIsSaving(false);
      }
    }, 1000);

    return () => clearTimeout(handler);
  }, [task1Text, task2Text, examCode, candidateId]);

  // Strictly Block Paste per IELTS exam integrity
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    setErrorPasteWarning('⚠️ PASTE ACTION IS DISABLED! Please type your response directly using your keyboard.');
    setTimeout(() => {
      setErrorPasteWarning(null);
    }, 4000);
  };

  return (
    <div className="space-y-6">
      
      {/* 0. Top Countdown Timer Bar */}
      <CountdownTimer
        initialMinutes={durationMins}
        testMode={testMode}
        sectionName="ACADEMIC WRITING (Task 1 & Task 2 - 60 Minutes)"
        onTimeExpire={onTimeExpire}
      />

      {/* Top Banner & Status */}
      <div className="bg-white border border-purple-100/80 rounded-3xl p-5 shadow-xl shadow-purple-950/5 flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-[#E2DDEC] text-[#3C2A63] rounded-2xl">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-[#3C2A63] flex items-center gap-2">
              Writing Section (IELTS Writing Task 1 &amp; Task 2)
            </h3>
            <p className="text-xs text-[#7C68A5] font-medium">
              Spellcheck: DISABLED | Paste: BLOCKED | Word Counter: \b\S+\b Regex | 1000ms IndexedDB Auto-Backup
            </p>
          </div>
        </div>

        {/* Local IndexedDB AutoSave Badge */}
        <div className="flex items-center space-x-3">
          <span className={`text-xs font-extrabold px-3.5 py-2 rounded-2xl flex items-center gap-1.5 border transition ${
            isSaving 
              ? 'bg-amber-50 text-amber-800 border-amber-200' 
              : 'bg-emerald-100 text-emerald-800 border-emerald-200'
          }`}>
            <Save className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin text-amber-600' : 'text-emerald-700'}`} />
            {isSaving ? 'Saving Draft...' : autoSaveTime ? `Saved to IndexedDB (${autoSaveTime})` : 'Draft Autosave Active'}
          </span>
        </div>
      </div>

      {/* Restored Draft Notice Banner */}
      {restoredNotice && (
        <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl text-xs text-[#503A7A] font-bold flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-[#6B51A5] shrink-0" />
            <span>{restoredNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setRestoredNotice(null)}
            className="text-purple-700 hover:text-purple-900 font-extrabold text-xs cursor-pointer ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Paste Blocked Warning Toast */}
      {pasteWarning && (
        <div className="p-4 bg-rose-100 border border-rose-200 rounded-2xl text-rose-800 text-xs font-extrabold flex items-center gap-2 animate-bounce">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{pasteWarning}</span>
        </div>
      )}

      {/* Tabs Switcher for Task 1 and Task 2 with Live Word Count Indicators & Split Ratio Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex bg-[#E2DDEC] p-1.5 rounded-2xl w-fit space-x-2">
          <button
            type="button"
            onClick={() => setActiveTab('task1')}
            className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2.5 cursor-pointer ${
              activeTab === 'task1'
                ? 'bg-[#6B51A5] text-white shadow-md'
                : 'text-[#3C2A63] hover:text-[#503A7A]'
            }`}
          >
            <span>Writing Task 1 (Min 150 words)</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
              task1WordCount >= 150 
                ? 'bg-emerald-200 text-emerald-950 font-black' 
                : 'bg-rose-200 text-rose-950 font-black'
            }`}>
              {task1WordCount >= 150 ? <CheckCircle2 className="w-3 h-3 text-emerald-800 inline" /> : <AlertTriangle className="w-3 h-3 text-rose-800 inline" />}
              {task1WordCount} words
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('task2')}
            className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2.5 cursor-pointer ${
              activeTab === 'task2'
                ? 'bg-[#6B51A5] text-white shadow-md'
                : 'text-[#3C2A63] hover:text-[#503A7A]'
            }`}
          >
            <span>Writing Task 2 (Min 250 words)</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
              task2WordCount >= 250 
                ? 'bg-emerald-200 text-emerald-950 font-black' 
                : 'bg-rose-200 text-rose-950 font-black'
            }`}>
              {task2WordCount >= 250 ? <CheckCircle2 className="w-3 h-3 text-emerald-800 inline" /> : <AlertTriangle className="w-3 h-3 text-rose-800 inline" />}
              {task2WordCount} words
            </span>
          </button>
        </div>

        {/* Quick Split Ratio Presets for Desktop & 13" laptops */}
        <div className="hidden md:flex items-center gap-1.5 bg-[#F5F2F9] px-3 py-1.5 rounded-2xl border border-purple-100 text-xs">
          <span className="text-[11px] font-bold text-[#7C68A5] mr-1">Layout:</span>
          <button
            type="button"
            onClick={() => setSplitRatio(45)}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${
              splitRatio === 45 ? 'bg-[#6B51A5] text-white shadow-xs' : 'bg-white text-[#503A7A] hover:bg-purple-100'
            }`}
            title="Balanced (Prompt 45% - Response 55%)"
          >
            45:55
          </button>
          <button
            type="button"
            onClick={() => setSplitRatio(58)}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${
              splitRatio === 58 ? 'bg-[#6B51A5] text-white shadow-xs' : 'bg-white text-[#503A7A] hover:bg-purple-100'
            }`}
            title="Expand prompt & diagram 58%"
          >
            Prompt 58%
          </button>
          <button
            type="button"
            onClick={() => setSplitRatio(35)}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${
              splitRatio === 35 ? 'bg-[#6B51A5] text-white shadow-xs' : 'bg-white text-[#503A7A] hover:bg-purple-100'
            }`}
            title="Expand response editor 65%"
          >
            Editor 65%
          </button>
        </div>
      </div>

      {/* Mobile view toggle (< 768px) */}
      <div className="flex md:hidden items-center justify-between bg-purple-50 p-1.5 rounded-2xl border border-purple-200">
        <div className="flex items-center gap-1 w-full">
          <button
            type="button"
            onClick={() => setMobileWritingView('editor')}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              mobileWritingView === 'editor' ? 'bg-[#6B51A5] text-white shadow-md' : 'text-[#503A7A] hover:bg-purple-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Response Area ({activeTab === 'task1' ? task1WordCount : task2WordCount} words)</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileWritingView('prompt')}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              mobileWritingView === 'prompt' ? 'bg-[#6B51A5] text-white shadow-md' : 'text-[#503A7A] hover:bg-purple-100'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Prompt &amp; Material</span>
          </button>
        </div>
      </div>

      {/* TASK 1 SPLIT-SCREEN WORKSPACE */}
      {activeTab === 'task1' && (
        <div
          ref={writingSplitContainerRef}
          className="flex flex-col md:flex-row h-[560px] md:h-[calc(100dvh-13.5rem)] md:min-h-[460px] md:max-h-[850px] bg-white rounded-3xl border border-purple-100/80 overflow-hidden shadow-xl shadow-purple-950/5 relative"
        >
          {/* Left Column: Task 1 Prompt, Instructions & Graphic */}
          <div
            className={`h-full flex flex-col bg-[#F8F6FC] md:border-r border-purple-100 overflow-hidden w-full ${
              mobileWritingView === 'editor' ? 'hidden md:flex' : 'flex'
            }`}
            style={{ width: isDesktop ? `${splitRatio}%` : '100%' }}
          >
            <div className="p-3.5 bg-white border-b border-purple-100 flex items-center justify-between shrink-0">
              <span className="text-xs px-3 py-1 rounded-full bg-purple-100 text-[#503A7A] font-extrabold border border-purple-200">
                TASK 1 PROMPT &amp; DATA
              </span>
              <span className="text-[11px] text-[#7C68A5] font-semibold">Spend ~20 mins</span>
            </div>

            <div className="flex-1 p-4 sm:p-6 overflow-y-auto overscroll-contain space-y-4">
              <div className="text-sm font-medium text-[#3C2A63] leading-relaxed whitespace-pre-wrap font-sans">
                {task1Prompt || 'You should spend about 20 minutes on this task. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.'}
              </div>

              {/* Task 1 Graphic / Chart Image Display */}
              {cleanTask1Image && (
                <div className="space-y-2">
                  <div className="relative group rounded-2xl overflow-hidden border border-purple-200/80 bg-white shadow-sm">
                    <img
                      src={cleanTask1Image}
                      alt="IELTS Writing Task 1 Diagram / Chart"
                      className="w-full max-h-80 object-contain bg-white cursor-pointer transition duration-200 group-hover:scale-[1.01]"
                      onClick={() => setIsZoomOpen(true)}
                      referrerPolicy="no-referrer"
                    />
                    
                    {/* Overlay button to zoom */}
                    <button
                      type="button"
                      onClick={() => setIsZoomOpen(true)}
                      className="absolute top-2 right-2 bg-[#3C2A63]/80 hover:bg-[#3C2A63] text-white p-2 rounded-xl backdrop-blur transition shadow-md cursor-pointer opacity-90 group-hover:opacity-100 flex items-center gap-1 text-[11px] font-bold"
                      title="Zoom chart image"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Zoom</span>
                    </button>

                    <div className="p-2.5 bg-white/90 border-t border-purple-100 flex items-center justify-between text-xs text-[#7C68A5]">
                      <span className="font-semibold text-[11px]">📊 Task 1 Visual / Chart Material</span>
                      <span className="text-[10px] text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded-md">
                        Click to enlarge
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3.5 bg-white rounded-2xl border border-purple-100 text-xs text-[#7C68A5] font-medium leading-relaxed">
                💡 <strong>Requirement:</strong> Summarise main features and trends. Minimum requirement is <strong>150 words</strong>.
              </div>
            </div>
          </div>

          {/* Draggable Resizer Split Handle */}
          <div
            onMouseDown={() => setIsResizing(true)}
            onTouchStart={() => setIsResizing(true)}
            onDoubleClick={() => setSplitRatio(45)}
            className={`hidden md:flex w-3 hover:w-3.5 bg-[#E2DDEC] hover:bg-[#6B51A5] active:bg-[#503A7A] cursor-col-resize items-center justify-center transition-all shrink-0 z-20 select-none touch-none ${
              isResizing ? 'bg-[#6B51A5] shadow-lg ring-2 ring-[#6B51A5]/40' : ''
            }`}
            title="Drag to resize split panes (Double-click to reset 45/55)"
          >
            <div className="h-8 w-1 bg-white/60 rounded-full flex flex-col justify-center items-center gap-0.5 pointer-events-none">
              <div className="w-0.5 h-1 bg-[#3C2A63] rounded-full" />
              <div className="w-0.5 h-1 bg-[#3C2A63] rounded-full" />
              <div className="w-0.5 h-1 bg-[#3C2A63] rounded-full" />
            </div>
          </div>

          {/* Right Column: Task 1 Response Editor */}
          <div
            className={`h-full flex flex-col bg-white overflow-hidden w-full ${
              mobileWritingView === 'prompt' ? 'hidden md:flex' : 'flex'
            }`}
            style={{ width: isDesktop ? `${100 - splitRatio}%` : '100%' }}
          >
            <div className="p-3.5 bg-[#F8F6FC] border-b border-purple-100 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <span className="text-xs font-extrabold text-[#3C2A63] uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#6B51A5]" />
                <span>Task 1 Response Editor</span>
              </span>

              {/* Word Count Indicator */}
              <span className={`text-xs font-black px-3 py-1 rounded-full border flex items-center gap-1.5 transition ${
                task1WordCount >= 150
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-rose-100 text-rose-800 border-rose-300'
              }`}>
                {task1WordCount >= 150 ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{task1WordCount} / 150 words (Met)</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>{task1WordCount} / 150 words (Need {150 - task1WordCount} more)</span>
                  </>
                )}
              </span>
            </div>

            <div className="flex-1 p-4 flex flex-col overflow-hidden">
              <textarea
                value={task1Text}
                onChange={(e) => onTask1Change(e.target.value)}
                onPaste={handlePaste}
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                placeholder="Type your Task 1 response here... (Paste is disabled, auto-saves to IndexedDB)"
                className="w-full flex-1 p-4 bg-[#F8F6FC] border border-purple-100 rounded-2xl text-sm text-[#3C2A63] placeholder-[#7C68A5] focus:outline-none focus:ring-2 focus:ring-[#6B51A5] transition-all font-mono leading-relaxed resize-none overflow-y-auto"
              />
            </div>

            <div className="p-3 bg-white border-t border-purple-100 flex flex-wrap items-center justify-between text-[11px] text-[#7C68A5] font-medium shrink-0">
              <span>Auto-saved to IndexedDB every 1000ms {autoSaveTime && `(${autoSaveTime})`}</span>
              <span>Spellcheck: Disabled | Paste: Blocked</span>
            </div>
          </div>
        </div>
      )}

      {/* Task 1 Image Zoom Modal (Student view only) */}
      {isZoomOpen && cleanTask1Image && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsZoomOpen(false)}
        >
          <div 
            className="relative max-w-5xl max-h-[90vh] bg-white rounded-3xl p-4 overflow-auto shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-3 border-b border-purple-100 mb-3">
              <span className="text-xs font-extrabold text-[#3C2A63] flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#6B51A5]" />
                IELTS Task 1 Graphic / Chart View
              </span>
              <button
                type="button"
                onClick={() => setIsZoomOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={cleanTask1Image}
              alt="Full Task 1 Diagram"
              className="max-w-full max-h-[75vh] object-contain rounded-xl"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}

      {/* TASK 2 SPLIT-SCREEN WORKSPACE */}
      {activeTab === 'task2' && (
        <div
          ref={writingSplitContainerRef}
          className="flex flex-col md:flex-row h-[560px] md:h-[calc(100dvh-13.5rem)] md:min-h-[460px] md:max-h-[850px] bg-white rounded-3xl border border-purple-100/80 overflow-hidden shadow-xl shadow-purple-950/5 relative"
        >
          {/* Left Column: Task 2 Prompt & Instructions */}
          <div
            className={`h-full flex flex-col bg-[#F8F6FC] md:border-r border-purple-100 overflow-hidden w-full ${
              mobileWritingView === 'editor' ? 'hidden md:flex' : 'flex'
            }`}
            style={{ width: isDesktop ? `${splitRatio}%` : '100%' }}
          >
            <div className="p-3.5 bg-white border-b border-purple-100 flex items-center justify-between shrink-0">
              <span className="text-xs px-3 py-1 rounded-full bg-purple-100 text-[#503A7A] font-extrabold border border-purple-200">
                TASK 2 PROMPT
              </span>
              <span className="text-[11px] text-[#7C68A5] font-semibold">Spend ~40 mins (2/3 score)</span>
            </div>

            <div className="flex-1 p-4 sm:p-6 overflow-y-auto overscroll-contain space-y-4">
              <div className="text-sm font-medium text-[#3C2A63] leading-relaxed whitespace-pre-wrap font-sans">
                {task2Prompt || 'You should spend about 40 minutes on this task. Write about the following topic: Some people think that universities should provide graduates with the knowledge and skills needed in the workplace. Others think the true function of a university should be to give access to knowledge for its own sake. Discuss both views and give your opinion. Write at least 250 words.'}
              </div>

              <div className="p-3.5 bg-white rounded-2xl border border-purple-100 text-xs text-[#7C68A5] font-medium leading-relaxed">
                💡 <strong>Requirement:</strong> Task 2 accounts for 2/3 of your total Writing score. Minimum requirement is <strong>250 words</strong>.
              </div>
            </div>
          </div>

          {/* Draggable Resizer Split Handle */}
          <div
            onMouseDown={() => setIsResizing(true)}
            onTouchStart={() => setIsResizing(true)}
            onDoubleClick={() => setSplitRatio(45)}
            className={`hidden md:flex w-3 hover:w-3.5 bg-[#E2DDEC] hover:bg-[#6B51A5] active:bg-[#503A7A] cursor-col-resize items-center justify-center transition-all shrink-0 z-20 select-none touch-none ${
              isResizing ? 'bg-[#6B51A5] shadow-lg ring-2 ring-[#6B51A5]/40' : ''
            }`}
            title="Drag to resize split panes (Double-click to reset 45/55)"
          >
            <div className="h-8 w-1 bg-white/60 rounded-full flex flex-col justify-center items-center gap-0.5 pointer-events-none">
              <div className="w-0.5 h-1 bg-[#3C2A63] rounded-full" />
              <div className="w-0.5 h-1 bg-[#3C2A63] rounded-full" />
              <div className="w-0.5 h-1 bg-[#3C2A63] rounded-full" />
            </div>
          </div>

          {/* Right Column: Task 2 Response Editor */}
          <div
            className={`h-full flex flex-col bg-white overflow-hidden w-full ${
              mobileWritingView === 'prompt' ? 'hidden md:flex' : 'flex'
            }`}
            style={{ width: isDesktop ? `${100 - splitRatio}%` : '100%' }}
          >
            <div className="p-3.5 bg-[#F8F6FC] border-b border-purple-100 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <span className="text-xs font-extrabold text-[#3C2A63] uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#6B51A5]" />
                <span>Task 2 Essay Editor</span>
              </span>

              {/* Word Count Indicator */}
              <span className={`text-xs font-black px-3 py-1 rounded-full border flex items-center gap-1.5 transition ${
                task2WordCount >= 250
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-rose-100 text-rose-800 border-rose-300'
              }`}>
                {task2WordCount >= 250 ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{task2WordCount} / 250 words (Met)</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>{task2WordCount} / 250 words (Need {250 - task2WordCount} more)</span>
                  </>
                )}
              </span>
            </div>

            <div className="flex-1 p-4 flex flex-col overflow-hidden">
              <textarea
                value={task2Text}
                onChange={(e) => onTask2Change(e.target.value)}
                onPaste={handlePaste}
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                placeholder="Type your Task 2 essay response here... (Paste is disabled, auto-saves to IndexedDB)"
                className="w-full flex-1 p-4 bg-[#F8F6FC] border border-purple-100 rounded-2xl text-sm text-[#3C2A63] placeholder-[#7C68A5] focus:outline-none focus:ring-2 focus:ring-[#6B51A5] transition-all font-mono leading-relaxed resize-none overflow-y-auto"
              />
            </div>

            <div className="p-3 bg-white border-t border-purple-100 flex flex-wrap items-center justify-between text-[11px] text-[#7C68A5] font-medium shrink-0">
              <span>Auto-saved to IndexedDB every 1000ms {autoSaveTime && `(${autoSaveTime})`}</span>
              <span>Spellcheck: Disabled | Paste: Blocked</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

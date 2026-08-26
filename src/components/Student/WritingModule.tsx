import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Save, 
  FileText, 
  Image as ImageIcon, 
  Maximize2, 
  X
} from 'lucide-react';

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
}

export const WritingModule: React.FC<WritingModuleProps> = ({
  task1Prompt,
  task1Image,
  task2Prompt,
  task1Text,
  task2Text,
  onTask1Change,
  onTask2Change,
  submissionId
}) => {
  const [activeTab, setActiveTab] = useState<'task1' | 'task2'>('task1');
  const [pasteWarning, setErrorPasteWarning] = useState<string | null>(null);
  const [autoSaveTime, setAutoSaveTime] = useState<string>('');
  
  // Image zoom state (view-only for student)
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  // Count words trimming extra spaces
  const countWords = (str: string): number => {
    if (!str || !str.trim()) return 0;
    return str.trim().split(/\s+/).filter(Boolean).length;
  };

  const task1WordCount = countWords(task1Text);
  const task2WordCount = countWords(task2Text);

  // Strictly Block Paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    setErrorPasteWarning('⚠️ PASTE ACTION IS DISABLED! Please type your response directly using your keyboard.');
    setTimeout(() => {
      setErrorPasteWarning(null);
    }, 4000);
  };

  // Continuous Auto-save to LocalStorage
  useEffect(() => {
    const saveKey = `ielts_writing_draft_${submissionId || 'default'}`;
    const draftData = {
      task1: task1Text,
      task2: task2Text,
      updated_at: new Date().toISOString()
    };
    localStorage.setItem(saveKey, JSON.stringify(draftData));
    
    const now = new Date();
    setAutoSaveTime(now.toLocaleTimeString());
  }, [task1Text, task2Text, submissionId]);

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Status */}
      <div className="bg-white border border-purple-100/80 rounded-3xl p-5 shadow-xl shadow-purple-950/5 flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-[#E2DDEC] text-[#3C2A63] rounded-2xl">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-[#3C2A63] flex items-center gap-2">
              Writing Section (IELTS Writing Task 1 & Task 2)
            </h3>
            <p className="text-xs text-[#7C68A5] font-medium">
              Spellcheck: DISABLED | Paste Action: BLOCKED | Word Counter: REAL-TIME (Trims whitespace)
            </p>
          </div>
        </div>

        {/* LocalAutoSave Badge */}
        <div className="flex items-center space-x-3">
          <span className="text-xs text-emerald-800 font-extrabold bg-emerald-100 border border-emerald-200 px-3.5 py-2 rounded-2xl flex items-center gap-1.5">
            <Save className="w-3.5 h-3.5 animate-pulse text-emerald-700" />
            Auto-saved Locally ({autoSaveTime})
          </span>
        </div>
      </div>

      {/* Paste Blocked Warning Toast */}
      {pasteWarning && (
        <div className="p-4 bg-rose-100 border border-rose-200 rounded-2xl text-rose-800 text-xs font-extrabold flex items-center gap-2 animate-bounce">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{pasteWarning}</span>
        </div>
      )}

      {/* Tabs Switcher for Task 1 and Task 2 */}
      <div className="flex bg-[#E2DDEC] p-1.5 rounded-2xl w-fit space-x-2">
        <button
          type="button"
          onClick={() => setActiveTab('task1')}
          className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'task1'
              ? 'bg-[#6B51A5] text-white shadow-md'
              : 'text-[#3C2A63] hover:text-[#503A7A]'
          }`}
        >
          <span>Writing Task 1 (Min 150 words)</span>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
            task1WordCount >= 150 ? 'bg-emerald-200 text-emerald-900' : 'bg-purple-200 text-[#3C2A63]'
          }`}>
            {task1WordCount} words
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('task2')}
          className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'task2'
              ? 'bg-[#6B51A5] text-white shadow-md'
              : 'text-[#3C2A63] hover:text-[#503A7A]'
          }`}
        >
          <span>Writing Task 2 (Min 250 words)</span>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
            task2WordCount >= 250 ? 'bg-emerald-200 text-emerald-900' : 'bg-purple-200 text-[#3C2A63]'
          }`}>
            {task2WordCount} words
          </span>
        </button>
      </div>

      {/* TASK 1 PANEL */}
      {activeTab === 'task1' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Prompt Box & Image Material */}
          <div className="lg:col-span-5 bg-white border border-purple-100/80 rounded-3xl p-6 shadow-xl shadow-purple-950/5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs px-3 py-1 rounded-full bg-purple-100 text-[#503A7A] font-extrabold border border-purple-200">
                TASK 1 PROMPT &amp; DATA
              </span>
            </div>

            <div className="text-sm font-medium text-[#3C2A63] leading-relaxed whitespace-pre-wrap font-sans">
              {task1Prompt || 'You should spend about 20 minutes on this task. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.'}
            </div>

            {/* Task 1 Graphic / Chart Image Display (Provided by Teacher) */}
            {task1Image && (
              <div className="space-y-2">
                <div className="relative group rounded-2xl overflow-hidden border border-purple-200/80 bg-[#F8F6FC] shadow-sm">
                  <img
                    src={task1Image}
                    alt="IELTS Writing Task 1 Diagram / Chart"
                    className="w-full max-h-72 object-contain bg-white cursor-pointer transition duration-200 group-hover:scale-[1.01]"
                    onClick={() => setIsZoomOpen(true)}
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Overlay button to zoom */}
                  <button
                    type="button"
                    onClick={() => setIsZoomOpen(true)}
                    className="absolute top-2 right-2 bg-[#3C2A63]/80 hover:bg-[#3C2A63] text-white p-2 rounded-xl backdrop-blur transition shadow-md cursor-pointer opacity-90 group-hover:opacity-100 flex items-center gap-1 text-[11px] font-bold"
                    title="Phóng to ảnh biểu đồ"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Phóng to</span>
                  </button>

                  <div className="p-2.5 bg-white/90 border-t border-purple-100 flex items-center justify-between text-xs text-[#7C68A5]">
                    <span className="font-semibold text-[11px]">📊 Ngữ liệu hình ảnh / Biểu đồ Task 1</span>
                    <span className="text-[10px] text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded-md">
                      Nhấn để phóng to
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="p-3.5 bg-[#F8F6FC] rounded-2xl border border-purple-100 text-xs text-[#7C68A5] font-medium leading-relaxed">
              💡 <strong>Lưu ý:</strong> Bài thi Task 1 yêu cầu mô tả các đặc điểm chính, xu hướng nổi bật và so sánh số liệu từ biểu đồ/sơ đồ. Yêu cầu tối thiểu 150 từ.
            </div>
          </div>

          {/* Text Area Input */}
          <div className="lg:col-span-7 bg-white border border-purple-100/80 rounded-3xl p-6 shadow-xl shadow-purple-950/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#3C2A63] uppercase tracking-wider">
                Task 1 Response Editor
              </span>
              <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${
                task1WordCount >= 150
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : 'bg-amber-100 text-amber-800 border-amber-200'
              }`}>
                Word Count: {task1WordCount} / 150+
              </span>
            </div>

            <textarea
              value={task1Text}
              onChange={(e) => onTask1Change(e.target.value)}
              onPaste={handlePaste}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              rows={14}
              placeholder="Type your Task 1 essay response here..."
              className="w-full p-4 bg-[#F8F6FC] border border-purple-100 rounded-2xl text-sm text-[#3C2A63] placeholder-[#7C68A5] focus:outline-none focus:ring-2 focus:ring-[#6B51A5] transition-all font-mono leading-relaxed"
            />

            <div className="flex items-center justify-between text-[11px] text-[#7C68A5] font-medium">
              <span>Keystrokes are automatically saved continuously</span>
              <span>Spellcheck: Disabled</span>
            </div>
          </div>

        </div>
      )}

      {/* Task 1 Image Zoom Modal (Student view only) */}
      {isZoomOpen && task1Image && (
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
              src={task1Image}
              alt="Full Task 1 Diagram"
              className="max-w-full max-h-[75vh] object-contain rounded-xl"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}

      {/* TASK 2 PANEL */}
      {activeTab === 'task2' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Prompt Box */}
          <div className="lg:col-span-5 bg-white border border-purple-100/80 rounded-3xl p-6 shadow-xl shadow-purple-950/5 space-y-4">
            <span className="text-xs px-3 py-1 rounded-full bg-purple-100 text-[#503A7A] font-extrabold border border-purple-200">
              TASK 2 PROMPT
            </span>
            <div className="text-sm font-medium text-[#3C2A63] leading-relaxed whitespace-pre-wrap font-sans">
              {task2Prompt || 'You should spend about 40 minutes on this task. Write about the following topic: Some people think that universities should provide graduates with the knowledge and skills needed in the workplace. Others think the true function of a university should be to give access to knowledge for its own sake. Discuss both views and give your opinion. Write at least 250 words.'}
            </div>
            
            <div className="p-3.5 bg-[#F8F6FC] rounded-2xl border border-purple-100 text-xs text-[#7C68A5] font-medium leading-relaxed">
              💡 <strong>Note:</strong> Task 2 accounts for 2/3 of your total Writing score. Minimum requirement is 250 words.
            </div>
          </div>

          {/* Text Area Input */}
          <div className="lg:col-span-7 bg-white border border-purple-100/80 rounded-3xl p-6 shadow-xl shadow-purple-950/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#3C2A63] uppercase tracking-wider">
                Task 2 Essay Editor
              </span>
              <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${
                task2WordCount >= 250
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : 'bg-amber-100 text-amber-800 border-amber-200'
              }`}>
                Word Count: {task2WordCount} / 250+
              </span>
            </div>

            <textarea
              value={task2Text}
              onChange={(e) => onTask2Change(e.target.value)}
              onPaste={handlePaste}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              rows={16}
              placeholder="Type your Task 2 essay response here..."
              className="w-full p-4 bg-[#F8F6FC] border border-purple-100 rounded-2xl text-sm text-[#3C2A63] placeholder-[#7C68A5] focus:outline-none focus:ring-2 focus:ring-[#6B51A5] transition-all font-mono leading-relaxed"
            />

            <div className="flex items-center justify-between text-[11px] text-[#7C68A5] font-medium">
              <span>Keystrokes are automatically saved continuously</span>
              <span>Spellcheck: Disabled</span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

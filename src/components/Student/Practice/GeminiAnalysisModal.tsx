import React, { useState } from 'react';
import { SentenceGrammarAnalysis } from '../../../types/practice';
import { 
  Sparkles, 
  X, 
  BookOpen, 
  Layers, 
  AlertCircle, 
  CheckCircle2, 
  Volume2, 
  Copy, 
  Check, 
  MessageSquare, 
  Send, 
  Loader2,
  HelpCircle,
  Lightbulb,
  FileText
} from 'lucide-react';
import { practiceService } from '../../../services/practiceService';

interface GeminiAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  sentence: string;
  targetWord?: string;
  initialAnalysis?: SentenceGrammarAnalysis | null;
  isLoading?: boolean;
}

export const GeminiAnalysisModal: React.FC<GeminiAnalysisModalProps> = ({
  isOpen,
  onClose,
  sentence,
  targetWord,
  initialAnalysis,
  isLoading = false
}) => {
  const [analysis, setAnalysis] = useState<SentenceGrammarAnalysis | null>(initialAnalysis || null);
  const [loading, setLoading] = useState(isLoading);
  const [userQuery, setUserQuery] = useState('');
  const [isAskingFollowUp, setIsAskingFollowUp] = useState(false);
  const [followUpAnswers, setFollowUpAnswers] = useState<Array<{ q: string; a: string }>>([]);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'syntax' | 'word' | 'grammar' | 'examples' | 'qa'>('syntax');

  // Sync initialAnalysis changes
  React.useEffect(() => {
    if (initialAnalysis) {
      setAnalysis(initialAnalysis);
    }
  }, [initialAnalysis]);

  if (!isOpen) return null;

  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleCopy = () => {
    if (!analysis) return;
    const textToCopy = `[CÂU GỐC]: ${analysis.original_sentence}\n[DỊCH NGHĨA]: ${analysis.sentence_translation_vi}\n\n[GIẢI THÍCH]:\n${analysis.detailed_explanation_vi}\n\n[BẪY THƯỜNG GẶP]: ${analysis.common_pitfalls}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuery.trim() || isAskingFollowUp) return;

    const query = userQuery.trim();
    setUserQuery('');
    setIsAskingFollowUp(true);

    try {
      const followUpRes = await practiceService.analyzeSentence(
        sentence,
        targetWord,
        query,
        analysis?.detailed_explanation_vi
      );

      setFollowUpAnswers(prev => [
        ...prev,
        {
          q: query,
          a: followUpRes.detailed_explanation_vi || 'Gemini đã phân tích câu hỏi của bạn và cập nhật cấu trúc bên dưới.'
        }
      ]);

      if (followUpRes) {
        setAnalysis(followUpRes);
      }
    } catch (e) {
      console.error('Follow up error:', e);
    } finally {
      setIsAskingFollowUp(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl md:rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 md:p-5 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white tracking-tight">Hỏi AI Gemini • Phân Tích Cấu Trúc</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 font-mono font-semibold">
                  Gemini 3.7 Flash
                </span>
              </div>
              <p className="text-xs text-slate-400">Giải mã ngữ pháp, từ loại, collocations và bẫy cấu trúc câu</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition"
              title="Sao chép nội dung phân tích"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Target Sentence Banner */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800/80 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-1 block">
                Câu cần phân tích:
              </span>
              <p className="text-sm md:text-base font-medium text-slate-100 leading-relaxed font-sans">
                "{sentence}"
              </p>
              {analysis?.sentence_translation_vi && (
                <p className="text-xs text-emerald-300/90 mt-1 font-sans italic">
                  💡 {analysis.sentence_translation_vi}
                </p>
              )}
            </div>

            <button
              onClick={() => handleSpeak(sentence)}
              className="p-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl transition shrink-0"
              title="Nghe phát âm cả câu"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-900/90 px-4 py-2 border-b border-slate-800/80 flex items-center space-x-2 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('syntax')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
              activeTab === 'syntax'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Thành phần câu (S-V-O)</span>
          </button>

          <button
            onClick={() => setActiveTab('word')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
              activeTab === 'word'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Từ khóa &amp; IPA</span>
          </button>

          <button
            onClick={() => setActiveTab('grammar')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
              activeTab === 'grammar'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Ngữ pháp &amp; Collocations</span>
          </button>

          <button
            onClick={() => setActiveTab('examples')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
              activeTab === 'examples'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Ví dụ câu</span>
          </button>

          <button
            onClick={() => setActiveTab('qa')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
              activeTab === 'qa'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Hỏi đáp thêm {followUpAnswers.length > 0 && `(${followUpAnswers.length})`}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
              <p className="text-sm text-slate-300 font-medium">Gemini 3.7 Flash đang phân tích sâu cấu trúc câu...</p>
              <p className="text-xs text-slate-500">Đang bóc tách thành phần S-V-O, từ loại và quy tắc ngữ pháp</p>
            </div>
          ) : !analysis ? (
            <div className="py-12 text-center text-slate-400">
              <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="text-sm">Không thể tải phân tích câu lúc này.</p>
            </div>
          ) : (
            <>
              {/* TAB 1: SYNTAX BREAKDOWN */}
              {activeTab === 'syntax' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    Bóc Tách Thành Phần Câu (Syntax Tree &amp; Clauses)
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3.5 bg-slate-800/70 border border-slate-700/60 rounded-xl">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block mb-1">
                        1. Chủ ngữ (Subject - S)
                      </span>
                      <p className="text-xs md:text-sm text-slate-200 font-medium">
                        {analysis.syntax_breakdown.subject || 'Được xác định theo ngữ cảnh'}
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-800/70 border border-slate-700/60 rounded-xl">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                        2. Động từ chính &amp; Vị ngữ (Verb / Tense)
                      </span>
                      <p className="text-xs md:text-sm text-slate-200 font-medium">
                        {analysis.syntax_breakdown.main_verb || 'Động từ chính của câu'}
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-800/70 border border-slate-700/60 rounded-xl">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block mb-1">
                        3. Tân ngữ / Bổ ngữ (Object / Complement)
                      </span>
                      <p className="text-xs md:text-sm text-slate-200 font-medium">
                        {analysis.syntax_breakdown.object_or_complement || 'Thành phần nhận tác động'}
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-800/70 border border-slate-700/60 rounded-xl">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
                        4. Trạng ngữ / Mệnh đề phụ (Modifiers &amp; Clauses)
                      </span>
                      <p className="text-xs md:text-sm text-slate-200 font-medium">
                        {analysis.syntax_breakdown.modifiers_or_clauses || 'Bổ nghĩa thời gian, nơi chốn hoặc điều kiện'}
                      </p>
                    </div>
                  </div>

                  {/* Detailed Explanation */}
                  <div className="p-4 bg-indigo-950/40 border border-indigo-800/50 rounded-xl space-y-2">
                    <h5 className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                      Giải Thích Sư Phạm Chi Tiết
                    </h5>
                    <p className="text-xs md:text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                      {analysis.detailed_explanation_vi}
                    </p>
                  </div>

                  {/* Common Pitfalls Warning */}
                  {analysis.common_pitfalls && (
                    <div className="p-3.5 bg-rose-950/30 border border-rose-800/40 rounded-xl flex items-start space-x-2.5">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <span className="font-bold text-rose-300 block mb-0.5">Bẫy Thường Gặp &amp; Lưu Ý:</span>
                        <p className="text-rose-200/90 leading-relaxed">{analysis.common_pitfalls}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: WORD BREAKDOWN */}
              {activeTab === 'word' && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-3">
                        <span className="text-lg md:text-xl font-bold text-white font-serif">
                          {analysis.word_analysis.target_word || targetWord}
                        </span>
                        {analysis.word_analysis.phonetic && (
                          <span className="text-xs font-mono text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/50">
                            {analysis.word_analysis.phonetic}
                          </span>
                        )}
                        {analysis.word_analysis.part_of_speech && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                            {analysis.word_analysis.part_of_speech}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 mt-1.5 font-medium">
                        👉 {analysis.word_analysis.definition_vi}
                      </p>
                    </div>

                    <button
                      onClick={() => handleSpeak(analysis.word_analysis.target_word || targetWord || '')}
                      className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md transition"
                      title="Phát âm từ vựng"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Word Family & Derivatives */}
                  {analysis.word_analysis.root_and_forms && analysis.word_analysis.root_and_forms.length > 0 && (
                    <div className="p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-xl">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                        Gia đình từ (Word Family &amp; Forms):
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {analysis.word_analysis.root_and_forms.map((item, idx) => (
                          <span key={idx} className="text-xs px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-mono">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Synonyms & Antonyms */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3.5 bg-emerald-950/20 border border-emerald-800/40 rounded-xl">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-1.5">
                        Từ đồng nghĩa (Synonyms):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.word_analysis.synonyms && analysis.word_analysis.synonyms.length > 0 ? (
                          analysis.word_analysis.synonyms.map((s, idx) => (
                            <span key={idx} className="text-xs px-2 py-0.5 bg-emerald-900/40 text-emerald-200 border border-emerald-700/40 rounded">
                              {s}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500">Đang cập nhật</span>
                        )}
                      </div>
                    </div>

                    <div className="p-3.5 bg-rose-950/20 border border-rose-800/40 rounded-xl">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block mb-1.5">
                        Từ trái nghĩa (Antonyms):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.word_analysis.antonyms && analysis.word_analysis.antonyms.length > 0 ? (
                          analysis.word_analysis.antonyms.map((a, idx) => (
                            <span key={idx} className="text-xs px-2 py-0.5 bg-rose-900/40 text-rose-200 border border-rose-700/40 rounded">
                              {a}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500">Không có hoặc không phổ biến</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: GRAMMAR & COLLOCATIONS */}
              {activeTab === 'grammar' && (
                <div className="space-y-4">
                  {/* Grammar Rules */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                      Quy Tắc Ngữ Pháp Cốt Lõi
                    </h5>
                    <div className="space-y-2">
                      {analysis.key_grammar_rules.map((rule, idx) => (
                        <div key={idx} className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-start space-x-2.5">
                          <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <p className="text-xs md:text-sm text-slate-200">{rule}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Collocations */}
                  <div className="space-y-2 pt-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      Cụm Từ &amp; Collocations Tự Nhiên
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {analysis.collocations_and_phrases.map((colloc, idx) => (
                        <div key={idx} className="p-2.5 bg-slate-800/70 border border-slate-700/50 rounded-xl text-xs text-slate-200 font-medium flex items-center space-x-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                          <span>{colloc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: EXAMPLE SENTENCES */}
              {activeTab === 'examples' && (
                <div className="space-y-3">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    Các Mẫu Câu Ứng Dụng Thực Tế
                  </h5>

                  {analysis.example_sentences.map((ex, idx) => (
                    <div key={idx} className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs md:text-sm font-medium text-slate-100">
                          {idx + 1}. "{ex.en}"
                        </p>
                        <button
                          onClick={() => handleSpeak(ex.en)}
                          className="p-1.5 text-slate-400 hover:text-indigo-300 rounded transition"
                          title="Nghe câu ví dụ"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-400 italic">
                        👉 {ex.vi}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 5: INTERACTIVE Q&A */}
              {activeTab === 'qa' && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="p-3 bg-indigo-950/30 border border-indigo-800/40 rounded-xl text-xs text-indigo-200">
                      💬 Bạn có thể đặt bất kỳ câu hỏi nào về câu này (ví dụ: <em>"Tại sao không dùng thì hiện tại hoàn thành?", "Từ này có đi được với giới từ at không?"</em>).
                    </div>

                    {followUpAnswers.map((item, idx) => (
                      <div key={idx} className="space-y-2 p-3.5 bg-slate-800/70 border border-slate-700 rounded-xl text-xs">
                        <div className="font-bold text-indigo-300 flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Học viên: "{item.q}"</span>
                        </div>
                        <p className="text-slate-200 leading-relaxed whitespace-pre-line pl-5 border-l-2 border-indigo-500/40">
                          {item.a}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Input Form */}
                  <form onSubmit={handleFollowUpSubmit} className="flex items-center gap-2 pt-2">
                    <input
                      type="text"
                      value={userQuery}
                      onChange={(e) => setUserQuery(e.target.value)}
                      placeholder="Hỏi thêm Gemini về cấu trúc hoặc ngữ nghĩa..."
                      className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 transition"
                      disabled={isAskingFollowUp}
                    />
                    <button
                      type="submit"
                      disabled={isAskingFollowUp || !userQuery.trim()}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition shrink-0"
                    >
                      {isAskingFollowUp ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <span>Gửi</span>
                          <Send className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            Powered by Google Gemini 3.7 Flash • Phân tích ngữ pháp chuyên sâu
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
          >
            Đóng bảng phân tích
          </button>
        </div>
      </div>
    </div>
  );
};

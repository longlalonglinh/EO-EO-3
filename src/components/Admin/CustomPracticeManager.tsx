import React, { useState, useEffect } from 'react';
import { CustomPracticeDeck, PracticeCard } from '../../types/practice';
import { practiceService } from '../../services/practiceService';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  FileText, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Upload, 
  RotateCcw, 
  Loader2,
  BookOpen,
  ArrowRight,
  Code2,
  ListPlus
} from 'lucide-react';

export const CustomPracticeManager: React.FC = () => {
  const [decks, setDecks] = useState<CustomPracticeDeck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<CustomPracticeDeck | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // AI Generator Modal / Form State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiCategory, setAiCategory] = useState<'Vocabulary' | 'Grammar' | 'Communication' | 'IELTS Academic'>('Vocabulary');
  const [aiLevel, setAiLevel] = useState<'A1-A2' | 'B1-B2' | 'C1-C2'>('B1-B2');
  const [aiCount, setAiCount] = useState(8);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Current deck form state
  const [deckId, setDeckId] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'Vocabulary' | 'Grammar' | 'Communication' | 'IELTS Academic' | 'General English' | 'Custom'>('Vocabulary');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState<'A1-A2' | 'B1-B2' | 'C1-C2'>('B1-B2');
  const [cards, setCards] = useState<PracticeCard[]>([]);

  useEffect(() => {
    refreshDecks();
  }, []);

  const refreshDecks = () => {
    const all = practiceService.getAllDecks();
    setDecks(all);
    if (!selectedDeck && all.length > 0) {
      handleSelectDeck(all[0]);
    }
  };

  const handleSelectDeck = (deck: CustomPracticeDeck) => {
    setSelectedDeck(deck);
    setDeckId(deck.deck_id);
    setTitle(deck.title);
    setCategory(deck.category);
    setDescription(deck.description);
    setLevel(deck.level);
    setCards(deck.cards || []);
    setIsEditing(false);
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const handleNewDeck = () => {
    const newId = `ON_TAP_${Date.now().toString().slice(-4)}`;
    setSelectedDeck(null);
    setDeckId(newId);
    setTitle('Đề Ôn Tập Tự Chọn Mới');
    setCategory('Vocabulary');
    setDescription('Mô tả mục tiêu và nội dung chính của đề ôn tập...');
    setLevel('B1-B2');
    setCards([
      {
        id: `c_${Date.now()}_1`,
        sentence_en: 'We need to _____ sustainable energy solutions for future generations.',
        sentence_vi: 'Chúng ta cần phát triển các giải pháp năng lượng bền vững cho các thế hệ tương lai.',
        cloze_target: 'develop',
        target_word: 'develop',
        part_of_speech: 'verb',
        phonetic: '/dɪˈvel.əp/',
        hints: 'phát triển, mở rộng (động từ)',
        accepted_answers: ['develop', 'promote', 'create'],
        explanation: 'Động từ "develop" phù hợp với tân ngữ "sustainable energy solutions".',
        grammar_points: ['Collocation: develop energy solutions'],
        options: ['develop', 'developing', 'development', 'developer'],
        difficulty: 'medium'
      }
    ]);
    setIsEditing(true);
  };

  const handleAddCard = () => {
    const newCard: PracticeCard = {
      id: `c_${Date.now()}_${cards.length + 1}`,
      sentence_en: 'This is a sample sentence with a _____ blank.',
      sentence_vi: 'Đây là câu ví dụ có chỗ trống cần điền.',
      cloze_target: 'sample',
      target_word: 'sample',
      part_of_speech: 'adjective',
      phonetic: '/ˈsɑːm.pəl/',
      hints: 'mẫu, làm mẫu (tính từ)',
      accepted_answers: ['sample', 'test'],
      explanation: 'Giải thích cấu trúc và ngữ nghĩa ở đây...',
      grammar_points: ['Ngữ pháp cần nhớ'],
      options: ['sample', 'sampling', 'sampled', 'sampler'],
      difficulty: 'medium'
    };
    setCards([...cards, newCard]);
  };

  const handleRemoveCard = (index: number) => {
    setCards(cards.filter((_, i) => i !== index));
  };

  const handleCardChange = (index: number, field: keyof PracticeCard, value: any) => {
    const updated = [...cards];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setCards(updated);
  };

  const handleSaveDeck = () => {
    if (!deckId.trim() || !title.trim()) {
      setErrorMsg('Vui lòng nhập Mã đề và Tiêu đề bộ đề.');
      return;
    }
    if (cards.length === 0) {
      setErrorMsg('Bộ đề phải có ít nhất 1 câu hỏi/thẻ ôn tập.');
      return;
    }

    const newDeck: CustomPracticeDeck = {
      deck_id: deckId.trim().toUpperCase(),
      title: title.trim(),
      category,
      description: description.trim(),
      target_language: 'English',
      native_language: 'Vietnamese',
      level,
      cards,
      is_custom: true,
      updated_at: new Date().toISOString()
    };

    const saved = practiceService.saveDeck(newDeck);
    if (saved) {
      setSuccessMsg(`Đã lưu thành công bộ đề [${newDeck.deck_id}].`);
      refreshDecks();
      setSelectedDeck(newDeck);
      setIsEditing(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      setErrorMsg('Lỗi khi lưu bộ đề.');
    }
  };

  const handleDeleteDeck = () => {
    if (!selectedDeck) return;
    if (window.confirm(`Bạn có chắc chắn muốn xóa bộ đề [${selectedDeck.deck_id}]?`)) {
      practiceService.deleteDeck(selectedDeck.deck_id);
      refreshDecks();
      setSelectedDeck(null);
      setSuccessMsg('Đã xóa bộ đề.');
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  // Generate Deck with AI Gemini
  const handleGenerateAiDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTopic.trim() || isGeneratingAi) return;

    setIsGeneratingAi(true);
    setErrorMsg(null);
    try {
      const generated = await practiceService.generateDeck(
        aiTopic.trim(),
        aiCategory,
        aiLevel,
        aiCount
      );

      if (generated) {
        setIsAiModalOpen(false);
        setAiTopic('');
        refreshDecks();
        handleSelectDeck(generated);
        setSuccessMsg(`AI Gemini đã tạo thành công bộ đề [${generated.deck_id}] với ${generated.cards.length} câu!`);
        setTimeout(() => setSuccessMsg(null), 5000);
      } else {
        setErrorMsg('Không thể tạo bộ đề bằng AI lúc này. Vui lòng thử lại.');
      }
    } catch (e: any) {
      console.error('AI Generator Error:', e);
      setErrorMsg('Lỗi kết nối AI Gemini.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Export to JSON
  const handleExportJson = () => {
    if (!selectedDeck) return;
    const jsonStr = JSON.stringify(selectedDeck, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedDeck.deck_id}_practice_deck.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-xs font-semibold text-indigo-300">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Quản Lý &amp; Tạo Đề Ôn Tập Tự Chọn</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            Kho Đề Ôn Tập Thông Minh (Mastery Decks)
          </h2>
          <p className="text-xs text-slate-400">
            Tạo đề ôn tập tự chọn không giới hạn, nhập liệu thủ công hoặc tạo tự động siêu tốc bằng AI Gemini.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center space-x-2 transition shadow-md shadow-purple-600/20"
          >
            <Sparkles className="w-4 h-4" />
            <span>Tạo Đề Bằng AI Gemini</span>
          </button>

          <button
            onClick={handleNewDeck}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center space-x-2 transition shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Đề Thủ Công</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-2 text-emerald-300 text-xs font-semibold animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-2 text-rose-300 text-xs font-semibold animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Grid: Deck List (Left) vs Deck Editor (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Deck Library (4 Cols) */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>Danh Sách Đề ({decks.length})</span>
            </h3>
            <span className="text-[11px] text-slate-400">Chọn đề để xem/sửa</span>
          </div>

          <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
            {decks.map(deck => {
              const isSelected = selectedDeck?.deck_id === deck.deck_id;
              return (
                <div
                  key={deck.deck_id}
                  onClick={() => handleSelectDeck(deck)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between space-y-2 ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500 shadow-md'
                      : 'bg-slate-800/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-indigo-300 bg-indigo-900/40 px-2 py-0.5 rounded border border-indigo-700/40">
                      {deck.deck_id}
                    </span>
                    <span className="text-[10px] uppercase font-semibold text-slate-400">
                      {deck.category}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-white line-clamp-1">
                    {deck.title}
                  </h4>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                    <span>{deck.cards.length} câu hỏi</span>
                    <span className="text-emerald-400 font-semibold">{deck.level}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Deck Details & Question Editor (8 Cols) */}
        <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          
          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white">
                {selectedDeck ? `Chi Tiết Bộ Đề [${selectedDeck.deck_id}]` : 'Tạo Bộ Đề Ôn Tập Mới'}
              </h3>
              <p className="text-xs text-slate-400">
                Thí sinh nhập mã đề này tại cổng đăng nhập để vào bài ôn tập
              </p>
            </div>

            <div className="flex items-center space-x-2">
              {selectedDeck && (
                <>
                  <button
                    onClick={handleExportJson}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition text-xs flex items-center gap-1"
                    title="Xuất file JSON"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handleDeleteDeck}
                    className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl transition text-xs flex items-center gap-1"
                    title="Xóa bộ đề này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}

              <button
                onClick={handleSaveDeck}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition shadow-md shadow-emerald-600/20"
              >
                <Save className="w-4 h-4" />
                <span>Lưu Bộ Đề</span>
              </button>
            </div>
          </div>

          {/* Form Meta */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Mã Đề (Exam Code) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={deckId}
                onChange={(e) => setDeckId(e.target.value)}
                placeholder="e.g. ON_TAP_01, VOCAB_B2"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Tiêu Đề Bộ Đề <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Từ Vựng & Ngữ Pháp Học Thuật Chuyên Sâu"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Danh Mục (Category)
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value="Vocabulary">Vocabulary (Từ vựng)</option>
                <option value="Grammar">Grammar (Ngữ pháp)</option>
                <option value="Communication">Communication (Giao tiếp)</option>
                <option value="IELTS Academic">IELTS Academic</option>
                <option value="General English">General English</option>
                <option value="Custom">Tùy chỉnh khác</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Trình Độ (Level)
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value="A1-A2">A1 - A2 (Cơ bản)</option>
                <option value="B1-B2">B1 - B2 (Trung cấp)</option>
                <option value="C1-C2">C1 - C2 (Nâng cao)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Mô Tả Ngắn
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Rèn luyện ngữ cảnh và phản xạ câu..."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Question Cards List */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Danh Sách Câu Hỏi / Thẻ Ôn Tập ({cards.length})</span>
              </h4>

              <button
                onClick={handleAddCard}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold rounded-xl text-xs flex items-center space-x-1 border border-slate-700 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Câu Mới</span>
              </button>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {cards.map((card, idx) => (
                <div
                  key={card.id || idx}
                  className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-300 font-mono text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>

                    <button
                      onClick={() => handleRemoveCard(idx)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                      title="Xóa câu này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Sentence EN with cloze mark */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Câu Tiếng Anh (Dùng _____ cho chỗ trống cần điền):
                    </label>
                    <input
                      type="text"
                      value={card.sentence_en}
                      onChange={(e) => handleCardChange(idx, 'sentence_en', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Sentence VI */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Dịch Nghĩa Tiếng Việt:
                    </label>
                    <input
                      type="text"
                      value={card.sentence_vi}
                      onChange={(e) => handleCardChange(idx, 'sentence_vi', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Target & Hints */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1">
                        Từ Cần Điền (Đáp Án):
                      </label>
                      <input
                        type="text"
                        value={card.cloze_target}
                        onChange={(e) => handleCardChange(idx, 'cloze_target', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-emerald-300 font-bold text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Từ Loại &amp; Phiên Âm IPA:
                      </label>
                      <input
                        type="text"
                        value={card.phonetic || ''}
                        onChange={(e) => handleCardChange(idx, 'phonetic', e.target.value)}
                        placeholder="e.g. /kɜːb/ (verb)"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-300 text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1">
                        Gợi Ý (Hints):
                      </label>
                      <input
                        type="text"
                        value={card.hints || ''}
                        onChange={(e) => handleCardChange(idx, 'hints', e.target.value)}
                        placeholder="e.g. kiềm chế, hạn chế (động từ)"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-amber-300 text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Explanation */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Giải Thích Ngữ Pháp &amp; Collocation:
                    </label>
                    <textarea
                      rows={2}
                      value={card.explanation}
                      onChange={(e) => handleCardChange(idx, 'explanation', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-300 text-xs focus:outline-none focus:border-indigo-500 leading-relaxed"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* AI Generator Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg p-6 md:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Tạo Đề Bằng AI Gemini 3.7</h3>
                  <p className="text-xs text-slate-400">Tự động sinh câu hỏi, chỗ trống và giải thích chuyên sâu</p>
                </div>
              </div>

              <button
                onClick={() => setIsAiModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerateAiDeck} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Chủ Đề Cần Tạo <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="e.g. Mệnh đề quan hệ nâng cao, IELTS Task 2 Environment, Phrasal Verbs..."
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Danh Mục
                  </label>
                  <select
                    value={aiCategory}
                    onChange={(e) => setAiCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Vocabulary">Vocabulary (Từ vựng)</option>
                    <option value="Grammar">Grammar (Ngữ pháp)</option>
                    <option value="Communication">Communication (Giao tiếp)</option>
                    <option value="IELTS Academic">IELTS Academic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Trình Độ
                  </label>
                  <select
                    value={aiLevel}
                    onChange={(e) => setAiLevel(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="A1-A2">A1 - A2</option>
                    <option value="B1-B2">B1 - B2</option>
                    <option value="C1-C2">C1 - C2</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Số lượng câu hỏi ({aiCount} câu)
                </label>
                <input
                  type="range"
                  min={5}
                  max={20}
                  value={aiCount}
                  onChange={(e) => setAiCount(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={isGeneratingAi || !aiTopic.trim()}
                className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition shadow-lg shadow-purple-600/30"
              >
                {isGeneratingAi ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Gemini đang sinh bộ câu hỏi và giải thích...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Tạo Bộ Đề Tự Động Ngay</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

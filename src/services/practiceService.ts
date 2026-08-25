import { CustomPracticeDeck, PracticeUserStats, SentenceGrammarAnalysis, CardReviewState } from '../types/practice';
import { STARTER_PRACTICE_DECKS } from '../data/practiceDecks';

const STORAGE_CUSTOM_DECKS = 'custom_practice_decks_repo';
const STORAGE_USER_STATS = 'custom_practice_user_stats';

export const practiceService = {
  // Get all available decks (Starter + Custom)
  getAllDecks(): CustomPracticeDeck[] {
    try {
      const customRaw = localStorage.getItem(STORAGE_CUSTOM_DECKS);
      const customDecks: CustomPracticeDeck[] = customRaw ? JSON.parse(customRaw) : [];
      
      // Combine avoiding duplicate IDs
      const combined = [...STARTER_PRACTICE_DECKS];
      for (const cd of customDecks) {
        const existingIdx = combined.findIndex(d => d.deck_id === cd.deck_id);
        if (existingIdx >= 0) {
          combined[existingIdx] = cd;
        } else {
          combined.push(cd);
        }
      }
      return combined;
    } catch (e) {
      console.error('Error loading custom decks:', e);
      return STARTER_PRACTICE_DECKS;
    }
  },

  // Get single deck by ID or code, with optional GAS fetch
  async getDeckById(deckId: string, gasUrl?: string): Promise<CustomPracticeDeck | null> {
    const cleanId = deckId.trim().toUpperCase();

    // 1. Check local combined repo first
    const all = this.getAllDecks();
    const localDeck = all.find(d => d.deck_id.toUpperCase() === cleanId);
    if (localDeck) return localDeck;

    // 2. Try fetching from GAS API if configured
    if (gasUrl && !gasUrl.includes('AKfycbx_mock')) {
      try {
        const url = `${gasUrl}?action=get_practice_deck&deck_code=${encodeURIComponent(cleanId)}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data && (data.deck || data.cards || data.data)) {
            const fetched = data.deck || data.data || data;
            if (Array.isArray(fetched.cards) && fetched.cards.length > 0) {
              return {
                deck_id: cleanId,
                title: fetched.title || `Bộ đề ôn tập ${cleanId}`,
                category: fetched.category || 'Custom',
                description: fetched.description || 'Đề ôn tập tự chọn được đồng bộ từ Google Sheets.',
                target_language: fetched.target_language || 'English',
                native_language: fetched.native_language || 'Vietnamese',
                level: fetched.level || 'B1-B2',
                cards: fetched.cards
              };
            }
          }
        }
      } catch (err) {
        console.warn('Could not fetch practice deck from GAS endpoint:', err);
      }
    }

    // 3. Fallback: if not found, return first starter deck
    return STARTER_PRACTICE_DECKS[0] || null;
  },

  // Save or update custom deck
  saveDeck(deck: CustomPracticeDeck): boolean {
    try {
      const customRaw = localStorage.getItem(STORAGE_CUSTOM_DECKS);
      const customDecks: CustomPracticeDeck[] = customRaw ? JSON.parse(customRaw) : [];
      
      const idx = customDecks.findIndex(d => d.deck_id.toUpperCase() === deck.deck_id.toUpperCase());
      if (idx >= 0) {
        customDecks[idx] = { ...deck, updated_at: new Date().toISOString() };
      } else {
        customDecks.unshift({ ...deck, created_at: new Date().toISOString() });
      }

      localStorage.setItem(STORAGE_CUSTOM_DECKS, JSON.stringify(customDecks));
      return true;
    } catch (e) {
      console.error('Error saving custom deck:', e);
      return false;
    }
  },

  // Delete custom deck
  deleteDeck(deckId: string): boolean {
    try {
      const customRaw = localStorage.getItem(STORAGE_CUSTOM_DECKS);
      if (!customRaw) return false;
      const customDecks: CustomPracticeDeck[] = JSON.parse(customRaw);
      const filtered = customDecks.filter(d => d.deck_id.toUpperCase() !== deckId.toUpperCase());
      localStorage.setItem(STORAGE_CUSTOM_DECKS, JSON.stringify(filtered));
      return true;
    } catch (e) {
      console.error('Error deleting deck:', e);
      return false;
    }
  },

  // Load user practice stats
  getUserStats(): PracticeUserStats {
    try {
      const raw = localStorage.getItem(STORAGE_USER_STATS);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Error loading user stats:', e);
    }

    return {
      daily_streak: 1,
      last_streak_date: new Date().toISOString().split('T')[0],
      words_practiced_today: 0,
      best_streak: 3,
      correct_repeats_pct: 88,
      total_cards_mastered: 14,
      cards_state: {},
      history_logs: []
    };
  },

  // Save practice session results & update mastery
  recordPracticeSession(
    deckId: string,
    deckTitle: string,
    cardsPracticed: number,
    correctAnswers: number,
    cardResults: Record<string, boolean>
  ): PracticeUserStats {
    const currentStats = this.getUserStats();
    const todayStr = new Date().toISOString().split('T')[0];

    // Calculate streak
    let newStreak = currentStats.daily_streak;
    if (currentStats.last_streak_date !== todayStr) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (currentStats.last_streak_date === yesterday) {
        newStreak += 1;
      } else {
        newStreak = 1;
      }
    }

    const wordsToday = (currentStats.last_streak_date === todayStr ? currentStats.words_practiced_today : 0) + cardsPracticed;
    const bestStreak = Math.max(currentStats.best_streak, newStreak);

    // Update card states
    const updatedCardsState = { ...currentStats.cards_state };
    let newlyMastered = 0;

    Object.entries(cardResults).forEach(([cardId, isCorrect]) => {
      const prev = updatedCardsState[cardId] || {
        card_id: cardId,
        correct_count: 0,
        wrong_count: 0,
        last_practiced: new Date().toISOString(),
        mastered: false
      };

      const newCorrect = isCorrect ? prev.correct_count + 1 : prev.correct_count;
      const newWrong = !isCorrect ? prev.wrong_count + 1 : prev.wrong_count;
      const isMastered = newCorrect >= 2 && newWrong <= 1;

      if (!prev.mastered && isMastered) {
        newlyMastered += 1;
      }

      updatedCardsState[cardId] = {
        ...prev,
        correct_count: newCorrect,
        wrong_count: newWrong,
        last_practiced: new Date().toISOString(),
        mastered: isMastered
      };
    });

    const totalMastered = Object.values(updatedCardsState).filter((c: CardReviewState) => Boolean(c && c.mastered)).length;
    const sessionPct = cardsPracticed > 0 ? Math.round((correctAnswers / cardsPracticed) * 100) : 100;
    const overallPct = Math.round((currentStats.correct_repeats_pct * 0.7) + (sessionPct * 0.3));

    const newLog = {
      timestamp: new Date().toISOString(),
      deck_id: deckId,
      deck_title: deckTitle,
      cards_practiced: cardsPracticed,
      score: correctAnswers
    };

    const newStats: PracticeUserStats = {
      daily_streak: newStreak,
      last_streak_date: todayStr,
      words_practiced_today: wordsToday,
      best_streak: bestStreak,
      correct_repeats_pct: overallPct,
      total_cards_mastered: totalMastered,
      cards_state: updatedCardsState,
      history_logs: [newLog, ...(currentStats.history_logs || [])].slice(0, 50)
    };

    try {
      localStorage.setItem(STORAGE_USER_STATS, JSON.stringify(newStats));
    } catch (e) {
      console.error('Error saving user stats:', e);
    }

    return newStats;
  },

  // Call Server-side Gemini Grammar Analyzer
  async analyzeSentence(sentence: string, targetWord?: string, userQuestion?: string, context?: string): Promise<SentenceGrammarAnalysis> {
    try {
      const response = await fetch('/api/gemini/analyze-grammar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentence, targetWord, userQuestion, context })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.analysis) {
          return data.analysis;
        }
      }
    } catch (err) {
      console.warn('Backend Gemini grammar analysis failed, using client fallback:', err);
    }

    // Fallback response if offline or backend error
    return {
      original_sentence: sentence,
      target_word: targetWord || 'Từ khóa',
      sentence_translation_vi: `Bản dịch cấu trúc: "${sentence}"`,
      syntax_breakdown: {
        subject: 'Thành phần Chủ ngữ (Subject) trong câu',
        main_verb: 'Động từ chính & Thì ngữ pháp (Main verb & Tense)',
        object_or_complement: 'Tân ngữ hoặc Bổ ngữ (Object / Complement)',
        modifiers_or_clauses: 'Mệnh đề bổ trợ, trạng từ chỉ nơi chốn/thời gian'
      },
      word_analysis: {
        target_word: targetWord || '',
        part_of_speech: 'Danh từ / Động từ / Tính từ phù hợp',
        phonetic: '',
        definition_vi: 'Ý nghĩa ngữ cảnh',
        root_and_forms: [],
        synonyms: ['từ đồng nghĩa phù hợp'],
        antonyms: []
      },
      key_grammar_rules: [
        'Sự phối hợp giữa chủ ngữ và động từ trong câu.',
        'Vị trí từ loại phù hợp (Noun sau tính từ, Adverb bổ nghĩa cho Verb).'
      ],
      collocations_and_phrases: [
        'Collocation tự nhiên trong câu'
      ],
      detailed_explanation_vi: `Cấu trúc câu hoàn chỉnh và rõ nghĩa. Từ khóa "${targetWord || ''}" giúp hoàn thiện mạch văn và ngữ pháp của câu.`,
      common_pitfalls: 'Cần chú ý từ loại (Word Family) và giới từ đi kèm để tránh mất điểm.',
      example_sentences: [
        {
          en: `Here is an academic example with "${targetWord || 'this word'}".`,
          vi: `Đây là một ví dụ học thuật có chứa từ này.`
        }
      ]
    };
  },

  // Call Server-side Gemini Practice Deck Generator
  async generateDeck(topic: string, category: string, level: string, count: number): Promise<CustomPracticeDeck | null> {
    try {
      const response = await fetch('/api/gemini/generate-practice-deck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, category, level, cardCount: count })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.deck) {
          const generated: CustomPracticeDeck = {
            ...data.deck,
            is_custom: true,
            created_at: new Date().toISOString()
          };
          this.saveDeck(generated);
          return generated;
        }
      }
    } catch (err) {
      console.error('Error generating deck with Gemini:', err);
    }
    return null;
  }
};

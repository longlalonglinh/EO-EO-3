import { describe, it, expect } from 'vitest';

describe('IELTS CBT UI/UX & Heuristics Verification', () => {
  it('validates word counter utility respects word boundaries and protects against whitespace anomalies', () => {
    const countWords = (text?: string): number => {
      if (!text || typeof text !== 'string') return 0;
      const clean = text.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
      if (!clean) return 0;
      return clean.split(/\s+/).filter(t => t.length > 0 && /\w/.test(t)).length;
    };

    expect(countWords('')).toBe(0);
    expect(countWords('   ')).toBe(0);
    expect(countWords('The chart illustrates the consumption of energy across five countries.')).toBe(10);
    expect(countWords('One two three    four\nfive\r\nsix')).toBe(6);
  });

  it('validates pre-publish readiness checklist audit logic', () => {
    // Exam with complete data
    const fullExam = {
      skills: ['listening', 'reading', 'writing'],
      audio_url: 'https://example.com/audio.mp3',
      passages: [
        {
          passage_index: 1,
          questions: [
            { question_id: 'R1_1', correct_answer: 'TRUE' },
            { question_id: 'R1_2', correct_answer: 'FALSE' }
          ]
        }
      ],
      listening_questions: [
        { question_id: 'L1', correct_answer: 'A' }
      ],
      writing_task1_prompt: 'Summarise the chart below.',
      writing_task2_prompt: 'Discuss both views and give your opinion.',
      duration_mins: 150
    };

    const targetSkills = fullExam.skills;
    const hasListening = targetSkills.includes('listening');
    const hasReading = targetSkills.includes('reading');
    const hasWriting = targetSkills.includes('writing');

    const audioCheck = !hasListening ? 'na' : Boolean(fullExam.audio_url?.trim()) ? 'pass' : 'fail';
    const allQs = [
      ...fullExam.passages[0].questions,
      ...fullExam.listening_questions
    ];
    const missingKeys = allQs.filter(q => !q.correct_answer || !q.correct_answer.trim());
    const answerKeyCheck = missingKeys.length === 0 ? 'pass' : 'fail';
    const writingCheck = (Boolean(fullExam.writing_task1_prompt) && Boolean(fullExam.writing_task2_prompt)) ? 'pass' : 'fail';
    const durationCheck = fullExam.duration_mins > 0 ? 'pass' : 'fail';

    expect(audioCheck).toBe('pass');
    expect(answerKeyCheck).toBe('pass');
    expect(writingCheck).toBe('pass');
    expect(durationCheck).toBe('pass');

    // Partial Exam with missing audio and missing key
    const partialExam = {
      skills: ['listening', 'reading'],
      audio_url: '',
      passages: [
        {
          passage_index: 1,
          questions: [
            { question_id: 'R1_1', correct_answer: '' }
          ]
        }
      ],
      listening_questions: [],
      duration_mins: 90
    };

    const partialAudioCheck = Boolean(partialExam.audio_url?.trim()) ? 'pass' : 'fail';
    const partialMissingKeys = partialExam.passages[0].questions.filter(q => !q.correct_answer?.trim());
    const partialKeyCheck = partialMissingKeys.length === 0 ? 'pass' : 'fail';

    expect(partialAudioCheck).toBe('fail');
    expect(partialKeyCheck).toBe('fail');
  });

  it('validates 3-state Question Palette color mappings (Unanswered, Answered, Flagged)', () => {
    const getPaletteClass = (isAnswered: boolean, isFlagged: boolean) => {
      if (isFlagged) return 'bg-amber-400 text-amber-950 font-black';
      if (isAnswered) return 'bg-emerald-600 text-white font-black';
      return 'bg-slate-100 text-slate-700';
    };

    expect(getPaletteClass(false, false)).toContain('bg-slate-100');
    expect(getPaletteClass(true, false)).toContain('bg-emerald-600');
    expect(getPaletteClass(false, true)).toContain('bg-amber-400');
    // Flagged takes priority over answered for candidate review
    expect(getPaletteClass(true, true)).toContain('bg-amber-400');
  });
});

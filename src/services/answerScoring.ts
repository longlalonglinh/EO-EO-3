import { ExamData, Question } from '../types';

/**
 * 1. ANSWER NORMALIZATION ENGINE (Automated answer normalization)
 *
 * Normalizes input strings by:
 * - Converting all characters to lowercase
 * - Removing leading indefinite/definite articles: ^(a|an|the)\s+
 * - Removing redundant punctuation: /[.,/#!$%^&*;:{}=\-_~()]/g
 * - Collapsing multiple consecutive whitespaces and trimming
 */
export function normalizeAnswer(input: string | undefined | null): string {
  if (!input) return '';

  let text = input.toString().toLowerCase();

  // 1. Strip leading optional articles: ^(a|an|the)\s+
  text = text.replace(/^(a|an|the)\s+/i, '');

  // 2. Remove hyphens, slashes, underscores, and redundant punctuation
  text = text.replace(/[-_/\\]+/g, '');

  // 3. Strip ordinal suffixes from numbers (e.g. 14th -> 14, 1st -> 1, 2nd -> 2, 3rd -> 3)
  text = text.replace(/\b(\d+)(st|nd|rd|th)\b/gi, '$1');

  // 4. Remove redundant punctuation (excluding letters, digits, and spaces)
  text = text.replace(/[.,#!$%^&*;:{}=\~()]/g, '');

  // 5. Remove excess whitespace and trim
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * Parses and returns a clean array of acceptable answers from either:
 * - A string array (e.g. ["1400 km", "1400 kilometres"])
 * - A pipe-separated string (e.g. "1,400 kilometres|1400 kilometres|1400 km|1,400km")
 * - Combined with optional acceptable_answers array
 */
export function parseAcceptableAnswers(
  correctAnswer: string | string[] | undefined | null,
  acceptableAnswers?: string[]
): string[] {
  const result: string[] = [];

  if (Array.isArray(correctAnswer)) {
    const validStrings: string[] = [];
    correctAnswer.forEach(ans => {
      if (typeof ans === 'string' && ans.trim()) {
        const trimmed = ans.trim();
        validStrings.push(trimmed);
        result.push(trimmed);
      }
    });
    // If it's an array of single letters e.g. ["A", "C"], also provide the combined "A, C"
    if (validStrings.length > 1 && validStrings.every(s => /^[A-Za-z]$/.test(s))) {
      const combined = validStrings.map(s => s.toUpperCase()).sort().join(', ');
      if (!result.includes(combined)) {
        result.push(combined);
      }
    }
  } else if (typeof correctAnswer === 'string' && correctAnswer.trim()) {
    // Split by pipe '|'
    const parts = correctAnswer.split('|').map(s => s.trim()).filter(Boolean);
    result.push(...parts);
  }

  if (Array.isArray(acceptableAnswers)) {
    acceptableAnswers.forEach(ans => {
      if (typeof ans === 'string' && ans.trim() && !result.includes(ans.trim())) {
        result.push(ans.trim());
      }
    });
  }

  return result;
}

/**
 * Evaluates whether a student answer matches any acceptable answer.
 * Handles exact matches, normalized comparison, and standard IELTS abbreviations (T/F/NG, Y/N/NG).
 */
export function isAnswerCorrect(
  userAnswer: string | undefined | null,
  correctAnswer: string | string[] | undefined | null,
  acceptableAnswers?: string[],
  questionType?: string
): boolean {
  if (!userAnswer || userAnswer.trim() === '') {
    return false;
  }

  const rawUser = userAnswer.trim();
  const normUser = normalizeAnswer(rawUser);

  if (!normUser) {
    return false;
  }

  const options = parseAcceptableAnswers(correctAnswer, acceptableAnswers);
  if (options.length === 0) {
    return false;
  }

  const cleanQType = (questionType || '').toLowerCase();

  // Check normalized candidates
  for (const option of options) {
    const normOption = normalizeAnswer(option);

    // Direct normalized equality match
    if (normUser === normOption) {
      return true;
    }

    // Handle True / False / Not Given shortcuts (bidirectional T/F/NG vs TRUE/FALSE/NOT GIVEN)
    if (
      cleanQType.includes('true_false') || 
      ['true', 'false', 'not given', 't', 'f', 'ng'].includes(normOption)
    ) {
      if ((normOption === 'true' || normOption === 't') && (normUser === 't' || normUser === 'true')) return true;
      if ((normOption === 'false' || normOption === 'f') && (normUser === 'f' || normUser === 'false')) return true;
      if ((normOption === 'not given' || normOption === 'ng') && (normUser === 'ng' || normUser === 'not given')) return true;
    }

    // Handle Yes / No / Not Given shortcuts (bidirectional Y/N/NG vs YES/NO/NOT GIVEN)
    if (
      cleanQType.includes('yes_no') || 
      ['yes', 'no', 'not given', 'y', 'n', 'ng'].includes(normOption)
    ) {
      if ((normOption === 'yes' || normOption === 'y') && (normUser === 'y' || normUser === 'yes')) return true;
      if ((normOption === 'no' || normOption === 'n') && (normUser === 'n' || normUser === 'no')) return true;
      if ((normOption === 'not given' || normOption === 'ng') && (normUser === 'ng' || normUser === 'not given')) return true;
    }

    // Number with units handling (e.g. 1400km vs 1400 km)
    const strippedUser = normUser.replace(/\s+/g, '');
    const strippedOption = normOption.replace(/\s+/g, '');
    if (strippedUser === strippedOption) {
      return true;
    }

    // Check multi-choice letter sets unordered equality (e.g. "A, B" vs "B, A" or "A, C" vs "C, A")
    const isLetterList = (str: string) => /^[a-h](\s*,\s*[a-h])+$/i.test(str.trim()) || /^[a-h](\s+[a-h])+$/i.test(str.trim());
    if (isLetterList(normUser) && isLetterList(normOption)) {
      const sortedUser = normUser.split(/[\s,]+/).filter(Boolean).sort().join(',');
      const sortedOption = normOption.split(/[\s,]+/).filter(Boolean).sort().join(',');
      if (sortedUser === sortedOption) {
        return true;
      }
    }

    // Also support if user selected multiple letters and option was comma-separated
    const userLetters = normUser.split(/[\s,]+/).filter(s => /^[a-h]$/i.test(s)).sort().join(',');
    const optLetters = normOption.split(/[\s,]+/).filter(s => /^[a-h]$/i.test(s)).sort().join(',');
    if (userLetters && optLetters && userLetters.length > 1 && userLetters === optLetters) {
      return true;
    }

    // Check single choice option prefix match (e.g. candidate typed "A. 1400 km" when option is "A")
    if (/^[A-H]$/i.test(option.trim())) {
      const match = rawUser.match(/^([A-H])[\.\)\:\s]/i);
      if (match && match[1].toUpperCase() === option.trim().toUpperCase()) {
        return true;
      }
    }

    // Date permutation match: e.g. "14 may" vs "may 14"
    const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec'];
    const userWords = normUser.split(' ');
    const optWords = normOption.split(' ');
    if (userWords.length === 2 && optWords.length === 2) {
      const hasMonthUser = userWords.some(w => MONTHS.includes(w));
      const hasNumUser = userWords.some(w => /^\d{1,2}$/.test(w));
      const hasMonthOpt = optWords.some(w => MONTHS.includes(w));
      const hasNumOpt = optWords.some(w => /^\d{1,2}$/.test(w));
      if (hasMonthUser && hasNumUser && hasMonthOpt && hasNumOpt) {
        if (userWords.slice().sort().join(' ') === optWords.slice().sort().join(' ')) {
          return true;
        }
      }
    }

    // Common UK vs US spelling equivalence in IELTS
    const canonicalizeUKUS = (str: string) => {
      return str
        .replace(/\bcolor\b/g, 'colour')
        .replace(/\bfavorite\b/g, 'favourite')
        .replace(/\btheater\b/g, 'theatre')
        .replace(/\bcenter\b/g, 'centre')
        .replace(/\bmeter\b/g, 'metre')
        .replace(/\bmeters\b/g, 'metres')
        .replace(/\bkilometer\b/g, 'kilometre')
        .replace(/\bkilometers\b/g, 'kilometres')
        .replace(/\bprogram\b/g, 'programme')
        .replace(/\btraveling\b/g, 'travelling')
        .replace(/\bcanceled\b/g, 'cancelled')
        .replace(/\bdialog\b/g, 'dialogue')
        .replace(/\bdefense\b/g, 'defence')
        .replace(/\boffense\b/g, 'offence')
        .replace(/\borganize\b/g, 'organise')
        .replace(/\borganized\b/g, 'organised')
        .replace(/\brecognize\b/g, 'recognise')
        .replace(/\brecognized\b/g, 'recognised');
    };
    if (canonicalizeUKUS(normUser) === canonicalizeUKUS(normOption)) {
      return true;
    }
  }

  return false;
}

/**
 * Official IELTS Academic Reading Raw-to-Band Conversion Table (0 - 40 Raw Points)
 * If maxScore < 40 (e.g. mini practice test), scales score proportionally to 40-point IELTS standard.
 */
export function calculateAcademicReadingBand(rawScore: number, maxScore: number = 40): number {
  if (maxScore <= 0) return 0.0;
  const scaled = maxScore !== 40 ? Math.round((rawScore / maxScore) * 40) : rawScore;
  const score = Math.max(0, Math.min(40, Math.round(scaled)));

  if (score >= 39) return 9.0;
  if (score >= 37) return 8.5;
  if (score >= 35) return 8.0;
  if (score >= 33) return 7.5;
  if (score >= 30) return 7.0;
  if (score >= 27) return 6.5;
  if (score >= 23) return 6.0;
  if (score >= 19) return 5.5;
  if (score >= 15) return 5.0;
  if (score >= 13) return 4.5;
  if (score >= 10) return 4.0;
  if (score >= 8) return 3.5;
  if (score >= 6) return 3.0;
  if (score >= 4) return 2.5;
  if (score >= 2) return 2.0;
  if (score === 1) return 1.0;
  return 0.0;
}

/**
 * Official IELTS Listening Raw-to-Band Conversion Table (0 - 40 Raw Points)
 * If maxScore < 40 (e.g. mini practice test), scales score proportionally to 40-point IELTS standard.
 */
export function calculateListeningBand(rawScore: number, maxScore: number = 40): number {
  if (maxScore <= 0) return 0.0;
  const scaled = maxScore !== 40 ? Math.round((rawScore / maxScore) * 40) : rawScore;
  const score = Math.max(0, Math.min(40, Math.round(scaled)));

  if (score >= 39) return 9.0;
  if (score >= 37) return 8.5;
  if (score >= 35) return 8.0;
  if (score >= 32) return 7.5;
  if (score >= 30) return 7.0;
  if (score >= 26) return 6.5;
  if (score >= 23) return 6.0;
  if (score >= 18) return 5.5;
  if (score >= 16) return 5.0;
  if (score >= 13) return 4.5;
  if (score >= 10) return 4.0;
  if (score >= 8) return 3.5;
  if (score >= 6) return 3.0;
  if (score >= 4) return 2.5;
  if (score >= 2) return 2.0;
  if (score === 1) return 1.0;
  return 0.0;
}

export interface QuestionGradingResult {
  question_id: string;
  section: 'listening' | 'reading';
  user_answer: string;
  is_correct: boolean;
  score_awarded: number;
  acceptable_answers: string[];
}

export interface ExamGradingSummary {
  listening_raw: number;
  listening_max: number;
  listening_band: number;
  reading_raw: number;
  reading_max: number;
  reading_band: number;
  total_raw: number;
  results: Record<string, QuestionGradingResult>;
}

/**
 * Evaluates an entire candidate answer sheet against an ExamData model
 */
export function gradeExamAnswers(
  exam: ExamData,
  userAnswers: Record<string, string>
): ExamGradingSummary {
  const isWritingRetake = Boolean(
    (exam.retakeMode && exam.targetSkill === 'writing') ||
    (exam.targetSkill === 'writing') ||
    (exam.exam_type === 'one_skill' && exam.skills?.length === 1 && exam.skills[0] === 'writing')
  );

  const isReadingRetake = Boolean(
    (exam.retakeMode && exam.targetSkill === 'reading') ||
    (exam.targetSkill === 'reading') ||
    (exam.exam_type === 'one_skill' && exam.skills?.length === 1 && exam.skills[0] === 'reading')
  );

  const isListeningRetake = Boolean(
    (exam.retakeMode && exam.targetSkill === 'listening') ||
    (exam.targetSkill === 'listening') ||
    (exam.exam_type === 'one_skill' && exam.skills?.length === 1 && exam.skills[0] === 'listening')
  );

  if (isWritingRetake) {
    return {
      listening_raw: 0,
      listening_max: 0,
      listening_band: 0,
      reading_raw: 0,
      reading_max: 0,
      reading_band: 0,
      total_raw: 0,
      results: {}
    };
  }

  const allListeningQuestions = isReadingRetake 
    ? [] 
    : (exam.listening_questions || (exam.questions || []).filter(q => q.section === 'listening'));
  
  // Collect reading questions directly from standardized passages first
  let allReadingQuestions: Question[] = [];
  if (!isListeningRetake) {
    if (exam.passages && exam.passages.length > 0) {
      exam.passages.forEach(p => {
        if (p.questions && p.questions.length > 0) {
          allReadingQuestions.push(...p.questions);
        }
      });
    }
    if (allReadingQuestions.length === 0) {
      allReadingQuestions = exam.reading_questions || (exam.questions || []).filter(q => q.section === 'reading');
    }
  }

  let listeningRaw = 0;
  let readingRaw = 0;
  const results: Record<string, QuestionGradingResult> = {};

  // Grade Listening
  allListeningQuestions.forEach(q => {
    const userAns = userAnswers[q.question_id] || '';
    const isCorrect = isAnswerCorrect(userAns, q.correct_answer, q.acceptable_answers, q.question_type);
    const score = isCorrect ? (q.max_score || 1) : 0;
    listeningRaw += score;

    results[q.question_id] = {
      question_id: q.question_id,
      section: 'listening',
      user_answer: userAns,
      is_correct: isCorrect,
      score_awarded: score,
      acceptable_answers: parseAcceptableAnswers(q.correct_answer, q.acceptable_answers)
    };
  });

  // Grade Reading
  allReadingQuestions.forEach(q => {
    const userAns = userAnswers[q.question_id] || '';
    const isCorrect = isAnswerCorrect(userAns, q.correct_answer, q.acceptable_answers, q.question_type);
    const score = isCorrect ? (q.max_score || 1) : 0;
    readingRaw += score;

    results[q.question_id] = {
      question_id: q.question_id,
      section: 'reading',
      user_answer: userAns,
      is_correct: isCorrect,
      score_awarded: score,
      acceptable_answers: parseAcceptableAnswers(q.correct_answer, q.acceptable_answers)
    };
  });

  const listeningMax = allListeningQuestions.length;
  const readingMax = allReadingQuestions.length;

  const listeningBand = listeningMax > 0 ? calculateListeningBand(listeningRaw, listeningMax) : 0;
  const readingBand = readingMax > 0 ? calculateAcademicReadingBand(readingRaw, readingMax) : 0;

  return {
    listening_raw: listeningRaw,
    listening_max: listeningMax,
    listening_band: listeningBand,
    reading_raw: readingRaw,
    reading_max: readingMax,
    reading_band: readingBand,
    total_raw: listeningRaw + readingRaw,
    results
  };
}

export const scoreExam = gradeExamAnswers;

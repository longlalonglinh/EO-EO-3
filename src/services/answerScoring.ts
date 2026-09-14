import { ExamData, Question } from '../types';

/**
 * 1. ANSWER NORMALIZATION ENGINE (Chuẩn hóa câu trả lời tự động)
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

  // 2. Remove redundant punctuation
  text = text.replace(/[.,/#!$%^&*;:{}=\-_~()]/g, '');

  // 3. Remove excess whitespace and trim
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
    correctAnswer.forEach(ans => {
      if (typeof ans === 'string' && ans.trim()) {
        result.push(ans.trim());
      }
    });
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

  // Check normalized candidates
  for (const option of options) {
    const normOption = normalizeAnswer(option);

    // Direct normalized equality match
    if (normUser === normOption) {
      return true;
    }

    // Handle True / False / Not Given shortcuts (bidirectional T/F/NG vs TRUE/FALSE/NOT GIVEN)
    if (
      questionType === 'true_false_not_given' || 
      ['true', 'false', 'not given', 't', 'f', 'ng'].includes(normOption)
    ) {
      if ((normOption === 'true' || normOption === 't') && (normUser === 't' || normUser === 'true')) return true;
      if ((normOption === 'false' || normOption === 'f') && (normUser === 'f' || normUser === 'false')) return true;
      if ((normOption === 'not given' || normOption === 'ng') && (normUser === 'ng' || normUser === 'not given')) return true;
    }

    // Handle Yes / No / Not Given shortcuts (bidirectional Y/N/NG vs YES/NO/NOT GIVEN)
    if (
      questionType === 'yes_no_not_given' || 
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
  }

  return false;
}

/**
 * Official IELTS Academic Reading Raw-to-Band Conversion Table (0 - 40 Raw Points)
 */
export function calculateAcademicReadingBand(rawScore: number): number {
  const score = Math.max(0, Math.min(40, Math.round(rawScore)));

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
 */
export function calculateListeningBand(rawScore: number): number {
  const score = Math.max(0, Math.min(40, Math.round(rawScore)));

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
  const allListeningQuestions = exam.listening_questions || (exam.questions || []).filter(q => q.section === 'listening');
  
  // Collect reading questions directly from standardized passages first
  let allReadingQuestions: Question[] = [];
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

  const listeningBand = calculateListeningBand(listeningRaw);
  const readingBand = calculateAcademicReadingBand(readingRaw);

  return {
    listening_raw: listeningRaw,
    listening_max: allListeningQuestions.length || 40,
    listening_band: listeningBand,
    reading_raw: readingRaw,
    reading_max: allReadingQuestions.length || 40,
    reading_band: readingBand,
    total_raw: listeningRaw + readingRaw,
    results
  };
}

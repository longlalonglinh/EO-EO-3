export type QuestionType = 'multiple_choice' | 'fill_in_blank' | 'true_false_not_given' | 'matching';

export interface Question {
  question_id: string;
  section: 'listening' | 'reading';
  question_text: string;
  question_type: QuestionType;
  options?: string[];
  correct_answer?: string; // e.g. "A", "library", "TRUE"
  max_score: number;
  image_url?: string;
}

export interface ExamData {
  exam_code: string;
  title: string;
  test_type?: 'TEST' | 'PRACTICE';
  duration_mins?: number;
  audio_url?: string;
  audio_title?: string;
  image_url?: string;
  listening_questions?: Question[];
  passage_title?: string;
  reading_passage_title?: string;
  passage_text?: string;
  reading_passage?: string;
  reading_questions?: Question[];
  questions?: Question[];
  writing_task1_prompt?: string;
  writing_task1_image?: string;
  writing_task2_prompt?: string;
  created_at?: string;
}

// Alias for backwards compatibility
export type Exam = ExamData;

export interface WritingScores {
  TR: number;  // Task Response
  CC: number;  // Coherence & Cohesion
  LR: number;  // Lexical Resource
  GRA: number; // Grammatical Range & Accuracy
}

export interface GradingForm {
  tr: number;
  cc: number;
  lr: number;
  gra: number;
  overall_writing: number;
  feedback: string;
}

export interface SubmissionRecord {
  submission_id: string;
  sbd: string;
  exam_code: string;
  test_mode?: 'TEST' | 'PRACTICE';
  listening_answers?: Record<string, string>;
  reading_answers?: Record<string, string>;
  writing_task1_text?: string;
  writing_task2_text?: string;
  listening_raw_score?: number;
  listening_max_score?: number;
  listening_band?: number;
  listening_score?: number;
  reading_raw_score?: number;
  reading_max_score?: number;
  reading_band?: number;
  reading_score?: number;
  writing_scores?: WritingScores;
  writing_band?: number;
  writing_status: 'PENDING_TEACHER' | 'GRADED';
  writing_feedback?: string;
  overall_band?: number;
  submitted_at?: string;
  timestamp?: string;
  created_at?: string;
  submission_time?: string;
  violations_count?: number;
}

// Alias
export type Submission = SubmissionRecord;

export interface SubmissionPayload {
  submission_id?: string;
  sbd: string;
  exam_code: string;
  test_mode?: 'TEST' | 'PRACTICE';
  listening_answers?: Record<string, string>;
  reading_answers?: Record<string, string>;
  writing_task1_text?: string;
  writing_task2_text?: string;
  answers?: Record<string, string>;
  writing_task1?: string;
  writing_task2?: string;
  violations_count?: number;
  violation_logs?: CheatLog[];
  cheat_logs?: CheatLog[];
  submitted_at?: string;
}

export interface SubmissionResponse {
  success?: boolean;
  submission_id: string;
  sbd: string;
  exam_code: string;
  listening_raw_score?: number;
  listening_max_score?: number;
  listening_band?: number;
  listening_score?: number;
  reading_raw_score?: number;
  reading_max_score?: number;
  reading_band?: number;
  reading_score?: number;
  overall_raw_score?: number;
  writing_status: 'PENDING_TEACHER' | 'GRADED';
  submitted_at?: string;
  created_at?: string;
  message?: string;
}

export interface CheatLog {
  log_id: string;
  submission_id: string;
  sbd: string;
  exam_code: string;
  violation_type: 'ONBLUR' | 'FULLSCREEN_EXIT' | 'RIGHT_CLICK' | 'KEY_DEVTOOLS' | string;
  violation_count?: number;
  timestamp: string;
}

export interface StudentSession {
  sbd: string;
  exam_code: string;
  test_mode: 'TEST' | 'PRACTICE';
  is_review: boolean;
  review_submission_id?: string;
}

export interface HighlightingTool {
  id: string;
  color: 'yellow' | 'green' | 'blue';
  color_hex?: string;
  text: string;
  startIndex?: number;
  endIndex?: number;
  paragraphIndex?: number;
}

export interface ParseExamResponse {
  success: boolean;
  exam?: ExamData;
  error?: string;
}

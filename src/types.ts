export * from './types/practice';

export type QuestionType =
  // Listening & Reading shared
  | 'multiple_choice'
  | 'multiple_choice_multi'
  | 'matching'
  | 'plan_map_diagram_labelling'
  | 'form_note_table_flowchart_completion'
  | 'sentence_completion'
  | 'short_answer_questions'
  | 'true_false_not_given'
  | 'yes_no_not_given'
  // Reading specialized
  | 'matching_headings'
  | 'matching_information'
  | 'matching_features'
  | 'matching_sentence_endings'
  | 'diagram_label_completion'
  | 'summary_completion'
  // Fallbacks & aliases
  | 'fill_in_blank';

export interface MatchingOption {
  id: string; // e.g. "A", "i", "1"
  text: string;
}

export interface Question {
  question_id: string;
  section: 'listening' | 'reading';
  part?: 1 | 2 | 3 | 4; // Listening Part 1, 2, 3, 4 (10 questions each)
  passage_index?: 1 | 2 | 3; // Reading Passage 1, 2, 3
  question_text: string;
  question_type: QuestionType;
  instruction?: string; // e.g. "Write NO MORE THAN TWO WORDS AND/OR A NUMBER"
  word_limit?: string; // e.g. "NO MORE THAN TWO WORDS"
  options?: string[]; // Multiple choice options ["A. Option 1", "B. Option 2", ...]
  headings_list?: MatchingOption[]; // For Matching Headings: [{ id: "i", text: "..." }, ...]
  matching_options?: MatchingOption[]; // For Matching Features/Endings: [{ id: "A", text: "..." }, ...]
  diagram_image_url?: string; // For Diagram/Map/Plan Labelling
  diagram_labels?: string[]; // Labels available on diagram (e.g. ["A", "B", "C", "D", "E"])
  correct_answer?: string | string[]; // e.g. "A", "library", or pipe-separated "1,400 kilometres|1400 kilometres|1400 km|1,400km"
  acceptable_answers?: string[]; // Multiple accepted alternatives
  correct_answers_multi?: string[]; // e.g. ["B", "D"] for choose 2 out of 5
  explanation?: string;
  max_score: number;
  image_url?: string;
}

export interface ReadingPassageItem {
  passage_index: 1 | 2 | 3;
  title: string;
  text: string;
  questions: Question[];
}

export interface ExamData {
  exam_code: string;
  title: string;
  test_type?: 'TEST' | 'PRACTICE';
  duration_mins?: number; // Total exam duration in minutes (default 120 or 150)
  listening_duration_mins?: number; // Default 30-40 mins
  reading_duration_mins?: number; // Default 60 mins
  writing_duration_mins?: number; // Default 60 mins
  audio_url?: string;
  audio_title?: string;
  image_url?: string;
  listening_questions?: Question[];
  passage_title?: string;
  reading_passage_title?: string;
  passage_text?: string;
  reading_passage?: string;
  passages: ReadingPassageItem[]; // Multi-passage support (Passage 1, 2, 3) - each contains passage_index, title, text, and questions
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
  submission_type?: 'STANDARD' | 'TIMEOUT_FORCED';
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
  submission_type?: 'STANDARD' | 'TIMEOUT_FORCED';
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
  submission_type?: 'STANDARD' | 'TIMEOUT_FORCED';
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

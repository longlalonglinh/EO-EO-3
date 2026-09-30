import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'server_data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const EXAMS_FILE = path.join(DATA_DIR, 'exams.json');
const STARTER_PACK_FILE = path.join(DATA_DIR, 'starter_pack.json');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');
const CHEAT_LOGS_FILE = path.join(DATA_DIR, 'cheat_logs.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const PRACTICE_DECKS_FILE = path.join(DATA_DIR, 'practice_decks.json');

const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbySNk5foVr4UMC5ZVP1YTlxjxT9qFgdI85cH5nyQ63ffqXdYVZ7SJKbmD0B3xNO3DEe/exec";

// In-memory cache for ultra-low latency (<1ms)
let cachedExams: any[] | null = null;
let cachedSubmissions: any[] | null = null;
let cachedCheatLogs: any[] | null = null;
let cachedConfig: any | null = null;
let cachedPracticeDecks: any[] | null = null;

function safeReadJson<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn(`[Server Storage] Error reading ${filePath}, using fallback:`, err);
  }
  return fallback;
}

function safeWriteJson(filePath: string, data: any): void {
  try {
    const tmpPath = `${filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    console.error(`[Server Storage] Error writing ${filePath}:`, err);
  }
}

// ---------------- EXAMS ----------------
export function getStoredExams(): any[] {
  if (cachedExams) return cachedExams;

  const examsFromFile = safeReadJson<any[]>(EXAMS_FILE, []);
  cachedExams = Array.isArray(examsFromFile) ? examsFromFile : [];
  return cachedExams;
}

export function importStarterPack(): { imported: number; exams: any[] } {
  const starter = safeReadJson<any[]>(STARTER_PACK_FILE, []);
  if (!starter || starter.length === 0) return { imported: 0, exams: [] };

  const current = getStoredExams();
  const existingCodes = new Set(current.map((e: any) => (e.exam_code || '').toUpperCase()));
  let count = 0;
  for (const ex of starter) {
    const code = (ex.exam_code || '').toUpperCase();
    if (code && !existingCodes.has(code)) {
      current.push(ex);
      existingCodes.add(code);
      count++;
    }
  }
  cachedExams = current;
  safeWriteJson(EXAMS_FILE, current);
  return { imported: count, exams: current };
}

export function getStoredExam(examCode: string): any | null {
  const cleanCode = (examCode || '').trim().toUpperCase();
  if (!cleanCode) return null;

  const exams = getStoredExams();
  const found = exams.find((e: any) => (e.exam_code || '').toUpperCase() === cleanCode) || null;
  if (!found) return null;

  const writingSection = found.sections?.find((s: any) => s.skill === 'writing');
  const task1Obj = writingSection?.tasks?.find((t: any) => t.task_number === 1) || writingSection?.tasks?.[0];

  const resolvedT1Img = found.writing_task1_image || 
    found.writing_task1_image_url || 
    found.writing_task1_imageUrl || 
    task1Obj?.image_url || 
    task1Obj?.imageUrl || 
    found.image_url || 
    found.imageUrl || 
    '';

  if (resolvedT1Img) {
    found.writing_task1_image = resolvedT1Img;
    found.writing_task1_image_url = resolvedT1Img;
    found.writing_task1_imageUrl = resolvedT1Img;
  }

  return found;
}

export function saveStoredExam(examData: any): any {
  if (!examData || !examData.exam_code) {
    throw new Error('Exam data must have exam_code');
  }

  const cleanCode = String(examData.exam_code).trim().toUpperCase();

  const writingSection = examData.sections?.find((s: any) => s.skill === 'writing');
  const task1Obj = writingSection?.tasks?.find((t: any) => t.task_number === 1) || writingSection?.tasks?.[0];

  const resolvedT1Img = examData.writing_task1_image || 
    examData.writing_task1_image_url || 
    examData.writing_task1_imageUrl || 
    task1Obj?.image_url || 
    task1Obj?.imageUrl || 
    examData.image_url || 
    examData.imageUrl || 
    '';

  let sections = examData.sections;
  if (Array.isArray(sections)) {
    sections = sections.map((sec: any) => {
      if (sec.skill === 'writing' && Array.isArray(sec.tasks)) {
        return {
          ...sec,
          tasks: sec.tasks.map((t: any) => {
            if (t.task_number === 1 || t.id === 'task-1') {
              return {
                ...t,
                image_url: t.image_url || t.imageUrl || resolvedT1Img,
                imageUrl: t.imageUrl || t.image_url || resolvedT1Img
              };
            }
            return t;
          })
        };
      }
      return sec;
    });
  }

  const standardizedExam = {
    ...examData,
    exam_code: cleanCode,
    sections,
    writing_task1_image: resolvedT1Img,
    writing_task1_image_url: resolvedT1Img,
    writing_task1_imageUrl: resolvedT1Img,
    updated_at: new Date().toISOString()
  };

  const exams = getStoredExams();
  const idx = exams.findIndex((e: any) => (e.exam_code || '').toUpperCase() === cleanCode);

  if (idx >= 0) {
    exams[idx] = standardizedExam;
  } else {
    exams.push(standardizedExam);
  }

  cachedExams = exams;
  safeWriteJson(EXAMS_FILE, exams);
  return standardizedExam;
}

export function deleteStoredExam(examCode: string): boolean {
  const cleanCode = (examCode || '').trim().toUpperCase();
  const exams = getStoredExams();
  const filtered = exams.filter((e: any) => (e.exam_code || '').toUpperCase() !== cleanCode);
  
  if (filtered.length !== exams.length) {
    cachedExams = filtered;
    safeWriteJson(EXAMS_FILE, filtered);
    return true;
  }
  return false;
}

// ---------------- SUBMISSIONS ----------------
export function getStoredSubmissions(): any[] {
  if (cachedSubmissions) return cachedSubmissions;
  cachedSubmissions = safeReadJson<any[]>(SUBMISSIONS_FILE, []);
  return cachedSubmissions;
}

export function saveStoredSubmission(submission: any): any {
  const submissions = getStoredSubmissions();
  const subId = submission.submission_id || `SUB_${Date.now()}`;
  const record = {
    ...submission,
    submission_id: subId,
    received_at: new Date().toISOString()
  };

  const idx = submissions.findIndex((s: any) => s.submission_id === subId);
  if (idx >= 0) {
    submissions[idx] = record;
  } else {
    submissions.unshift(record);
  }

  // Keep latest 2000 submissions
  if (submissions.length > 2000) {
    submissions.length = 2000;
  }

  cachedSubmissions = submissions;
  safeWriteJson(SUBMISSIONS_FILE, submissions);
  return record;
}

export function updateStoredWritingScore(
  submissionId: string, 
  scores: any, 
  overallWriting: number, 
  feedback?: string
): any | null {
  const submissions = getStoredSubmissions();
  const sub = submissions.find((s: any) => s.submission_id === submissionId);
  if (!sub) return null;

  sub.writing_status = 'GRADED';
  sub.writing_band = overallWriting;
  sub.writing_scores = scores;
  if (feedback !== undefined) sub.writing_feedback = feedback;

  // Re-calculate overall band if listening and reading bands exist
  const lBand = Number(sub.listening_band) || 0;
  const rBand = Number(sub.reading_band) || 0;
  const isOneSkillRetake = Boolean(sub.retakeMode || sub.retake_mode || (sub.targetSkill === 'writing' || sub.target_skill === 'writing'));
  
  if (isOneSkillRetake && lBand === 0 && rBand === 0) {
    sub.overall_band = overallWriting;
  } else if (lBand > 0 || rBand > 0) {
    const activeBands = [lBand, rBand, overallWriting].filter(b => b > 0);
    const avg = activeBands.reduce((a, b) => a + b, 0) / activeBands.length;
    sub.overall_band = Math.round(avg * 2) / 2;
  } else {
    sub.overall_band = overallWriting;
  }

  cachedSubmissions = submissions;
  safeWriteJson(SUBMISSIONS_FILE, submissions);
  return sub;
}

// ---------------- CHEAT LOGS ----------------
export function getStoredCheatLogs(): any[] {
  if (cachedCheatLogs) return cachedCheatLogs;
  cachedCheatLogs = safeReadJson<any[]>(CHEAT_LOGS_FILE, []);
  return cachedCheatLogs;
}

export function saveStoredCheatLog(log: any): any {
  const logs = getStoredCheatLogs();
  const logId = log.log_id || `LOG_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const record = {
    ...log,
    log_id: logId,
    timestamp: log.timestamp || new Date().toISOString()
  };

  logs.unshift(record);
  if (logs.length > 3000) {
    logs.length = 3000;
  }

  cachedCheatLogs = logs;
  safeWriteJson(CHEAT_LOGS_FILE, logs);
  return record;
}

// ---------------- SERVER CONFIG ----------------
export function getStoredConfig(): { gas_url: string; last_synced_at?: string } {
  if (cachedConfig) return cachedConfig;
  const def = { gas_url: DEFAULT_GAS_URL };
  cachedConfig = safeReadJson<{ gas_url: string; last_synced_at?: string }>(CONFIG_FILE, def);
  if (!cachedConfig.gas_url) {
    cachedConfig.gas_url = DEFAULT_GAS_URL;
  }
  return cachedConfig;
}

export function saveStoredConfig(newConfig: Partial<{ gas_url: string; last_synced_at: string }>): any {
  const current = getStoredConfig();
  cachedConfig = {
    ...current,
    ...newConfig
  };
  safeWriteJson(CONFIG_FILE, cachedConfig);
  return cachedConfig;
}

// ---------------- PRACTICE DECKS ----------------
export function getStoredPracticeDecks(): any[] {
  if (cachedPracticeDecks) return cachedPracticeDecks;
  cachedPracticeDecks = safeReadJson<any[]>(PRACTICE_DECKS_FILE, []);
  return cachedPracticeDecks;
}

export function saveStoredPracticeDeck(deck: any): any {
  const decks = getStoredPracticeDecks();
  const deckId = deck.deck_id || `DECK_${Date.now()}`;
  const record = { ...deck, deck_id: deckId, updated_at: new Date().toISOString() };

  const idx = decks.findIndex((d: any) => d.deck_id === deckId);
  if (idx >= 0) {
    decks[idx] = record;
  } else {
    decks.push(record);
  }

  cachedPracticeDecks = decks;
  safeWriteJson(PRACTICE_DECKS_FILE, decks);
  return record;
}

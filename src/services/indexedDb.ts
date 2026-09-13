import { ExamData, SubmissionRecord, CheatLog } from '../types';
import { CustomPracticeDeck } from '../types/practice';

const DB_NAME = 'ielts_offline_vault_db';
const DB_VERSION = 2;

interface DBSchema {
  exams: ExamData;
  submissions: SubmissionRecord;
  cheat_logs: CheatLog;
  practice_decks: CustomPracticeDeck;
  key_values: { key: string; value: any; updated_at: string };
}

let dbInstance: IDBDatabase | null = null;

/**
 * Open or initialize IndexedDB instance
 */
export function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported in this environment'));
    }

    if (dbInstance) {
      return resolve(dbInstance);
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('exams')) {
        db.createObjectStore('exams', { keyPath: 'exam_code' });
      }

      if (!db.objectStoreNames.contains('submissions')) {
        db.createObjectStore('submissions', { keyPath: 'submission_id' });
      }

      if (!db.objectStoreNames.contains('cheat_logs')) {
        db.createObjectStore('cheat_logs', { keyPath: 'log_id' });
      }

      if (!db.objectStoreNames.contains('practice_decks')) {
        db.createObjectStore('practice_decks', { keyPath: 'deck_id' });
      }

      if (!db.objectStoreNames.contains('key_values')) {
        db.createObjectStore('key_values', { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('IndexedDB open error:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

/**
 * Save Exam to IndexedDB
 */
export async function saveExamToIndexedDB(exam: ExamData): Promise<void> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('exams', 'readwrite');
      const store = tx.objectStore('exams');
      const req = store.put(exam);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('saveExamToIndexedDB failed:', err);
  }
}

/**
 * Get Exam by exam_code from IndexedDB
 */
export async function getExamFromIndexedDB(examCode: string): Promise<ExamData | null> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('exams', 'readonly');
      const store = tx.objectStore('exams');
      const req = store.get(examCode);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('getExamFromIndexedDB failed:', err);
    return null;
  }
}

/**
 * Get all exams from IndexedDB
 */
export async function getAllExamsFromIndexedDB(): Promise<ExamData[]> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('exams', 'readonly');
      const store = tx.objectStore('exams');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('getAllExamsFromIndexedDB failed:', err);
    return [];
  }
}

/**
 * Save submission to IndexedDB
 */
export async function saveSubmissionToIndexedDB(submission: SubmissionRecord): Promise<void> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('submissions', 'readwrite');
      const store = tx.objectStore('submissions');
      const req = store.put(submission);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('saveSubmissionToIndexedDB failed:', err);
  }
}

/**
 * Get all submissions from IndexedDB
 */
export async function getAllSubmissionsFromIndexedDB(): Promise<SubmissionRecord[]> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('submissions', 'readonly');
      const store = tx.objectStore('submissions');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('getAllSubmissionsFromIndexedDB failed:', err);
    return [];
  }
}

/**
 * Save cheat log to IndexedDB
 */
export async function saveCheatLogToIndexedDB(log: CheatLog): Promise<void> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('cheat_logs', 'readwrite');
      const store = tx.objectStore('cheat_logs');
      const req = store.put(log);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('saveCheatLogToIndexedDB failed:', err);
  }
}

/**
 * Get all cheat logs from IndexedDB
 */
export async function getAllCheatLogsFromIndexedDB(): Promise<CheatLog[]> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('cheat_logs', 'readonly');
      const store = tx.objectStore('cheat_logs');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('getAllCheatLogsFromIndexedDB failed:', err);
    return [];
  }
}

/**
 * Save practice decks to IndexedDB
 */
export async function savePracticeDecksToIndexedDB(decks: CustomPracticeDeck[]): Promise<void> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('practice_decks', 'readwrite');
      const store = tx.objectStore('practice_decks');
      decks.forEach(deck => store.put(deck));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('savePracticeDecksToIndexedDB failed:', err);
  }
}

/**
 * Get practice decks from IndexedDB
 */
export async function getPracticeDecksFromIndexedDB(): Promise<CustomPracticeDeck[]> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('practice_decks', 'readonly');
      const store = tx.objectStore('practice_decks');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('getPracticeDecksFromIndexedDB failed:', err);
    return [];
  }
}

/**
 * Generic Key-Value Storage
 */
export async function saveKeyValue(key: string, value: any): Promise<void> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('key_values', 'readwrite');
      const store = tx.objectStore('key_values');
      const req = store.put({ key, value, updated_at: new Date().toISOString() });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('saveKeyValue failed:', key, err);
  }
}

export async function getKeyValue<T>(key: string): Promise<T | null> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('key_values', 'readonly');
      const store = tx.objectStore('key_values');
      const req = store.get(key);
      req.onsuccess = () => {
        if (req.result) {
          resolve(req.result.value as T);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('getKeyValue failed:', key, err);
    return null;
  }
}

/**
 * Requirement 5: Writing Draft Persistence in IndexedDB
 * Key format: DRAFT_WRITING_${EXAM_CODE}_${CANDIDATE_ID}
 */
export interface WritingDraft {
  task1: string;
  task2: string;
  updated_at: string;
}

export async function saveWritingDraftToIndexedDB(
  examCode: string,
  candidateId: string,
  draft: { task1: string; task2: string }
): Promise<void> {
  const cleanCode = (examCode || 'EXAM').toUpperCase().replace(/[^A-Z0-9]/g, '_');
  const cleanId = (candidateId || 'CANDIDATE').toUpperCase().replace(/[^A-Z0-9]/g, '_');
  const draftKey = `DRAFT_WRITING_${cleanCode}_${cleanId}`;

  const payload: WritingDraft = {
    task1: draft.task1,
    task2: draft.task2,
    updated_at: new Date().toISOString()
  };

  // Dual save to LocalStorage and IndexedDB
  try {
    localStorage.setItem(draftKey, JSON.stringify(payload));
  } catch (e) {
    console.warn('LocalStorage draft write failed:', e);
  }

  await saveKeyValue(draftKey, payload);
}

export async function getWritingDraftFromIndexedDB(
  examCode: string,
  candidateId: string
): Promise<WritingDraft | null> {
  const cleanCode = (examCode || 'EXAM').toUpperCase().replace(/[^A-Z0-9]/g, '_');
  const cleanId = (candidateId || 'CANDIDATE').toUpperCase().replace(/[^A-Z0-9]/g, '_');
  const draftKey = `DRAFT_WRITING_${cleanCode}_${cleanId}`;

  // Check IndexedDB first
  const dbDraft = await getKeyValue<WritingDraft>(draftKey);
  if (dbDraft) {
    return dbDraft;
  }

  // Fallback to LocalStorage
  try {
    const raw = localStorage.getItem(draftKey);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('LocalStorage draft read failed:', e);
  }

  return null;
}

/**
 * Requirement 4: Audio Progress in IndexedDB
 */
export async function saveAudioProgressToIndexedDB(
  examCode: string,
  candidateId: string,
  currentTime: number
): Promise<void> {
  const cleanCode = (examCode || 'EXAM').toUpperCase().replace(/[^A-Z0-9]/g, '_');
  const cleanId = (candidateId || 'CANDIDATE').toUpperCase().replace(/[^A-Z0-9]/g, '_');
  const key = `AUDIO_PROGRESS_${cleanCode}_${cleanId}`;

  try {
    localStorage.setItem(key, currentTime.toString());
  } catch (e) {
    // ignore
  }

  await saveKeyValue(key, currentTime);
}

export async function getAudioProgressFromIndexedDB(
  examCode: string,
  candidateId: string
): Promise<number> {
  const cleanCode = (examCode || 'EXAM').toUpperCase().replace(/[^A-Z0-9]/g, '_');
  const cleanId = (candidateId || 'CANDIDATE').toUpperCase().replace(/[^A-Z0-9]/g, '_');
  const key = `AUDIO_PROGRESS_${cleanCode}_${cleanId}`;

  const savedTime = await getKeyValue<number>(key);
  if (typeof savedTime === 'number' && !isNaN(savedTime)) {
    return savedTime;
  }

  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = parseFloat(raw);
      if (!isNaN(parsed)) return parsed;
    }
  } catch (e) {
    // ignore
  }

  return 0;
}

/**
 * Requirement 3: Current answers cache in IndexedDB for emergency timeout submission
 */
export async function saveCurrentAnswersToIndexedDB(
  examCode: string,
  candidateId: string,
  answers: Record<string, string>
): Promise<void> {
  const cleanCode = (examCode || 'EXAM').toUpperCase().replace(/[^A-Z0-9]/g, '_');
  const cleanId = (candidateId || 'CANDIDATE').toUpperCase().replace(/[^A-Z0-9]/g, '_');
  const key = `ACTIVE_ANSWERS_${cleanCode}_${cleanId}`;

  try {
    localStorage.setItem(key, JSON.stringify(answers));
  } catch (e) {
    // ignore
  }

  await saveKeyValue(key, answers);
}

export async function getCurrentAnswersFromIndexedDB(
  examCode: string,
  candidateId: string
): Promise<Record<string, string>> {
  const cleanCode = (examCode || 'EXAM').toUpperCase().replace(/[^A-Z0-9]/g, '_');
  const cleanId = (candidateId || 'CANDIDATE').toUpperCase().replace(/[^A-Z0-9]/g, '_');
  const key = `ACTIVE_ANSWERS_${cleanCode}_${cleanId}`;

  const saved = await getKeyValue<Record<string, string>>(key);
  if (saved && typeof saved === 'object') {
    return saved;
  }

  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    // ignore
  }

  return {};
}


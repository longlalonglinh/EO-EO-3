import { 
  SubmissionRecord, 
  CheatLog, 
  GradingForm, 
  SubmissionPayload, 
  SubmissionResponse, 
  ExamData,
  ReadingPassageItem
} from '../types';
import { extractQuestionsFromRawResponse } from './dbDiagnostics';
import { DEFAULT_EXAMS } from '../data/defaultExams';
import { CustomPracticeDeck, StudentProgressRecord } from '../types/practice';
import { 
  saveExamToIndexedDB, 
  getExamFromIndexedDB, 
  getAllExamsFromIndexedDB,
  saveSubmissionToIndexedDB, 
  getAllSubmissionsFromIndexedDB, 
  saveCheatLogToIndexedDB, 
  getAllCheatLogsFromIndexedDB,
  savePracticeDecksToIndexedDB,
  getPracticeDecksFromIndexedDB
} from './indexedDb';
import { gradeExamAnswers } from './answerScoring';

export const DEFAULT_API_URL = "https://script.google.com/macros/s/AKfycbySNk5foVr4UMC5ZVP1YTlxjxT9qFgdI85cH5nyQ63ffqXdYVZ7SJKbmD0B3xNO3DEe/exec";

/**
 * Check connection status to internet and Google Apps Script API endpoint
 */
export async function checkConnection(apiUrl: string = DEFAULT_API_URL): Promise<{
  isOnline: boolean;
  isGasReachable: boolean;
  latencyMs?: number;
  message: string;
}> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (!isOnline) {
    return {
      isOnline: false,
      isGasReachable: false,
      message: 'Client device is completely offline. Operating in IndexedDB offline mode.'
    };
  }

  if (!apiUrl || apiUrl.includes('mock_ielts_exam_system_gas_url') || apiUrl.includes('AKfycbx_mock')) {
    return {
      isOnline: true,
      isGasReachable: false,
      message: 'Demo / Mock API URL configured. Operating via local & IndexedDB fallback storage.'
    };
  }

  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const testUrl = `${apiUrl}?action=ping`;
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const latencyMs = Date.now() - startTime;
    return {
      isOnline: true,
      isGasReachable: response.ok || response.status === 200 || response.status === 302,
      latencyMs,
      message: response.ok ? `Connected to Google Apps Script (${latencyMs}ms)` : `Connected with status ${response.status}`
    };
  } catch (err: any) {
    return {
      isOnline: true,
      isGasReachable: false,
      latencyMs: Date.now() - startTime,
      message: `Google Apps Script connection check failed: ${err.message || 'Network Timeout'}`
    };
  }
}

/**
 * Robust fetch wrapper with automatic exponential backoff retry for network errors
 */
export async function fetchWithRetry(
  url: string, 
  options: RequestInit = {}, 
  maxRetries: number = 3, 
  baseDelayMs: number = 800
): Promise<Response> {
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutMs = options.method === 'POST' ? 15000 : 8000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const fetchOptions: RequestInit = {
        ...options,
        signal: options.signal || controller.signal
      };

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      // If server returns 5xx error or rate limit, retry
      if (!response.ok && (response.status >= 500 || response.status === 429)) {
        throw new Error(`Server returned status ${response.status}`);
      }

      return response;
    } catch (err: any) {
      lastError = err;
      console.warn(`[Network Retry] Attempt ${attempt}/${maxRetries} failed for ${url}:`, err.message || err);

      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 200;
        await new Promise(res => setTimeout(res, delay));
      }
    }
  }

  throw lastError || new Error(`Failed to fetch after ${maxRetries} attempts`);
}

/**
 * Deduplicate and sanitize student submissions
 */
export function deduplicateSubmissions(list: SubmissionRecord[]): SubmissionRecord[] {
  const seen = new Set<string>();
  const result: SubmissionRecord[] = [];
  list.forEach((sub, idx) => {
    if (!sub) return;
    const rawId = String(sub.submission_id ?? '').trim();
    const id = (!rawId || rawId === '#ERROR!')
      ? `sub_fallback_${String(sub.sbd || 'cand')}_${String(sub.exam_code || 'code')}_${idx}`
      : rawId;

    if (!seen.has(id)) {
      seen.add(id);
      result.push({
        ...sub,
        submission_id: id
      });
    }
  });
  return result;
}

/**
 * Deduplicate and sanitize cheat logs
 */
export function deduplicateCheatLogs(list: CheatLog[]): CheatLog[] {
  const seen = new Set<string>();
  const result: CheatLog[] = [];
  list.forEach((log, idx) => {
    if (!log) return;
    const rawId = String(log.log_id ?? '').trim();
    const id = (!rawId || rawId === '#ERROR!')
      ? `log_fallback_${String(log.sbd || 'cand')}_${String(log.exam_code || 'code')}_${idx}`
      : rawId;

    if (!seen.has(id)) {
      seen.add(id);
      result.push({
        ...log,
        log_id: id
      });
    }
  });
  return result;
}

/**
 * Fetch all student submissions with automatic retry and IndexedDB backup sync
 */
export async function fetchSubmissions(
  apiUrl: string = DEFAULT_API_URL
): Promise<{ success: boolean; data?: SubmissionRecord[]; error?: string; source?: 'gas' | 'idb' | 'local' }> {
  // Load local backups first
  const localSaved = localStorage.getItem('ielts_student_submissions');
  const localData: SubmissionRecord[] = localSaved ? JSON.parse(localSaved) : [];
  const idbData = await getAllSubmissionsFromIndexedDB();

  // Combine unique local & idb submissions
  const cachedSubmissions = deduplicateSubmissions([...localData, ...idbData]);

  if (!apiUrl || apiUrl.includes('mock_ielts_exam_system_gas_url') || apiUrl.includes('AKfycbx_mock')) {
    return { success: true, data: cachedSubmissions, source: 'idb' };
  }

  try {
    const response = await fetchWithRetry(`${apiUrl}?action=getSubmissions`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    }, 2, 800);

    if (response.ok) {
      const result = await response.json();
      const rows = Array.isArray(result) ? result : (Array.isArray(result?.data) ? result.data : null);
      if (rows) {
        // Merge with local submissions to avoid losing offline attempts
        const combined = deduplicateSubmissions([...rows, ...cachedSubmissions]);

        // Backup newly synced submissions into IndexedDB & localStorage
        combined.forEach(sub => {
          saveSubmissionToIndexedDB(sub).catch(() => {});
        });
        localStorage.setItem('ielts_student_submissions', JSON.stringify(combined.slice(0, 50)));

        return { success: true, data: combined, source: 'gas' };
      }
    }
  } catch (err) {
    console.warn('GAS API fetchSubmissions failed after retries, utilizing IndexedDB/LocalStorage vault:', err);
  }

  return { success: true, data: cachedSubmissions, source: 'idb' };
}

/**
 * Fetch cheat violation logs with automatic retry and IndexedDB backup sync
 */
export async function fetchCheatLogs(
  apiUrl: string
): Promise<{ success: boolean; data?: CheatLog[]; error?: string; source?: 'gas' | 'idb' | 'local' }> {
  const localLogs = localStorage.getItem('ielts_cheat_logs');
  const logsArr: CheatLog[] = localLogs ? JSON.parse(localLogs) : [];
  const idbLogs = await getAllCheatLogsFromIndexedDB();

  const cachedLogs = deduplicateCheatLogs([...logsArr, ...idbLogs]);

  if (!apiUrl || apiUrl.includes('mock_ielts_exam_system_gas_url') || apiUrl.includes('AKfycbx_mock')) {
    return { success: true, data: cachedLogs, source: 'idb' };
  }

  try {
    const response = await fetchWithRetry(`${apiUrl}?action=getCheatLogs`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    }, 2, 800);

    if (response.ok) {
      const result = await response.json();
      const rows = Array.isArray(result) ? result : (Array.isArray(result?.data) ? result.data : null);
      if (rows) {
        const combined = deduplicateCheatLogs([...rows, ...cachedLogs]);

        // Backup to IndexedDB
        combined.forEach(log => {
          saveCheatLogToIndexedDB(log).catch(() => {});
        });
        localStorage.setItem('ielts_cheat_logs', JSON.stringify(combined.slice(0, 100)));

        return { success: true, data: combined, source: 'gas' };
      }
    }
  } catch (err) {
    console.warn('GAS API fetchCheatLogs failed after retries, falling back to IndexedDB vault:', err);
  }

  return { success: true, data: cachedLogs, source: 'idb' };
}

/**
 * Save manual grading scores for Writing with dual backup to IndexedDB & localStorage
 */
export async function saveWritingScore(
  apiUrl: string, 
  submissionId: string, 
  form: GradingForm
): Promise<{ success: boolean; message?: string }> {
  // Update in LocalStorage & IndexedDB
  const localSaved = localStorage.getItem('ielts_student_submissions');
  if (localSaved) {
    const localData: SubmissionRecord[] = JSON.parse(localSaved);
    const updated = localData.map(sub => {
      if (sub.submission_id === submissionId) {
        const gradedSub: SubmissionRecord = {
          ...sub,
          writing_status: 'GRADED' as const,
          writing_band: form.overall_writing,
          writing_scores: {
            TR: form.tr,
            CC: form.cc,
            LR: form.lr,
            GRA: form.gra
          },
          writing_feedback: form.feedback
        };
        // Also update IndexedDB
        saveSubmissionToIndexedDB(gradedSub).catch(() => {});
        return gradedSub;
      }
      return sub;
    });
    localStorage.setItem('ielts_student_submissions', JSON.stringify(updated));
  }

  if (!apiUrl || apiUrl.includes('mock_ielts_exam_system_gas_url')) {
    return { success: true, message: 'Writing scores saved to IndexedDB & LocalStorage successfully!' };
  }

  try {
    const response = await fetchWithRetry(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'gradeWriting',
        submission_id: submissionId,
        writing_scores: {
          TR: form.tr,
          CC: form.cc,
          LR: form.lr,
          GRA: form.gra
        },
        writing_band: form.overall_writing,
        writing_feedback: form.feedback
      })
    }, 3, 1000);

    if (response.ok) {
      return { success: true, message: 'Writing scores updated on Google Sheets successfully!' };
    }
  } catch (err) {
    console.warn('GAS API saveWritingScore network failure, cached safely in IndexedDB:', err);
  }

  return { success: true, message: 'Grading record saved locally in IndexedDB & LocalStorage!' };
}

/**
 * Requirement 2: Submit with exponential backoff retry for Google Apps Script concurrent lock errors
 * If GAS returns { status: 'ERROR' } or network fails, retry after 2s, 4s, 8s.
 */
export async function postToGasWithLockRetry(
  apiUrl: string, 
  payload: any, 
  maxRetries: number = 3
): Promise<any> {
  const retryDelays = [2000, 4000, 8000];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutMs = 25000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`GAS HTTP error ${res.status}`);
      }

      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        console.warn('GAS non-JSON response:', text);
      }

      // Check if GAS returned a concurrency lock error or busy state
      if (data && (data.status === 'ERROR' || data.status === 'error')) {
        const errorMsg = data.message || 'Concurrent write lock busy in Google Sheets';
        console.warn(`[GAS Concurrency Lock] Attempt ${attempt + 1}/${maxRetries + 1} returned busy: ${errorMsg}`);
        if (attempt < maxRetries) {
          const delay = retryDelays[attempt] || 8000;
          console.log(`[GAS Backoff] Retrying submission in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        return data;
      }

      return data || { status: 'success' };
    } catch (err: any) {
      console.warn(`[GAS POST Attempt ${attempt + 1}/${maxRetries + 1} failed]:`, err.message || err);
      if (attempt < maxRetries) {
        const delay = retryDelays[attempt] || 8000;
        console.log(`[GAS Backoff] Retrying submission in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
}

/**
 * Submit full exam payload from Student with immediate IndexedDB & LocalStorage backup
 * Integrates Answer Normalization Engine and IELTS Academic Raw-to-Band calculation
 */
export async function submitExamPayload(
  apiUrl: string, 
  payload: SubmissionPayload,
  examData?: ExamData
): Promise<SubmissionResponse> {
  const timestamp = new Date().toISOString();
  const submissionId = payload.submission_id || `${payload.sbd}_${payload.exam_code}_${Date.now()}`;
  const submissionType = payload.submission_type || 'STANDARD';

  // Consolidate answers
  const userAnswers: Record<string, string> = {
    ...(payload.answers || {}),
    ...(payload.listening_answers || {}),
    ...(payload.reading_answers || {})
  };

  let listeningRaw = 0;
  let readingRaw = 0;
  let listeningBand = 0;
  let readingBand = 0;

  // Grade using Answer Normalization Engine if examData is available
  if (examData) {
    const grading = gradeExamAnswers(examData, userAnswers);
    listeningRaw = grading.listening_raw;
    readingRaw = grading.reading_raw;
    listeningBand = grading.listening_band;
    readingBand = grading.reading_band;
  } else {
    // Count filled answers as reasonable fallback
    Object.keys(payload.listening_answers || {}).forEach(k => {
      if (payload.listening_answers && payload.listening_answers[k] && payload.listening_answers[k].trim() !== '') {
        listeningRaw += 1;
      }
    });
    Object.keys(payload.reading_answers || {}).forEach(k => {
      if (payload.reading_answers && payload.reading_answers[k] && payload.reading_answers[k].trim() !== '') {
        readingRaw += 1;
      }
    });
    listeningBand = Math.min(9, Math.max(1, Math.round((listeningRaw / 3) * 2) / 2 || 4.5));
    readingBand = Math.min(9, Math.max(1, Math.round((readingRaw / 3) * 2) / 2 || 4.5));
  }

  const responseObj: SubmissionResponse = {
    success: true,
    submission_id: submissionId,
    sbd: payload.sbd,
    exam_code: payload.exam_code,
    submission_type: submissionType,
    listening_raw_score: listeningRaw,
    listening_max_score: 40,
    listening_band: listeningBand,
    reading_raw_score: readingRaw,
    reading_max_score: 40,
    reading_band: readingBand,
    writing_status: 'PENDING_TEACHER',
    submitted_at: timestamp,
    message: submissionType === 'TIMEOUT_FORCED' 
      ? 'Exam automatically submitted due to session timeout.'
      : 'Exam submitted successfully!'
  };

  const record: SubmissionRecord = {
    submission_id: submissionId,
    sbd: payload.sbd,
    exam_code: payload.exam_code,
    test_mode: payload.test_mode,
    submission_type: submissionType,
    listening_answers: payload.listening_answers || userAnswers,
    reading_answers: payload.reading_answers || userAnswers,
    writing_task1_text: payload.writing_task1_text || payload.writing_task1,
    writing_task2_text: payload.writing_task2_text || payload.writing_task2,
    listening_raw_score: listeningRaw,
    listening_max_score: 40,
    listening_band: listeningBand,
    reading_raw_score: readingRaw,
    reading_max_score: 40,
    reading_band: readingBand,
    writing_status: 'PENDING_TEACHER',
    submitted_at: timestamp,
    violations_count: payload.violations_count
  };

  // 1. Immediate persistence to IndexedDB
  await saveSubmissionToIndexedDB(record);

  // 2. Persistence to LocalStorage
  try {
    const existing = localStorage.getItem('ielts_student_submissions');
    const subsArr: SubmissionRecord[] = existing ? JSON.parse(existing) : [];
    if (!subsArr.some(s => s.submission_id === record.submission_id)) {
      subsArr.unshift(record);
    }
    localStorage.setItem('ielts_student_submissions', JSON.stringify(deduplicateSubmissions(subsArr)));
  } catch (e) {
    console.warn('LocalStorage save failed, IndexedDB preserved:', e);
  }

  // If cheat logs present in payload, persist to IndexedDB
  if (payload.violation_logs && Array.isArray(payload.violation_logs)) {
    payload.violation_logs.forEach(log => {
      saveCheatLogToIndexedDB(log).catch(() => {});
    });
  }
  if (payload.cheat_logs && Array.isArray(payload.cheat_logs)) {
    payload.cheat_logs.forEach(log => {
      saveCheatLogToIndexedDB(log).catch(() => {});
    });
  }

  if (!apiUrl || apiUrl.includes('mock_ielts_exam_system_gas_url') || apiUrl.includes('AKfycbx_mock')) {
    return responseObj;
  }

  // 3. Send to Google Apps Script with exponential backoff retry
  try {
    const postData = {
      action: 'submitExam',
      ...payload,
      submission_id: submissionId,
      submission_type: submissionType,
      listening_raw_score: listeningRaw,
      reading_raw_score: readingRaw,
      listening_band: listeningBand,
      reading_band: readingBand,
      submitted_at: timestamp
    };

    const serverRes = await postToGasWithLockRetry(apiUrl, postData, 3);
    if (serverRes && serverRes.submission_id) {
      return {
        ...responseObj,
        ...serverRes,
        submission_type: submissionType
      };
    }
  } catch (err) {
    console.warn('Network error while posting to GAS API with retry, offline IndexedDB backup active:', err);
  }

  return responseObj;
}

/**
 * Standardize an ExamData object to ensure passages is an array of 3 passages,
 * each containing passage_index, title, text, and its list of questions directly inside.
 */
export function standardizeExamData(rawExam: any, cleanCode: string): ExamData {
  const allQs = rawExam.questions || [];
  const listeningQs = rawExam.listening_questions || allQs.filter((q: any) => q.section === 'listening');
  const readingQs = rawExam.reading_questions || allQs.filter((q: any) => q.section === 'reading');

  let rawPassages: any[] = rawExam.passages || [];

  // Check if Reading skill exists in this exam
  const hasReadingContent = readingQs.length > 0 || rawPassages.some((p: any) => (p?.text && p.text.trim()) || (p?.questions && p.questions.length > 0));

  let standardizedPassages: ReadingPassageItem[] = [];

  if (hasReadingContent) {
    if (!Array.isArray(rawPassages) || rawPassages.length === 0) {
      rawPassages = [
        {
          passage_index: 1,
          title: rawExam.passage_title || rawExam.reading_passage_title || 'Reading Passage 1',
          text: rawExam.passage_text || rawExam.reading_passage || ''
        },
        {
          passage_index: 2,
          title: 'Reading Passage 2',
          text: ''
        },
        {
          passage_index: 3,
          title: 'Reading Passage 3',
          text: ''
        }
      ];
    }

    // Determine how many passages to preserve
    const maxPIdx = Math.max(
      1,
      ...rawPassages.map((p: any) => p.passage_index || 1),
      ...readingQs.map((q: any) => q.passage_index || 1)
    );
    const passageIndices = Array.from({ length: Math.min(3, Math.max(1, maxPIdx)) }, (_, i) => i + 1);

    standardizedPassages = passageIndices.map((pIdx) => {
      const existingP = rawPassages.find((p: any) => p.passage_index === pIdx) || rawPassages[pIdx - 1];
      const pTitle = existingP?.title || `Reading Passage ${pIdx}`;
      const pText = existingP?.text || (pIdx === 1 ? (rawExam.passage_text || rawExam.reading_passage || '') : '');
      
      // Locate questions belonging to this passage
      let pQuestions = existingP?.questions;
      if (!Array.isArray(pQuestions) || pQuestions.length === 0) {
        pQuestions = readingQs.filter((q: any) => {
          if (q.passage_index === pIdx) return true;
          if (!q.passage_index) {
            const qIndex = readingQs.indexOf(q);
            if (pIdx === 1 && qIndex < 13) return true;
            if (pIdx === 2 && qIndex >= 13 && qIndex < 26) return true;
            if (pIdx === 3 && qIndex >= 26) return true;
          }
          return false;
        });
      }

      return {
        passage_index: pIdx as 1 | 2 | 3,
        title: pTitle,
        text: pText,
        questions: pQuestions
      };
    });
  }

  return {
    ...rawExam,
    exam_code: cleanCode,
    title: rawExam.title || `IELTS Examination - ${cleanCode}`,
    passages: standardizedPassages,
    listening_questions: listeningQs,
    reading_questions: readingQs,
    questions: allQs.length > 0 ? allQs : [...listeningQs, ...readingQs]
  };
}

/**
 * Fast In-Memory Exam Cache & Pre-fetching Engine
 */
export const examMemoryCache = new Map<string, ExamData>();
const inFlightExamFetches = new Map<string, Promise<{ success: boolean; exam?: ExamData }>>();

// Seed memory cache immediately with built-in default exams
try {
  DEFAULT_EXAMS.forEach((ex) => {
    if (ex && ex.exam_code) {
      const code = ex.exam_code.trim().toUpperCase();
      examMemoryCache.set(code, standardizeExamData(ex, code));
    }
  });
} catch (e) {}

// Populate memory cache asynchronously from IndexedDB and LocalStorage in the background
if (typeof window !== 'undefined') {
  setTimeout(async () => {
    try {
      const idbExams = await getAllExamsFromIndexedDB();
      idbExams.forEach((ex) => {
        if (ex && ex.exam_code) {
          const code = ex.exam_code.trim().toUpperCase();
          if (!examMemoryCache.has(code)) {
            examMemoryCache.set(code, standardizeExamData(ex, code));
          }
        }
      });
    } catch (e) {}

    try {
      const localRaw = localStorage.getItem('ielts_saved_exams');
      if (localRaw) {
        const parsed = JSON.parse(localRaw);
        if (Array.isArray(parsed)) {
          parsed.forEach((ex: any) => {
            if (ex && ex.exam_code) {
              const code = String(ex.exam_code).trim().toUpperCase();
              if (!examMemoryCache.has(code)) {
                examMemoryCache.set(code, standardizeExamData(ex, code));
              }
            }
          });
        }
      }
    } catch (e) {}
  }, 0);
}

/**
 * Asynchronously revalidate exam data from Google Sheets in the background without blocking UI
 */
export function triggerBackgroundRevalidation(apiUrl: string, cleanCode: string): void {
  if (!apiUrl || apiUrl.includes('mock_ielts_exam_system_gas_url') || apiUrl.includes('AKfycbx_mock')) {
    return;
  }

  setTimeout(async () => {
    try {
      const fetchUrl = `${apiUrl}?action=get_exam&exam_code=${encodeURIComponent(cleanCode)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(fetchUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const raw = await res.json();
        const extracted = extractQuestionsFromRawResponse(raw, cleanCode);
        if (extracted.questions && extracted.questions.length > 0) {
          const meta = extracted.meta || {};
          const rawExamObj: ExamData = {
            exam_code: cleanCode,
            title: meta.title || `IELTS Examination - ${cleanCode}`,
            audio_url: meta.audio_url || '',
            passages: meta.passages || [],
            questions: extracted.questions,
            writing_task1_prompt: meta.writing_task1_prompt || '',
            writing_task1_image: meta.writing_task1_image || '',
            writing_task2_prompt: meta.writing_task2_prompt || ''
          };

          const fresh = standardizeExamData(rawExamObj, cleanCode);
          examMemoryCache.set(cleanCode, fresh);
          saveExamToIndexedDB(fresh).catch(() => {});
          try {
            localStorage.setItem('ielts_current_exam', JSON.stringify(fresh));
          } catch (e) {}

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('ielts:exam-revalidated', { detail: fresh }));
          }
        }
      }
    } catch (e) {}
  }, 60);
}

/**
 * Background pre-fetching engine to warm up cache while candidate is typing or reviewing instructions
 */
export function prefetchExam(
  apiUrl: string,
  examCode: string
): Promise<{ success: boolean; exam?: ExamData }> {
  const cleanCode = (examCode || 'TEST01').trim().toUpperCase();
  if (!cleanCode) return Promise.resolve({ success: false });

  if (examMemoryCache.has(cleanCode)) {
    return Promise.resolve({ success: true, exam: examMemoryCache.get(cleanCode) });
  }

  if (inFlightExamFetches.has(cleanCode)) {
    return inFlightExamFetches.get(cleanCode)!;
  }

  const prefetchPromise = (async () => {
    // 1. Check IndexedDB
    try {
      const idbExam = await getExamFromIndexedDB(cleanCode);
      if (idbExam) {
        const standardized = standardizeExamData(idbExam, cleanCode);
        examMemoryCache.set(cleanCode, standardized);
        return { success: true, exam: standardized };
      }
    } catch (e) {}

    // 2. Check LocalStorage
    try {
      const localExamsRaw = localStorage.getItem('ielts_saved_exams');
      if (localExamsRaw) {
        const localList = JSON.parse(localExamsRaw);
        if (Array.isArray(localList)) {
          const foundLocal = localList.find((ex: any) => ex.exam_code?.toUpperCase() === cleanCode);
          if (foundLocal) {
            const standardized = standardizeExamData(foundLocal, cleanCode);
            examMemoryCache.set(cleanCode, standardized);
            saveExamToIndexedDB(standardized).catch(() => {});
            return { success: true, exam: standardized };
          }
        }
      }
    } catch (e) {}

    // 3. Check built-in default (STRICT exact code match only)
    const foundDefault = DEFAULT_EXAMS.find(
      (ex) => ex.exam_code.trim().toUpperCase() === cleanCode
    );
    if (foundDefault) {
      const standardized = standardizeExamData(foundDefault, cleanCode);
      examMemoryCache.set(cleanCode, standardized);
      saveExamToIndexedDB(standardized).catch(() => {});
      return { success: true, exam: standardized };
    }

    // 4. Background fetch from GAS
    if (apiUrl && !apiUrl.includes('mock_ielts_exam_system_gas_url') && !apiUrl.includes('AKfycbx_mock')) {
      try {
        const fetchUrl = `${apiUrl}?action=get_exam&exam_code=${encodeURIComponent(cleanCode)}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(fetchUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const raw = await res.json();
          const extracted = extractQuestionsFromRawResponse(raw, cleanCode);
          if (extracted.questions && extracted.questions.length > 0) {
            const meta = extracted.meta || {};
            const rawExamObj: ExamData = {
              exam_code: cleanCode,
              title: meta.title || `IELTS Examination - ${cleanCode}`,
              audio_url: meta.audio_url || '',
              passages: meta.passages || [],
              questions: extracted.questions,
              writing_task1_prompt: meta.writing_task1_prompt || '',
              writing_task1_image: meta.writing_task1_image || '',
              writing_task2_prompt: meta.writing_task2_prompt || ''
            };
            const standardized = standardizeExamData(rawExamObj, cleanCode);
            examMemoryCache.set(cleanCode, standardized);
            saveExamToIndexedDB(standardized).catch(() => {});
            try {
              localStorage.setItem('ielts_current_exam', JSON.stringify(standardized));
            } catch (e) {}
            return { success: true, exam: standardized };
          }
        }
      } catch (err) {}
    }

    return { success: false };
  })().finally(() => {
    inFlightExamFetches.delete(cleanCode);
  });

  inFlightExamFetches.set(cleanCode, prefetchPromise);
  return prefetchPromise;
}

/**
 * Ultra-fast Exam Fetching with Cache-First & Stale-While-Revalidate architecture.
 * Loads in ~0ms if in-memory, ~2ms if in IndexedDB/LocalStorage, or resolves prefetch.
 */
export async function fetchExam(
  apiUrl: string, 
  examCode: string
): Promise<{ success: boolean; exam?: ExamData; error?: string; source?: 'gas' | 'idb' | 'local' | 'default' | 'memory' }> {
  const cleanCode = (examCode || 'TEST01').trim().toUpperCase();

  // Tier 1: In-Memory Cache (Instant ~0ms)
  if (examMemoryCache.has(cleanCode)) {
    const cached = examMemoryCache.get(cleanCode)!;
    triggerBackgroundRevalidation(apiUrl, cleanCode);
    return { success: true, exam: cached, source: 'memory' };
  }

  // Tier 2: Check ongoing prefetch with quick 600ms grace period
  if (inFlightExamFetches.has(cleanCode)) {
    try {
      const fastResult = await Promise.race([
        inFlightExamFetches.get(cleanCode)!,
        new Promise<null>((res) => setTimeout(() => res(null), 600))
      ]);
      if (fastResult && fastResult.success && fastResult.exam) {
        return { success: true, exam: fastResult.exam, source: 'gas' };
      }
    } catch (e) {}
  }

  // Tier 3: IndexedDB Cache (~2-5ms)
  try {
    const idbExam = await getExamFromIndexedDB(cleanCode);
    if (idbExam) {
      const standardized = standardizeExamData(idbExam, cleanCode);
      examMemoryCache.set(cleanCode, standardized);
      triggerBackgroundRevalidation(apiUrl, cleanCode);
      return { success: true, exam: standardized, source: 'idb' };
    }
  } catch (e) {
    console.warn('Error reading from IndexedDB:', e);
  }

  // Tier 4: Saved LocalStorage Exams (~1-2ms)
  try {
    const localExamsRaw = localStorage.getItem('ielts_saved_exams');
    if (localExamsRaw) {
      const localList = JSON.parse(localExamsRaw);
      if (Array.isArray(localList)) {
        const foundLocal = localList.find((ex: any) => ex.exam_code?.toUpperCase() === cleanCode);
        if (foundLocal) {
          const standardized = standardizeExamData(foundLocal, cleanCode);
          examMemoryCache.set(cleanCode, standardized);
          saveExamToIndexedDB(standardized).catch(() => {});
          triggerBackgroundRevalidation(apiUrl, cleanCode);
          return { success: true, exam: standardized, source: 'local' };
        }
      }
    }
  } catch (e) {
    console.warn('Error reading from localStorage:', e);
  }

  // Tier 5: Built-In Default Exams Repository (~0.1ms) - STRICT EXACT MATCH ONLY
  const foundDefault = DEFAULT_EXAMS.find(
    (ex) => ex.exam_code.trim().toUpperCase() === cleanCode
  );
  if (foundDefault) {
    const standardized = standardizeExamData(foundDefault, cleanCode);
    examMemoryCache.set(cleanCode, standardized);
    saveExamToIndexedDB(standardized).catch(() => {});
    triggerBackgroundRevalidation(apiUrl, cleanCode);
    return { success: true, exam: standardized, source: 'default' };
  }

  // Tier 6: Cache Miss - Direct targeted GAS Fetch (Single request, 3.8s timeout)
  if (apiUrl && !apiUrl.includes('mock_ielts_exam_system_gas_url') && !apiUrl.includes('AKfycbx_mock')) {
    try {
      const fetchUrl = `${apiUrl}?action=get_exam&exam_code=${encodeURIComponent(cleanCode)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3800);
      const res = await fetch(fetchUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const raw = await res.json();
        const extracted = extractQuestionsFromRawResponse(raw, cleanCode);
        if (extracted.questions && extracted.questions.length > 0) {
          const meta = extracted.meta || {};
          const rawExamObj: ExamData = {
            exam_code: cleanCode,
            title: meta.title || `IELTS Examination - ${cleanCode}`,
            audio_url: meta.audio_url || '',
            passages: meta.passages || [],
            questions: extracted.questions,
            writing_task1_prompt: meta.writing_task1_prompt || '',
            writing_task1_image: meta.writing_task1_image || '',
            writing_task2_prompt: meta.writing_task2_prompt || ''
          };

          const standardized = standardizeExamData(rawExamObj, cleanCode);
          examMemoryCache.set(cleanCode, standardized);
          await saveExamToIndexedDB(standardized);
          try {
            localStorage.setItem('ielts_current_exam', JSON.stringify(standardized));
          } catch (e) {}

          return { success: true, exam: standardized, source: 'gas' };
        }
      }
    } catch (err) {
      console.warn(`Direct fetch failed for exam ${cleanCode}:`, err);
    }
  }

  // Tier 7: If the exam code was not found anywhere (not in defaults, IDB, LocalStorage, or GAS)
  return { 
    success: false, 
    error: `Exam not found: No test paper found for code [${cleanCode}]. Please verify your test code or contact your supervisor.` 
  };
}

/**
 * Fetch practice decks with retry and IndexedDB backup
 */
export async function fetchPracticeDecksFromGAS(
  apiUrl: string
): Promise<{ success: boolean; is_initialized?: boolean; decks?: CustomPracticeDeck[]; message?: string; error?: string }> {
  // Check IndexedDB first as cache
  const idbDecks = await getPracticeDecksFromIndexedDB();

  if (!apiUrl || apiUrl.includes('mock_ielts_exam_system_gas_url') || apiUrl.includes('AKfycbx_mock')) {
    if (idbDecks.length > 0) {
      return { success: true, is_initialized: true, decks: idbDecks };
    }
    return { success: false, error: 'Google Apps Script URL is not configured' };
  }

  try {
    const urls = [
      `${apiUrl}?action=get_practice_decks`,
      `${apiUrl}?action=getPracticeDecks`
    ];

    for (const fetchUrl of urls) {
      const res = await fetchWithRetry(fetchUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      }, 2, 700);

      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          const fetchedDecks = Array.isArray(data.decks) ? data.decks : [];
          if (fetchedDecks.length > 0) {
            savePracticeDecksToIndexedDB(fetchedDecks).catch(() => {});
          }
          return {
            success: true,
            is_initialized: data.is_initialized !== false,
            decks: fetchedDecks,
            message: data.message
          };
        }
      }
    }
  } catch (err: any) {
    console.warn('fetchPracticeDecksFromGAS failed after retries:', err);
    if (idbDecks.length > 0) {
      return { success: true, is_initialized: true, decks: idbDecks, message: 'Loaded from IndexedDB offline vault' };
    }
    return { success: false, error: err.message || 'Unable to connect to Google Sheets' };
  }

  if (idbDecks.length > 0) {
    return { success: true, is_initialized: true, decks: idbDecks };
  }

  return { success: false, error: 'Unable to retrieve practice database from Google Sheets' };
}

/**
 * Initialize PRACTICE_QUESTIONS database tab on Google Sheets and sync practice decks
 */
export async function initPracticeDatabaseInGAS(
  apiUrl: string,
  decks: CustomPracticeDeck[],
  mode: 'replace_all' | 'append' = 'replace_all'
): Promise<{ success: boolean; message?: string; total_cards?: number; error?: string }> {
  // Always backup to IndexedDB
  await savePracticeDecksToIndexedDB(decks);

  if (!apiUrl || apiUrl.includes('mock_ielts_exam_system_gas_url') || apiUrl.includes('AKfycbx_mock')) {
    return { 
      success: true, 
      message: 'Practice decks saved into IndexedDB offline vault successfully!', 
      total_cards: decks.reduce((acc, d) => acc + (d.cards?.length || 0), 0)
    };
  }

  try {
    const res = await fetchWithRetry(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'init_practice_sheet',
        mode,
        decks
      })
    }, 2, 1000);

    if (res.ok) {
      const result = await res.json();
      if (result && result.success) {
        return {
          success: true,
          message: result.message || 'Practice database initialized on Google Sheets successfully!',
          total_cards: result.total_cards
        };
      }
    }
  } catch (err: any) {
    console.warn('initPracticeDatabaseInGAS failed:', err);
    return { success: true, message: 'Saved to IndexedDB backup (network error initializing GAS)', total_cards: decks.reduce((acc, d) => acc + (d.cards?.length || 0), 0) };
  }

  return { success: false, error: 'Database initialization failed. Please verify Web App access permissions (Anyone) on Google Apps Script.' };
}

/**
 * Save / update single practice deck to Google Sheets and IndexedDB
 */
export async function savePracticeDeckToGAS(
  apiUrl: string,
  deck: CustomPracticeDeck
): Promise<{ success: boolean; message?: string; error?: string }> {
  // Save to IndexedDB
  await savePracticeDecksToIndexedDB([deck]);

  if (!apiUrl || apiUrl.includes('mock_ielts_exam_system_gas_url') || apiUrl.includes('AKfycbx_mock')) {
    return { success: true, message: 'Practice deck saved to IndexedDB offline vault!' };
  }

  try {
    const res = await fetchWithRetry(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'save_practice_deck',
        mode: 'append',
        deck
      })
    }, 2, 800);

    if (res.ok) {
      const result = await res.json();
      if (result && result.success) {
        return { success: true, message: result.message || 'Practice deck saved to Google Sheets!' };
      }
    }
  } catch (err: any) {
    console.warn('savePracticeDeckToGAS failed:', err);
    return { success: true, message: 'Saved to IndexedDB (Google Sheets sync will retry)' };
  }

  return { success: false, error: 'Unable to save practice deck to Google Sheets' };
}

/**
 * Sync student practice progress records to Google Sheets
 */
export async function syncStudentProgressToGAS(
  apiUrl: string,
  records: StudentProgressRecord[]
): Promise<{ success: boolean; message?: string; updated_count?: number; error?: string }> {
  if (!apiUrl || apiUrl.includes('mock_ielts_exam_system_gas_url') || apiUrl.includes('AKfycbx_mock')) {
    return { success: true, message: 'Progress saved locally!', updated_count: records.length };
  }

  try {
    const res = await fetchWithRetry(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'sync_student_progress',
        progress_records: records
      })
    }, 2, 800);

    if (res.ok) {
      const result = await res.json();
      if (result && result.success) {
        return { 
          success: true, 
          message: result.message || 'Learner progress saved to Google Sheets successfully!',
          updated_count: result.updated_count
        };
      }
    }
  } catch (err: any) {
    console.warn('syncStudentProgressToGAS failed:', err);
    return { success: false, error: err.message };
  }

  return { success: false, error: 'Unable to sync progress to Google Sheets' };
}

/**
 * Fetch student practice progress from Google Sheets
 */
export async function fetchStudentProgressFromGAS(
  apiUrl: string,
  studentId?: string
): Promise<{ success: boolean; records?: StudentProgressRecord[]; error?: string }> {
  if (!apiUrl || apiUrl.includes('mock_ielts_exam_system_gas_url') || apiUrl.includes('AKfycbx_mock')) {
    return { success: false, error: 'Google Apps Script URL is not configured' };
  }

  try {
    const query = studentId ? `&student_id=${encodeURIComponent(studentId)}` : '';
    const res = await fetchWithRetry(`${apiUrl}?action=get_student_progress${query}`, {
      method: 'GET'
    }, 2, 800);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && Array.isArray(data.records)) {
        return { success: true, records: data.records };
      }
    }
  } catch (err: any) {
    console.warn('fetchStudentProgressFromGAS failed:', err);
    return { success: false, error: err.message };
  }

  return { success: false, error: 'Unable to retrieve learner progress from Google Sheets' };
}

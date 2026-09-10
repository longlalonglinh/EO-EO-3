import { 
  SubmissionRecord, 
  CheatLog, 
  GradingForm, 
  SubmissionPayload, 
  SubmissionResponse, 
  ExamData 
} from '../types';
import { extractQuestionsFromRawResponse } from './dbDiagnostics';
import { DEFAULT_EXAMS } from '../data/defaultExams';
import { CustomPracticeDeck, StudentProgressRecord } from '../types/practice';
export const DEFAULT_API_URL = "https://script.google.com/macros/s/AKfycbySNk5foVr4UMC5ZVP1YTlxjxT9qFgdI85cH5nyQ63ffqXdYVZ7SJKbmD0B3xNO3DEe/exec"; // Enter your live Google Apps Script web app URL here

/**
 * Fetch all student submissions for Admin Monitoring & Grading
 */
export async function fetchSubmissions(apiUrl: string = DEFAULT_API_URL): Promise<{ success: boolean; data?: SubmissionRecord[]; error?: string }> {
  // Check LocalStorage fallback first
  const localSaved = localStorage.getItem('ielts_student_submissions');
  const localData: SubmissionRecord[] = localSaved ? JSON.parse(localSaved) : [];

  if (!apiUrl || apiUrl.includes('mock_ielts_exam_system_gas_url')) {
    return { success: true, data: localData };
  }

  try {
    const response = await fetch(`${apiUrl}?action=getSubmissions`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (response.ok) {
      const result = await response.json();
      const rows = Array.isArray(result) ? result : (Array.isArray(result?.data) ? result.data : null);
      if (rows) {
        // Merge with local submissions to avoid losing offline attempts
        const combined = [...rows];
        localData.forEach(loc => {
          if (!combined.some(rem => rem.submission_id === loc.submission_id)) {
            combined.unshift(loc);
          }
        });
        return { success: true, data: combined };
      }
    }
  } catch (err) {
    console.warn('GAS API fetchSubmissions failed, falling back to LocalStorage:', err);
  }

  return { success: true, data: localData };
}

/**
 * Fetch cheat violation logs for Admin Monitoring
 */
export async function fetchCheatLogs(apiUrl: string): Promise<{ success: boolean; data?: CheatLog[]; error?: string }> {
  const localLogs = localStorage.getItem('ielts_cheat_logs');
  const logsArr: CheatLog[] = localLogs ? JSON.parse(localLogs) : [];

  if (!apiUrl || apiUrl.includes('mock_ielts_exam_system_gas_url')) {
    return { success: true, data: logsArr };
  }

  try {
    const response = await fetch(`${apiUrl}?action=getCheatLogs`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (response.ok) {
      const result = await response.json();
      const rows = Array.isArray(result) ? result : (Array.isArray(result?.data) ? result.data : null);
      if (rows) {
        const combined = [...rows];
        logsArr.forEach(loc => {
          if (!combined.some(rem => rem.log_id === loc.log_id)) {
            combined.unshift(loc);
          }
        });
        return { success: true, data: combined };
      }
    }
  } catch (err) {
    console.warn('GAS API fetchCheatLogs failed, falling back to LocalStorage:', err);
  }

  return { success: true, data: logsArr };
}

/**
 * Save manual grading scores for Writing
 */
export async function saveWritingScore(
  apiUrl: string, 
  submissionId: string, 
  form: GradingForm
): Promise<{ success: boolean; message?: string }> {
  // Update in LocalStorage
  const localSaved = localStorage.getItem('ielts_student_submissions');
  if (localSaved) {
    const localData: SubmissionRecord[] = JSON.parse(localSaved);
    const updated = localData.map(sub => {
      if (sub.submission_id === submissionId) {
        return {
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
      }
      return sub;
    });
    localStorage.setItem('ielts_student_submissions', JSON.stringify(updated));
  }

  if (!apiUrl || apiUrl.includes('mock_ielts_exam_system_gas_url')) {
    return { success: true, message: 'Writing scores saved to LocalStorage successfully!' };
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // text/plain avoids CORS preflight issues in GAS
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
    });

    if (response.ok) {
      return { success: true, message: 'Writing scores updated on Google Sheets successfully!' };
    }
  } catch (err) {
    console.warn('GAS API saveWritingScore failed:', err);
  }

  return { success: true, message: 'Grading record saved locally!' };
}

/**
 * Submit full exam payload from Student
 */
export async function submitExamPayload(
  apiUrl: string, 
  payload: SubmissionPayload
): Promise<SubmissionResponse> {
  const timestamp = new Date().toISOString();
  const submissionId = `${payload.sbd}_${payload.exam_code}_${Date.now()}`;

  // Local calculation of raw score mock
  let listeningRaw = 0;
  let readingRaw = 0;
  Object.keys(payload.listening_answers).forEach(k => {
    if (payload.listening_answers[k] && payload.listening_answers[k].trim() !== '') listeningRaw += 1;
  });
  Object.keys(payload.reading_answers).forEach(k => {
    if (payload.reading_answers[k] && payload.reading_answers[k].trim() !== '') readingRaw += 1;
  });

  const listeningBand = Math.min(9, Math.max(1, Math.round((listeningRaw / 3) * 2) / 2 || 4.5));
  const readingBand = Math.min(9, Math.max(1, Math.round((readingRaw / 3) * 2) / 2 || 4.5));

  const responseObj: SubmissionResponse = {
    success: true,
    submission_id: submissionId,
    sbd: payload.sbd,
    exam_code: payload.exam_code,
    listening_raw_score: listeningRaw,
    listening_max_score: 40,
    listening_band: listeningBand,
    reading_raw_score: readingRaw,
    reading_max_score: 40,
    reading_band: readingBand,
    writing_status: 'PENDING_TEACHER',
    submitted_at: timestamp,
    message: 'Exam submitted successfully!'
  };

  // Save to LocalStorage
  const record: SubmissionRecord = {
    submission_id: submissionId,
    sbd: payload.sbd,
    exam_code: payload.exam_code,
    test_mode: payload.test_mode,
    listening_answers: payload.listening_answers,
    reading_answers: payload.reading_answers,
    writing_task1_text: payload.writing_task1_text,
    writing_task2_text: payload.writing_task2_text,
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

  const existing = localStorage.getItem('ielts_student_submissions');
  const subsArr: SubmissionRecord[] = existing ? JSON.parse(existing) : [];
  subsArr.unshift(record);
  localStorage.setItem('ielts_student_submissions', JSON.stringify(subsArr));

  if (!apiUrl || apiUrl.includes('mock_ielts_exam_system_gas_url')) {
    return responseObj;
  }

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'submitExam',
        ...payload,
        submission_id: submissionId,
        submitted_at: timestamp
      })
    });

    if (res.ok) {
      const serverRes = await res.json();
      if (serverRes && serverRes.submission_id) {
        return serverRes;
      }
    }
  } catch (err) {
    console.warn('Network error while posting to GAS API, offline backup created:', err);
  }

  return responseObj;
}

/**
 * Fetch exam questions from GAS API with multi-protocol support and universal question parser
 */
export async function fetchExam(
  apiUrl: string, 
  examCode: string
): Promise<{ success: boolean; exam?: ExamData; error?: string; source?: 'gas' | 'default' | 'local' }> {
  const cleanCode = (examCode || 'TEST01').trim().toUpperCase();

  if (apiUrl && !apiUrl.includes('mock_ielts_exam_system_gas_url') && !apiUrl.includes('AKfycbx_mock')) {
    const urlsToTry = [
      `${apiUrl}?action=get_exam&exam_code=${encodeURIComponent(cleanCode)}`,
      `${apiUrl}?action=getExam&exam_code=${encodeURIComponent(cleanCode)}`,
      `${apiUrl}?exam_code=${encodeURIComponent(cleanCode)}`
    ];

    for (const fetchUrl of urlsToTry) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);
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
            const lQs = extracted.questions.filter(q => q.section === 'listening');
            const rQs = extracted.questions.filter(q => q.section === 'reading');

            const examObj: ExamData = {
              exam_code: cleanCode,
              title: meta.title || `IELTS Examination - ${cleanCode}`,
              audio_url: meta.audio_url || DEFAULT_EXAMS[0].audio_url,
              listening_questions: lQs,
              passage_title: meta.passage_title || meta.reading_passage_title || (meta.passages?.[0]?.title) || DEFAULT_EXAMS[0].passages?.[0]?.title || 'Reading Passage',
              passage_text: meta.passage_text || meta.reading_passage || (meta.passages?.[0]?.text) || DEFAULT_EXAMS[0].passages?.[0]?.text || '',
              passages: meta.passages || DEFAULT_EXAMS[0].passages,
              reading_questions: rQs,
              writing_task1_prompt: meta.writing_task1_prompt || DEFAULT_EXAMS[0].writing_task1_prompt,
              writing_task1_image: meta.writing_task1_image || DEFAULT_EXAMS[0].writing_task1_image,
              writing_task2_prompt: meta.writing_task2_prompt || DEFAULT_EXAMS[0].writing_task2_prompt
            };
            return { success: true, exam: examObj, source: 'gas' };
          }
        }
      } catch (err) {
        console.warn(`Query attempt failed on ${fetchUrl}:`, err);
      }
    }
  }

  // Fallback 1: LocalStorage saved exams
  try {
    const localExamsRaw = localStorage.getItem('ielts_saved_exams');
    if (localExamsRaw) {
      const localList = JSON.parse(localExamsRaw);
      if (Array.isArray(localList)) {
        const foundLocal = localList.find((ex: any) => ex.exam_code?.toUpperCase() === cleanCode);
        if (foundLocal) {
          return { success: true, exam: foundLocal, source: 'local' };
        }
      }
    }
  } catch (e) {
    console.warn('Error reading from localStorage:', e);
  }

  // Fallback 2: Default repository
  const foundDefault = DEFAULT_EXAMS.find(
    (ex) => ex.exam_code.toUpperCase() === cleanCode || cleanCode.includes(ex.exam_code.toUpperCase())
  ) || DEFAULT_EXAMS[0];

  if (foundDefault) {
    const lQs = foundDefault.questions.filter(q => q.section === 'listening');
    const rQs = foundDefault.questions.filter(q => q.section === 'reading');
    const examObj: ExamData = {
      exam_code: cleanCode,
      title: foundDefault.title,
      audio_url: foundDefault.audio_url,
      listening_questions: lQs,
      passage_title: foundDefault.passages?.[0]?.title || 'Reading Passage',
      passage_text: foundDefault.passages?.[0]?.text || '',
      passages: foundDefault.passages,
      reading_questions: rQs,
      writing_task1_prompt: foundDefault.writing_task1_prompt,
      writing_task1_image: foundDefault.writing_task1_image,
      writing_task2_prompt: foundDefault.writing_task2_prompt
    };
    return { success: true, exam: examObj, source: 'default' };
  }

  return { success: false, error: 'No questions found and no fallback data available.' };
}

/**
 * Fetch practice decks & questions directly from Google Sheets (tab PRACTICE_QUESTIONS)
 */
export async function fetchPracticeDecksFromGAS(
  apiUrl: string
): Promise<{ success: boolean; is_initialized?: boolean; decks?: CustomPracticeDeck[]; message?: string; error?: string }> {
  if (!apiUrl || apiUrl.includes('mock_ielts_exam_system_gas_url') || apiUrl.includes('AKfycbx_mock')) {
    return { success: false, error: 'Google Apps Script URL is not configured' };
  }

  try {
    const urls = [
      `${apiUrl}?action=get_practice_decks`,
      `${apiUrl}?action=getPracticeDecks`
    ];

    for (const fetchUrl of urls) {
      const res = await fetch(fetchUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          return {
            success: true,
            is_initialized: data.is_initialized !== false,
            decks: Array.isArray(data.decks) ? data.decks : [],
            message: data.message
          };
        }
      }
    }
  } catch (err: any) {
    console.warn('fetchPracticeDecksFromGAS failed:', err);
    return { success: false, error: err.message || 'Unable to connect to Google Sheets' };
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
  if (!apiUrl || apiUrl.includes('mock_ielts_exam_system_gas_url') || apiUrl.includes('AKfycbx_mock')) {
    return { success: false, error: 'Google Apps Script URL is not configured. Please enter the GAS URL in Admin settings.' };
  }

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'init_practice_sheet',
        mode,
        decks
      })
    });

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
    return { success: false, error: err.message || 'Network error initializing database on Google Sheets' };
  }

  return { success: false, error: 'Database initialization failed. Please verify Web App access permissions (Anyone) on Google Apps Script.' };
}

/**
 * Save / update single practice deck to Google Sheets
 */
export async function savePracticeDeckToGAS(
  apiUrl: string,
  deck: CustomPracticeDeck
): Promise<{ success: boolean; message?: string; error?: string }> {
  if (!apiUrl || apiUrl.includes('mock_ielts_exam_system_gas_url') || apiUrl.includes('AKfycbx_mock')) {
    return { success: false, error: 'Google Apps Script URL is not configured' };
  }

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'save_practice_deck',
        mode: 'append',
        deck
      })
    });

    if (res.ok) {
      const result = await res.json();
      if (result && result.success) {
        return { success: true, message: result.message || 'Practice deck saved to Google Sheets!' };
      }
    }
  } catch (err: any) {
    console.warn('savePracticeDeckToGAS failed:', err);
    return { success: false, error: err.message };
  }

  return { success: false, error: 'Unable to save practice deck to Google Sheets' };
}

/**
 * Sync student practice progress records to Google Sheets (Tab STUDENT_PROGRESS)
 */
export async function syncStudentProgressToGAS(
  apiUrl: string,
  records: StudentProgressRecord[]
): Promise<{ success: boolean; message?: string; updated_count?: number; error?: string }> {
  if (!apiUrl || apiUrl.includes('mock_ielts_exam_system_gas_url') || apiUrl.includes('AKfycbx_mock')) {
    return { success: false, error: 'Google Apps Script URL is not configured' };
  }

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'sync_student_progress',
        progress_records: records
      })
    });

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
 * Fetch student practice progress from Google Sheets (Tab STUDENT_PROGRESS)
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
    const res = await fetch(`${apiUrl}?action=get_student_progress${query}`);
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

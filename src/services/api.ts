import { 
  SubmissionRecord, 
  CheatLog, 
  GradingForm, 
  SubmissionPayload, 
  SubmissionResponse, 
  ExamData 
} from '../types';
export const DEFAULT_API_URL = "https://script.google.com/macros/s/AKfycbySNk5foVr4UMC5ZVP1YTlxjxT9qFgdI85cH5nyQ63ffqXdYVZ7SJKbmD0B3xNO3DEe/exec"; // Dán URL GAS thật của bạn vào đây

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
    return { success: true, message: 'Đã lưu điểm Writing vào LocalStorage thành công!' };
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
      return { success: true, message: 'Đã cập nhật điểm thi lên Google Sheets!' };
    }
  } catch (err) {
    console.warn('GAS API saveWritingScore failed:', err);
  }

  return { success: true, message: 'Đã lưu bản ghi chấm điểm cục bộ!' };
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
    message: 'Nộp bài thành công!'
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
 * Fetch exam questions from GAS API
 */
export async function fetchExam(
  apiUrl: string, 
  examCode: string
): Promise<{ success: boolean; exam?: ExamData; error?: string }> {
  if (!apiUrl || apiUrl.includes('mock_ielts_exam_system_gas_url')) {
    return { success: false, error: 'Chưa kết nối GAS API endpoint' };
  }

  const cleanCode = examCode.trim();

  try {
    const res = await fetch(`${apiUrl}?action=get_exam&exam_code=${encodeURIComponent(cleanCode)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (res.ok) {
      const data = await res.json();
      const examObj = data?.exam || data?.data || data;
      if (examObj && (examObj.exam_code || examObj.questions || examObj.listening_questions || examObj.reading_questions)) {
        return { success: true, exam: examObj };
      }
    }
  } catch (err) {
    console.warn('Error fetching exam from GAS with get_exam, retrying getExam:', err);
  }

  try {
    const res2 = await fetch(`${apiUrl}?action=getExam&exam_code=${encodeURIComponent(cleanCode)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (res2.ok) {
      const data = await res2.json();
      const examObj = data?.exam || data?.data || data;
      if (examObj && (examObj.exam_code || examObj.questions || examObj.listening_questions || examObj.reading_questions)) {
        return { success: true, exam: examObj };
      }
    }
  } catch (err) {
    console.warn('Error fetching exam from GAS with getExam:', err);
  }

  return { success: false, error: 'Không thể kết nối hoặc không tìm thấy mã đề trong Google Sheet.' };
}

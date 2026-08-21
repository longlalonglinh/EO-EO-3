import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { LoginInstructions } from './components/Student/LoginInstructions';
import { ListeningModule } from './components/Student/ListeningModule';
import { ReadingModule } from './components/Student/ReadingModule';
import { WritingModule } from './components/Student/WritingModule';
import { ProctoringMonitor } from './components/Student/ProctoringMonitor';
import { ResultPage } from './components/Student/ResultPage';
import { MonitoringDashboard } from './components/Admin/MonitoringDashboard';
import { ManualGrading } from './components/Admin/ManualGrading';
import { UploadModule } from './components/Admin/UploadModule';
import { PreviewModule } from './components/Admin/PreviewModule';
import { ExamData, SubmissionResponse, SubmissionPayload, CheatLog, Question } from './types';
import { 
  Headphones, 
  BookOpen, 
  FileText, 
  CheckCircle2, 
  Send, 
  WifiOff, 
  RefreshCw, 
  Database, 
  Code, 
  Copy, 
  Check, 
  ExternalLink,
  ShieldCheck,
  Eye,
  Settings,
  HelpCircle,
  Clock,
  Sparkles,
  Lock,
  ArrowRight
} from 'lucide-react';

import { DEFAULT_API_URL } from './services/api';

// Default GAS URL or loaded from LocalStorage
const DEFAULT_GAS_URL = DEFAULT_API_URL;

// Sample fallback exam data if GAS endpoint is not connected yet
const SAMPLE_EXAM: ExamData = {
  exam_code: 'IELTS01',
  title: 'Đề Thi Thử IELTS Academic - Test 01',
  audio_url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=ambient-piano-amp-strings-10711.mp3',
  listening_questions: [
    {
      question_id: 'l1',
      section: 'listening',
      question_text: '1. What is the customer\'s main requirement for the apartment?',
      question_type: 'multiple_choice',
      options: ['A. Near the city center', 'B. Sea view with 2 bedrooms', 'C. Close to the train station', 'D. Pet-friendly balcony'],
      max_score: 1
    },
    {
      question_id: 'l2',
      section: 'listening',
      question_text: '2. Complete the form: The lease agreement starts on ________ November.',
      question_type: 'fill_in_blank',
      max_score: 1
    },
    {
      question_id: 'l3',
      section: 'listening',
      question_text: '3. What is the maximum monthly rent budget mentioned?',
      question_type: 'multiple_choice',
      options: ['A. $800', 'B. $1200', 'C. $1500', 'D. $2000'],
      max_score: 1
    }
  ],
  passage_title: 'The Rise of Renewable Energy Technologies in Modern Cities',
  passage_text: `Renewable energy technologies have witnessed unprecedented growth over the past two decades. Urban centers around the globe are increasingly integrating solar photovoltaics, wind turbines, and geothermal systems into their energy grids to curb carbon emissions.\n\nSolar power, in particular, has experienced dramatic cost reductions due to technological breakthroughs and economies of scale. High-efficiency monocrystalline silicon panels can now convert over 22% of sunlight into usable electrical energy. Furthermore, battery storage solutions, such as grid-scale lithium-ion facilities, are resolving the intermittency challenges historically associated with solar and wind power.\n\nDespite these advancements, urban deployment faces spatial constraints and regulatory hurdles. Roof space availability in high-density metropolitan areas is often limited, necessitating innovative solutions like building-integrated photovoltaics (BIPV) and floating solar farms on reservoirs. Policy frameworks and government subsidies continue to play a pivotal role in accelerating adoption.`,
  reading_questions: [
    {
      question_id: 'r1',
      section: 'reading',
      question_text: '1. High-efficiency monocrystalline silicon panels convert over 22% of sunlight into electrical energy.',
      question_type: 'true_false_not_given',
      max_score: 1
    },
    {
      question_id: 'r2',
      section: 'reading',
      question_text: '2. What facility solves the intermittency challenge of solar energy?',
      question_type: 'fill_in_blank',
      max_score: 1
    },
    {
      question_id: 'r3',
      section: 'reading',
      question_text: '3. According to the passage, floating solar farms are built on:',
      question_type: 'multiple_choice',
      options: ['A. Ocean surfaces', 'B. Reservoirs', 'C. Residential roofs', 'D. Agricultural fields'],
      max_score: 1
    }
  ],
  writing_task1_prompt: 'The chart below shows the percentage of energy generated from renewable sources in four European countries from 2010 to 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
  writing_task2_prompt: 'Some people argue that technological development is causing people to lose social skills and live more isolated lives. To what extent do you agree or disagree? Give reasons for your answer and include relevant examples. Write at least 250 words.'
};

export default function App() {
  const [activeView, setActiveView] = useState<'student' | 'admin'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') === 'admin' || window.location.pathname.includes('admin')) {
        return 'admin';
      }
    }
    return 'student';
  });
  const [adminTab, setAdminTab] = useState<'dashboard' | 'grading' | 'upload' | 'preview' | 'gas_setup'>('dashboard');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'admin' || window.location.pathname.includes('admin')) {
      setActiveView('admin');
    }
  }, []);
  
  // GAS Web App URL
  const [gasUrl, setGasUrl] = useState<string>(() => {
    return localStorage.getItem('ielts_gas_url') || DEFAULT_GAS_URL;
  });

  // Student Flow State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sbd, setSbd] = useState('');
  const [examCode, setExamCode] = useState('');
  const [testMode, setTestMode] = useState<'TEST' | 'PRACTICE'>('TEST');
  const [submissionId, setSubmissionId] = useState('');
  const [currentModule, setCurrentModule] = useState<'listening' | 'reading' | 'writing' | 'results'>('listening');

  // Sequential progression state for TEST MODE
  const [completedSkills, setCompletedSkills] = useState<{ listening: boolean; reading: boolean; writing: boolean }>({
    listening: false,
    reading: false,
    writing: false
  });
  const [skillNotice, setSkillNotice] = useState<string | null>(null);

  // Switch tabs safely based on TEST vs PRACTICE mode
  const handleSwitchTab = (targetModule: 'listening' | 'reading' | 'writing') => {
    if (testMode === 'PRACTICE') {
      setCurrentModule(targetModule);
      setSkillNotice(null);
      return;
    }

    // TEST MODE ENFORCEMENT
    if (targetModule === 'listening') {
      setCurrentModule('listening');
      setSkillNotice(null);
    } else if (targetModule === 'reading') {
      if (!completedSkills.listening) {
        setSkillNotice('🔒 Trong chế độ TEST MODE: Bạn cần nộp bài phần NGHE (Listening) để mở khóa phần ĐỌC (Reading)!');
        setTimeout(() => setSkillNotice(null), 4000);
        return;
      }
      setCurrentModule('reading');
      setSkillNotice(null);
    } else if (targetModule === 'writing') {
      if (!completedSkills.listening) {
        setSkillNotice('🔒 Trong chế độ TEST MODE: Bạn cần nộp lần lượt từng phần thi (Nghe → Đọc → Viết)!');
        setTimeout(() => setSkillNotice(null), 4000);
        return;
      }
      if (!completedSkills.reading) {
        setSkillNotice('🔒 Trong chế độ TEST MODE: Bạn cần nộp bài phần ĐỌC (Reading) để mở khóa phần VIẾT (Writing)!');
        setTimeout(() => setSkillNotice(null), 4000);
        return;
      }
      setCurrentModule('writing');
      setSkillNotice(null);
    }
  };

  // Section Advancement Handlers
  const handleCompleteListening = () => {
    setCompletedSkills(prev => ({ ...prev, listening: true }));
    setCurrentModule('reading');
    setSkillNotice('✅ Đã hoàn thành & nộp phần thi NGHE! Chuyển sang bài thi ĐỌC (Reading).');
    setTimeout(() => setSkillNotice(null), 5000);
  };

  const handleCompleteReading = () => {
    setCompletedSkills(prev => ({ ...prev, reading: true }));
    setCurrentModule('writing');
    setSkillNotice('✅ Đã hoàn thành & nộp phần thi ĐỌC! Chuyển sang bài thi VIẾT (Writing).');
    setTimeout(() => setSkillNotice(null), 5000);
  };

  // Exam Data State
  const [examData, setExamData] = useState<ExamData>(SAMPLE_EXAM);
  const [isLoadingExam, setIsLoadingExam] = useState(false);

  // User Responses State
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [writingTask1, setWritingTask1] = useState('');
  const [writingTask2, setWritingTask2] = useState('');
  const [violationCount, setViolationCount] = useState(0);

  // Submission & Retry State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmissionResponse | null>(null);
  const [offlinePending, setOfflinePending] = useState(false);
  const [copiedGasCode, setCopiedGasCode] = useState(false);

  // Save GAS URL to LocalStorage
  const handleSaveGasUrl = (url: string) => {
    setGasUrl(url);
    localStorage.setItem('ielts_gas_url', url);
  };

  // Determine TEST vs PRACTICE Mode using (code % 2) math
  const determineTestMode = (code: string): 'TEST' | 'PRACTICE' => {
    const digits = code.replace(/\D/g, '');
    let numVal = 1;
    if (digits.length > 0) {
      numVal = parseInt(digits, 10);
    } else {
      // Sum char codes if no digits
      numVal = code.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    }
    return numVal % 2 !== 0 ? 'TEST' : 'PRACTICE';
  };

  // Handle Login & Load Exam
  const handleLogin = async (sbdInput: string, codeInput: string, reviewPrevious: boolean) => {
    const cleanSbd = sbdInput.trim();
    const cleanCode = codeInput.trim();
    setSbd(cleanSbd);
    setExamCode(cleanCode);
    setCompletedSkills({ listening: false, reading: false, writing: false });
    setSkillNotice(null);

    const mode = determineTestMode(cleanCode);
    setTestMode(mode);

    const subId = `${cleanSbd}_${cleanCode}_${Date.now()}`;
    setSubmissionId(subId);

    setIsLoadingExam(true);

    try {
      if (gasUrl && !gasUrl.includes('AKfycbx_mock')) {
        let loadedExam: any = null;

        // Try get_exam action first
        try {
          const fetchUrl = `${gasUrl}?action=get_exam&exam_code=${encodeURIComponent(cleanCode)}`;
          const res = await fetch(fetchUrl);
          if (res.ok) {
            const json = await res.json();
            if (json && (json.questions || json.exam?.questions || json.data?.questions)) {
              loadedExam = json.exam || json.data || json;
            }
          }
        } catch (e1) {
          console.warn('get_exam attempt failed, trying getExam:', e1);
        }

        // Try getExam action as fallback
        if (!loadedExam) {
          try {
            const fetchUrl2 = `${gasUrl}?action=getExam&exam_code=${encodeURIComponent(cleanCode)}`;
            const res2 = await fetch(fetchUrl2);
            if (res2.ok) {
              const json2 = await res2.json();
              if (json2 && (json2.questions || json2.exam?.questions || json2.data?.questions)) {
                loadedExam = json2.exam || json2.data || json2;
              }
            }
          } catch (e2) {
            console.warn('getExam attempt failed:', e2);
          }
        }

        if (loadedExam && Array.isArray(loadedExam.questions) && loadedExam.questions.length > 0) {
          // Parse GAS questions array into ExamData structure with case-insensitive matching
          const questions: Question[] = loadedExam.questions;
          const lQs = questions.filter(q => q.section?.toLowerCase()?.trim() === 'listening');
          const rQs = questions.filter(q => q.section?.toLowerCase()?.trim() === 'reading');

          setExamData({
            exam_code: cleanCode,
            title: loadedExam.title || `Đề Thi IELTS ${cleanCode}`,
            audio_url: loadedExam.audio_url || SAMPLE_EXAM.audio_url,
            listening_questions: lQs.length > 0 ? lQs : (loadedExam.listening_questions || []),
            passage_title: loadedExam.passage_title || SAMPLE_EXAM.passage_title,
            passage_text: loadedExam.passage_text || SAMPLE_EXAM.passage_text,
            reading_questions: rQs.length > 0 ? rQs : (loadedExam.reading_questions || []),
            writing_task1_prompt: loadedExam.writing_task1_prompt || SAMPLE_EXAM.writing_task1_prompt,
            writing_task2_prompt: loadedExam.writing_task2_prompt || SAMPLE_EXAM.writing_task2_prompt
          });

          setSkillNotice(`✅ Đã tải thành công đề thi [${cleanCode}] từ Google Sheets (${questions.length} câu hỏi).`);
          setTimeout(() => setSkillNotice(null), 6000);
        } else {
          setSkillNotice(`⚠️ Không tìm thấy câu hỏi cho mã đề [${cleanCode}] trong tab QUESTIONS của Google Sheets (đang hiển thị đề mặc định).`);
          setTimeout(() => setSkillNotice(null), 8000);
        }
      }
    } catch (err) {
      console.warn('Could not fetch exam from GAS API, using fallback exam data:', err);
      setSkillNotice(`⚠️ Không thể kết nối đến Google Apps Script. Đang sử dụng dữ liệu đề thi cục bộ.`);
      setTimeout(() => setSkillNotice(null), 8000);
    } finally {
      setIsLoadingExam(false);
      setIsLoggedIn(true);

      // Check if reviewing previous submission in Practice Mode
      if (mode === 'PRACTICE' && reviewPrevious) {
        const existingSubs = localStorage.getItem('ielts_student_submissions');
        if (existingSubs) {
          const subsArr: SubmissionResponse[] = JSON.parse(existingSubs);
          const found = subsArr.find(s => s.sbd === cleanSbd && s.exam_code === cleanCode);
          if (found) {
            setSubmitResult(found);
            setCurrentModule('results');
            return;
          }
        }
      }

      setCurrentModule('listening');
    }
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  // Submit Exam & Batching Payload
  const handleSubmitExam = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    // Retrieve cheat logs from LocalStorage
    const rawCheatLogs = localStorage.getItem('ielts_cheat_logs');
    const cheatLogs: CheatLog[] = rawCheatLogs ? JSON.parse(rawCheatLogs) : [];

    // Filter cheat logs for this submission
    const currentLogs = cheatLogs.filter(log => log.sbd === sbd && log.exam_code === examCode);

    const payload: SubmissionPayload = {
      submission_id: submissionId,
      sbd,
      exam_code: examCode,
      test_mode: testMode,
      answers: userAnswers,
      writing_task1: writingTask1,
      writing_task2: writingTask2,
      cheat_logs: currentLogs,
      submitted_at: new Date().toISOString()
    };

    let serverResponse: SubmissionResponse | null = null;

    try {
      if (gasUrl && !gasUrl.includes('AKfycbx_mock')) {
        const res = await fetch(gasUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8' // GAS requirement for CORS
          },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data && data.submission_id) {
          serverResponse = data;
        }
      }
    } catch (err) {
      console.error('GAS API POST Submission Error (will retry offline):', err);
      // Save to pending offline submissions queue
      const pendingRaw = localStorage.getItem('ielts_pending_submissions');
      const pendingArr: SubmissionPayload[] = pendingRaw ? JSON.parse(pendingRaw) : [];
      pendingArr.push(payload);
      localStorage.setItem('ielts_pending_submissions', JSON.stringify(pendingArr));
      setOfflinePending(true);
    }

    // Client-side Fallback Grading calculation if server response is unavailable
    if (!serverResponse) {
      let listeningCorrect = 0;
      examData.listening_questions.forEach(q => {
        const ans = userAnswers[q.question_id];
        if (ans && q.correct_answer && ans.trim().toLowerCase() === q.correct_answer.trim().toLowerCase()) {
          listeningCorrect += 1;
        } else if (ans) {
          listeningCorrect += 1; // Give raw points for answered questions in fallback
        }
      });

      let readingCorrect = 0;
      examData.reading_questions.forEach(q => {
        const ans = userAnswers[q.question_id];
        if (ans && q.correct_answer && ans.trim().toLowerCase() === q.correct_answer.trim().toLowerCase()) {
          readingCorrect += 1;
        } else if (ans) {
          readingCorrect += 1;
        }
      });

      serverResponse = {
        submission_id: submissionId,
        sbd,
        exam_code: examCode,
        listening_score: Math.min(listeningCorrect, 40),
        reading_score: Math.min(readingCorrect, 40),
        writing_status: 'PENDING_TEACHER',
        created_at: new Date().toISOString()
      };
    }

    // Save submission locally
    const subsRaw = localStorage.getItem('ielts_student_submissions');
    const subsArr: SubmissionResponse[] = subsRaw ? JSON.parse(subsRaw) : [];
    subsArr.unshift(serverResponse);
    localStorage.setItem('ielts_student_submissions', JSON.stringify(subsArr));

    setSubmitResult(serverResponse);
    setIsSubmitting(false);
    setCurrentModule('results');
  };

  // Background Offline Retry Loop
  const triggerOfflineRetry = useCallback(async () => {
    const pendingRaw = localStorage.getItem('ielts_pending_submissions');
    if (!pendingRaw) return;
    const pendingArr: SubmissionPayload[] = JSON.parse(pendingRaw);
    if (pendingArr.length === 0) {
      setOfflinePending(false);
      return;
    }

    if (!gasUrl || gasUrl.includes('AKfycbx_mock')) return;

    const remaining: SubmissionPayload[] = [];
    for (const item of pendingArr) {
      try {
        const res = await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(item)
        });
        if (res.ok) {
          console.log('Successfully re-submitted offline item:', item.submission_id);
        } else {
          remaining.push(item);
        }
      } catch {
        remaining.push(item);
      }
    }

    if (remaining.length === 0) {
      localStorage.removeItem('ielts_pending_submissions');
      setOfflinePending(false);
    } else {
      localStorage.setItem('ielts_pending_submissions', JSON.stringify(remaining));
      setOfflinePending(true);
    }
  }, [gasUrl]);

  useEffect(() => {
    const interval = setInterval(() => {
      triggerOfflineRetry();
    }, 10000);
    return () => clearInterval(interval);
  }, [triggerOfflineRetry]);

  // Complete GAS Code Script Template
  const gasBackendScript = `/**
 * BACKEND GOOGLE APPS SCRIPT (GAS) - IELTS EXAM SYSTEM
 * Tương thích với Google Sheets gồm 4 tabs: EXAMS, QUESTIONS, SUBMISSIONS, CHEATLOGS
 */

function doGet(e) {
  var params = e ? e.parameter : {};
  var action = (params.action || 'get_exam').toLowerCase();
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. ACTION: LẤY ĐỀ THI (get_exam / getexam)
  if (action === 'get_exam' || action === 'getexam') {
    var rawCode = params.exam_code || 'IELTS01';
    var examCode = rawCode.toString().trim().toUpperCase();

    // Đọc thông tin chung từ sheet EXAMS (nếu có)
    var title = 'Đề thi IELTS ' + rawCode;
    var audioUrl = '';
    var passageTitle = '';
    var passageText = '';
    var writingTask1 = '';
    var writingTask2 = '';

    var examsSheet = ss.getSheetByName('EXAMS');
    if (examsSheet && examsSheet.getLastRow() > 1) {
      var examsData = examsSheet.getDataRange().getValues();
      for (var eRow = 1; eRow < examsData.length; eRow++) {
        var er = examsData[eRow];
        if (er[0] && er[0].toString().trim().toUpperCase() === examCode) {
          if (er[1]) title = er[1].toString().trim();
          if (er[4]) audioUrl = er[4].toString().trim(); // Cột Audio URL nếu có
          if (er[5]) passageTitle = er[5].toString().trim();
          if (er[6]) passageText = er[6].toString().trim();
          if (er[7]) writingTask1 = er[7].toString().trim();
          if (er[8]) writingTask2 = er[8].toString().trim();
          break;
        }
      }
    }

    // Đọc danh sách câu hỏi từ sheet QUESTIONS
    var questionsSheet = ss.getSheetByName('QUESTIONS');
    var questions = [];

    if (questionsSheet && questionsSheet.getLastRow() > 1) {
      var data = questionsSheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        if (row[0] && row[0].toString().trim().toUpperCase() === examCode) {
          var rawSection = (row[2] || 'reading').toString().trim().toLowerCase();
          var qObj = {
            question_id: (row[1] || ('q_' + i)).toString().trim(),
            section: rawSection, // listening hoặc reading
            question_text: (row[3] || '').toString().trim(),
            question_type: (row[4] || 'multiple_choice').toString().trim().toLowerCase(),
            options: row[5] ? row[5].toString().split('|').map(function(s){ return s.trim(); }) : [],
            max_score: Number(row[7]) || 1
            // Lưu ý: Cột 6 (CORRECT_ANSWERS) bảo mật ở máy chủ, không trả về client
          };
          questions.push(qObj);

          // Cập nhật thông tin bài nếu có ghi ở dòng QUESTIONS
          if (row[8] && !passageTitle) passageTitle = row[8].toString().trim();
          if (row[9] && !passageText) passageText = row[9].toString().trim();
          if (row[10] && !audioUrl) audioUrl = row[10].toString().trim();
          if (row[11] && !writingTask1) writingTask1 = row[11].toString().trim();
          if (row[12] && !writingTask2) writingTask2 = row[12].toString().trim();
        }
      }
    }

    var result = {
      status: 'success',
      exam_code: rawCode,
      title: title,
      questions: questions,
      passage_title: passageTitle,
      passage_text: passageText,
      audio_url: audioUrl,
      writing_task1_prompt: writingTask1,
      writing_task2_prompt: writingTask2
    };

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 2. ACTION: LẤY DANH SÁCH BÀI NỘP CHO GIÁO VIÊN (getSubmissions / get_submissions)
  if (action === 'getsubmissions' || action === 'get_submissions') {
    var subSheet = ss.getSheetByName('SUBMISSIONS');
    var submissions = [];
    if (subSheet && subSheet.getLastRow() > 1) {
      var sData = subSheet.getDataRange().getValues();
      for (var s = 1; s < sData.length; s++) {
        var sr = sData[s];
        submissions.push({
          submission_id: sr[0],
          sbd: sr[1],
          exam_code: sr[2],
          listening_raw_score: Number(sr[3]) || 0,
          reading_raw_score: Number(sr[4]) || 0,
          writing_status: sr[5] || 'PENDING_TEACHER',
          writing_task1_essay: sr[6] || '',
          writing_task2_essay: sr[7] || '',
          writing_scores: {
            TR: sr[8] || null,
            CC: sr[9] || null,
            LR: sr[10] || null,
            GRA: sr[11] || null
          },
          writing_band: sr[12] || null,
          writing_feedback: sr[13] || '',
          submitted_at: sr[14] || sr[5] || new Date().toISOString()
        });
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: submissions }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 3. ACTION: LẤY LOGS GIAN LẬN (getCheatLogs / get_cheat_logs)
  if (action === 'getcheatlogs' || action === 'get_cheat_logs') {
    var cheatSheet = ss.getSheetByName('CHEATLOGS');
    var logs = [];
    if (cheatSheet && cheatSheet.getLastRow() > 1) {
      var logsData = cheatSheet.getDataRange().getValues();
      for (var j = 1; j < logsData.length; j++) {
        var r = logsData[j];
        logs.push({
          log_id: r[0],
          submission_id: r[1],
          sbd: r[2],
          exam_code: r[3],
          violation_type: r[4],
          timestamp: r[5]
        });
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: logs }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', message: 'IELTS GAS API Ready' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var contents = JSON.parse(e.postData.contents);
    var action = (contents.action || 'submitExam').toLowerCase();
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. ACTION CHẤM ĐIỂM WRITING (gradeWriting / grade_writing)
    if (action === 'gradewriting' || action === 'grade_writing') {
      var targetSubId = contents.submission_id;
      var subSheet = ss.getSheetByName('SUBMISSIONS');
      if (subSheet && subSheet.getLastRow() > 1) {
        var sRows = subSheet.getDataRange().getValues();
        for (var rowIdx = 1; rowIdx < sRows.length; rowIdx++) {
          if (sRows[rowIdx][0] == targetSubId) {
            var scores = contents.writing_scores || {};
            subSheet.getRange(rowIdx + 1, 6).setValue('GRADED'); // Status
            subSheet.getRange(rowIdx + 1, 9).setValue(scores.TR || '');
            subSheet.getRange(rowIdx + 1, 10).setValue(scores.CC || '');
            subSheet.getRange(rowIdx + 1, 11).setValue(scores.LR || '');
            subSheet.getRange(rowIdx + 1, 12).setValue(scores.GRA || '');
            subSheet.getRange(rowIdx + 1, 13).setValue(contents.writing_band || '');
            subSheet.getRange(rowIdx + 1, 14).setValue(contents.writing_feedback || '');
            break;
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Grading saved' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 2. ACTION TẢI LÊN ĐỀ THI (upload_exam / uploadexam)
    if (action === 'upload_exam' || action === 'uploadexam') {
      var exam = contents.exam_data;
      if (!exam) {
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Không tìm thấy dữ liệu exam_data' }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      var sheetE = ss.getSheetByName('EXAMS') || ss.insertSheet('EXAMS');
      var sheetQ = ss.getSheetByName('QUESTIONS') || ss.insertSheet('QUESTIONS');

      var uExamCode = (exam.exam_code || 'IELTS01').toString().trim().toUpperCase();
      var uTitle = exam.title || ('Đề thi IELTS ' + uExamCode);
      var uTestType = exam.test_type || 'Academic';
      var uDuration = exam.duration_mins || 60;
      var uAudioUrl = exam.audio_url || '';
      var uPassageTitle = exam.passage_title || '';
      var uPassageText = exam.passage_text || '';
      var uWritingTask1 = exam.writing_task1_prompt || '';
      var uWritingTask2 = exam.writing_task2_prompt || '';

      sheetE.appendRow([
        uExamCode,
        uTitle,
        uTestType,
        uDuration,
        uAudioUrl,
        uPassageTitle,
        uPassageText,
        uWritingTask1,
        uWritingTask2
      ]);

      var listeningQs = exam.listening_questions || [];
      for (var l = 0; l < listeningQs.length; l++) {
        var lq = listeningQs[l];
        var lOptions = (lq.options && Array.isArray(lq.options)) ? lq.options.join('|') : (lq.options || '');
        sheetQ.appendRow([
          uExamCode,
          lq.question_id || ('l_' + (l + 1)),
          'listening',
          lq.question_text || '',
          lq.question_type || 'multiple_choice',
          lOptions,
          lq.correct_answer || '',
          lq.max_score || 1,
          uPassageTitle,
          uPassageText,
          uAudioUrl
        ]);
      }

      var readingQs = exam.reading_questions || [];
      for (var r = 0; r < readingQs.length; r++) {
        var rq = readingQs[r];
        var rOptions = (rq.options && Array.isArray(rq.options)) ? rq.options.join('|') : (rq.options || '');
        sheetQ.appendRow([
          uExamCode,
          rq.question_id || ('r_' + (r + 1)),
          'reading',
          rq.question_text || '',
          rq.question_type || 'multiple_choice',
          rOptions,
          rq.correct_answer || '',
          rq.max_score || 1,
          uPassageTitle,
          uPassageText,
          uAudioUrl
        ]);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Đã lưu đề thi ' + uExamCode + ' lên Google Sheets thành công!',
        exam_code: uExamCode,
        total_questions: listeningQs.length + readingQs.length
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. ACTION NỘP BÀI THI (submitExam / submit_exam)
    var subSheet = ss.getSheetByName('SUBMISSIONS');
    var cheatSheet = ss.getSheetByName('CHEATLOGS');

    var subId = contents.submission_id || (contents.sbd + '_' + contents.exam_code + '_' + new Date().getTime());
    var sbd = contents.sbd;
    var examCode = (contents.exam_code || '').toString().trim().toUpperCase();
    var answers = contents.answers || {};

    // Tự động chấm điểm trắc nghiệm Listening & Reading
    var questionsSheet = ss.getSheetByName('QUESTIONS');
    var listeningScore = 0;
    var readingScore = 0;

    if (questionsSheet && questionsSheet.getLastRow() > 1) {
      var qData = questionsSheet.getDataRange().getValues();
      for (var k = 1; k < qData.length; k++) {
        var qRow = qData[k];
        if (qRow[0] && qRow[0].toString().trim().toUpperCase() === examCode) {
          var qId = (qRow[1] || '').toString().trim();
          var section = (qRow[2] || '').toString().trim().toLowerCase();
          var correctAns = qRow[6] ? qRow[6].toString().trim().toLowerCase() : '';
          var userAns = answers[qId] ? answers[qId].toString().trim().toLowerCase() : '';

          if (userAns && correctAns && userAns === correctAns) {
            if (section === 'listening') listeningScore++;
            if (section === 'reading') readingScore++;
          }
        }
      }
    }

    // Ghi vào sheet SUBMISSIONS
    if (subSheet) {
      subSheet.appendRow([
        subId,
        sbd,
        contents.exam_code,
        listeningScore,
        readingScore,
        'PENDING_TEACHER', // Trạng thái Writing
        contents.writing_task1 || '',
        contents.writing_task2 || '',
        '', '', '', '', '', '', // TR, CC, LR, GRA, Band, Feedback
        new Date().toISOString()
      ]);
    }

    // Ghi nhận Cheat Logs
    if (cheatSheet && contents.cheat_logs && contents.cheat_logs.length > 0) {
      for (var m = 0; m < contents.cheat_logs.length; m++) {
        var log = contents.cheat_logs[m];
        cheatSheet.appendRow([
          log.log_id || ('log_' + new Date().getTime()),
          subId,
          sbd,
          contents.exam_code,
          log.violation_type || 'Unknown Violation',
          log.timestamp || new Date().toISOString()
        ]);
      }
    }

    var responseObj = {
      status: 'success',
      submission_id: subId,
      sbd: sbd,
      exam_code: contents.exam_code,
      listening_score: listeningScore,
      reading_score: readingScore,
      writing_status: 'PENDING_TEACHER',
      created_at: new Date().toISOString()
    };

    return ContentService.createTextOutput(JSON.stringify(responseObj))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
`;

  const copyGasCode = () => {
    navigator.clipboard.writeText(gasBackendScript);
    setCopiedGasCode(true);
    setTimeout(() => setCopiedGasCode(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#F5F2F9] text-[#3C2A63] flex flex-col font-sans transition-colors duration-300">
      
      {/* Universal Top Navigation Header */}
      <Navbar
        activeView={activeView}
        adminTab={adminTab}
        setActiveView={setActiveView}
        setAdminTab={setAdminTab}
        studentMode={testMode}
        sbd={sbd}
        examCode={examCode}
        gasUrl={gasUrl}
      />

      {/* Offline Pending Submission Alert */}
      {offlinePending && (
        <div className="bg-amber-100 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <WifiOff className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
            <span>
              <strong>Cơ chế Offline-Retry:</strong> Kết nối mạng chập chờn. Hệ thống đang tự động xếp hàng bài nộp và sẽ fetch gửi lại ngay khi khôi phục mạng!
            </span>
          </div>
          <button
            onClick={triggerOfflineRetry}
            className="px-2.5 py-1 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            Retry Ngay
          </button>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        
        {/* STUDENT VIEW */}
        {activeView === 'student' && (
          <div>
            {!isLoggedIn ? (
              <LoginInstructions 
                onLogin={handleLogin} 
                onSwitchToAdmin={() => setActiveView('admin')}
              />
            ) : (
              <div className="space-y-6">
                
                {/* Proctoring Monitor for Test Mode */}
                <ProctoringMonitor
                  submissionId={submissionId}
                  sbd={sbd}
                  examCode={examCode}
                  testMode={testMode}
                  onViolationCountChange={(count) => setViolationCount(count)}
                />

                {/* Skill Lock / Notice Banner */}
                {skillNotice && (
                  <div className={`p-4 rounded-2xl border text-xs font-extrabold flex items-center justify-between gap-3 animate-fade-in shadow-md ${
                    skillNotice.startsWith('✅')
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : 'bg-rose-100 text-rose-900 border-rose-300'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <Lock className="w-4 h-4 shrink-0" />
                      <span>{skillNotice}</span>
                    </div>
                    <button
                      onClick={() => setSkillNotice(null)}
                      className="text-xs hover:opacity-75 font-black px-2 py-0.5 rounded cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Student Step Module Switcher Tabs */}
                {currentModule !== 'results' && (
                  <div className="bg-white/90 border border-purple-100/80 p-2.5 rounded-3xl shadow-xl shadow-purple-950/5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center space-x-2">
                      
                      <button
                        onClick={() => handleSwitchTab('listening')}
                        className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                          currentModule === 'listening'
                            ? 'bg-[#6B51A5] text-white shadow-md'
                            : completedSkills.listening
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-[#E2DDEC] text-[#3C2A63] hover:bg-[#D9D3E4]'
                        }`}
                      >
                        {completedSkills.listening ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        ) : (
                          <Headphones className="w-4 h-4" />
                        )}
                        <span>1. Listening ({examData.listening_questions.length} câu)</span>
                      </button>

                      <button
                        onClick={() => handleSwitchTab('reading')}
                        className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                          currentModule === 'reading'
                            ? 'bg-[#6B51A5] text-white shadow-md'
                            : completedSkills.reading
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : testMode === 'TEST' && !completedSkills.listening
                            ? 'bg-purple-50 text-[#7C68A5] border border-purple-200/60 opacity-80'
                            : 'bg-[#E2DDEC] text-[#3C2A63] hover:bg-[#D9D3E4]'
                        }`}
                      >
                        {completedSkills.reading ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        ) : testMode === 'TEST' && !completedSkills.listening ? (
                          <Lock className="w-3.5 h-3.5 text-rose-500" />
                        ) : (
                          <BookOpen className="w-4 h-4" />
                        )}
                        <span>2. Reading ({examData.reading_questions.length} câu)</span>
                      </button>

                      <button
                        onClick={() => handleSwitchTab('writing')}
                        className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                          currentModule === 'writing'
                            ? 'bg-[#6B51A5] text-white shadow-md'
                            : completedSkills.writing
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : testMode === 'TEST' && (!completedSkills.listening || !completedSkills.reading)
                            ? 'bg-purple-50 text-[#7C68A5] border border-purple-200/60 opacity-80'
                            : 'bg-[#E2DDEC] text-[#3C2A63] hover:bg-[#D9D3E4]'
                        }`}
                      >
                        {completedSkills.writing ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        ) : testMode === 'TEST' && (!completedSkills.listening || !completedSkills.reading) ? (
                          <Lock className="w-3.5 h-3.5 text-rose-500" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                        <span>3. Writing (Task 1 & Task 2)</span>
                      </button>

                    </div>

                    {/* SUBMIT BUTTON */}
                    <button
                      onClick={handleSubmitExam}
                      disabled={isSubmitting}
                      className="px-6 py-3 bg-[#6B51A5] hover:bg-[#583F8F] text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-purple-900/15 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Đang Nộp Bài...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>NỘP BÀI THI (SUBMIT)</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Render Selected Student Module */}
                {currentModule === 'listening' && (
                  <div className="space-y-4">
                    <ListeningModule
                      audioUrl={examData.audio_url}
                      questions={examData.listening_questions}
                      userAnswers={userAnswers}
                      onAnswerChange={handleAnswerChange}
                      testMode={testMode}
                    />

                    {/* Section Progression Footer */}
                    <div className="bg-white border border-purple-100/80 rounded-3xl p-5 shadow-xl shadow-purple-950/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-3 bg-emerald-100 text-emerald-800 rounded-2xl">
                          <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                        </div>
                        <div>
                          <h4 className="text-sm font-extrabold text-[#3C2A63]">Nộp Bài Làm Phần Nghe (Listening)</h4>
                          <p className="text-xs text-[#7C68A5] font-medium">
                            {testMode === 'TEST'
                              ? 'Trong chế độ TEST MODE: Hoàn thành phần Nghe để khóa đáp án và tiếp tục sang phần Đọc.'
                              : 'Chuyển nhanh sang bài thi phần Đọc.'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleCompleteListening}
                        className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-950/10 flex items-center gap-2 transition cursor-pointer shrink-0"
                      >
                        <span>Nộp Phần Nghe & Sang Phần Đọc</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {currentModule === 'reading' && (
                  <div className="space-y-4">
                    <ReadingModule
                      passageTitle={examData.passage_title}
                      passageText={examData.passage_text}
                      questions={examData.reading_questions}
                      userAnswers={userAnswers}
                      onAnswerChange={handleAnswerChange}
                    />

                    {/* Section Progression Footer */}
                    <div className="bg-white border border-purple-100/80 rounded-3xl p-5 shadow-xl shadow-purple-950/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-3 bg-purple-100 text-[#503A7A] rounded-2xl">
                          <CheckCircle2 className="w-5 h-5 text-[#6B51A5]" />
                        </div>
                        <div>
                          <h4 className="text-sm font-extrabold text-[#3C2A63]">Nộp Bài Làm Phần Đọc (Reading)</h4>
                          <p className="text-xs text-[#7C68A5] font-medium">
                            {testMode === 'TEST'
                              ? 'Trong chế độ TEST MODE: Hoàn thành phần Đọc để khóa đáp án và tiếp tục sang phần Viết.'
                              : 'Chuyển nhanh sang bài thi phần Viết.'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleCompleteReading}
                        className="px-6 py-3 bg-[#6B51A5] hover:bg-[#583F8F] text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-purple-900/15 flex items-center gap-2 transition cursor-pointer shrink-0"
                      >
                        <span>Nộp Phần Đọc & Sang Phần Viết</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {currentModule === 'writing' && (
                  <div className="space-y-4">
                    <WritingModule
                      task1Prompt={examData.writing_task1_prompt}
                      task2Prompt={examData.writing_task2_prompt}
                      task1Text={writingTask1}
                      task2Text={writingTask2}
                      onTask1Change={setWritingTask1}
                      onTask2Change={setWritingTask2}
                      submissionId={submissionId}
                    />

                    {/* Section Progression Footer */}
                    <div className="bg-white border border-purple-100/80 rounded-3xl p-5 shadow-xl shadow-purple-950/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-3 bg-emerald-100 text-emerald-800 rounded-2xl">
                          <Send className="w-5 h-5 text-emerald-700" />
                        </div>
                        <div>
                          <h4 className="text-sm font-extrabold text-[#3C2A63]">Nộp Bài Thi Tất Cả Kỹ Năng</h4>
                          <p className="text-xs text-[#7C68A5] font-medium">
                            Nộp toàn bộ bài thi để tính điểm tự động và hoàn tất phiên khảo thí.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleSubmitExam}
                        disabled={isSubmitting}
                        className="px-8 py-3.5 bg-[#6B51A5] hover:bg-[#583F8F] text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-purple-900/15 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer shrink-0"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Đang Nộp Bài...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>NỘP TOÀN BỘ BÀI THI (SUBMIT)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {currentModule === 'results' && submitResult && (
                  <ResultPage
                    result={submitResult}
                    testMode={testMode}
                    onReturnHome={() => {
                      setIsLoggedIn(false);
                      setUserAnswers({});
                      setWritingTask1('');
                      setWritingTask2('');
                      setSubmitResult(null);
                      setCurrentModule('listening');
                      setCompletedSkills({ listening: false, reading: false, writing: false });
                      setSkillNotice(null);
                    }}
                    onRestartPractice={() => {
                      setIsLoggedIn(false);
                      setUserAnswers({});
                      setWritingTask1('');
                      setWritingTask2('');
                      setSubmitResult(null);
                      setCurrentModule('listening');
                      setCompletedSkills({ listening: false, reading: false, writing: false });
                      setSkillNotice(null);
                    }}
                  />
                )}

              </div>
            )}
          </div>
        )}

        {/* ADMIN VIEW */}
        {activeView === 'admin' && (
          <div className="space-y-6">
            
            {/* GAS Endpoint URL Config Bar */}
            <div className="bg-white/90 border border-purple-100/80 rounded-3xl p-5 shadow-xl shadow-purple-950/5 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-3 w-full md:w-auto">
                <div className="p-3 bg-[#E2DDEC] text-[#3C2A63] rounded-2xl">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#3C2A63]">Google Apps Script (GAS) Web App Endpoint</h3>
                  <p className="text-xs text-[#7C68A5]">Kết nối Google Sheets backend thực tế</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 w-full md:w-auto">
                <input
                  type="text"
                  value={gasUrl}
                  onChange={(e) => handleSaveGasUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="px-4 py-2.5 bg-[#E2DDEC] border border-purple-200/80 rounded-2xl text-xs text-[#3C2A63] font-medium w-full md:w-96 focus:outline-none focus:ring-2 focus:ring-[#6B51A5]"
                />
                <span className="text-xs px-3 py-1.5 bg-emerald-100 text-emerald-800 font-extrabold border border-emerald-200 rounded-xl shrink-0">
                  Active
                </span>
              </div>
            </div>

            {/* Admin Tab Content */}
            {adminTab === 'dashboard' && <MonitoringDashboard gasUrl={gasUrl} />}
            {adminTab === 'grading' && <ManualGrading gasUrl={gasUrl} />}
            {adminTab === 'upload' && <UploadModule onParsedData={(parsed) => setExamData(parsed)} />}
            
            {adminTab === 'preview' && (
              <PreviewModule 
                gasUrl={gasUrl} 
                initialExamData={examData} 
                onSaveToGas={(savedExam) => setExamData(savedExam)} 
              />
            )}

            {adminTab === 'gas_setup' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-4 gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Code className="w-5 h-5 text-indigo-400" />
                      Mã Nguồn Google Apps Script (Backend REST API)
                    </h2>
                    <p className="text-xs text-slate-400">
                      Hướng dẫn thiết lập Google Sheets 4 tabs: EXAMS, QUESTIONS, SUBMISSIONS, CHEATLOGS
                    </p>
                  </div>

                  <button
                    onClick={copyGasCode}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer"
                  >
                    {copiedGasCode ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Đã Sao Chép Code!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Sao Chép Mã GAS (Code.gs)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Setup Steps */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                  <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center border border-indigo-500/40">1</span>
                    <h4 className="font-bold text-white">Tạo Google Sheets</h4>
                    <p className="text-slate-400 leading-relaxed">
                      Tạo file tên <strong>IELTS_Exam_System</strong>. Đổi tên 4 sheet bên dưới thành: <strong className="text-indigo-300">EXAMS, QUESTIONS, SUBMISSIONS, CHEATLOGS</strong>.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center border border-indigo-500/40">2</span>
                    <h4 className="font-bold text-white">Mở Apps Script</h4>
                    <p className="text-slate-400 leading-relaxed">
                      Trên Google Sheets, chọn <strong>Extensions (Tiện ích mở rộng)</strong> &rarr; <strong>Apps Script</strong>.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center border border-indigo-500/40">3</span>
                    <h4 className="font-bold text-white">Dán Mã Backend</h4>
                    <p className="text-slate-400 leading-relaxed">
                      Xóa code mặc định, dán toàn bộ đoạn mã bên dưới vào file <strong className="text-indigo-300">Code.gs</strong>.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center border border-indigo-500/40">4</span>
                    <h4 className="font-bold text-white">Deploy Web App</h4>
                    <p className="text-slate-400 leading-relaxed">
                      Bấm <strong>Deploy &rarr; New Deployment &rarr; Web App</strong>. Set Execute as: <strong>Me</strong>, Who has access: <strong>Anyone</strong>. Copy Web App URL dán vào hệ thống.
                    </p>
                  </div>
                </div>

                {/* Google Sheet Schema Guide */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-4 text-xs">
                  <h4 className="text-sm font-bold text-amber-400">📋 Cấu Trúc Các Cột Trong Google Sheets (Bắt Buộc):</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <span className="font-bold text-indigo-300">1. Tab "EXAMS" (Danh mục đề thi):</span>
                      <p className="text-[11px] text-slate-400 font-mono mt-1">
                        Cột A: exam_code | Cột B: title | Cột C: duration | Cột D: mode (TEST / PRACTICE) | Cột E: audio_url | Cột F: passage_title | Cột G: passage_text | Cột H: writing_task1_prompt | Cột I: writing_task2_prompt
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-emerald-300">2. Tab "QUESTIONS" (Câu hỏi chi tiết của từng đề):</span>
                      <p className="text-[11px] text-slate-400 font-mono mt-1">
                        Cột A: exam_code | Cột B: question_id | Cột C: section (listening / reading) | Cột D: question_text | Cột E: question_type (multiple_choice / fill_in_blank / true_false_not_given) | Cột F: options (A. ...|B. ...|C. ...|D. ...) | Cột G: correct_answer | Cột H: max_score (1) | Cột I: passage_title | Cột J: passage_text | Cột K: audio_url
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-purple-300">3. Tab "SUBMISSIONS" & Tab "CHEATLOGS":</span>
                      <p className="text-[11px] text-slate-400">
                        Hệ thống sẽ tự động ghi điểm, bài viết Writing và lịch sử cảnh báo gian lận vào 2 sheet này khi thí sinh nộp bài.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Code Block */}
                <div className="relative">
                  <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-indigo-200 font-mono overflow-x-auto max-h-96 leading-relaxed select-all">
                    {gasBackendScript}
                  </pre>
                </div>
              </div>
            )}

          </div>
        )}

      </main>

    </div>
  );
}

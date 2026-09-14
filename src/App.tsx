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
import { PracticeDashboard } from './components/Student/Practice/PracticeDashboard';
import { CustomPracticeManager } from './components/Admin/CustomPracticeManager';
import { practiceService } from './services/practiceService';
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
  ArrowRight,
  Activity,
  Hourglass,
  AlertTriangle
} from 'lucide-react';

import { DEFAULT_API_URL, fetchExam, prefetchExam, submitExamPayload } from './services/api';
import { gradeExamAnswers } from './services/answerScoring';
import { getCurrentAnswersFromIndexedDB, getWritingDraftFromIndexedDB } from './services/indexedDb';
import { DEFAULT_EXAMS } from './data/defaultExams';
import { DatabaseDiagnosticsModal } from './components/Common/DatabaseDiagnosticsModal';
import { extractQuestionsFromRawResponse } from './services/dbDiagnostics';

// Default GAS URL or loaded from LocalStorage
const DEFAULT_GAS_URL = DEFAULT_API_URL;

// Sample fallback exam data if GAS endpoint is not connected yet (uses full standard IELTS exam)
const defaultTemplate = DEFAULT_EXAMS[0];
const SAMPLE_EXAM: ExamData = {
  exam_code: 'IELTS01',
  title: defaultTemplate.title,
  audio_url: defaultTemplate.audio_url,
  listening_questions: defaultTemplate.questions.filter(q => q.section === 'listening'),
  passage_title: defaultTemplate.passages?.[0]?.title || 'Reading Passage',
  passage_text: defaultTemplate.passages?.[0]?.text || '',
  passages: defaultTemplate.passages,
  reading_questions: defaultTemplate.questions.filter(q => q.section === 'reading'),
  writing_task1_prompt: defaultTemplate.writing_task1_prompt,
  writing_task1_image: defaultTemplate.writing_task1_image,
  writing_task2_prompt: defaultTemplate.writing_task2_prompt
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
    const checkAdminQueryOrHash = () => {
      const params = new URLSearchParams(window.location.search);
      if (
        params.get('view') === 'admin' ||
        window.location.pathname.includes('admin') ||
        window.location.hash === '#admin'
      ) {
        setActiveView('admin');
      }
    };
    checkAdminQueryOrHash();
    window.addEventListener('hashchange', checkAdminQueryOrHash);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setActiveView(prev => (prev === 'admin' ? 'student' : 'admin'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('hashchange', checkAdminQueryOrHash);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  // GAS Web App URL
  const [gasUrl, setGasUrl] = useState<string>(() => {
    return localStorage.getItem('ielts_gas_url') || DEFAULT_GAS_URL;
  });

  // Diagnostics Modal State
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);

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
        setSkillNotice('🔒 In TEST MODE: You must complete and submit the Listening section to unlock Reading!');
        setTimeout(() => setSkillNotice(null), 4000);
        return;
      }
      setCurrentModule('reading');
      setSkillNotice(null);
    } else if (targetModule === 'writing') {
      if (!completedSkills.listening) {
        setSkillNotice('🔒 In TEST MODE: You must submit each section in sequence (Listening → Reading → Writing)!');
        setTimeout(() => setSkillNotice(null), 4000);
        return;
      }
      if (!completedSkills.reading) {
        setSkillNotice('🔒 In TEST MODE: You must complete and submit the Reading section to unlock Writing!');
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
    setSkillNotice('✅ Listening section submitted! Proceeding to Reading.');
    setTimeout(() => setSkillNotice(null), 5000);
  };

  const handleCompleteReading = () => {
    setCompletedSkills(prev => ({ ...prev, reading: true }));
    setCurrentModule('writing');
    setSkillNotice('✅ Reading section submitted! Proceeding to Writing.');
    setTimeout(() => setSkillNotice(null), 5000);
  };

  // Exam Data State
  const [examData, setExamData] = useState<ExamData>(SAMPLE_EXAM);
  
  const handleSetExamData = (data: ExamData) => {
    const sanitizeQs = (qs: any[], prefix: string) => {
      const seen = new Set<string>();
      return qs.map((q, idx) => {
        let qid = q.question_id || `${prefix}${idx + 1}`;
        if (seen.has(qid)) {
          qid = `${qid}_dup_${idx}`;
        }
        seen.add(qid);
        return { ...q, question_id: qid };
      });
    };
    
    setExamData({
      ...data,
      listening_questions: sanitizeQs(data.listening_questions || [], 'l'),
      reading_questions: sanitizeQs(data.reading_questions || [], 'r'),
    });
  };

  const [isLoadingExam, setIsLoadingExam] = useState(false);
  const [loginErrorMessage, setLoginErrorMessage] = useState<string | null>(null);

  // User Responses State
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [writingTask1, setWritingTask1] = useState('');
  const [writingTask2, setWritingTask2] = useState('');
  const [violationCount, setViolationCount] = useState(0);

  // Submission & Retry State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForcedSubmitting, setIsForcedSubmitting] = useState(false);
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

  // Custom Practice Deck Session State
  const [isCustomPracticeSession, setIsCustomPracticeSession] = useState(false);
  const [customPracticeDeckId, setCustomPracticeDeckId] = useState('ON_TAP_01');

  // Helper to format any raw exam structure into ExamData
  const formatRawExamToExamData = (examObj: any, cleanCode: string): ExamData => {
    const allQs: Question[] = Array.isArray(examObj.questions) ? examObj.questions : [];
    
    const isListening = (q: any) => {
      const s = String(q.section || '').toLowerCase().trim();
      const id = String(q.question_id || '').toLowerCase().trim();
      return s.includes('listen') || s === 'l' || id.startsWith('l');
    };

    const isReading = (q: any) => {
      const s = String(q.section || '').toLowerCase().trim();
      const id = String(q.question_id || '').toLowerCase().trim();
      return s.includes('read') || s.includes('passage') || s === 'r' || id.startsWith('r');
    };

    let lQs = allQs.filter(isListening);
    let rQs = allQs.filter(isReading);

    // If section wasn't labeled in Sheet, intelligently divide or assign questions
    if (lQs.length === 0 && rQs.length === 0 && allQs.length > 0) {
      if (examObj.reading_passage || examObj.passage_text || examObj.passages || examObj.reading_passages) {
        rQs = allQs;
      } else if (examObj.audio_url) {
        lQs = allQs;
      } else {
        rQs = allQs;
      }
    }

    // Default template fallback for passages and audio
    const fallbackTemplate = DEFAULT_EXAMS[0];

    // Parse passages array if available or from reading_passage JSON string
    let parsedPassages = examObj.passages || examObj.reading_passages || fallbackTemplate.passages;
    if (!parsedPassages && examObj.reading_passage) {
      try {
        const testJson = JSON.parse(examObj.reading_passage);
        if (Array.isArray(testJson)) {
          parsedPassages = testJson;
        }
      } catch (e) {
        // Not JSON string, use normal text
      }
    }

    return {
      exam_code: examObj.exam_code || cleanCode,
      title: examObj.title || `IELTS Examination ${cleanCode}`,
      audio_url: examObj.audio_url || fallbackTemplate.audio_url,
      listening_questions: lQs.length > 0 ? lQs : (examObj.listening_questions?.length ? examObj.listening_questions : fallbackTemplate.questions.filter(q => q.section === 'listening')),
      passage_title: examObj.passage_title || (parsedPassages?.[0]?.title) || examObj.reading_passage_title || fallbackTemplate.passages?.[0]?.title || 'Reading Passage',
      passage_text: examObj.passage_text || (parsedPassages?.[0]?.text) || examObj.reading_passage || fallbackTemplate.passages?.[0]?.text || '',
      passages: parsedPassages,
      reading_questions: rQs.length > 0 ? rQs : (examObj.reading_questions?.length ? examObj.reading_questions : fallbackTemplate.questions.filter(q => q.section === 'reading')),
      writing_task1_prompt: examObj.writing_task1_prompt || fallbackTemplate.writing_task1_prompt,
      writing_task1_image: examObj.writing_task1_image || fallbackTemplate.writing_task1_image,
      writing_task2_prompt: examObj.writing_task2_prompt || fallbackTemplate.writing_task2_prompt
    };
  };

  // Prefetch default exams on mount for 0-second instant transition
  useEffect(() => {
    prefetchExam(gasUrl, 'IELTS01').catch(() => {});
    prefetchExam(gasUrl, 'TEST01').catch(() => {});
  }, [gasUrl]);

  // Background exam updates from Google Sheets without disrupting active test taking
  useEffect(() => {
    const handleRevalidated = (e: any) => {
      const freshExam = e.detail as ExamData;
      if (!freshExam || !freshExam.exam_code) return;
      if (isLoggedIn && examCode.toUpperCase() === freshExam.exam_code.toUpperCase()) {
        const answersCount = Object.keys(userAnswers).filter(k => userAnswers[k]?.trim()).length;
        if (answersCount === 0 && !writingTask1.trim() && !writingTask2.trim()) {
          handleSetExamData(freshExam);
          setSkillNotice(`⚡ Synchronized latest questions for [${freshExam.exam_code}] from Google Sheets.`);
          setTimeout(() => setSkillNotice(null), 5000);
        }
      }
    };

    window.addEventListener('ielts:exam-revalidated', handleRevalidated);
    return () => {
      window.removeEventListener('ielts:exam-revalidated', handleRevalidated);
    };
  }, [isLoggedIn, examCode, userAnswers, writingTask1, writingTask2]);

  // Handle Login & Load Exam with Ultra-Fast Instant Entry
  const handleLogin = async (
    sbdInput: string, 
    codeInput: string, 
    modeOrReview?: 'TEST' | 'PRACTICE' | boolean, 
    reviewPreviousParam?: boolean
  ) => {
    let chosenMode: 'TEST' | 'PRACTICE' | undefined;
    let reviewPrevious = false;
    if (typeof modeOrReview === 'string') {
      chosenMode = modeOrReview;
      reviewPrevious = !!reviewPreviousParam;
    } else if (typeof modeOrReview === 'boolean') {
      reviewPrevious = modeOrReview;
    }

    const cleanSbd = sbdInput.trim();
    const cleanCode = codeInput.trim().toUpperCase();
    setSbd(cleanSbd);
    setExamCode(cleanCode);
    setUserAnswers({});
    setWritingTask1('');
    setWritingTask2('');
    setCompletedSkills({ listening: false, reading: false, writing: false });
    setSkillNotice(null);

    // Check if entered code corresponds to a Custom Practice Deck
    const upperCode = cleanCode;
    const allPracticeDecks = practiceService.getAllDecks();
    const isPracticeDeck = allPracticeDecks.some(d => d.deck_id.toUpperCase() === upperCode) ||
      upperCode.startsWith('ON_TAP') ||
      upperCode.startsWith('VOCAB') ||
      upperCode.startsWith('GRAMMAR') ||
      upperCode.startsWith('COMMUNICATION') ||
      upperCode.startsWith('DECK_') ||
      upperCode.startsWith('PRAC_SET');

    if (isPracticeDeck) {
      if (cleanSbd) {
        const upperSbd = cleanSbd.toUpperCase();
        if (upperSbd === 'HV01' || upperSbd === 'HV02' || upperSbd === 'HV03') {
          practiceService.setCurrentLearner(upperSbd);
        } else {
          // If the learner entered their real name
          const cur = practiceService.getCurrentLearner();
          practiceService.updateLearnerName(cur.student_id, cleanSbd);
        }
      }
      setIsCustomPracticeSession(true);
      setCustomPracticeDeckId(cleanCode);
      setIsLoggedIn(true);
      setIsLoadingExam(false);
      return;
    }

    setIsCustomPracticeSession(false);

    const mode = chosenMode || determineTestMode(cleanCode);
    setTestMode(mode);

    const subId = `${cleanSbd}_${cleanCode}_${Date.now()}`;
    setSubmissionId(subId);

    setIsLoadingExam(true);
    setLoginErrorMessage(null);

    let finalExamData: ExamData | null = null;
    let fetchErrorMessage = '';

    try {
      const fetchResult = await fetchExam(gasUrl, cleanCode);
      if (fetchResult.success && fetchResult.exam) {
        finalExamData = fetchResult.exam;
        const totalCount = (finalExamData.listening_questions?.length || 0) + (finalExamData.reading_questions?.length || 0);
        if (fetchResult.source === 'gas') {
          setSkillNotice(`✅ Successfully loaded test [${cleanCode}] from Google Sheets (${totalCount} questions).`);
        } else if (fetchResult.source === 'local' || fetchResult.source === 'idb' || fetchResult.source === 'memory') {
          setSkillNotice(`⚡ Entered exam room immediately [${cleanCode}] (${totalCount} questions).`);
        } else {
          setSkillNotice(`ℹ️ Loaded standard test package [${cleanCode}] (${totalCount} questions).`);
        }
        setTimeout(() => setSkillNotice(null), 5000);
      } else if (fetchResult.error) {
        fetchErrorMessage = fetchResult.error;
      }
    } catch (err: any) {
      console.warn('Could not fetch exam from API:', err);
      fetchErrorMessage = err?.message || 'Error loading exam from server.';
    }

    if (!finalExamData) {
      setIsLoadingExam(false);
      const notFoundMsg = fetchErrorMessage || `Exam not found: No test paper found for code [${cleanCode}]. Please check your test code or contact your exam invigilator.`;
      setLoginErrorMessage(notFoundMsg);
      setSkillNotice(`⚠️ ${notFoundMsg}`);
      setTimeout(() => setSkillNotice(null), 7000);
      return;
    }

    setLoginErrorMessage(null);
    handleSetExamData(finalExamData);
    setIsLoadingExam(false);
    setIsLoggedIn(true);

    // Check if reviewing previous submission in Practice Mode
    if (mode === 'PRACTICE' && reviewPrevious) {
      const existingSubs = localStorage.getItem('ielts_student_submissions');
      if (existingSubs) {
        try {
          const subsArr: SubmissionResponse[] = JSON.parse(existingSubs);
          const found = subsArr.find(s => String(s?.sbd ?? '') === cleanSbd && String(s?.exam_code ?? '').toUpperCase() === cleanCode.toUpperCase());
          if (found) {
            setSubmitResult(found);
            setCurrentModule('results');
            return;
          }
        } catch (e) {}
      }
    }

    // Intelligently route to Listening or Reading depending on available questions
    if (finalExamData.listening_questions && finalExamData.listening_questions.length > 0) {
      setCurrentModule('listening');
    } else if (finalExamData.reading_questions && finalExamData.reading_questions.length > 0) {
      setCurrentModule('reading');
      setCompletedSkills({ listening: true, reading: false, writing: false });
    } else {
      setCurrentModule('reading');
    }
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  // Submit Exam & Batching Payload (handles both STANDARD candidate click and TIMEOUT_FORCED)
  const handleSubmitExam = async (submissionType: 'STANDARD' | 'TIMEOUT_FORCED' = 'STANDARD') => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    if (submissionType === 'TIMEOUT_FORCED') {
      setIsForcedSubmitting(true);
    }

    // Step 1: Pull the latest answers from local state and IndexedDB to guarantee nothing is missed
    let latestAnswers = { ...userAnswers };
    try {
      const idbAnswers = await getCurrentAnswersFromIndexedDB(examCode, sbd);
      if (idbAnswers && Object.keys(idbAnswers).length > 0) {
        latestAnswers = { ...idbAnswers, ...latestAnswers };
      }
    } catch (e) {
      console.warn('Could not read latest answers from IndexedDB during submission:', e);
    }

    // Pull latest writing draft from IndexedDB
    let currentTask1 = writingTask1;
    let currentTask2 = writingTask2;
    try {
      const writingDraft = await getWritingDraftFromIndexedDB(examCode, sbd);
      if (writingDraft) {
        if (!currentTask1 && writingDraft.task1) currentTask1 = writingDraft.task1;
        if (!currentTask2 && writingDraft.task2) currentTask2 = writingDraft.task2;
      }
    } catch (e) {
      console.warn('Could not read latest writing draft during submission:', e);
    }

    // Retrieve cheat logs from LocalStorage
    const rawCheatLogs = localStorage.getItem('ielts_cheat_logs');
    const cheatLogs: CheatLog[] = rawCheatLogs ? JSON.parse(rawCheatLogs) : [];
    const currentLogs = cheatLogs.filter(log => String(log?.sbd ?? '') === String(sbd ?? '') && String(log?.exam_code ?? '').toUpperCase() === String(examCode ?? '').toUpperCase());

    const payload: SubmissionPayload = {
      submission_id: submissionId,
      sbd,
      exam_code: examCode,
      test_mode: testMode,
      submission_type: submissionType,
      answers: latestAnswers,
      listening_answers: latestAnswers,
      reading_answers: latestAnswers,
      writing_task1: currentTask1,
      writing_task2: currentTask2,
      writing_task1_text: currentTask1,
      writing_task2_text: currentTask2,
      cheat_logs: currentLogs,
      violation_logs: currentLogs,
      submitted_at: new Date().toISOString()
    };

    // Use submitExamPayload with lock retry, local IndexedDB backup, normalized scoring and band conversion
    const serverResponse = await submitExamPayload(gasUrl, payload, examData);

    // Save submission locally
    const subsRaw = localStorage.getItem('ielts_student_submissions');
    const subsArr: SubmissionResponse[] = subsRaw ? JSON.parse(subsRaw) : [];
    if (!subsArr.some(s => s.submission_id === serverResponse.submission_id)) {
      subsArr.unshift(serverResponse);
    }
    const seen = new Set<string>();
    const cleanSubs = subsArr.filter(s => {
      const id = String(s?.submission_id ?? '').trim();
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    localStorage.setItem('ielts_student_submissions', JSON.stringify(cleanSubs));

    setSubmitResult(serverResponse);
    setIsSubmitting(false);
    setIsForcedSubmitting(false);
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
 * Compatible with Google Sheets containing tabs: EXAMS, QUESTIONS, SUBMISSIONS, CHEATLOGS, STUDENT_PROGRESS, PRACTICE_QUESTIONS
 */

function doGet(e) {
  var params = e ? e.parameter : {};
  var action = (params.action || 'get_exam').toLowerCase();
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. ACTION: GET EXAM (get_exam / getexam)
  if (action === 'get_exam' || action === 'getexam') {
    var rawCode = params.exam_code || 'IELTS01';
    var examCode = rawCode.toString().trim().toUpperCase();

    // Read general exam information from EXAMS sheet (if present)
    var title = 'IELTS Exam ' + rawCode;
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
          if (er[4]) audioUrl = er[4].toString().trim(); // Audio URL column if present
          if (er[5]) passageTitle = er[5].toString().trim();
          if (er[6]) passageText = er[6].toString().trim();
          if (er[7]) writingTask1 = er[7].toString().trim();
          if (er[8]) writingTask2 = er[8].toString().trim();
          break;
        }
      }
    }

    // Read question list from QUESTIONS sheet
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
            section: rawSection, // listening or reading
            question_text: (row[3] || '').toString().trim(),
            question_type: (row[4] || 'multiple_choice').toString().trim().toLowerCase(),
            options: row[5] ? row[5].toString().split('|').map(function(s){ return s.trim(); }) : [],
            max_score: Number(row[7]) || 1
            // Note: Column 6 (CORRECT_ANSWERS) is kept confidential on server, not sent to client
          };
          questions.push(qObj);

          // Update passage/meta if defined in QUESTIONS row
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

  // 2. ACTION: GET SUBMISSIONS FOR INSTRUCTOR (getSubmissions / get_submissions)
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

  // 3. ACTION: GET CHEAT / INTEGRITY LOGS (getCheatLogs / get_cheat_logs)
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

  // 4. ACTION: GET 3 LEARNERS PROGRESS (get_student_progress)
  if (action === 'get_student_progress') {
    var pSheet = ss.getSheetByName('STUDENT_PROGRESS');
    var progress = [];
    if (pSheet && pSheet.getLastRow() > 1) {
      var pData = pSheet.getDataRange().getValues();
      for (var p = 1; p < pData.length; p++) {
        var pr = pData[p];
        progress.push({
          student_id: pr[0],
          student_name: pr[1],
          deck_id: pr[2],
          deck_title: pr[3],
          cards_mastered: Number(pr[4]) || 0,
          total_cards: Number(pr[5]) || 0,
          mastery_pct: Number(pr[6]) || 0,
          correct_count: Number(pr[7]) || 0,
          wrong_count: Number(pr[8]) || 0,
          daily_streak: Number(pr[9]) || 0,
          last_studied_at: pr[10] || '',
          notes: pr[11] || ''
        });
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: progress }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 5. ACTION: GET PRACTICE QUESTIONS FROM SHEET (get_practice_questions)
  if (action === 'get_practice_questions') {
    var pqSheet = ss.getSheetByName('PRACTICE_QUESTIONS');
    var pCards = [];
    if (pqSheet && pqSheet.getLastRow() > 1) {
      var pqData = pqSheet.getDataRange().getValues();
      for (var q = 1; q < pqData.length; q++) {
        var qr = pqData[q];
        pCards.push({
          id: qr[0] || ('pq_' + q),
          deck_id: qr[1] || 'PRACTICE_01',
          sentence_en: qr[2] || '',
          sentence_vi: qr[3] || '',
          cloze_target: qr[4] || '',
          target_word: qr[5] || qr[4] || '',
          part_of_speech: qr[6] || '',
          phonetic: qr[7] || '',
          hints: qr[8] || '',
          accepted_answers: qr[9] ? qr[9].toString().split('|').map(function(s){ return s.trim(); }) : [qr[4]],
          explanation: qr[10] || '',
          options: qr[11] ? qr[11].toString().split('|').map(function(s){ return s.trim(); }) : [],
          difficulty: qr[12] || 'medium'
        });
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: pCards }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', message: 'IELTS GAS API Ready' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  var hasLock = false;
  try {
    // Acquire sequential write lock (wait up to 30s for concurrent submissions)
    hasLock = lock.tryLock(30000);
    if (!hasLock) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'ERROR',
        message: 'Google Sheets concurrent write lock is busy. Server is processing another submission, retry queued...'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var contents = JSON.parse(e.postData.contents);
    var action = (contents.action || 'submitExam').toLowerCase();
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 0. ACTION: SYNC LEARNER PROGRESS (sync_student_progress)
    if (action === 'sync_student_progress') {
      var studentSheet = ss.getSheetByName('STUDENT_PROGRESS') || ss.insertSheet('STUDENT_PROGRESS');
      if (studentSheet.getLastRow() === 0) {
        studentSheet.appendRow([
          'STUDENT_ID', 'STUDENT_NAME', 'DECK_ID', 'DECK_TITLE',
          'CARDS_MASTERED', 'TOTAL_CARDS', 'MASTERY_PCT', 'CORRECT_COUNT',
          'WRONG_COUNT', 'DAILY_STREAK', 'LAST_STUDIED_AT', 'RAW_PAYLOAD'
        ]);
      }

      var records = contents.records || [];
      for (var rIdx = 0; rIdx < records.length; rIdx++) {
        var rec = records[rIdx];
        studentSheet.appendRow([
          rec.student_id || contents.student_id || 'HV01',
          rec.student_name || contents.student_name || 'Learner',
          rec.deck_id || 'PRACTICE_01',
          rec.deck_title || 'Practice',
          rec.cards_mastered || 0,
          rec.total_cards || 0,
          rec.mastery_pct || 0,
          rec.correct_count || 0,
          rec.wrong_count || 0,
          rec.daily_streak || 1,
          rec.last_studied_at || new Date().toISOString(),
          contents.raw_stats_json || ''
        ]);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Student progress synchronized successfully' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 1. ACTION: GRADE WRITING (gradeWriting / grade_writing)
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

    // 2. ACTION: UPLOAD EXAM (upload_exam / uploadexam)
    if (action === 'upload_exam' || action === 'uploadexam') {
      var exam = contents.exam_data;
      if (!exam) {
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Missing exam_data payload' }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      var sheetE = ss.getSheetByName('EXAMS') || ss.insertSheet('EXAMS');
      var sheetQ = ss.getSheetByName('QUESTIONS') || ss.insertSheet('QUESTIONS');

      var uExamCode = (exam.exam_code || 'IELTS01').toString().trim().toUpperCase();
      var uTitle = exam.title || ('IELTS Exam ' + uExamCode);
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
        message: 'Exam ' + uExamCode + ' saved to Google Sheets successfully!',
        exam_code: uExamCode,
        total_questions: listeningQs.length + readingQs.length
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. ACTION: SUBMIT EXAM (submitExam / submit_exam)
    var subSheet = ss.getSheetByName('SUBMISSIONS');
    var cheatSheet = ss.getSheetByName('CHEATLOGS');

    var subId = contents.submission_id || (contents.sbd + '_' + contents.exam_code + '_' + new Date().getTime());
    var sbd = contents.sbd;
    var examCode = (contents.exam_code || '').toString().trim().toUpperCase();
    var answers = contents.answers || contents.listening_answers || contents.reading_answers || {};
    var submissionType = contents.submission_type || 'STANDARD';

    // Auto-grade Listening & Reading objective questions with Answer Normalization Engine
    function normalizeAns(str) {
      if (!str) return '';
      return str.toString()
        .toLowerCase()
        .replace(/^(a|an|the)\s+/, '')
        .replace(/[.,/#!$%^&*;:{}=\-_~()]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    }

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
          var rawCorrect = qRow[6] ? qRow[6].toString() : '';
          var userAns = answers[qId] ? normalizeAns(answers[qId]) : '';

          if (userAns && rawCorrect) {
            // Support pipe-separated answers: "1,400 kilometres|1400 kilometres|1400 km"
            var acceptedVariants = rawCorrect.split('|').map(function(item) {
              return normalizeAns(item);
            });
            if (acceptedVariants.indexOf(userAns) !== -1) {
              if (section === 'listening') listeningScore++;
              if (section === 'reading') readingScore++;
            }
          }
        }
      }
    }

    // Official IELTS Academic Raw-to-Band mapping
    function rawToReadingBand(raw) {
      if (raw >= 39) return 9.0;
      if (raw >= 37) return 8.5;
      if (raw >= 35) return 8.0;
      if (raw >= 33) return 7.5;
      if (raw >= 30) return 7.0;
      if (raw >= 27) return 6.5;
      if (raw >= 23) return 6.0;
      if (raw >= 19) return 5.5;
      if (raw >= 15) return 5.0;
      if (raw >= 13) return 4.5;
      if (raw >= 10) return 4.0;
      if (raw >= 8) return 3.5;
      if (raw >= 6) return 3.0;
      if (raw >= 4) return 2.5;
      return 2.0;
    }

    function rawToListeningBand(raw) {
      if (raw >= 39) return 9.0;
      if (raw >= 37) return 8.5;
      if (raw >= 35) return 8.0;
      if (raw >= 32) return 7.5;
      if (raw >= 30) return 7.0;
      if (raw >= 26) return 6.5;
      if (raw >= 23) return 6.0;
      if (raw >= 18) return 5.5;
      if (raw >= 16) return 5.0;
      if (raw >= 13) return 4.5;
      if (raw >= 10) return 4.0;
      if (raw >= 8) return 3.5;
      if (raw >= 6) return 3.0;
      if (raw >= 4) return 2.5;
      return 2.0;
    }

    var listeningBand = rawToListeningBand(listeningScore);
    var readingBand = rawToReadingBand(readingScore);

    // Record into SUBMISSIONS sheet (with submission_type & band scores)
    if (subSheet) {
      subSheet.appendRow([
        subId,
        sbd,
        contents.exam_code,
        listeningScore,
        readingScore,
        'PENDING_TEACHER', // Writing status
        contents.writing_task1 || contents.writing_task1_text || '',
        contents.writing_task2 || contents.writing_task2_text || '',
        '', '', '', '', '', '', // TR, CC, LR, GRA, Band, Feedback
        new Date().toISOString(),
        submissionType,
        listeningBand,
        readingBand
      ]);
    }

    // Record Integrity / Violation Logs
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
      submission_type: submissionType,
      listening_score: listeningScore,
      reading_score: readingScore,
      listening_band: listeningBand,
      reading_band: readingBand,
      writing_status: 'PENDING_TEACHER',
      created_at: new Date().toISOString()
    };

    return ContentService.createTextOutput(JSON.stringify(responseObj))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    if (hasLock) {
      try {
        lock.releaseLock();
      } catch (lockErr) {}
    }
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
        onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
      />

      {/* Offline Pending Submission Alert */}
      {offlinePending && (
        <div className="bg-amber-100 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <WifiOff className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
            <span>
              <strong>Offline-Retry Mode:</strong> Unstable network detected. The system has safely queued your submission and will automatically resubmit once reconnected!
            </span>
          </div>
          <button
            onClick={triggerOfflineRetry}
            className="px-2.5 py-1 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            Retry Now
          </button>
        </div>
      )}

      {/* Forced Auto-Submission Blocking Modal Overlay */}
      {isForcedSubmitting && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-purple-200 text-center space-y-5 animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-rose-100 rounded-3xl flex items-center justify-center mx-auto text-rose-600 shadow-inner">
              <Hourglass className="w-8 h-8 animate-spin" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-[#3C2A63]">
                Time is up!
              </h3>
              <p className="text-sm font-semibold text-rose-600">
                Your exam is being submitted automatically...
              </p>
              <p className="text-xs text-[#7C68A5]">
                All answers, passages, and writing drafts are being locked, scored, and securely synchronized to the official exam record. Please do not close your browser.
              </p>
            </div>
            <div className="flex items-center justify-center space-x-2 text-xs font-bold text-[#503A7A] bg-[#F5F2F9] py-2.5 px-4 rounded-2xl border border-purple-100">
              <RefreshCw className="w-4 h-4 animate-spin text-[#6B51A5]" />
              <span>Locking session &amp; computing official scores...</span>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        
        {/* STUDENT VIEW */}
        {activeView === 'student' && (
          <div>
            {!isLoggedIn ? (
              <>
                <LoginInstructions 
                  onLogin={handleLogin} 
                  onSwitchToAdmin={() => setActiveView('admin')}
                  onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
                  isLoadingExam={isLoadingExam}
                  gasUrl={gasUrl}
                  loginError={loginErrorMessage}
                  onClearLoginError={() => setLoginErrorMessage(null)}
                />

                {/* Instant Entry Progress Modal (if downloading fresh exam on cache miss) */}
                {isLoadingExam && (
                  <div className="fixed inset-0 bg-[#1E1035]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white border border-purple-100 rounded-3xl p-6 shadow-2xl max-w-sm w-full text-center space-y-4">
                      <div className="w-14 h-14 bg-purple-100 text-[#6B51A5] rounded-2xl flex items-center justify-center mx-auto">
                        <RefreshCw className="w-7 h-7 animate-spin text-[#6B51A5]" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-[#3C2A63]">Preparing Exam Room</h3>
                        <p className="text-xs text-[#7C68A5] mt-1">Configuring exam package [{examCode}] and loading test session...</p>
                      </div>
                      <div className="w-full bg-purple-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-[#6B51A5] h-full rounded-full w-4/5 animate-pulse" />
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : isCustomPracticeSession ? (
              <PracticeDashboard
                initialDeckId={customPracticeDeckId}
                candidateSbd={sbd}
                onExitToLogin={() => {
                  setIsLoggedIn(false);
                  setIsCustomPracticeSession(false);
                }}
                gasUrl={gasUrl}
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
                        <span>1. Listening ({examData.listening_questions.length} Qs)</span>
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
                        <span>2. Reading ({examData.reading_questions.length} Qs)</span>
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
                        <span>3. Writing (Task 1 &amp; Task 2)</span>
                      </button>

                    </div>

                    {/* SUBMIT BUTTON */}
                    <button
                      onClick={() => handleSubmitExam('STANDARD')}
                      disabled={isSubmitting}
                      className="px-6 py-3 bg-[#6B51A5] hover:bg-[#583F8F] text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-purple-900/15 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Submitting Exam...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>SUBMIT EXAM</span>
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
                      questions={examData.listening_questions || []}
                      userAnswers={userAnswers}
                      onAnswerChange={handleAnswerChange}
                      testMode={testMode}
                      durationMins={examData.listening_duration_mins || 30}
                      examCode={examCode}
                      candidateId={sbd}
                      onTimeExpire={() => handleSubmitExam('TIMEOUT_FORCED')}
                    />

                    {/* Section Progression Footer */}
                    <div className="bg-white border border-purple-100/80 rounded-3xl p-5 shadow-xl shadow-purple-950/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-3 bg-emerald-100 text-emerald-800 rounded-2xl">
                          <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                        </div>
                        <div>
                          <h4 className="text-sm font-extrabold text-[#3C2A63]">Submit Listening Answers</h4>
                          <p className="text-xs text-[#7C68A5] font-medium">
                            {testMode === 'TEST'
                              ? 'In TEST MODE: Submitting Listening locks your answers and unlocks the Reading section.'
                              : 'Proceed directly to Reading practice.'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleCompleteListening}
                        className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-950/10 flex items-center gap-2 transition cursor-pointer shrink-0"
                      >
                        <span>Submit Listening &amp; Proceed to Reading</span>
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
                      passages={examData.passages}
                      questions={examData.reading_questions}
                      userAnswers={userAnswers}
                      onAnswerChange={handleAnswerChange}
                      testMode={testMode}
                      durationMins={examData.reading_duration_mins || 60}
                      onTimeExpire={() => handleSubmitExam('TIMEOUT_FORCED')}
                    />

                    {/* Section Progression Footer */}
                    <div className="bg-white border border-purple-100/80 rounded-3xl p-5 shadow-xl shadow-purple-950/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-3 bg-purple-100 text-[#503A7A] rounded-2xl">
                          <CheckCircle2 className="w-5 h-5 text-[#6B51A5]" />
                        </div>
                        <div>
                          <h4 className="text-sm font-extrabold text-[#3C2A63]">Submit Reading Answers</h4>
                          <p className="text-xs text-[#7C68A5] font-medium">
                            {testMode === 'TEST'
                              ? 'In TEST MODE: Submitting Reading locks your answers and unlocks the Writing section.'
                              : 'Proceed directly to Writing practice.'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleCompleteReading}
                        className="px-6 py-3 bg-[#6B51A5] hover:bg-[#583F8F] text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-purple-900/15 flex items-center gap-2 transition cursor-pointer shrink-0"
                      >
                        <span>Submit Reading &amp; Proceed to Writing</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {currentModule === 'writing' && (
                  <div className="space-y-4">
                    <WritingModule
                      task1Prompt={examData.writing_task1_prompt}
                      task1Image={examData.writing_task1_image}
                      task2Prompt={examData.writing_task2_prompt}
                      task1Text={writingTask1}
                      task2Text={writingTask2}
                      onTask1Change={setWritingTask1}
                      onTask2Change={setWritingTask2}
                      submissionId={submissionId}
                      examCode={examCode}
                      candidateId={sbd}
                      testMode={testMode}
                      durationMins={examData.writing_duration_mins || 60}
                      onTimeExpire={() => handleSubmitExam('TIMEOUT_FORCED')}
                    />

                    {/* Section Progression Footer */}
                    <div className="bg-white border border-purple-100/80 rounded-3xl p-5 shadow-xl shadow-purple-950/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-3 bg-emerald-100 text-emerald-800 rounded-2xl">
                          <Send className="w-5 h-5 text-emerald-700" />
                        </div>
                        <div>
                          <h4 className="text-sm font-extrabold text-[#3C2A63]">Submit Entire Examination</h4>
                          <p className="text-xs text-[#7C68A5] font-medium">
                            Submit all answers across skills for automated score computation and official recording.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSubmitExam('STANDARD')}
                        disabled={isSubmitting}
                        className="px-8 py-3.5 bg-[#6B51A5] hover:bg-[#583F8F] text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-purple-900/15 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer shrink-0"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Submitting Exam...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>SUBMIT COMPLETE EXAM</span>
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
                  <p className="text-xs text-[#7C68A5]">Live Google Sheets backend endpoint integration</p>
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
            {adminTab === 'upload' && <UploadModule onParsedData={(parsed) => handleSetExamData(parsed)} />}
            {adminTab === 'custom_practice' && <CustomPracticeManager gasUrl={gasUrl} />}
            
            {adminTab === 'preview' && (
              <PreviewModule 
                gasUrl={gasUrl} 
                initialExamData={examData} 
                onSaveToGas={(savedExam) => handleSetExamData(savedExam)} 
              />
            )}

            {adminTab === 'gas_setup' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-4 gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Code className="w-5 h-5 text-indigo-400" />
                      Google Apps Script Source Code (Backend REST API)
                    </h2>
                    <p className="text-xs text-slate-400">
                      Instructions to configure Google Sheets with 4 tabs: EXAMS, QUESTIONS, SUBMISSIONS, CHEATLOGS
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsDiagnosticsOpen(true)}
                      className="px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md cursor-pointer"
                    >
                      <Activity className="w-4 h-4 text-purple-200 animate-pulse" />
                      <span>Run DB Diagnostics</span>
                    </button>

                    <button
                      onClick={copyGasCode}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer"
                    >
                      {copiedGasCode ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>Code Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy GAS Script (Code.gs)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Setup Steps */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                  <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center border border-indigo-500/40">1</span>
                    <h4 className="font-bold text-white">Create Google Sheet</h4>
                    <p className="text-slate-400 leading-relaxed">
                      Create a spreadsheet named <strong>IELTS_Exam_System</strong>. Five tabs: <strong className="text-indigo-300">EXAMS, QUESTIONS, SUBMISSIONS, CHEATLOGS, PRACTICE_QUESTIONS</strong>.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center border border-indigo-500/40">2</span>
                    <h4 className="font-bold text-white">Open Apps Script</h4>
                    <p className="text-slate-400 leading-relaxed">
                      In your Google Sheet, click <strong>Extensions</strong> &rarr; <strong>Apps Script</strong>.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center border border-indigo-500/40">3</span>
                    <h4 className="font-bold text-white">Paste Backend Code</h4>
                    <p className="text-slate-400 leading-relaxed">
                      Clear default code and paste the script below into <strong className="text-indigo-300">Code.gs</strong>.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center border border-indigo-500/40">4</span>
                    <h4 className="font-bold text-white">Deploy Web App</h4>
                    <p className="text-slate-400 leading-relaxed">
                      Click <strong>Deploy &rarr; New Deployment &rarr; Web App</strong>. Set Execute as: <strong>Me</strong>, Who has access: <strong>Anyone</strong>. Copy the Web App URL into the system.
                    </p>
                  </div>
                </div>

                {/* Google Sheet Schema Guide */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-4 text-xs">
                  <h4 className="text-sm font-bold text-amber-400">📋 Google Sheets Column Schema (Required):</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <span className="font-bold text-indigo-300">1. Tab "EXAMS" (Exam Catalog):</span>
                      <p className="text-[11px] text-slate-400 font-mono mt-1">
                        Col A: exam_code | Col B: title | Col C: duration | Col D: mode (TEST / PRACTICE) | Col E: audio_url | Col F: passage_title | Col G: passage_text | Col H: writing_task1_prompt | Col I: writing_task2_prompt
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-emerald-300">2. Tab "QUESTIONS" (Questions List):</span>
                      <p className="text-[11px] text-slate-400 font-mono mt-1">
                        Col A: exam_code | Col B: question_id | Col C: section (listening / reading) | Col D: question_text | Col E: question_type (multiple_choice / fill_in_blank / true_false_not_given) | Col F: options (A. ...|B. ...|C. ...|D. ...) | Col G: correct_answer | Col H: max_score (1) | Col I: passage_title | Col J: passage_text | Col K: audio_url
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-purple-300">3. Tab "SUBMISSIONS" &amp; Tab "CHEATLOGS":</span>
                      <p className="text-[11px] text-slate-400">
                        System automatically records scores, student essays, and proctoring violation logs upon test completion.
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-sky-300">4. Tab "PRACTICE_QUESTIONS" (Practice Sets Database):</span>
                      <p className="text-[11px] text-slate-400 font-mono mt-1">
                        Col A: DECK_ID | Col B: DECK_TITLE | Col C: CATEGORY | Col D: DESCRIPTION | Col E: LEVEL | Col F: CARD_ID | Col G: SENTENCE_EN | Col H: SENTENCE_VI | Col I: CLOZE_TARGET | Col J: TARGET_WORD | Col K: PART_OF_SPEECH | Col L: PHONETIC | Col M: HINTS | Col N: OPTIONS_JSON | Col O: ACCEPTED_ANSWERS_JSON | Col P: EXPLANATION | Col Q: GRAMMAR_POINTS_JSON | Col R: DIFFICULTY | Col S: UPDATED_AT
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

      {/* Automated Database & Connection Diagnostics Modal */}
      <DatabaseDiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        apiUrl={gasUrl}
        initialExamCode={examCode || 'TEST01'}
        onApplyExam={(examDataLoaded) => {
          handleSetExamData(examDataLoaded);
          setIsDiagnosticsOpen(false);
        }}
      />

    </div>
  );
}

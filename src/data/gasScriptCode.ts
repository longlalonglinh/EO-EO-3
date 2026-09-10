export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * ============================================================================
 * GOOGLE APPS SCRIPT BACKEND REST API - IELTS EXAM SYSTEM
 * ============================================================================
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open Google Sheets "IELTS_Exam_System"
 * 2. Click Extensions -> Apps Script
 * 3. Paste the entire source code below into Code.gs (replace old code)
 * 4. Run the 'setupInitialSheets()' function once to create the 6 standard tabs:
 *    EXAMS, QUESTIONS, SUBMISSIONS, CHEATLOGS, PRACTICE_QUESTIONS, STUDENT_PROGRESS
 * 5. Click Deploy -> New deployment
 * 6. Select "Web app" type:
 *    - Execute as: "Me"
 *    - Who has access: "Anyone"
 * 7. Click Deploy, grant permissions, and copy the Web App URL into this Web App!
 * ============================================================================
 */

// Initialize 6 standard tabs for Google Sheets
function setupInitialSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Tab 1: EXAMS
  var sheetExams = ss.getSheetByName('EXAMS') || ss.insertSheet('EXAMS');
  if (sheetExams.getLastRow() === 0) {
    sheetExams.appendRow([
      'EXAM_CODE', 'TITLE', 'TEST_TYPE', 'DURATION_MINS', 
      'AUDIO_URL', 'READING_PASSAGE', 'WRITING_TASK1_PROMPT', 'WRITING_TASK2_PROMPT', 'CREATED_AT'
    ]);
    sheetExams.getRange("1:1").setFontWeight("bold").setBackground("#e2e8f0");
  }
  
  // Tab 2: QUESTIONS
  var sheetQuestions = ss.getSheetByName('QUESTIONS') || ss.insertSheet('QUESTIONS');
  if (sheetQuestions.getLastRow() === 0) {
    sheetQuestions.appendRow([
      'EXAM_CODE', 'QUESTION_ID', 'SECTION', 'QUESTION_TEXT', 
      'QUESTION_TYPE', 'OPTIONS_JSON', 'CORRECT_ANSWER', 'MAX_SCORE'
    ]);
    sheetQuestions.getRange("1:1").setFontWeight("bold").setBackground("#e2e8f0");
  }
  
  // Tab 3: SUBMISSIONS
  var sheetSubmissions = ss.getSheetByName('SUBMISSIONS') || ss.insertSheet('SUBMISSIONS');
  if (sheetSubmissions.getLastRow() === 0) {
    sheetSubmissions.appendRow([
      'SUBMISSION_ID', 'SBD', 'EXAM_CODE', 'TEST_MODE', 
      'LISTENING_RAW', 'LISTENING_BAND', 'READING_RAW', 'READING_BAND',
      'WRITING_TASK1_TEXT', 'WRITING_TASK2_TEXT', 'WRITING_SCORES_JSON', 
      'WRITING_BAND', 'OVERALL_BAND', 'STATUS', 'SUBMITTED_AT', 'VIOLATIONS_COUNT'
    ]);
    sheetSubmissions.getRange("1:1").setFontWeight("bold").setBackground("#e2e8f0");
  }
  
  // Tab 4: CHEATLOGS
  var sheetCheatlogs = ss.getSheetByName('CHEATLOGS') || ss.insertSheet('CHEATLOGS');
  if (sheetCheatlogs.getLastRow() === 0) {
    sheetCheatlogs.appendRow([
      'LOG_ID', 'SUBMISSION_ID', 'SBD', 'EXAM_CODE', 
      'VIOLATION_TYPE', 'VIOLATION_COUNT', 'TIMESTAMP'
    ]);
    sheetCheatlogs.getRange("1:1").setFontWeight("bold").setBackground("#e2e8f0");
  }
  
  // Tab 5: PRACTICE_QUESTIONS (Question Bank & Practice Decks)
  var sheetPractice = ss.getSheetByName('PRACTICE_QUESTIONS') || ss.insertSheet('PRACTICE_QUESTIONS');
  if (sheetPractice.getLastRow() === 0) {
    sheetPractice.appendRow([
      'DECK_ID', 'DECK_TITLE', 'CATEGORY', 'DESCRIPTION', 'LEVEL', 
      'CARD_ID', 'SENTENCE_EN', 'SENTENCE_VI', 'CLOZE_TARGET', 'TARGET_WORD', 
      'PART_OF_SPEECH', 'PHONETIC', 'HINTS', 'OPTIONS_JSON', 'ACCEPTED_ANSWERS_JSON', 
      'EXPLANATION', 'GRAMMAR_POINTS_JSON', 'DIFFICULTY', 'UPDATED_AT'
    ]);
    sheetPractice.getRange("1:1").setFontWeight("bold").setBackground("#c7d2fe");
  }
  
  // Tab 6: STUDENT_PROGRESS (Learning Progress for 3 Learners)
  var sheetStudentProgress = ss.getSheetByName('STUDENT_PROGRESS') || ss.insertSheet('STUDENT_PROGRESS');
  if (sheetStudentProgress.getLastRow() === 0) {
    sheetStudentProgress.appendRow([
      'STUDENT_ID', 'STUDENT_NAME', 'DECK_ID', 'DECK_TITLE', 
      'CARDS_MASTERED', 'TOTAL_CARDS', 'MASTERY_PCT', 'CORRECT_COUNT', 
      'WRONG_COUNT', 'DAILY_STREAK', 'LAST_STUDIED_AT', 'NOTES'
    ]);
    sheetStudentProgress.getRange("1:1").setFontWeight("bold").setBackground("#ede9fe");
  }
  
  Logger.log("Successfully initialized 6 tabs: EXAMS, QUESTIONS, SUBMISSIONS, CHEATLOGS, PRACTICE_QUESTIONS, STUDENT_PROGRESS!");
}

/**
 * ============================================================================
 * GET API: Load Exam, Submissions, Cheatlogs, Practice Decks, Progress
 * ============================================================================
 */
// Case-insensitive flexible Sheet lookup helper
function getFlexibleSheet(ss, names) {
  var allSheets = ss.getSheets();
  for (var k = 0; k < allSheets.length; k++) {
    var actualName = allSheets[k].getName().trim().toUpperCase();
    for (var n = 0; n < names.length; n++) {
      if (actualName === names[n].toUpperCase()) {
        return allSheets[k];
      }
    }
  }
  return null;
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'get_exam';
  var examCode = (e && e.parameter && e.parameter.exam_code) ? String(e.parameter.exam_code).trim() : '';
  
  var response = { status: 'error', success: false, message: 'Invalid request' };
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // Quick diagnostic ping (Ping / Diagnose)
    if (action === 'ping' || action === 'diagnose') {
      var sheetNames = ss.getSheets().map(function(s) { return s.getName(); });
      var qSheet = getFlexibleSheet(ss, ['QUESTIONS', 'Questions', 'Cau_Hoi']);
      var foundCodes = [];
      if (qSheet) {
        var qVals = qSheet.getDataRange().getValues();
        for (var r = 1; r < qVals.length; r++) {
          var c = String(qVals[r][0]).trim().toUpperCase();
          if (c && foundCodes.indexOf(c) === -1) foundCodes.push(c);
        }
      }
      return createJsonResponse({
        status: 'success',
        success: true,
        message: 'Google Apps Script service is operational',
        spreadsheet_name: ss.getName(),
        sheets_found: sheetNames,
        available_exam_codes: foundCodes,
        timestamp: new Date().toISOString()
      });
    }
    
    if (action === 'get_exam' || action === 'getExam' || examCode !== '') {
      var sheetQ = getFlexibleSheet(ss, ['QUESTIONS', 'Questions', 'questions', 'CAU_HOI', 'Cau_Hoi', 'Sheet1']);
      if (!sheetQ) {
        return createJsonResponse({ 
          status: 'error', 
          success: false, 
          message: 'QUESTIONS tab does not exist in your Google Sheet' 
        });
      }
      
      var dataQ = sheetQ.getDataRange().getValues();
      var questions = [];
      var cleanTargetCode = examCode.toUpperCase();
      
      // Iterate rows (skip header [0])
      for (var i = 1; i < dataQ.length; i++) {
        var row = dataQ[i];
        var codeInRow = String(row[0]).trim().toUpperCase();
        
        // Filter by exam code (or return all if no code specified)
        if (cleanTargetCode === '' || codeInRow === cleanTargetCode) {
          // MUST OMIT CORRECT_ANSWERS COLUMN (row[6]) TO PREVENT LEAKS
          questions.push({
            exam_code: row[0],
            question_id: String(row[1] || ('Q' + i)),
            section: String(row[2] || 'reading').toLowerCase(), // listening / reading
            question_text: row[3],
            question_type: row[4],
            options: row[5] ? parseJsonSafe(row[5]) : [],
            // Column index 6 (CORRECT_ANSWER) IS PURPOSELY OMITTED HERE
            max_score: row[7] || 1
          });
        }
      }
      
      // Load exam metadata from EXAMS sheet if present
      var sheetE = getFlexibleSheet(ss, ['EXAMS', 'Exams', 'exams', 'DE_THI', 'De_Thi']);
      var examMeta = null;
      if (sheetE) {
        var dataE = sheetE.getDataRange().getValues();
        for (var j = 1; j < dataE.length; j++) {
          if (String(dataE[j][0]).trim().toUpperCase() === cleanTargetCode) {
            examMeta = {
              exam_code: dataE[j][0],
              title: dataE[j][1],
              test_type: dataE[j][2],
              duration_mins: dataE[j][3],
              audio_url: dataE[j][4],
              reading_passage: dataE[j][5],
              passage_text: dataE[j][5],
              writing_task1_prompt: dataE[j][6],
              writing_task2_prompt: dataE[j][7]
            };
            break;
          }
        }
      }
      
      response = {
        status: 'success',
        success: true,
        exam_code: examCode,
        exam_meta: examMeta,
        questions_count: questions.length,
        questions: questions, // EXCLUDES CORRECT_ANSWERS
        data: questions       // Compatible data array
      };
      
    } else if (action === 'get_submissions') {
      var sheetS = getFlexibleSheet(ss, ['SUBMISSIONS', 'Submissions', 'submissions']);
      if (!sheetS) return createJsonResponse({ status: 'error', success: false, message: 'Sheet SUBMISSIONS does not exist' });
      
      var dataS = sheetS.getDataRange().getValues();
      var submissions = [];
      for (var k = 1; k < dataS.length; k++) {
        var r = dataS[k];
        submissions.push({
          submission_id: r[0],
          sbd: r[1],
          exam_code: r[2],
          test_mode: r[3],
          listening_raw: r[4],
          listening_band: r[5],
          reading_raw: r[6],
          reading_band: r[7],
          writing_task1_text: r[8],
          writing_task2_text: r[9],
          writing_scores: parseJsonSafe(r[10]),
          writing_band: r[11],
          overall_band: r[12],
          status: r[13],
          submitted_at: r[14],
          violations_count: r[15]
        });
      }
      response = { status: 'success', submissions: submissions };
      
    } else if (action === 'get_cheatlogs') {
      var sheetC = ss.getSheetByName('CHEATLOGS');
      if (!sheetC) return createJsonResponse({ status: 'error', message: 'Sheet CHEATLOGS does not exist' });
      
      var dataC = sheetC.getDataRange().getValues();
      var cheatlogs = [];
      for (var m = 1; m < dataC.length; m++) {
        var rowC = dataC[m];
        cheatlogs.push({
          log_id: rowC[0],
          submission_id: rowC[1],
          sbd: rowC[2],
          exam_code: rowC[3],
          violation_type: rowC[4],
          violation_count: rowC[5],
          timestamp: rowC[6]
        });
      }
      response = { status: 'success', cheatlogs: cheatlogs };

    } else if (action === 'get_practice_decks' || action === 'getPracticeDecks') {
      // RETRIEVE PRACTICE QUESTIONS FROM GOOGLE SHEETS
      var sheetP = getFlexibleSheet(ss, ['PRACTICE_QUESTIONS', 'Practice_Questions', 'PRACTICE', 'Practice', 'BAI_LUYEN_TAP']);
      if (!sheetP) {
        return createJsonResponse({
          status: 'not_initialized',
          success: true,
          is_initialized: false,
          message: 'PRACTICE_QUESTIONS tab has not been created in Google Sheets yet. Please initialize from Web App.',
          decks: []
        });
      }

      var dataP = sheetP.getDataRange().getValues();
      if (dataP.length <= 1) {
        return createJsonResponse({
          status: 'empty',
          success: true,
          is_initialized: true,
          message: 'PRACTICE_QUESTIONS tab exists but has no questions yet.',
          decks: []
        });
      }

      var deckMap = {};
      var deckOrder = [];

      for (var pi = 1; pi < dataP.length; pi++) {
        var pRow = dataP[pi];
        var deckId = String(pRow[0] || '').trim();
        if (!deckId) continue;

        if (!deckMap[deckId]) {
          deckMap[deckId] = {
            deck_id: deckId,
            title: String(pRow[1] || ('Practice Deck ' + deckId)),
            category: String(pRow[2] || 'Vocabulary'),
            description: String(pRow[3] || ''),
            level: String(pRow[4] || 'B1-B2'),
            target_language: 'English',
            native_language: 'English',
            cards: []
          };
          deckOrder.push(deckId);
        }

        var cardId = String(pRow[5] || ('card_' + pi));
        var opts = parseJsonSafe(pRow[13]);
        if ((!opts || opts.length === 0) && typeof pRow[13] === 'string' && pRow[13].indexOf('|') >= 0) {
          opts = pRow[13].split('|').map(function(s) { return s.trim(); });
        }

        var accepted = parseJsonSafe(pRow[14]);
        if ((!accepted || accepted.length === 0) && typeof pRow[14] === 'string' && pRow[14].indexOf('|') >= 0) {
          accepted = pRow[14].split('|').map(function(s) { return s.trim(); });
        }

        var grammarPts = parseJsonSafe(pRow[16]);
        if ((!grammarPts || grammarPts.length === 0) && typeof pRow[16] === 'string' && pRow[16].indexOf('|') >= 0) {
          grammarPts = pRow[16].split('|').map(function(s) { return s.trim(); });
        }

        deckMap[deckId].cards.push({
          id: cardId,
          sentence_en: String(pRow[6] || ''),
          sentence_vi: String(pRow[7] || ''),
          cloze_target: String(pRow[8] || '').trim(),
          target_word: String(pRow[9] || pRow[8] || '').trim(),
          part_of_speech: String(pRow[10] || 'verb'),
          phonetic: String(pRow[11] || ''),
          hints: String(pRow[12] || ''),
          options: opts,
          accepted_answers: accepted,
          explanation: String(pRow[15] || ''),
          grammar_points: grammarPts,
          difficulty: String(pRow[17] || 'medium')
        });
      }

      var resultDecks = deckOrder.map(function(id) { return deckMap[id]; });
      var totalCardsCount = 0;
      for (var di = 0; di < resultDecks.length; di++) {
        totalCardsCount += resultDecks[di].cards.length;
      }

      response = {
        status: 'success',
        success: true,
        is_initialized: true,
        source: 'google_sheets',
        decks_count: resultDecks.length,
        total_cards: totalCardsCount,
        decks: resultDecks
      };
    } else if (action === 'get_student_progress' || action === 'getStudentProgress') {
      // RETRIEVE LEARNER PROGRESS FROM STUDENT_PROGRESS TAB
      var studentId = (e && e.parameter && e.parameter.student_id) ? String(e.parameter.student_id).trim().toUpperCase() : '';
      var sheetProg = getFlexibleSheet(ss, ['STUDENT_PROGRESS', 'Student_Progress', 'PRACTICE_PROGRESS']);
      if (!sheetProg) {
        return createJsonResponse({ status: 'not_initialized', success: false, records: [] });
      }
      var progData = sheetProg.getDataRange().getValues();
      var records = [];
      for (var p = 1; p < progData.length; p++) {
        var pR = progData[p];
        var rowStudentId = String(pR[0] || '').trim().toUpperCase();
        if (!studentId || rowStudentId === studentId) {
          records.push({
            student_id: String(pR[0] || ''),
            student_name: String(pR[1] || ''),
            deck_id: String(pR[2] || ''),
            deck_title: String(pR[3] || ''),
            cards_mastered: Number(pR[4]) || 0,
            total_cards: Number(pR[5]) || 0,
            mastery_pct: Number(pR[6]) || 0,
            correct_count: Number(pR[7]) || 0,
            wrong_count: Number(pR[8]) || 0,
            daily_streak: Number(pR[9]) || 0,
            last_studied_at: String(pR[10] || ''),
            notes: String(pR[11] || '')
          });
        }
      }
      response = { status: 'success', success: true, count: records.length, records: records };
    }
    
  } catch (err) {
    response = { status: 'error', message: err.toString() };
  }
  
  return createJsonResponse(response);
}

/**
 * ============================================================================
 * POST API: Submit Exam, Server-Side Grading, Generate SUBMISSION_ID, AppendRow
 * ============================================================================
 */
function doPost(e) {
  var response = { status: 'error', message: 'Unable to process request' };
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action || 'submit_exam';
    
    if (action === 'submit_exam') {
      var sbd = payload.sbd || 'GUEST';
      var examCode = payload.exam_code || 'TEST01';
      var testMode = payload.test_mode || 'TEST';
      var listeningAnswers = payload.listening_answers || {};
      var readingAnswers = payload.reading_answers || {};
      var writingTask1Text = payload.writing_task1_text || '';
      var writingTask2Text = payload.writing_task2_text || '';
      var cheatLogs = payload.cheat_logs || [];
      var violationsCount = payload.violations_count || 0;
      
      // 1. GENERATE SUBMISSION_ID: SBD_Code_Time
      var timestampStr = Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd_HHmmss");
      var submissionId = sbd + "_" + examCode + "_" + timestampStr;
      var submittedAt = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd HH:mm:ss");
      
      // 2. SERVER-SIDE GRADING (LISTENING & READING)
      var sheetQ = ss.getSheetByName('QUESTIONS');
      var correctAnswersMap = {}; // key: question_id, val: { answer: string, section: string, max_score: number }
      
      if (sheetQ) {
        var dataQ = sheetQ.getDataRange().getValues();
        for (var i = 1; i < dataQ.length; i++) {
          if (String(dataQ[i][0]).toUpperCase() === examCode.toUpperCase()) {
            var qId = String(dataQ[i][1]);
            correctAnswersMap[qId] = {
              section: String(dataQ[i][2]).toLowerCase(),
              correct: String(dataQ[i][6]).trim().toUpperCase(),
              max_score: Number(dataQ[i][7]) || 1
            };
          }
        }
      }
      
      // Calculate Listening raw score
      var listeningRaw = 0;
      var listeningMax = 0;
      for (var lKey in listeningAnswers) {
        var lVal = String(listeningAnswers[lKey]).trim().toUpperCase();
        if (correctAnswersMap[lKey]) {
          listeningMax += correctAnswersMap[lKey].max_score;
          if (lVal === correctAnswersMap[lKey].correct) {
            listeningRaw += correctAnswersMap[lKey].max_score;
          }
        }
      }
      
      // Calculate Reading raw score
      var readingRaw = 0;
      var readingMax = 0;
      for (var rKey in readingAnswers) {
        var rVal = String(readingAnswers[rKey]).trim().toUpperCase();
        if (correctAnswersMap[rKey]) {
          readingMax += correctAnswersMap[rKey].max_score;
          if (rVal === correctAnswersMap[rKey].correct) {
            readingRaw += correctAnswersMap[rKey].max_score;
          }
        }
      }
      
      // Convert raw score to IELTS Band Scale
      var listeningBand = convertRawToIeltsBand(listeningRaw, listeningMax || 40);
      var readingBand = convertRawToIeltsBand(readingRaw, readingMax || 40);
      
      // 3. RECORD RESULT INTO SUBMISSIONS SHEET (APPENDROW)
      var sheetSubmissions = ss.getSheetByName('SUBMISSIONS') || ss.insertSheet('SUBMISSIONS');
      sheetSubmissions.appendRow([
        submissionId,
        sbd,
        examCode,
        testMode,
        listeningRaw,
        listeningBand,
        readingRaw,
        readingBand,
        writingTask1Text,
        writingTask2Text,
        JSON.stringify({ TR: 0, CC: 0, LR: 0, GRA: 0 }), // Pending teacher grading
        0, // Writing band
        0, // Overall band
        'PENDING_TEACHER', // Default status
        submittedAt,
        violationsCount
      ]);
      
      // 4. RECORD VIOLATIONS INTO CHEATLOGS (APPENDROW)
      if (cheatLogs && cheatLogs.length > 0) {
        var sheetCheatlogs = ss.getSheetByName('CHEATLOGS') || ss.insertSheet('CHEATLOGS');
        for (var c = 0; m < cheatLogs.length; c++) {
          var log = cheatLogs[c];
          sheetCheatlogs.appendRow([
            'LOG_' + Date.now() + '_' + c,
            submissionId,
            sbd,
            examCode,
            log.violation_type || 'ONBLUR',
            log.violation_count || 1,
            log.timestamp || submittedAt
          ]);
        }
      }
      
      response = {
        status: 'success',
        submission_id: submissionId,
        sbd: sbd,
        exam_code: examCode,
        listening_raw: listeningRaw,
        listening_band: listeningBand,
        reading_raw: readingRaw,
        reading_band: readingBand,
        writing_status: 'PENDING_TEACHER',
        submitted_at: submittedAt
      };
      
    } else if (action === 'grade_writing') {
      // Instructor grading for Writing
      var submissionIdToGrade = payload.submission_id;
      var scores = payload.writing_scores; // { TR, CC, LR, GRA }
      var feedback = payload.writing_feedback || '';
      
      var writingBand = Math.round(((scores.TR + scores.CC + scores.LR + scores.GRA) / 4) * 2) / 2;
      
      var sheetS = ss.getSheetByName('SUBMISSIONS');
      if (sheetS) {
        var dataS = sheetS.getDataRange().getValues();
        for (var rowIdx = 1; rowIdx < dataS.length; rowIdx++) {
          if (String(dataS[rowIdx][0]) === String(submissionIdToGrade)) {
            var lBand = Number(dataS[rowIdx][5]) || 0;
            var rBand = Number(dataS[rowIdx][7]) || 0;
            var overallBand = Math.round(((lBand + rBand + writingBand) / 3) * 2) / 2;
            
            // Update corresponding row (1-based index)
            sheetS.getRange(rowIdx + 1, 11).setValue(JSON.stringify(scores)); // WRITING_SCORES_JSON
            sheetS.getRange(rowIdx + 1, 12).setValue(writingBand);            // WRITING_BAND
            sheetS.getRange(rowIdx + 1, 13).setValue(overallBand);           // OVERALL_BAND
            sheetS.getRange(rowIdx + 1, 14).setValue('GRADED');              // STATUS
            
            response = {
              status: 'success',
              submission_id: submissionIdToGrade,
              writing_band: writingBand,
              overall_band: overallBand,
              message: 'Writing graded successfully!'
            };
            break;
          }
        }
      }
    } else if (action === 'upload_exam') {
      // 3. ACTION: UPLOAD EXAM
      var exam = payload.exam_data;
      if (!exam) {
        return createJsonResponse({ status: 'error', message: 'Missing exam_data in payload' });
      }

      var sheetE = ss.getSheetByName('EXAMS') || ss.insertSheet('EXAMS');
      var sheetQ = ss.getSheetByName('QUESTIONS') || ss.insertSheet('QUESTIONS');

      var examCode = (exam.exam_code || 'IELTS01').toString().trim().toUpperCase();
      var title = exam.title || ('IELTS Exam ' + examCode);
      var testType = exam.test_type || 'Academic';
      var duration = exam.duration_mins || 60;
      var audioUrl = exam.audio_url || '';
      var passageTitle = exam.passage_title || '';
      var passageText = exam.passage_text || '';
      var writingTask1 = exam.writing_task1_prompt || '';
      var writingTask2 = exam.writing_task2_prompt || '';

      // Record 1 row in EXAMS tab with overview info
      sheetE.appendRow([
        examCode,
        title,
        testType,
        duration,
        audioUrl,
        passageTitle,
        passageText,
        writingTask1,
        writingTask2
      ]);

      // Iterate through listening_questions and reading_questions
      var listeningQs = exam.listening_questions || [];
      for (var l = 0; l < listeningQs.length; l++) {
        var lq = listeningQs[l];
        var lOptions = (lq.options && Array.isArray(lq.options)) ? lq.options.join('|') : (lq.options || '');
        sheetQ.appendRow([
          examCode,
          lq.question_id || ('l_' + (l + 1)),
          'listening',
          lq.question_text || '',
          lq.question_type || 'multiple_choice',
          lOptions,
          lq.correct_answer || '',
          lq.max_score || 1,
          passageTitle,
          passageText,
          audioUrl
        ]);
      }

      var readingQs = exam.reading_questions || [];
      for (var r = 0; r < readingQs.length; r++) {
        var rq = readingQs[r];
        var rOptions = (rq.options && Array.isArray(rq.options)) ? rq.options.join('|') : (rq.options || '');
        sheetQ.appendRow([
          examCode,
          rq.question_id || ('r_' + (r + 1)),
          'reading',
          rq.question_text || '',
          rq.question_type || 'multiple_choice',
          rOptions,
          rq.correct_answer || '',
          rq.max_score || 1,
          passageTitle,
          passageText,
          audioUrl
        ]);
      }

      response = {
        status: 'success',
        message: 'Exam ' + examCode + ' saved to Google Sheets successfully!',
        exam_code: examCode,
        total_questions: listeningQs.length + readingQs.length
      };

    } else if (action === 'init_practice_sheet' || action === 'sync_practice_decks' || action === 'save_practice_deck') {
      // INITIALIZE PRACTICE DATABASE & SAVE PRACTICE QUESTIONS TO GOOGLE SHEETS
      var sheetPractice = ss.getSheetByName('PRACTICE_QUESTIONS') || ss.insertSheet('PRACTICE_QUESTIONS');

      // Initialize headers if empty
      if (sheetPractice.getLastRow() === 0) {
        sheetPractice.appendRow([
          'DECK_ID', 'DECK_TITLE', 'CATEGORY', 'DESCRIPTION', 'LEVEL', 
          'CARD_ID', 'SENTENCE_EN', 'SENTENCE_VI', 'CLOZE_TARGET', 'TARGET_WORD', 
          'PART_OF_SPEECH', 'PHONETIC', 'HINTS', 'OPTIONS_JSON', 'ACCEPTED_ANSWERS_JSON', 
          'EXPLANATION', 'GRAMMAR_POINTS_JSON', 'DIFFICULTY', 'UPDATED_AT'
        ]);
        sheetPractice.getRange("1:1").setFontWeight("bold").setBackground("#c7d2fe");
      }

      var incomingDecks = payload.decks || (payload.deck ? [payload.deck] : []);
      var syncMode = payload.mode || 'replace_all'; // 'replace_all' | 'append' | 'update_single'
      var savedCardsCount = 0;
      var timestamp = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd HH:mm:ss");

      if (syncMode === 'replace_all') {
        var lastR = sheetPractice.getLastRow();
        if (lastR > 1) {
          sheetPractice.getRange(2, 1, lastR - 1, sheetPractice.getLastColumn()).clearContent();
        }
      }

      var rowsToInsert = [];
      for (var d = 0; d < incomingDecks.length; d++) {
        var dObj = incomingDecks[d];
        var dCards = dObj.cards || [];
        for (var c = 0; c < dCards.length; c++) {
          var cd = dCards[c];
          rowsToInsert.push([
            dObj.deck_id || 'DECK_01',
            dObj.title || 'Practice Deck',
            dObj.category || 'Vocabulary',
            dObj.description || '',
            dObj.level || 'B1-B2',
            cd.id || ('card_' + (c + 1)),
            cd.sentence_en || '',
            cd.sentence_vi || '',
            cd.cloze_target || '',
            cd.target_word || cd.cloze_target || '',
            cd.part_of_speech || 'word',
            cd.phonetic || '',
            cd.hints || '',
            JSON.stringify(cd.options || []),
            JSON.stringify(cd.accepted_answers || []),
            cd.explanation || '',
            JSON.stringify(cd.grammar_points || []),
            cd.difficulty || 'medium',
            timestamp
          ]);
          savedCardsCount++;
        }
      }

      if (rowsToInsert.length > 0) {
        var startRow = sheetPractice.getLastRow() + 1;
        sheetPractice.getRange(startRow, 1, rowsToInsert.length, rowsToInsert[0].length).setValues(rowsToInsert);
      }

      response = {
        status: 'success',
        success: true,
        message: 'Practice database initialized and ' + savedCardsCount + ' practice questions saved to Google Sheets successfully!',
        total_cards: savedCardsCount,
        decks_count: incomingDecks.length,
        timestamp: timestamp
      };
    } else if (action === 'sync_student_progress' || action === 'save_student_progress') {
      // SAVE / SYNC LEARNER PROGRESS TO STUDENT_PROGRESS TAB
      var sheetProg = ss.getSheetByName('STUDENT_PROGRESS') || ss.insertSheet('STUDENT_PROGRESS');
      if (sheetProg.getLastRow() === 0) {
        sheetProg.appendRow([
          'STUDENT_ID', 'STUDENT_NAME', 'DECK_ID', 'DECK_TITLE', 
          'CARDS_MASTERED', 'TOTAL_CARDS', 'MASTERY_PCT', 'CORRECT_COUNT', 
          'WRONG_COUNT', 'DAILY_STREAK', 'LAST_STUDIED_AT', 'NOTES'
        ]);
        sheetProg.getRange("1:1").setFontWeight("bold").setBackground("#ede9fe");
      }

      var progressList = payload.progress_records || (payload.record ? [payload.record] : []);
      var pData = sheetProg.getDataRange().getValues();
      var nowTime = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd HH:mm:ss");
      var updatedCount = 0;

      for (var pi = 0; pi < progressList.length; pi++) {
        var rec = progressList[pi];
        var sId = String(rec.student_id || 'HV01').trim().toUpperCase();
        var dId = String(rec.deck_id || 'PRACTICE_01').trim();
        var rowFound = -1;

        for (var rIdx = 1; rIdx < pData.length; rIdx++) {
          if (String(pData[rIdx][0]).trim().toUpperCase() === sId && String(pData[rIdx][2]).trim() === dId) {
            rowFound = rIdx + 1;
            break;
          }
        }

        var rowValues = [
          sId,
          rec.student_name || ('Learner ' + sId),
          dId,
          rec.deck_title || ('Practice Deck ' + dId),
          Number(rec.cards_mastered) || 0,
          Number(rec.total_cards) || 0,
          Number(rec.mastery_pct) || 0,
          Number(rec.correct_count) || 0,
          Number(rec.wrong_count) || 0,
          Number(rec.daily_streak) || 1,
          rec.last_studied_at || nowTime,
          rec.notes || ''
        ];

        if (rowFound > 0) {
          sheetProg.getRange(rowFound, 1, 1, rowValues.length).setValues([rowValues]);
        } else {
          sheetProg.appendRow(rowValues);
        }
        updatedCount++;
      }

      response = {
        status: 'success',
        success: true,
        message: 'Saved progress for ' + updatedCount + ' practice decks to Google Sheets!',
        updated_count: updatedCount,
        timestamp: nowTime
      };
    }
    
  } catch (err) {
    response = { status: 'error', message: err.toString() };
  }
  
  return createJsonResponse(response);
}

/**
 * Helper: Create JSON response with CORS headers
 */
function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Helper: Safe JSON parse
 */
function parseJsonSafe(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return [];
  }
}

/**
 * Helper: Convert raw score to IELTS Band Score 0 - 9.0
 */
function convertRawToIeltsBand(rawScore, maxScore) {
  if (!rawScore || rawScore <= 0) return 1.0;
  var ratio = rawScore / (maxScore || 40);
  var raw40 = Math.round(ratio * 40);
  
  if (raw40 >= 39) return 9.0;
  if (raw40 >= 37) return 8.5;
  if (raw40 >= 35) return 8.0;
  if (raw40 >= 33) return 7.5;
  if (raw40 >= 30) return 7.0;
  if (raw40 >= 27) return 6.5;
  if (raw40 >= 23) return 6.0;
  if (raw40 >= 19) return 5.5;
  if (raw40 >= 15) return 5.0;
  if (raw40 >= 12) return 4.5;
  if (raw40 >= 9)  return 4.0;
  if (raw40 >= 6)  return 3.5;
  if (raw40 >= 4)  return 3.0;
  return 2.5;
}
`;

export const gasScriptCodeTemplate = GOOGLE_APPS_SCRIPT_CODE;

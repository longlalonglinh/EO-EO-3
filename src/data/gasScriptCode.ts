export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * ============================================================================
 * GOOGLE APPS SCRIPT BACKEND REST API - IELTS EXAM SYSTEM
 * ============================================================================
 * 
 * HƯỚNG DẪN CẤU HÌNH:
 * 1. Mở Google Sheets "IELTS_Exam_System"
 * 2. Mở Tiện ích mở rộng (Extensions) -> Apps Script
 * 3. Dán toàn bộ mã nguồn bên dưới vào file Code.gs (xóa hết code cũ)
 * 4. Bấm chạy hàm 'setupInitialSheets()' một lần duy nhất để tạo 4 tab chuẩn:
 *    EXAMS, QUESTIONS, SUBMISSIONS, CHEATLOGS
 * 5. Bấm Deploy (Triển khai) -> New deployment (Triển khai mới)
 * 6. Chọn loại "Web app" (Ứng dụng Web)
 *    - Execute as: "Me" (Tôi)
 *    - Who has access: "Anyone" (Bất kỳ ai)
 * 7. Bấm Deploy, cấp quyền và copy Web App URL dán vào ứng dụng Web!
 * ============================================================================
 */

// Hàm khởi tạo tự động 4 tab chuẩn cho Google Sheets
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
  
  Logger.log("Khởi tạo thành công 4 tab: EXAMS, QUESTIONS, SUBMISSIONS, CHEATLOGS!");
}

/**
 * ============================================================================
 * GET API: Tải đề thi (CHẶN LỘ ĐÁP ÁN CORRECT_ANSWERS), Lấy Submissions, Cheatlogs
 * ============================================================================
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'get_exam';
  var examCode = (e && e.parameter && e.parameter.exam_code) ? e.parameter.exam_code : '';
  
  var response = { status: 'error', message: 'Yêu cầu không hợp lệ' };
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === 'get_exam' || examCode !== '') {
      var sheetQ = ss.getSheetByName('QUESTIONS');
      if (!sheetQ) {
        return createJsonResponse({ status: 'error', message: 'Tab QUESTIONS không tồn tại' });
      }
      
      var dataQ = sheetQ.getDataRange().getValues();
      var questions = [];
      
      // Duyệt qua dữ liệu (Bỏ qua dòng Tiêu đề [0])
      for (var i = 1; i < dataQ.length; i++) {
        var row = dataQ[i];
        var codeInRow = String(row[0]).trim();
        
        // Lọc theo mã đề thi (hoặc lấy tất cả nếu không truyền examCode)
        if (examCode === '' || codeInRow.toUpperCase() === examCode.toUpperCase()) {
          // BẮT BUỘC LOẠI BỎ CỘT CORRECT_ANSWERS (row[6]) ĐỂ CHỐNG LỘ ĐÁP ÁN!
          questions.push({
            exam_code: row[0],
            question_id: row[1],
            section: row[2], // listening / reading
            question_text: row[3],
            question_type: row[4],
            options: row[5] ? parseJsonSafe(row[5]) : [],
            // Cột index 6 (CORRECT_ANSWER) CỐ TÌNH BỊ LOẠI BỎ Ở ĐÂY!
            max_score: row[7] || 1
          });
        }
      }
      
      // Lấy thêm thông tin bài thi từ sheet EXAMS nếu có
      var sheetE = ss.getSheetByName('EXAMS');
      var examMeta = null;
      if (sheetE) {
        var dataE = sheetE.getDataRange().getValues();
        for (var j = 1; j < dataE.length; j++) {
          if (String(dataE[j][0]).toUpperCase() === examCode.toUpperCase()) {
            examMeta = {
              exam_code: dataE[j][0],
              title: dataE[j][1],
              test_type: dataE[j][2],
              duration_mins: dataE[j][3],
              audio_url: dataE[j][4],
              reading_passage: dataE[j][5],
              writing_task1_prompt: dataE[j][6],
              writing_task2_prompt: dataE[j][7]
            };
            break;
          }
        }
      }
      
      response = {
        status: 'success',
        exam_code: examCode,
        exam_meta: examMeta,
        questions_count: questions.length,
        questions: questions // KHÔNG CHỨA CORRECT_ANSWERS
      };
      
    } else if (action === 'get_submissions') {
      var sheetS = ss.getSheetByName('SUBMISSIONS');
      if (!sheetS) return createJsonResponse({ status: 'error', message: 'Sheet SUBMISSIONS không tồn tại' });
      
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
      if (!sheetC) return createJsonResponse({ status: 'error', message: 'Sheet CHEATLOGS không tồn tại' });
      
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
    }
    
  } catch (err) {
    response = { status: 'error', message: err.toString() };
  }
  
  return createJsonResponse(response);
}

/**
 * ============================================================================
 * POST API: Nộp bài, Chấm điểm server-side, Tạo SUBMISSION_ID, AppendRow
 * ============================================================================
 */
function doPost(e) {
  var response = { status: 'error', message: 'Không xử lý được yêu cầu' };
  
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
      
      // 1. TẠO SUBMISSION_ID THEO CÔNG THỨC: SBD_Code_Time
      var timestampStr = Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd_HHmmss");
      var submissionId = sbd + "_" + examCode + "_" + timestampStr;
      var submittedAt = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd HH:mm:ss");
      
      // 2. CHẤM ĐIỂM SERVER-SIDE GRADING (LISTENING & READING)
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
      
      // Tính điểm thô Listening
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
      
      // Tính điểm thô Reading
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
      
      // Quy đổi điểm thô sang Band IELTS (Thang 40 câu)
      var listeningBand = convertRawToIeltsBand(listeningRaw, listeningMax || 40);
      var readingBand = convertRawToIeltsBand(readingRaw, readingMax || 40);
      
      // 3. GHI KẾT QUẢ VÀO SHEET SUBMISSIONS (APPENDROW)
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
        'PENDING_TEACHER', // Trạng thái mặc định
        submittedAt,
        violationsCount
      ]);
      
      // 4. GHI LOGS VI PHẠM VÀO SHEET CHEATLOGS (APPENDROW)
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
      // Giáo viên chấm điểm Writing
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
            
            // Cập nhật dòng tương ứng (chú ý index 1-based)
            sheetS.getRange(rowIdx + 1, 11).setValue(JSON.stringify(scores)); // WRITING_SCORES_JSON
            sheetS.getRange(rowIdx + 1, 12).setValue(writingBand);            // WRITING_BAND
            sheetS.getRange(rowIdx + 1, 13).setValue(overallBand);           // OVERALL_BAND
            sheetS.getRange(rowIdx + 1, 14).setValue('GRADED');              // STATUS
            
            response = {
              status: 'success',
              submission_id: submissionIdToGrade,
              writing_band: writingBand,
              overall_band: overallBand,
              message: 'Chấm điểm thành công!'
            };
            break;
          }
        }
      }
    } else if (action === 'upload_exam') {
      // 3. ACTION TẢI LÊN ĐỀ THI (UPLOAD_EXAM)
      var exam = payload.exam_data;
      if (!exam) {
        return createJsonResponse({ status: 'error', message: 'Không tìm thấy dữ liệu exam_data trong payload' });
      }

      var sheetE = ss.getSheetByName('EXAMS') || ss.insertSheet('EXAMS');
      var sheetQ = ss.getSheetByName('QUESTIONS') || ss.insertSheet('QUESTIONS');

      var examCode = (exam.exam_code || 'IELTS01').toString().trim().toUpperCase();
      var title = exam.title || ('Đề thi IELTS ' + examCode);
      var testType = exam.test_type || 'Academic';
      var duration = exam.duration_mins || 60;
      var audioUrl = exam.audio_url || '';
      var passageTitle = exam.passage_title || '';
      var passageText = exam.passage_text || '';
      var writingTask1 = exam.writing_task1_prompt || '';
      var writingTask2 = exam.writing_task2_prompt || '';

      // Ghi 1 dòng vào tab EXAMS gồm các thông số tổng quan
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

      // Lặp qua mảng listening_questions và reading_questions để ghi từng câu hỏi xuống tab QUESTIONS
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
        message: 'Đã lưu đề thi ' + examCode + ' lên Google Sheets thành công!',
        exam_code: examCode,
        total_questions: listeningQs.length + readingQs.length
      };
    }
    
  } catch (err) {
    response = { status: 'error', message: err.toString() };
  }
  
  return createJsonResponse(response);
}

/**
 * Helper: Tạo response JSON với Header chống CORS
 */
function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Helper: Parse JSON an toàn
 */
function parseJsonSafe(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return [];
  }
}

/**
 * Helper: Quy đổi điểm thô sang Band Score IELTS 0 - 9.0
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

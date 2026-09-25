import { ExamData } from '../types';
import { ExamTestReport, verifyAndOptimizeExam } from './examVerification';

export interface GenerateExamOptions {
  mode?: 'topic' | 'document' | 'preset';
  topic: string;
  skills?: ('listening' | 'reading' | 'writing')[];
  difficulty?: 'band_5_6' | 'band_65_75' | 'band_8_9';
  questionCount?: number;
  durationMins?: number;
  customPrompt?: string;
  text?: string;
  pdfBase64?: string;
}

export interface GenerateExamResponse {
  success: boolean;
  exam: ExamData;
  testReport: ExamTestReport;
  error?: string;
}

/**
 * Generate a complete verified IELTS Exam using server-side Gemini 3.8 Flash
 * Automatically runs the 6-Point Quality Verification & Auto-repair suite before returning results.
 */
export async function generateExamWithAI(options: GenerateExamOptions): Promise<GenerateExamResponse> {
  try {
    const response = await fetch('/api/gemini/generate-exam', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        mode: options.mode || 'topic',
        topic: options.topic,
        skills: options.skills || ['listening', 'reading', 'writing'],
        difficulty: options.difficulty || 'band_65_75',
        questionCount: options.questionCount || 10,
        durationMins: options.durationMins || 120,
        customPrompt: options.customPrompt,
        text: options.text,
        pdf_base64: options.pdfBase64
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server returned status ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || !data.exam) {
      throw new Error(data.error || 'Failed to generate valid exam format.');
    }

    // Client-side safety assertion: ensure verification report exists
    let verifiedExam = data.exam;
    let testReport = data.testReport;
    if (!testReport) {
      const checkResult = verifyAndOptimizeExam(verifiedExam);
      verifiedExam = checkResult.exam;
      testReport = checkResult.report;
    }

    return {
      success: true,
      exam: verifiedExam,
      testReport: testReport
    };
  } catch (err: any) {
    console.error('AI Exam Generation Error:', err.message);
    throw new Error(err.message || 'Không thể tạo đề thi bằng AI. Vui lòng kiểm tra lại kết nối mạng hoặc sử dụng tính năng trích xuất đề từ file PDF / văn bản.');
  }
}

/**
 * Parse an uploaded IELTS Exam PDF Base64 string into structured Exam JSON using server-side Gemini
 */
export async function parsePdfWithGemini(pdfBase64: string, _customApiKey?: string): Promise<string> {
  const result = await parsePdfWithServerGemini(pdfBase64);
  return JSON.stringify(result.exam, null, 2);
}

/**
 * Server-backed PDF and document parser with automated pre-flight testing
 */
export async function parsePdfWithServerGemini(pdfBase64: string, text?: string): Promise<{ success: boolean; exam: ExamData; testReport: ExamTestReport }> {
  const response = await fetch('/api/parse-exam', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pdf_base64: pdfBase64, text: text })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Server parser error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.success || !data.exam) {
    throw new Error(data.error || 'Could not parse document into IELTS Exam JSON.');
  }

  // Ensure verified
  let verifiedExam = data.exam;
  let testReport = data.testReport;
  if (!testReport) {
    const verified = verifyAndOptimizeExam(verifiedExam);
    verifiedExam = verified.exam;
    testReport = verified.report;
  }

  return {
    success: true,
    exam: verifiedExam,
    testReport: testReport
  };
}

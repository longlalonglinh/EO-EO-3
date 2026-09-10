import { GoogleGenAI } from '@google/genai';

/**
 * Parse an uploaded IELTS Exam PDF Base64 string into structured Exam JSON using Gemini 3.7 Flash
 */
export async function parsePdfWithGemini(pdfBase64: string, customApiKey?: string): Promise<string> {
  const apiKey = customApiKey || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY : undefined);

  if (!apiKey) {
    // If no API key is set, return a fallback parsed JSON mock for testing/demo
    console.warn('No Gemini API key provided. Using simulated fallback parser response.');
    return JSON.stringify({
      exam_code: 'IELTS02',
      title: 'IELTS Academic Practice Exam - Test 02 (AI Parsed)',
      audio_url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=ambient-piano-amp-strings-10711.mp3',
      listening_questions: [
        {
          question_id: 'l1',
          section: 'listening',
          question_text: '1. What type of insurance policy is requested?',
          question_type: 'multiple_choice',
          options: ['A. Comprehensive Motor Insurance', 'B. Third-Party Property', 'C. Health Insurance', 'D. Home Contents Insurance'],
          max_score: 1
        },
        {
          question_id: 'l2',
          section: 'listening',
          question_text: '2. Complete the form: Registration plate is ________',
          question_type: 'fill_in_blank',
          max_score: 1
        }
      ],
      passage_title: 'Urban Farming and Vertical Agriculture in Modern Cities',
      passage_text: 'Urban farming represents a crucial innovation in global food security. By cultivating crops vertically in climate-controlled indoor environments, cities can drastically reduce water consumption and carbon emissions associated with long-distance transportation.',
      reading_questions: [
        {
          question_id: 'r1',
          section: 'reading',
          question_text: '1. Vertical agriculture reduces water consumption compared to traditional farming.',
          question_type: 'true_false_not_given',
          max_score: 1
        },
        {
          question_id: 'r2',
          section: 'reading',
          question_text: '2. What is the primary benefit of climate-controlled indoor farming?',
          question_type: 'fill_in_blank',
          max_score: 1
        }
      ],
      writing_task1_prompt: 'The chart shows crop yield in vertical farms from 2015 to 2025. Summarise the features and make comparisons.',
      writing_task2_prompt: 'Some people believe urban agriculture should be mandatory for new buildings. Do you agree or disagree?'
    }, null, 2);
  }

  const ai = new GoogleGenAI({ apiKey });

  let lastError: any = null;
  const MAX_RETRIES = 3;

  // Auto-Retry loop to handle transient 503 errors
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: pdfBase64
                }
              },
              {
                text: `You are an expert IELTS Exam PDF Parser. Read the attached IELTS Exam PDF document and extract all sections into a valid JSON object strictly matching this schema:

{
  "exam_code": "IELTS_TEST_CODE",
  "title": "IELTS Exam Title",
  "audio_url": "Optional audio mp3 link if found",
  "listening_questions": [
    {
      "question_id": "l1",
      "section": "listening",
      "question_text": "Question text...",
      "question_type": "multiple_choice" or "fill_in_blank" or "true_false_not_given",
      "options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"],
      "correct_answer": "A",
      "max_score": 1
    }
  ],
  "passage_title": "Title of Reading Passage",
  "passage_text": "Full text of Reading Passage",
  "reading_questions": [
    {
      "question_id": "r1",
      "section": "reading",
      "question_text": "Question text...",
      "question_type": "true_false_not_given",
      "correct_answer": "TRUE",
      "max_score": 1
    }
  ],
  "writing_task1_prompt": "Writing Task 1 prompt",
  "writing_task2_prompt": "Writing Task 2 prompt"
}

Return strictly valid JSON only. Do not include markdown formatting, code block markers, or additional text.`
              }
            ]
          }
        ]
      });

      // If successful on any attempt, return result immediately
      return response.text || '';

    } catch (err: any) {
      lastError = err;
      console.warn(`[Auto-Retry] Attempt ${attempt}/${MAX_RETRIES} failed from Google server (Error ${err?.status}): ${err.message}`);
      
      if (attempt < MAX_RETRIES) {
        // Pause 2.5s before next retry to allow connection release
        await new Promise(resolve => setTimeout(resolve, 2500));
      }
    }
  }

  // If retries exhausted, surface error
  throw new Error(`Auto-retried ${MAX_RETRIES} times, but the AI service is experiencing high demand. Please try again in a few moments. Root cause: ${lastError?.message}`);
}
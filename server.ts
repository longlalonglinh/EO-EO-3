import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const __dirname = process.cwd();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // AI Exam Parser using Gemini 2.5 Flash
  app.post('/api/parse-exam', async (req, res) => {
    try {
      const { text, pdf_base64 } = req.body;
      const apiKey = process.env.GEMINI_API_KEY || 'AQ.Ab8RN6J8TwSqeuTmSr4Jg_CcHeJ7smPZleTAm3obPxLmEPSqYA';

      if (!apiKey) {
        return res.status(400).json({
          success: false,
          error: 'GEMINI_API_KEY chưa được cấu hình trong môi trường.'
        });
      }

      if (!text && !pdf_base64) {
        return res.status(400).json({
          success: false,
          error: 'Thiếu nội dung văn bản hoặc PDF base64 để xử lý.'
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      const systemPrompt = `You are an expert IELTS Exam Parser. Your job is to analyze raw IELTS test text or PDF contents and convert it into a strictly formatted JSON object matching this schema:

{
  "exam_code": "TEST_AI_01",
  "title": "IELTS Academic Practice Exam",
  "test_type": "TEST",
  "duration_mins": 120,
  "audio_url": "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=english-conversation-11823.mp3",
  "reading_passage_title": "Passage Title Here",
  "reading_passage": "Full passage text with paragraphs marked...",
  "writing_task1_prompt": "Task 1 prompt...",
  "writing_task2_prompt": "Task 2 prompt...",
  "questions": [
    {
      "question_id": "L1",
      "section": "listening",
      "question_text": "Question text...",
      "question_type": "multiple_choice",
      "options": ["A. Option 1", "B. Option 2", "C. Option 3"],
      "correct_answer": "A",
      "max_score": 1
    }
  ]
}

Return ONLY raw valid JSON, without any markdown code fences (\`\`\`json).`;

      const contents: any[] = [{ text: systemPrompt }];
      
      if (text) {
        contents.push({ text: `Analyze and extract IELTS exam data from this text:\n\n${text}` });
      }

      if (pdf_base64) {
        contents.push({
          inlineData: {
            mimeType: 'application/pdf',
            data: pdf_base64.replace(/^data:application\/pdf;base64,/, '')
          }
        });
        contents.push({ text: "Extract the IELTS Listening, Reading passage, Writing tasks, and Questions with options and correct answers." });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: contents,
      });

      const responseText = response.text || '';
      // Clean potential JSON markdown wrapping
      const cleanedJsonText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedExam = JSON.parse(cleanedJsonText);

      return res.json({
        success: true,
        exam: parsedExam
      });

    } catch (err: any) {
      console.error('Gemini Parsing Error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Lỗi xử lý file đề thi bằng AI.'
      });
    }
  });

  // Vite development middleware or static production serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server IELTS Exam System running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

import { ExamData, Question, QuestionType, ReadingPassageItem } from '../types';

export interface ParsedDocumentResult {
  exam: Partial<ExamData>;
  questionsCount: number;
  hasPassage: boolean;
  hasListening: boolean;
  hasWriting: boolean;
  detectedTitle: string;
  passageCount: number;
}

/**
 * Extracts Answer Key mapping from the document if an answers block is present.
 * Supports diverse formats:
 * - "Answer Key:", "Answers:", "ĐÁP ÁN:", "KEYS:", "Answers for Reading Passage 1"
 * - Multi-line answers: "1. TRUE", "2. B", "3) NOT GIVEN", "4: 1985", "5 - photosynthesis"
 * - In-line answers: "1. B  2. C  3. A  4. TRUE"
 * - Tabular / column answers: "1 | B", "1 B", "1\tB"
 */
export function extractAnswerKeyMap(text: string): { map: Map<number, string>; cleanText: string } {
  const map = new Map<number, string>();
  let cleanText = text;

  // Search for Answer Key section heading
  const answerKeyHeadingRegex = /(?:(?:\n|\r\n)\s*(?:(?:ANSWER|MODEL|TEST)\s*(?:KEYS?|SOLUTIONS?)|ANSWERS?|ĐÁP\s*ÁN|BẢNG\s*ĐÁP\s*ÁN|KEYS?)(?:\s*(?:FOR|TO)?\s*(?:QUESTIONS|TEST|PASSAGES?|READING|LISTENING)?\s*\d*(?:-\d*)?)?\s*[:\-\n])([\s\S]*)$/i;
  const match = text.match(answerKeyHeadingRegex);

  if (match && match[1] && match.index !== undefined) {
    const rawAnswers = match[1];
    // Cut the answer key block from text so it does not get treated as questions
    cleanText = text.substring(0, match.index).trim();

    // Regex 1: "1. TRUE", "1) B", "1: NOT GIVEN", "1 - word", "1 | A"
    const entryRegex = /(?:^|[\s,;|])(\d{1,2})[\.\)\:\-\|\s]\s*([^\n\r,;|]+)/g;
    let entryMatch;
    while ((entryMatch = entryRegex.exec(rawAnswers)) !== null) {
      const qNum = parseInt(entryMatch[1], 10);
      let ansVal = entryMatch[2].trim();
      // Strip trailing numbering if accidentally caught
      ansVal = ansVal.replace(/\s+\d{1,2}[\.\)\:\-].*$/, '').trim();
      if (!isNaN(qNum) && qNum >= 1 && qNum <= 50 && ansVal && ansVal.length <= 80) {
        if (!map.has(qNum)) {
          map.set(qNum, ansVal);
        }
      }
    }

    // Regex 2: Compact series like "1. A  2. B  3. C  4. D"
    if (map.size === 0) {
      const compactRegex = /(\d{1,2})\s*[\.\:\-\)]\s*([A-Za-z0-9\/\s\-]+?)(?=(?:\s+\d{1,2}[\.\:\-\)])|$)/g;
      let cMatch;
      while ((cMatch = compactRegex.exec(rawAnswers)) !== null) {
        const qNum = parseInt(cMatch[1], 10);
        const ansVal = cMatch[2].trim();
        if (!isNaN(qNum) && qNum >= 1 && qNum <= 50 && ansVal) {
          map.set(qNum, ansVal);
        }
      }
    }
  }

  return { map, cleanText };
}

/**
 * Extracts Writing Tasks 1 & 2 if present in the document
 */
export function extractWritingTasks(text: string): {
  task1?: string;
  task2?: string;
  cleanText: string;
} {
  let cleanText = text;
  let task1: string | undefined;
  let task2: string | undefined;

  // Match Writing Task 1
  const task1Regex = /(?:WRITING\s*TASK\s*1|TASK\s*1)[\s\S]*?(?=WRITING\s*TASK\s*2|TASK\s*2|$)/i;
  const match1 = text.match(task1Regex);
  if (match1) {
    task1 = match1[0].trim();
    cleanText = cleanText.replace(match1[0], '');
  }

  // Match Writing Task 2
  const task2Regex = /(?:WRITING\s*TASK\s*2|TASK\s*2)[\s\S]*?$/i;
  const match2 = text.match(task2Regex);
  if (match2) {
    task2 = match2[0].trim();
    cleanText = cleanText.replace(match2[0], '');
  }

  return { task1, task2, cleanText };
}

/**
 * Extracts Multiple Choice options from question block text.
 * Handles both multiline:
 *   A. Option text
 *   B. Option text
 * and inline:
 *   A. Option 1  B. Option 2  C. Option 3  D. Option 4
 * as well as lowercase and parenthesized variants:
 *   (A) Option 1  (B) Option 2
 */
export function extractOptions(text: string): { options: string[]; cleanQuestionText: string } {
  const lines = text.split(/\r?\n/);
  const options: string[] = [];
  const questionLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const optMatch = line.match(/^[\(\[]?([A-Ha-h])[\.\)\]\:\-]?\s+(.*)$/);
    if (optMatch && (options.length > 0 || optMatch[1].toUpperCase() === 'A')) {
      const letter = optMatch[1].toUpperCase();
      const expectedChar = String.fromCharCode(65 + options.length);
      if (letter === expectedChar) {
        options.push(`${letter}. ${optMatch[2].trim()}`);
        continue;
      }
    }

    if (options.length === 0) {
      questionLines.push(lines[i]);
    } else if (options.length > 0) {
      options[options.length - 1] += ' ' + line;
    }
  }

  if (options.length >= 2) {
    return {
      options,
      cleanQuestionText: questionLines.join('\n').trim()
    };
  }

  // Fallback to inline options on single line: "A. Option 1 B. Option 2 C. Option 3 D. Option 4"
  const inlineRegex = /(?:^|\s+)(?:[\(\[]?([A-Da-d])[\.\)\]\:\-])\s+([^A-D\n\r]+?)(?=(?:\s+[\(\[]?[A-Da-d][\.\)\]\:\-])|$)/g;
  const inlineMatches: { letter: string; text: string; full: string; index: number }[] = [];
  let im;
  while ((im = inlineRegex.exec(text)) !== null) {
    inlineMatches.push({ letter: im[1].toUpperCase(), text: im[2].trim(), full: im[0], index: im.index });
  }

  if (inlineMatches.length >= 2 && inlineMatches[0].letter === 'A') {
    const inlineOpts = inlineMatches.map(m => `${m.letter}. ${m.text}`);
    const cleanText = text.substring(0, inlineMatches[0].index).trim();
    return { options: inlineOpts, cleanQuestionText: cleanText };
  }

  return { options: [], cleanQuestionText: text };
}

/**
 * Extracts List of Headings (Roman numerals i, ii, iii, iv, v, vi, vii, viii, ix, x)
 */
export function extractListOfHeadings(text: string): { headings: string[]; cleanText: string } {
  const headings: string[] = [];
  const lines = text.split(/\r?\n/);
  const cleanLines: string[] = [];
  let inHeadingsBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (/^(?:List\s+of\s+Headings|LIST\s+OF\s+HEADINGS)\b/i.test(line)) {
      inHeadingsBlock = true;
      continue;
    }

    if (inHeadingsBlock) {
      const romanMatch = line.match(/^[\(\[]?([ivxlcdm]+)[\.\)\:\-]?\s+(.+)$/i);
      if (romanMatch) {
        headings.push(`${romanMatch[1].toLowerCase()}. ${romanMatch[2].trim()}`);
        continue;
      }
      if (!line) continue;
      if (/^(?:questions?\s*\d+|\d{1,2}[\.\)\:\-]|paragraph|[A-Z]\b)/i.test(line)) {
        inHeadingsBlock = false;
        cleanLines.push(lines[i]);
        continue;
      }
    }

    cleanLines.push(lines[i]);
  }

  return { headings, cleanText: cleanLines.join('\n') };
}

/**
 * Determines QuestionType from instruction block, question text, extracted options, and detected answer
 */
export function determineQuestionType(
  instruction: string, 
  qText: string, 
  optionsCount: number, 
  detectedAnswer?: string
): QuestionType {
  const combined = (instruction + ' ' + qText).toLowerCase();
  const ansUpper = (detectedAnswer || '').trim().toUpperCase();

  // 1. Multiple Choice with Multiple Answers: Choose TWO or THREE letters
  if (
    combined.includes('choose two') ||
    combined.includes('choose three') ||
    combined.includes('choose 2') ||
    combined.includes('choose 3') ||
    /choose\s+(?:two|three|2|3)\s+letters/i.test(combined)
  ) {
    return 'multiple_choice_multi';
  }

  // 2. Matching Headings
  if (
    combined.includes('list of headings') ||
    combined.includes('choose the correct heading') ||
    combined.includes('choose the heading') ||
    (combined.includes('heading') && /paragraph\s+[a-g]/i.test(qText))
  ) {
    return 'matching_headings';
  }

  // 3. Matching Information: Which paragraph contains the following information?
  if (
    combined.includes('which paragraph contains') ||
    combined.includes('which section contains') ||
    (combined.includes('which paragraph') && (combined.includes('information') || combined.includes('following'))) ||
    combined.includes('you may use any letter more than once')
  ) {
    return 'matching_information';
  }

  // 4. Matching Features: Match each statement with the correct person / researcher / country / theory
  if (
    (combined.includes('match each') || combined.includes('look at the following')) &&
    (combined.includes('person') || combined.includes('people') || combined.includes('researcher') || combined.includes('scientist') || combined.includes('expert') || combined.includes('writer') || combined.includes('country') || combined.includes('organisation') || combined.includes('organization') || combined.includes('theory'))
  ) {
    return 'matching_features';
  }

  // 5. Matching Sentence Endings: Complete each sentence with the correct ending
  if (
    combined.includes('sentence ending') ||
    (combined.includes('ending') && combined.includes('sentence')) ||
    combined.includes('complete each sentence with the correct ending')
  ) {
    return 'matching_sentence_endings';
  }

  // 6. Generic Matching if not specialized
  if (
    combined.includes('which paragraph') ||
    combined.includes('which section') ||
    combined.includes('match each') ||
    combined.includes('look at the following')
  ) {
    return 'matching_features';
  }

  // 7. Multiple Choice (Single)
  if (optionsCount >= 2) {
    return 'multiple_choice';
  }

  // 8. True / False / Not Given
  if (
    (combined.includes('true') && (combined.includes('false') || combined.includes('not given'))) ||
    combined.includes('agree with the information') ||
    ansUpper === 'TRUE' || ansUpper === 'FALSE' || ansUpper === 'NOT GIVEN'
  ) {
    return 'true_false_not_given';
  }

  // 9. Yes / No / Not Given
  if (
    (combined.includes('yes') && (combined.includes('no') || combined.includes('not given'))) ||
    combined.includes('agree with the claims') ||
    combined.includes('agree with the views') ||
    ansUpper === 'YES' || ansUpper === 'NO'
  ) {
    return 'yes_no_not_given';
  }

  // 10. Summary with Box / Wordlist
  if (
    combined.includes('summary') &&
    (combined.includes('box') || combined.includes('list of words') || combined.includes('wordlist') || combined.includes('words a-') || combined.includes('words a–'))
  ) {
    return 'summary_completion_box';
  }

  // 11. Table Completion
  if (combined.includes('table') && (combined.includes('complete') || combined.includes('no more than') || combined.includes('below'))) {
    return 'table_completion';
  }

  // 12. Flow-chart Completion
  if (combined.includes('flow-chart') || combined.includes('flowchart')) {
    return 'flow_chart_completion';
  }

  // 13. Diagram Label Completion
  if (combined.includes('diagram') || combined.includes('label the diagram') || combined.includes('plan') || combined.includes('map')) {
    return 'diagram_label_completion';
  }

  // 14. Sentence Completion
  if (
    combined.includes('sentence') && 
    (combined.includes('complete') || combined.includes('no more than') || combined.includes('words'))
  ) {
    return 'sentence_completion';
  }

  // 15. Summary Completion
  if (combined.includes('summary') || combined.includes('notes')) {
    return 'summary_completion';
  }

  // 16. Short Answer Questions
  if (combined.includes('short answer') || (combined.includes('answer the questions') && combined.includes('no more than'))) {
    return 'short_answer_questions';
  }

  // 17. Fill in the Blank / Completion
  if (
    combined.includes('complete') || 
    combined.includes('no more than') || 
    combined.includes('fill') ||
    combined.includes('blank') ||
    qText.includes('____') ||
    qText.includes('....') ||
    qText.includes('[...]')
  ) {
    return 'fill_in_blank';
  }

  return 'fill_in_blank';
}

/**
 * Normalizes answer according to question type
 */
function normalizeAnswerByType(rawAns: string, qType: QuestionType, options: string[]): string {
  const trimmed = rawAns.trim();
  if (!trimmed) {
    if (qType === 'true_false_not_given') return 'TRUE';
    if (qType === 'yes_no_not_given') return 'YES';
    if (qType === 'multiple_choice' && options.length > 0) return 'A';
    return '';
  }

  const upper = trimmed.toUpperCase();

  if (qType === 'true_false_not_given') {
    if (upper === 'T' || upper.startsWith('TRUE')) return 'TRUE';
    if (upper === 'F' || upper.startsWith('FALSE')) return 'FALSE';
    if (upper === 'NG' || upper.includes('NOT GIVEN')) return 'NOT GIVEN';
    return 'TRUE';
  }

  if (qType === 'yes_no_not_given') {
    if (upper === 'Y' || upper.startsWith('YES')) return 'YES';
    if (upper === 'N' || upper.startsWith('NO')) return 'NO';
    if (upper === 'NG' || upper.includes('NOT GIVEN')) return 'NOT GIVEN';
    return 'YES';
  }

  if (qType === 'multiple_choice') {
    // If answer is single letter A, B, C, D
    const letterMatch = upper.match(/^[A-H]$/);
    if (letterMatch) return letterMatch[0];

    // If answer matches an option text e.g. "Polonium and radium"
    const matchedOpt = options.find(opt => 
      opt.toLowerCase().includes(trimmed.toLowerCase()) || 
      trimmed.toLowerCase().includes(opt.slice(3).toLowerCase())
    );
    if (matchedOpt) {
      return matchedOpt.slice(0, 1).toUpperCase();
    }
    return upper.slice(0, 1) || 'A';
  }

  return trimmed;
}

/**
 * Parses all questions from a questions text block
 */
export function parseQuestionsList(
  questionsBlock: string, 
  section: 'listening' | 'reading',
  answerKeyMap: Map<number, string>,
  availableHeadings?: string[]
): Question[] {
  const questions: Question[] = [];
  if (!questionsBlock || !questionsBlock.trim()) return questions;

  const lines = questionsBlock.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  let currentInstruction = '';
  let currentQNum: number | null = null;
  let currentQTextLines: string[] = [];

  const flushQuestion = () => {
    if (currentQNum !== null && currentQTextLines.length > 0) {
      const fullText = currentQTextLines.join('\n');
      const { options, cleanQuestionText } = extractOptions(fullText);

      // Check inline answer key in question text e.g. "(Answer: B)" or "[Key: TRUE]"
      let detectedAnswer = answerKeyMap.get(currentQNum) || '';
      const inlineAnsMatch = cleanQuestionText.match(/(?:[\(\[]\s*(?:Answer|Key|Đáp\s*án)\s*[:\-]\s*([^\)\]]+)[\)\]])/i);
      let finalText = cleanQuestionText;
      if (inlineAnsMatch) {
        if (!detectedAnswer) detectedAnswer = inlineAnsMatch[1].trim();
        finalText = cleanQuestionText.replace(inlineAnsMatch[0], '').trim();
      }

      const qType = determineQuestionType(currentInstruction, finalText, options.length, detectedAnswer);

      // Format options based on question type
      let finalOptions = options;
      if (qType === 'true_false_not_given') {
        finalOptions = ['TRUE', 'FALSE', 'NOT GIVEN'];
      } else if (qType === 'yes_no_not_given') {
        finalOptions = ['YES', 'NO', 'NOT GIVEN'];
      } else if (qType === 'matching_headings' && availableHeadings && availableHeadings.length > 0) {
        finalOptions = availableHeadings;
      }

      // Clean & normalize answer
      const cleanAnswer = normalizeAnswerByType(detectedAnswer, qType, finalOptions);

      const qId = section === 'listening' ? `L${currentQNum}` : `R${currentQNum}`;

      questions.push({
        question_id: qId,
        section: section,
        question_type: qType,
        question_text: finalText || `Question ${currentQNum}`,
        options: finalOptions.length > 0 ? finalOptions : undefined,
        correct_answer: cleanAnswer || (qType === 'multiple_choice' ? 'A' : qType === 'true_false_not_given' ? 'TRUE' : 'answer'),
        acceptable_answers: cleanAnswer ? [cleanAnswer] : undefined,
        instruction: currentInstruction || undefined,
        max_score: 1,
        explanation: detectedAnswer 
          ? `Extracted from document answer key: ${detectedAnswer}`
          : undefined
      });
    }

    currentQNum = null;
    currentQTextLines = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Ignore page headers/footers e.g. "Page 3 of 12", "12 / 16"
    if (/^page\s+\d+/i.test(line) || /^\d+\s*[\/|]\s*\d+$/.test(line)) {
      continue;
    }

    // 1. Detect instruction headers:
    // "Questions 1-5", "Questions 1 to 5", "Questions 1–7", "Câu hỏi 1-5", "Do the following statements agree..."
    if (
      /^(?:questions?|câu\s*(?:hỏi\s*)?)\s*\d+\s*(?:[-–—~]|to|đến|tới|and)\s*\d+/i.test(line) ||
      /^questions?\s*$/i.test(line) ||
      /^câu\s*hỏi\s*[:\-\n]?$/i.test(line) ||
      /^do the following statements/i.test(line) ||
      /^choose the (?:correct\s+)?(?:letter|heading|number|words?|two|three)/i.test(line) ||
      /^complete the (?:summary|notes?|sentences?|table|form|diagram|flow-chart)/i.test(line) ||
      /^which (?:paragraph|section)/i.test(line) ||
      /^look at the following/i.test(line) ||
      /^label the (?:diagram|map|plan)/i.test(line) ||
      /^classify the following/i.test(line) ||
      /^in boxes \d+/i.test(line) ||
      /^read the (?:passage|text|following)/i.test(line)
    ) {
      flushQuestion();
      currentInstruction = line;
      // Lookahead up to 4 lines if subsequent lines are also part of instructions
      let lookahead = i + 1;
      while (
        lines[lookahead] && 
        !/^(?:question\s*|questions\s*|q\s*\.?\s*|câu\s*(?:hỏi\s*)?|bài\s*)?[\(\[]?(\d{1,2})[\.\)\:\-\]\|/]?\s*/i.test(lines[lookahead]) &&
        /^(?:write|in boxes|true if|false if|not given if|yes if|no if|no more than|you may use|choose|reading passage|there are|match|paragraph|for questions|những câu)/i.test(lines[lookahead])
      ) {
        currentInstruction += ' ' + lines[lookahead];
        i = lookahead;
        lookahead++;
      }
      continue;
    }

    // 2. Detect Question Number:
    // Matches:
    // - "1. Text", "1) Text", "1: Text", "1 - Text", "(1) Text", "[1] Text", "1/ Text", "1 Text"
    // - "Question 1: Text", "Q1: Text", "Câu 1: Text", "Câu hỏi 1: Text", "Bài 1: Text"
    // - Single number alone on its line: "1", "1.", "1)", "(1)", "[1]", "Q1", "Câu 1"
    const qMatch = line.match(/^(?:question\s*|questions\s*|q\s*\.?\s*|câu\s*(?:hỏi\s*)?|bài\s*)?[\(\[]?(\d{1,2})[\.\)\:\-\]\|/]?\s*(.*)$/i);
    if (qMatch) {
      const parsedNum = parseInt(qMatch[1], 10);
      // Ensure number is a valid question number between 1 and 50
      if (!isNaN(parsedNum) && parsedNum >= 1 && parsedNum <= 50) {
        flushQuestion();
        currentQNum = parsedNum;
        if (qMatch[2] && qMatch[2].trim()) {
          currentQTextLines.push(qMatch[2].trim());
        }
        continue;
      }
    }

    // 3. Detect embedded blank in line:
    // e.g. "Edmond Becquerel discovered the photovoltaic effect in (1) ..........."
    // e.g. "1 ..........."
    const embeddedBlankMatch = line.match(/^([^\d\n\r]*?)[\(\[]?(\d{1,2})[\)\]]?\s*[\._–-]{3,}(.*)$/);
    if (embeddedBlankMatch) {
      const parsedNum = parseInt(embeddedBlankMatch[2], 10);
      if (!isNaN(parsedNum) && parsedNum >= 1 && parsedNum <= 50) {
        flushQuestion();
        currentQNum = parsedNum;
        currentQTextLines.push(line);
        continue;
      }
    }

    // If we haven't started a question yet and line is non-empty, treat as instruction context
    if (currentQNum === null) {
      currentInstruction = (currentInstruction ? currentInstruction + ' ' : '') + line;
      continue;
    }

    // Continuation of question text or options
    currentQTextLines.push(line);
  }

  // Flush the final question
  flushQuestion();

  return questions;
}

/**
 * Extracts a Reading Passage and separates it from its Questions Block.
 * Handles both:
 * 1. Passage followed by Questions (standard)
 * 2. Questions followed by Passage (e.g. matching headings placed before passage)
 */
export function extractPassageAndQuestions(text: string, passageIndex: number = 1): {
  title: string;
  passageText: string;
  questionsBlock: string;
  headingsList: string[];
} {
  // Extract list of headings if present
  const { headings: headingsList, cleanText } = extractListOfHeadings(text);

  const lines = cleanText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  let title = `IELTS Reading Passage ${passageIndex}`;
  let passageStartIdx = 0;

  // Header pattern e.g. "READING PASSAGE 1", "PASSAGE 1", "SECTION 1", "BÀI ĐỌC 1"
  const headerRegex = new RegExp(`^(?:READING\\s*PASSAGE|PASSAGE|SECTION|PART|BÀI\\s*ĐỌC)\\s*${passageIndex}\\b`, 'i');
  let passageHeaderIdx = lines.findIndex(l => headerRegex.test(l));

  if (passageHeaderIdx === -1 && passageIndex === 1) {
    passageHeaderIdx = lines.findIndex(l => /^(?:READING\s*PASSAGE|PASSAGE|SECTION|PART|BÀI\\s*ĐỌC)\\s*\d*/i.test(l));
  }

  if (passageHeaderIdx >= 0) {
    let nextIdx = passageHeaderIdx + 1;
    // Skip "You should spend about 20 minutes on Questions..."
    if (lines[nextIdx] && /you should spend/i.test(lines[nextIdx])) {
      nextIdx++;
    }
    // Check if next line is passage title
    if (lines[nextIdx] && lines[nextIdx].length < 120 && !/^(?:questions|câu|q\s*\.?|\d+[\.\)\:\-])/i.test(lines[nextIdx])) {
      title = lines[nextIdx];
      passageStartIdx = nextIdx + 1;
    } else {
      passageStartIdx = passageHeaderIdx + 1;
    }
  } else {
    // If no header, first line might be the title
    if (lines[0] && lines[0].length < 100 && !/^(?:questions|câu|q\s*\.?|\d+[\.\)\:\-])/i.test(lines[0])) {
      title = lines[0];
      passageStartIdx = 1;
    }
  }

  // Find where questions start:
  // - "Questions X-Y", "Questions 1-5", "Câu hỏi 1-5"
  // - "Complete the...", "Do the following...", "Choose the..."
  // - Question number starting a line: e.g. "1.", "14.", "27.", "Câu 1", "Q1:"
  let questionsStartLineIdx = lines.findIndex((l, idx) => 
    idx >= passageStartIdx && (
      /^(?:questions?|câu\s*(?:hỏi\s*)?)\s*\d+/i.test(l) ||
      /^(?:do the following statements|choose the correct letter|complete the (?:summary|notes?|sentences?|table))/i.test(l) ||
      /^\s*(?:question\s*|q\s*\.?\s*|câu\s*(?:hỏi\s*)?|bài\s*)?[\(\[]?(\d{1,2})[\.\)\:\-\]\|/]?\s*/i.test(l)
    )
  );

  let passageText = '';
  let questionsBlock = '';

  if (questionsStartLineIdx > passageStartIdx) {
    // Normal case: Passage comes first, followed by Questions
    passageText = lines.slice(passageStartIdx, questionsStartLineIdx).join('\n\n');
    questionsBlock = lines.slice(questionsStartLineIdx).join('\n');
  } else if (questionsStartLineIdx >= 0) {
    // Questions are at the beginning (e.g. Matching Headings or pure questions document)
    // Check if there is a passage header/title line AFTER the questions
    const passageAfterIdx = lines.findIndex((l, idx) => 
      idx > questionsStartLineIdx && 
      (headerRegex.test(l) || /^(?:the\s+[A-Z]|passage\s+\d+|bài\s*đọc)/i.test(l))
    );

    if (passageAfterIdx > questionsStartLineIdx) {
      questionsBlock = lines.slice(questionsStartLineIdx, passageAfterIdx).join('\n');
      passageText = lines.slice(passageAfterIdx).join('\n\n');
    } else {
      // Entire text is questions
      questionsBlock = cleanText;
      passageText = '';
    }
  } else {
    // Fallback search in cleanText
    const testQs = parseQuestionsList(cleanText, 'reading', new Map());
    if (testQs.length > 0) {
      questionsBlock = cleanText;
      passageText = '';
    } else {
      passageText = cleanText;
      questionsBlock = '';
    }
  }

  return { title, passageText, questionsBlock, headingsList };
}

/**
 * Splits multi-passage document into individual passage texts
 * e.g. "READING PASSAGE 1 ... READING PASSAGE 2 ... READING PASSAGE 3"
 */
function splitMultiPassage(text: string): { passagesRaw: string[]; isMultiPassage: boolean } {
  const lines = text.split(/\r?\n/);
  const passageIndices: { lineIdx: number; pNum: number }[] = [];
  
  lines.forEach((l, idx) => {
    const m = l.trim().match(/^(?:READING\s*PASSAGE|PASSAGE|SECTION|PART|BÀI\s*ĐỌC)\s*([1-3]|ONE|TWO|THREE|I|II|III)\b/i);
    if (m) {
      let pNum = 1;
      const rawNum = m[1].toUpperCase();
      if (rawNum === '1' || rawNum === 'ONE' || rawNum === 'I') pNum = 1;
      else if (rawNum === '2' || rawNum === 'TWO' || rawNum === 'II') pNum = 2;
      else if (rawNum === '3' || rawNum === 'THREE' || rawNum === 'III') pNum = 3;
      passageIndices.push({ lineIdx: idx, pNum });
    }
  });

  if (passageIndices.length <= 1) {
    return { passagesRaw: [text], isMultiPassage: false };
  }

  const sections: string[] = [];
  for (let i = 0; i < passageIndices.length; i++) {
    const startLine = passageIndices[i].lineIdx;
    const endLine = i + 1 < passageIndices.length ? passageIndices[i + 1].lineIdx : lines.length;
    sections.push(lines.slice(startLine, endLine).join('\n').trim());
  }

  return { passagesRaw: sections, isMultiPassage: true };
}

/**
 * Master Document & Text Exam Parser.
 * Accurately parses IELTS exams from raw text extracted from PDF or pasted curriculum,
 * preserving ALL questions without hardcoded mock question injections.
 */
export function parseExamFromDocumentText(rawText: string): ParsedDocumentResult {
  if (!rawText || !rawText.trim()) {
    return {
      exam: {},
      questionsCount: 0,
      hasPassage: false,
      hasListening: false,
      hasWriting: false,
      detectedTitle: 'IELTS Academic Exam',
      passageCount: 0
    };
  }

  // 1. Extract Answer Key map if present at end of text
  const { map: answerKeyMap, cleanText: textWithoutAnswers } = extractAnswerKeyMap(rawText);

  // 2. Extract Writing Tasks 1 & 2
  const { task1, task2, cleanText: textWithoutWriting } = extractWritingTasks(textWithoutAnswers);

  // 3. Partition Listening vs Reading if both exist
  let listeningText = '';
  let readingText = textWithoutWriting;

  const listeningSplitMatch = textWithoutWriting.match(/(?:LISTENING\s*SECTION|LISTENING\s*TEST|SECTION\s*1\s*[:\-\n])([\s\S]*?)(?=READING\s*PASSAGE|READING\s*TEST|$)/i);
  if (listeningSplitMatch) {
    listeningText = listeningSplitMatch[0];
    readingText = textWithoutWriting.replace(listeningSplitMatch[0], '');
  }

  // 4. Handle Reading Passages (Single or Multi-passage)
  const { passagesRaw, isMultiPassage } = splitMultiPassage(readingText);
  const passagesList: ReadingPassageItem[] = [];
  const allReadingQuestions: Question[] = [];
  let mainTitle = '';
  let mainPassageText = '';

  passagesRaw.forEach((pRaw, idx) => {
    const pIndex = ((idx + 1) >= 1 && (idx + 1) <= 3 ? (idx + 1) : 1) as 1 | 2 | 3;
    const { title, passageText, questionsBlock, headingsList } = extractPassageAndQuestions(pRaw, pIndex);
    const pQuestions = parseQuestionsList(questionsBlock, 'reading', answerKeyMap, headingsList);

    if (idx === 0) {
      mainTitle = title;
      mainPassageText = passageText;
    }

    if (passageText || pQuestions.length > 0) {
      passagesList.push({
        passage_index: pIndex,
        title: title,
        text: passageText,
        questions: pQuestions
      });
    }

    allReadingQuestions.push(...pQuestions);
  });

  // 5. Extract Listening Questions if present
  let listeningQuestions: Question[] = [];
  if (listeningText) {
    listeningQuestions = parseQuestionsList(listeningText, 'listening', answerKeyMap);
  }

  let allQuestions = [...listeningQuestions, ...allReadingQuestions];

  // ULTIMATE SAFETY NET: If 0 questions were extracted, scan the entire text directly!
  if (allQuestions.length === 0) {
    const directScanQs = parseQuestionsList(textWithoutWriting, 'reading', answerKeyMap);
    if (directScanQs.length > 0) {
      allReadingQuestions.push(...directScanQs);
      allQuestions = [...listeningQuestions, ...allReadingQuestions];
      if (passagesList.length > 0) {
        passagesList[0].questions = directScanQs;
      } else {
        passagesList.push({
          passage_index: 1,
          title: mainTitle || 'Reading Passage 1',
          text: mainPassageText,
          questions: directScanQs
        });
      }
    }
  }

  // If reading passage text was not separated, retain non-empty text
  if (!mainPassageText && textWithoutWriting) {
    mainPassageText = textWithoutWriting;
    if (passagesList.length > 0 && !passagesList[0].text) {
      passagesList[0].text = mainPassageText;
    }
  }

  // Calculate duration dynamically based on volume:
  // 1 passage (13 Qs) = 60 mins; 3 passages / full test (40 Qs) = 120 mins
  let durationMins = 60;
  if (allQuestions.length >= 25 || isMultiPassage) {
    durationMins = 120;
  } else if (allQuestions.length >= 15) {
    durationMins = 90;
  }

  const timestamp = Date.now().toString().slice(-6);
  const cleanTitle = mainTitle || (listeningQuestions.length > 0 ? 'IELTS Listening Practice Test' : 'IELTS Extracted Practice Test');
  const examCode = `IELTS_EXTRACTED_${timestamp}`;

  const exam: Partial<ExamData> = {
    exam_code: examCode,
    title: cleanTitle,
    test_type: 'TEST',
    duration_mins: durationMins,
    audio_url: listeningQuestions.length > 0
      ? 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=english-conversation-11823.mp3'
      : undefined,
    passage_title: cleanTitle,
    reading_passage_title: cleanTitle,
    passage_text: mainPassageText,
    reading_passage: mainPassageText,
    passages: passagesList.length > 0 ? passagesList : undefined,
    listening_questions: listeningQuestions.length > 0 ? listeningQuestions : undefined,
    reading_questions: allReadingQuestions.length > 0 ? allReadingQuestions : undefined,
    questions: allQuestions.length > 0 ? allQuestions : undefined,
    writing_task1_prompt: task1,
    writing_task1_image: (() => {
      if (!task1) return undefined;
      const imgMdMatch = task1.match(/!\[.*?\]\((https?:\/\/[^\s\)]+|data:image\/[^\s\)]+)\)/i);
      const imgTagMatch = task1.match(/\[(?:Image|Chart|Graphic|Biểu\s*đồ)\s*[:\-]\s*(https?:\/\/[^\s\]]+|data:image\/[^\s\]]+)\]/i);
      return imgMdMatch ? imgMdMatch[1] : (imgTagMatch ? imgTagMatch[1] : undefined);
    })(),
    writing_task2_prompt: task2,
    created_at: new Date().toISOString()
  };

  return {
    exam,
    questionsCount: allQuestions.length,
    hasPassage: Boolean(mainPassageText && mainPassageText.length > 50),
    hasListening: listeningQuestions.length > 0,
    hasWriting: Boolean(task1 || task2),
    detectedTitle: cleanTitle,
    passageCount: passagesList.length
  };
}

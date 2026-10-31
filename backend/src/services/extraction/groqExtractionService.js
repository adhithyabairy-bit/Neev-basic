/**
 * Groq-Powered Document Extraction Service for Neev Platform
 *
 * Provides intelligent, robust document extraction:
 * 1. Question Paper: Filters instructions/headers and extracts clean questions with max marks.
 * 2. Answer Sheet: Extracts student answers question-by-question with 100% verbatim fidelity
 *    (STRICT RULE: Never fixes spelling errors, arithmetic slips, or formula mistakes).
 * 3. Marking Scheme: Extracts reference solutions, scoring criteria, and key points per question.
 */

const GROQ_CLOUD_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';
const FALLBACK_MODELS = ['openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];

function getApiKey() {
  return process.env.GROQ_API_KEY || process.env.GROK_API_KEY || null;
}

/**
 * Executes a structured JSON chat completion with Groq Cloud.
 */
async function callGroqJson({ systemPrompt, userPrompt, timeoutMs = 25000 }) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('GROQ_API_KEY_MISSING');
  }

  const modelsToTry = [DEFAULT_GROQ_MODEL, ...FALLBACK_MODELS];
  let lastError = null;

  for (const model of modelsToTry) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(GROQ_CLOUD_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        if (response.status === 404 && modelsToTry.indexOf(model) < modelsToTry.length - 1) {
          console.warn(`[GroqExtraction] Model '${model}' returned 404, falling back...`);
          continue;
        }
        throw new Error(`Groq API HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from Groq API');
      }

      try {
        return JSON.parse(content);
      } catch (parseErr) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        throw parseErr;
      }
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
      if (err.name === 'AbortError') {
        break;
      }
    }
  }

  throw lastError || new Error('Groq extraction failed on all candidate models');
}

/**
 * 1. Extract questions and max marks from Question Paper PDF text.
 * Filters out school headers, instructions, candidate blanks.
 */
export async function extractQuestionsFromQuestionPaper(rawText, subject = '') {
  if (!rawText || !rawText.trim()) {
    return [];
  }

  const systemPrompt = `You are an expert examination paper parser.
Your task is to analyze raw text extracted from an examination question paper and output ONLY the genuine test questions with their assigned maximum marks.

CRITICAL PARSING RULES:
1. Filter out all non-question text:
   - School / Academy name, examination title, class, subject, date, time allowed.
   - Student name, roll number, section blanks.
   - General instructions (e.g. "All questions are compulsory", "Read each question carefully").
   - Section headers (e.g. "Section A", "Part 1").
2. Extract each genuine question with:
   - "questionNumber": "Q1", "Q2", "Q3", etc.
   - "prompt": The clean question statement / problem text.
   - "maxMarks": The numerical marks allocated for this question. If not explicitly specified, default to 3.
3. Preserve mathematical expressions and formulas accurately in standard notation.
4. Output ONLY valid JSON matching this schema:
{
  "questions": [
    {
      "questionNumber": "Q1",
      "prompt": "Solve the linear equation: 5x - 3 = 3x + 7 and verify your answer.",
      "maxMarks": 3
    }
  ]
}`;

  const userPrompt = `EXAM QUESTION PAPER RAW TEXT:
"""
${rawText}
"""

Extract all test questions with questionNumber, prompt, and maxMarks as JSON.`;

  try {
    const result = await callGroqJson({ systemPrompt, userPrompt });
    if (Array.isArray(result.questions) && result.questions.length > 0) {
      return result.questions.map((q, idx) => ({
        questionNumber: q.questionNumber || `Q${idx + 1}`,
        prompt: (q.prompt || '').trim(),
        maxMarks: Number(q.maxMarks) || 3,
      }));
    }
  } catch (err) {
    console.warn('[GroqExtraction] LLM Question extraction fallback:', err.message);
  }

  // Robust Heuristic Fallback if Groq unavailable
  return fallbackExtractQuestions(rawText);
}

/**
 * 2. Extract student answers matching questions with 100% verbatim fidelity.
 * STRICT RULE: Does NOT fix, modify, or correct any mistakes.
 */
export async function extractAnswersFromAnswerSheet(rawAnswerText, questionsList = []) {
  if (!rawAnswerText || !rawAnswerText.trim()) {
    return (questionsList || []).map((q, i) => ({
      questionNumber: q.questionNumber || `Q${i + 1}`,
      studentAnswer: '(No answer text provided)',
    }));
  }

  const questionsContext = (questionsList || [])
    .map((q) => `${q.questionNumber}: ${q.prompt || ''}`)
    .join('\n');

  const systemPrompt = `You are an objective document extraction assistant for student exam answer sheets.
Your job is to extract the student's written response for each question.

CRITICAL FIDELITY RULES:
1. Extract the student's EXACT answer text WITHOUT fixing, correcting, or normalizing ANY mistakes.
2. DO NOT correct spelling mistakes.
3. DO NOT correct arithmetic calculation slips or formula errors (e.g., if the student wrote "3(5)+7 = 23" or "x = 4", keep it EXACTLY as written).
4. DO NOT rephrase, polish, or complete unfinished student working.
5. If the student did not answer a question, write "(No answer provided)".
6. Map the answers to each question number (Q1, Q2, Q3...).

Output ONLY valid JSON matching this schema:
{
  "answers": [
    {
      "questionNumber": "Q1",
      "studentAnswer": "exact verbatim text of student answer for Q1"
    }
  ]
}`;

  const userPrompt = `EXAM QUESTIONS:
${questionsContext || 'Extract questions detected in the student work'}

STUDENT ANSWER SHEET RAW SCANNED TEXT:
"""
${rawAnswerText}
"""

Extract the exact verbatim student answer for each question as JSON.`;

  try {
    const result = await callGroqJson({ systemPrompt, userPrompt });
    if (Array.isArray(result.answers) && result.answers.length > 0) {
      return result.answers.map((a, idx) => ({
        questionNumber: a.questionNumber || `Q${idx + 1}`,
        studentAnswer: (a.studentAnswer || '').trim(),
      }));
    }
  } catch (err) {
    console.warn('[GroqExtraction] LLM Student Answer extraction fallback:', err.message);
  }

  // Robust Heuristic Fallback preserving exact verbatim text
  return fallbackExtractStudentAnswers(rawAnswerText, questionsList);
}

/**
 * 3. Extract reference solutions and scoring rubric from Marking Scheme PDF text.
 */
export async function extractRubricFromMarkingScheme(rawSchemeText, questionsList = []) {
  if (!rawSchemeText || !rawSchemeText.trim()) {
    return [];
  }

  const systemPrompt = `You are an educational assessment assistant.
Your task is to analyze raw text extracted from an official Marking Scheme / Solution Key and extract the model answer, scoring criteria, and allocated marks for each question.

CRITICAL RULES:
1. Extract each question's:
   - "questionNumber": "Q1", "Q2", etc.
   - "referenceAnswer": Complete expected model solution and correct final answer.
   - "keyPoints": Array of scoring steps / bullet points (e.g. ["Definition: 1 mark", "Example: 1 mark"]).
   - "maxMarks": Total marks for this question.
2. Filter out general examiner instructions and headers.

Output ONLY valid JSON:
{
  "rubric": [
    {
      "questionNumber": "Q1",
      "referenceAnswer": "A scientific model is a simplified representation...",
      "keyPoints": ["Definition: 1 mark", "Importance: 1 mark", "Example: 1 mark"],
      "maxMarks": 3
    }
  ]
}`;

  const userPrompt = `MARKING SCHEME RAW TEXT:
"""
${rawSchemeText}
"""

Extract the rubric items as JSON.`;

  try {
    const result = await callGroqJson({ systemPrompt, userPrompt });
    if (Array.isArray(result.rubric) && result.rubric.length > 0) {
      return result.rubric.map((r, idx) => ({
        questionNumber: r.questionNumber || `Q${idx + 1}`,
        referenceAnswer: (r.referenceAnswer || '').trim(),
        keyPoints: Array.isArray(r.keyPoints) ? r.keyPoints : [],
        maxMarks: Number(r.maxMarks) || 3,
      }));
    }
  } catch (err) {
    console.warn('[GroqExtraction] LLM Marking Scheme extraction fallback:', err.message);
  }

  return fallbackExtractRubric(rawSchemeText, questionsList);
}

// ---------------------------------------------------------
// Local Fallback Implementations (Offline / Network Guard)
// ---------------------------------------------------------

function fallbackExtractQuestions(rawText) {
  const lines = rawText.split('\n');
  const questions = [];
  let currentQ = null;

  const qMarkerRegex = /^(?:(?:Q(?:uestion)?|Prob(?:lem)?)\s*(?:\.?\s*No\.?|#|\.)?\s*([1-9][0-9]*[a-z]?)|([1-9][0-9]*)[\.\)\:\-])\s*(.*)$/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip general instruction headers
    if (
      /academic excellence|annual exam|time allowed|maximum marks|roll no|general instructions|all questions are compulsory/i.test(
        trimmed
      )
    ) {
      continue;
    }

    const match = trimmed.match(qMarkerRegex);
    if (match) {
      if (currentQ) questions.push(currentQ);
      const qNum = match[1] || match[2] || `${questions.length + 1}`;
      const rest = match[3] || '';
      const marksMatch = trimmed.match(/(?:\[|\()?(\d+)\s*(?:Marks?|Pts?)(?:\]|\))?/i);
      const maxMarks = marksMatch ? parseInt(marksMatch[1], 10) : 3;

      currentQ = {
        questionNumber: `Q${qNum.replace(/^Q/i, '')}`,
        prompt: rest.replace(/(?:\[|\()?(\d+)\s*(?:Marks?|Pts?)(?:\]|\))?/i, '').trim(),
        maxMarks,
      };
    } else if (currentQ) {
      currentQ.prompt += ' ' + trimmed;
    }
  }

  if (currentQ) questions.push(currentQ);

  if (questions.length === 0) {
    // If no numbered lines found, create a single clean item
    questions.push({
      questionNumber: 'Q1',
      prompt: rawText.slice(0, 150).trim(),
      maxMarks: 5,
    });
  }

  return questions;
}

function fallbackExtractStudentAnswers(rawText, questionsList = []) {
  if (!questionsList || questionsList.length === 0) {
    return [{ questionNumber: 'Q1', studentAnswer: rawText.trim() }];
  }

  const qRegex = /(?:^|\n)\s*(?:Q(?:uestion)?\s*#?\.?\s*([1-9][0-9]*)|([1-9][0-9]*)[\.\)\:\-])/gi;
  const matches = [...rawText.matchAll(qRegex)];

  if (matches.length === 0) {
    // Distribute text to first question
    return questionsList.map((q, idx) => ({
      questionNumber: q.questionNumber,
      studentAnswer: idx === 0 ? rawText.trim() : '(No answer text provided)',
    }));
  }

  const answers = [];
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const qNum = match[1] || match[2];
    const start = match.index + match[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : rawText.length;
    const text = rawText.slice(start, end).trim();

    answers.push({
      questionNumber: `Q${qNum}`,
      studentAnswer: text,
    });
  }

  // Ensure all questions have an entry
  return questionsList.map((q) => {
    const found = answers.find(
      (a) => a.questionNumber.toUpperCase() === q.questionNumber.toUpperCase()
    );
    return {
      questionNumber: q.questionNumber,
      studentAnswer: found ? found.studentAnswer : '(No answer text provided)',
    };
  });
}

function fallbackExtractRubric(rawText, questionsList = []) {
  const questions = fallbackExtractQuestions(rawText);
  return questions.map((q) => ({
    questionNumber: q.questionNumber,
    referenceAnswer: q.prompt,
    keyPoints: [q.prompt.slice(0, 80)],
    maxMarks: q.maxMarks,
  }));
}

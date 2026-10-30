/**
 * AI Answer Evaluation Service for Neev Platform
 * Evaluates student answers against rubric and retrieved syllabus evidence.
 *
 * Supports both:
 * 1. Groq Cloud LPU API (keys starting with `gsk_`, e.g. openai/gpt-oss-120b, openai/gpt-oss-20b, qwen/qwen3.8-27b)
 * 2. xAI Grok API (keys starting with `xai-`, e.g. grok-2-latest)
 *
 * Implements strict security, structured JSON parsing, prompt boundaries,
 * and explicit provider configuration (never silently fabricating marks in production).
 */

const DEFAULT_GROK_MODEL = 'grok-2-latest';
const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';

const GROK_XAI_ENDPOINT = 'https://api.x.ai/v1/chat/completions';
const GROQ_CLOUD_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Builds the system prompt enforcing academic rigor, evidence grounding, and pedagogical caution.
 */
function buildSystemPrompt() {
  return `You are Neev's AI Answer Evaluator, an objective educational assessment assistant.
Your role is to evaluate student answers strictly against the provided Question, Teacher Rubric, and Retrieved Syllabus Evidence.

STRICT EVALUATION RULES:
1. Evaluate ONLY against the Question, supplied Rubric, and Retrieved Syllabus Evidence. Do not invent facts, marking rules, or textbook quotations.
2. Award partial credit when justified by the student's working steps, following the teacher's rubric criteria.
3. Accept mathematically/conceptually equivalent wording and valid alternative solution methods.
4. Distinguish between OCR transcription uncertainties (e.g. ambiguous signs) and real student conceptual mistakes.
5. Observed Errors must report direct factual discrepancies found in the student's work.
6. Misconception Hypotheses must be framed strictly as educator hypotheses to investigate, NOT definitive psychological or student-ability labels.
7. If the retrieved syllabus evidence is insufficient or irrelevant to ground the evaluation, set "isEvidenceSufficient": false.
8. NEVER award marks greater than the provided maxMarks or less than 0.

RESPONSE FORMAT:
You must respond with ONLY a valid, parseable JSON object matching this exact schema:
{
  "suggestedMarks": <number between 0 and maxMarks>,
  "explanation": "<concise teacher-facing reasoning for the score>",
  "observedErrors": "<direct factual errors observed in the student's work, or 'None' if correct>",
  "misconceptionHypothesis": "<prospective conceptual learning gap or root cause, framed as a hypothesis>",
  "evidenceQuotes": ["<exact quote or reference from the retrieved syllabus excerpts supporting this assessment>"],
  "isEvidenceSufficient": <true or false>,
  "confidence": "<High / Moderate / Low with percentage, e.g. High (92%)>"
}`;
}

/**
 * Builds user prompt containing the assessment items and evidence context.
 */
function buildUserPrompt({
  questionNumber,
  prompt,
  studentAnswer,
  maxMarks,
  referenceAnswer,
  keyPoints = [],
  evidenceText,
  lessonName,
}) {
  return `EVALUATION REQUEST:
Question Number: ${questionNumber}
Question Prompt: ${prompt || 'Not specified'}
Maximum Marks for Question: ${maxMarks}
${referenceAnswer ? `Teacher Reference Solution: ${referenceAnswer}` : ''}
${keyPoints && keyPoints.length > 0 ? `Key Scoring Points: ${keyPoints.join('; ')}` : ''}
${lessonName ? `Associated Topic: ${lessonName}` : ''}

Student's Submitted Work:
"""
${studentAnswer || '(No answer text provided)'}
"""

Retrieved Syllabus & Exemplar Evidence:
"""
${evidenceText || 'No relevant syllabus passages found.'}
"""

Evaluate the student's work and return your assessment in the required JSON format.`;
}

/**
 * Fallback evaluator strictly for test environments and explicit offline development.
 */
function evaluateWithLocalHeuristic({
  studentAnswer,
  maxMarks,
  referenceAnswer,
  prompt,
}) {
  const cleanStudent = (studentAnswer || '').trim().toLowerCase();
  const cleanRef = (referenceAnswer || '').trim().toLowerCase();

  let suggestedMarks = maxMarks;
  let observedErrors = 'None observed; solution is consistent with rubric criteria.';
  let hypothesis = 'Demonstrates working knowledge of the concept.';
  let confidence = 'High (90%)';

  if (!cleanStudent || cleanStudent.includes('no answer text') || cleanStudent.length < 3) {
    suggestedMarks = 0;
    observedErrors = 'No readable answer submitted for this question.';
    hypothesis = 'Unanswered question or unreadable handwriting.';
    confidence = 'High (95%)';
  } else if (cleanRef && cleanStudent !== cleanRef) {
    if (cleanStudent.includes('-') && !cleanStudent.includes('+') && cleanRef.includes('+')) {
      suggestedMarks = Math.max(0, maxMarks - 2);
      observedErrors = 'Sign error identified during algebraic operation or transposition step.';
      hypothesis = 'Likely inverse operation misconception during balance step.';
    } else {
      suggestedMarks = Math.max(1, Math.round(maxMarks / 2));
      observedErrors = 'Partial computation discrepancy against reference solution.';
      hypothesis = 'Multi-step execution slip; core foundation partially present.';
    }
  }

  return {
    suggestedMarks,
    explanation: 'Evaluated using deterministic rubric-aware heuristic (Offline/Test Mode).',
    observedErrors,
    misconceptionHypothesis: hypothesis,
    evidenceQuotes: ['Standard curriculum syllabus criteria applied.'],
    isEvidenceSufficient: true,
    confidence,
    isMock: true,
    evaluatorProvider: 'heuristic_mock',
  };
}

export class GrokService {
  constructor(options = {}) {
    this.apiKey =
      options.apiKey ||
      process.env.GROQ_API_KEY ||
      process.env.GROK_API_KEY ||
      null;

    this.configuredModel =
      options.model ||
      process.env.GROQ_MODEL ||
      process.env.GROK_MODEL ||
      null;

    this.timeoutMs = parseInt(process.env.GROK_TIMEOUT_MS, 10) || 30000;

    const inTest =
      process.env.NODE_ENV === 'test' ||
      process.env.ALLOW_MOCK_AI === 'true' ||
      process.env.npm_lifecycle_event === 'test' ||
      process.execArgv.some((a) => a.includes('test')) ||
      process.argv.some((a) => a.includes('test'));

    this.allowMock = typeof options.allowMock === 'boolean' ? options.allowMock : inTest;
  }

  isConfigured() {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  getProviderDetails() {
    const rawKey = (this.apiKey || '').trim();
    const isGroq =
      rawKey.startsWith('gsk_') ||
      Boolean(process.env.GROQ_API_KEY);

    if (isGroq) {
      // If configured model was for xAI Grok (e.g. grok-2-latest), use top Groq model
      let activeModel = this.configuredModel;
      if (!activeModel || activeModel.startsWith('grok-')) {
        activeModel = DEFAULT_GROQ_MODEL;
      }
      return {
        isGroq: true,
        endpoint: GROQ_CLOUD_ENDPOINT,
        model: activeModel,
        fallbackModels: ['openai/gpt-oss-20b', 'qwen/qwen3.8-27b'],
        evaluatorProvider: 'groq_ai',
        displayName: 'Groq Cloud LPU',
      };
    }

    return {
      isGroq: false,
      endpoint: GROK_XAI_ENDPOINT,
      model: this.configuredModel || DEFAULT_GROK_MODEL,
      fallbackModels: ['grok-beta'],
      evaluatorProvider: 'grok_ai',
      displayName: 'xAI Grok',
    };
  }

  getModelName() {
    const details = this.getProviderDetails();
    return details.model;
  }

  /**
   * Evaluates an individual student answer against rubric and evidence.
   */
  async evaluateAnswer(params = {}) {
    const {
      questionNumber = 'Q1',
      prompt = '',
      studentAnswer = '',
      maxMarks = 5,
      referenceAnswer = '',
      keyPoints = [],
      evidenceText = '',
      lessonName = '',
    } = params;

    const parsedMaxMarks = Number(maxMarks) || 5;

    // Strict Production Gate: NEVER silently fabricate marks in production
    if (!this.apiKey) {
      if (this.allowMock) {
        return evaluateWithLocalHeuristic({
          studentAnswer,
          maxMarks: parsedMaxMarks,
          referenceAnswer,
          prompt,
        });
      }
      throw new Error(
        'AI_UNCONFIGURED: AI evaluation API key is not configured. Real answer evaluation requires a valid GROK_API_KEY or GROQ_API_KEY in environment variables.'
      );
    }

    const provider = this.getProviderDetails();
    const modelsToTry = [provider.model, ...provider.fallbackModels];

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt({
      questionNumber,
      prompt,
      studentAnswer,
      maxMarks: parsedMaxMarks,
      referenceAnswer,
      keyPoints,
      evidenceText,
      lessonName,
    });

    let lastError = null;

    for (const modelCandidate of modelsToTry) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(provider.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: modelCandidate,
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
          // If model was not found (404), try next model candidate
          if (response.status === 404 && modelsToTry.indexOf(modelCandidate) < modelsToTry.length - 1) {
            console.warn(`[GrokService] Model '${modelCandidate}' returned 404. Attempting fallback...`);
            continue;
          }
          throw new Error(
            `${provider.displayName} API returned HTTP ${response.status}: ${errorText || response.statusText}`
          );
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
          throw new Error(`${provider.displayName} API returned empty completion content.`);
        }

        let parsed;
        try {
          parsed = JSON.parse(content);
        } catch (parseErr) {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error(`Failed to parse AI JSON evaluation: ${parseErr.message}`);
          }
        }

        // Clamp suggestedMarks strictly within [0, parsedMaxMarks]
        let marks = Number(parsed.suggestedMarks);
        if (isNaN(marks) || marks < 0) marks = 0;
        if (marks > parsedMaxMarks) marks = parsedMaxMarks;

        return {
          suggestedMarks: marks,
          explanation: parsed.explanation || 'Evaluated against question rubric.',
          observedErrors: parsed.observedErrors || 'None',
          misconceptionHypothesis: parsed.misconceptionHypothesis || 'None identified.',
          evidenceQuotes: Array.isArray(parsed.evidenceQuotes) ? parsed.evidenceQuotes : [],
          isEvidenceSufficient: parsed.isEvidenceSufficient !== false,
          confidence: parsed.confidence || 'Moderate',
          isMock: false,
          evaluatorProvider: provider.evaluatorProvider,
          modelUsed: modelCandidate,
        };
      } catch (err) {
        clearTimeout(timeoutId);
        lastError = err;
        // If abort or fatal network error, stop immediately
        if (err.name === 'AbortError') {
          break;
        }
      }
    }

    console.error('[GrokService] Error evaluating answer:', lastError?.message);
    throw new Error(`AI Evaluation Failed: ${lastError?.message || 'Unknown evaluation error'}`);
  }
}

export const grokService = new GrokService();
export default grokService;

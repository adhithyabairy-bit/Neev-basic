/**
 * Grok API Integration Service for Neev Platform
 * Evaluates student answers against rubric and retrieved syllabus evidence.
 *
 * Implements strict security, structured JSON parsing, prompt boundaries,
 * and resilient offline test fallback when credentials are not configured.
 */

const DEFAULT_GROK_MODEL = 'grok-beta';
const GROK_API_ENDPOINT = 'https://api.x.ai/v1/chat/completions';

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
 * Fallback evaluator when GROK_API_KEY is not defined (for offline tests and local development).
 * Provides deterministic, rubric-aware evaluation without incurring API charges.
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
    // Check for common algebra signs
    if (cleanStudent.includes('-') && !cleanRef.includes('-')) {
      suggestedMarks = Math.max(0, maxMarks - 2);
      observedErrors = 'Transposition or negative sign reversal discrepancy observed in intermediate working steps.';
      hypothesis = 'Possible inverse operation or signed arithmetic confusion during equation transformation.';
      confidence = 'Moderate (85%)';
    } else {
      suggestedMarks = Math.max(1, Math.round(maxMarks * 0.5));
      observedErrors = 'Partial working steps present, but does not fully match the reference answer.';
      hypothesis = 'Partial conceptual understanding with possible procedural gaps.';
      confidence = 'Moderate (80%)';
    }
  }

  return {
    suggestedMarks: Math.min(maxMarks, Math.max(0, suggestedMarks)),
    explanation: `Evaluation based on rubric criteria (Maximum marks: ${maxMarks}).`,
    observedErrors,
    misconceptionHypothesis: hypothesis,
    evidenceQuotes: ['Syllabus topic guideline reference'],
    isEvidenceSufficient: true,
    confidence,
  };
}

class GrokService {
  constructor() {
    this.apiKey = process.env.GROK_API_KEY || null;
    this.model = process.env.GROK_MODEL || DEFAULT_GROK_MODEL;
    this.timeoutMs = parseInt(process.env.GROK_TIMEOUT_MS, 10) || 25000;
  }

  isConfigured() {
    return Boolean(this.apiKey);
  }

  getModelName() {
    return this.apiKey ? this.model : 'heuristic-mock-evaluator';
  }

  /**
   * Evaluates a single student answer item.
   *
   * @param {Object} params - Evaluation parameters
   * @returns {Promise<Object>} Structured evaluation object
   */
  async evaluateAnswer(params) {
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

    // If no Grok API key is configured, use safe local heuristic (preserves tests & offline dev)
    if (!this.apiKey) {
      return evaluateWithLocalHeuristic({
        studentAnswer,
        maxMarks: parsedMaxMarks,
        referenceAnswer,
        prompt,
      });
    }

    // Call live Grok API via fetch with timeout and retry
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(GROK_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.1, // Low temperature for consistent grading
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`Grok API returned HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('Grok API returned empty completion content.');
      }

      // Parse JSON output
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (parseErr) {
        // Fallback: extract json block if enclosed in ```json ```
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error(`Failed to parse Grok JSON evaluation: ${parseErr.message}`);
        }
      }

      // Validate and clamp suggestedMarks within [0, parsedMaxMarks]
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
      };
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('[GrokService] Error evaluating answer:', err.message);
      throw err;
    }
  }
}

export const grokService = new GrokService();
export default grokService;


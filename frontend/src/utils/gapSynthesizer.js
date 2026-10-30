/**
 * Gap & Remediation Synthesizer for Neev Platform
 * Derives foundational prerequisite gaps, ordered learning roadmaps,
 * and diagnostic re-test items from evaluated answer sheet results.
 */

export function deriveGapsAndRemediation(evaluations = [], syllabusData = {}) {
  const gaps = [];
  const roadmap = [];
  const testQuestions = [];

  const subject = syllabusData.selectedSubject || 'Mathematics';
  const targetGrade = syllabusData.selectedClass || 'Class 8';

  evaluations.forEach((item, index) => {
    const qNum = item.questionNumber || `Q${index + 1}`;
    const prompt = item.prompt || `Question ${qNum}`;

    const observed = String(item.observedErrors || '').trim();
    const hasObservedError =
      observed.length > 0 &&
      observed.toLowerCase() !== 'none' &&
      !observed.toLowerCase().startsWith('none observed');

    const suggested = Number(item.suggestedMarks ?? item.awardedMarks ?? 0);
    const max = Number(item.maxMarks || 5);
    const scoreLost = suggested < max;

    const hypothesis = String(item.misconceptionHypothesis || '').trim();
    const hasMisconception =
      hypothesis.length > 0 &&
      hypothesis.toLowerCase() !== 'none identified.' &&
      hypothesis.toLowerCase() !== 'none';

    // If student had a conceptual slip, lost marks, or observed error
    if (hasObservedError || scoreLost || hasMisconception) {
      let topicName =
        item.affectedLessonName ||
        (prompt.includes('—') ? prompt.split('—')[0].trim() : prompt.slice(0, 50).trim()) ||
        `Foundational ${subject} Concept`;

      // Clean topic name
      topicName = topicName.replace(/\s*\[\d+\s*Marks?\]/i, '').replace(/Solution/i, '').trim();

      const gapTopic = hypothesis
        ? hypothesis.split('.')[0].replace(/^Possible\s+/i, '').replace(/^Likely\s+/i, '').trim()
        : `Foundational Understanding in ${topicName}`;

      const gapId = `gap-${qNum.toLowerCase().replace(/[^a-z0-9]/g, '') || index + 1}`;
      const lessonName = item.affectedLessonName || topicName;

      gaps.push({
        id: gapId,
        topicName: gapTopic,
        grade: 'Foundational Root',
        lessonName,
        lessonId: item.affectedLessonId || `les-${index + 1}`,
        evidence: `In ${qNum}, ${observed || hypothesis || 'discrepancy identified in working steps.'}`,
        likelihood: suggested <= max / 2 ? 'Likely' : 'Possible',
        status: 'Verified from Answer Evidence',
        dependentTopics: [topicName, `${subject} Core Curriculum`],
        misconception: hypothesis || 'Conceptual reinforcement required.',
      });

      roadmap.push({
        id: `rm-${qNum.toLowerCase().replace(/[^a-z0-9]/g, '') || index + 1}`,
        rank: roadmap.length + 1,
        topic: gapTopic,
        grade: 'Foundational Remediation',
        lessonId: item.affectedLessonId || `les-${index + 1}`,
        prereqChain: roadmap.length === 0 ? 'None (Root Foundation)' : `Step ${roadmap.length}: Prior Concept`,
        recommendedActivity: `Targeted practice on ${topicName.toLowerCase()} with teacher-guided worked examples and number line / algebraic verification models.`,
        workedExamples: '2 worked examples breaking down step-by-step resolution.',
        practiceQuestions: 4,
        estimatedMinutes: 25,
        status: 'Not Started',
      });

      testQuestions.push({
        id: `test-${qNum.toLowerCase().replace(/[^a-z0-9]/g, '') || index + 1}`,
        number: `${testQuestions.length + 1}`,
        prompt: `Diagnostic check for ${qNum}: Verify and solve ${prompt.slice(0, 80)}`,
        type: 'Short Answer',
        marks: 2,
        targetConcept: gapTopic,
        syllabusTopic: lessonName,
        expectedAnswer: item.expectedAnswer || 'Clear logical steps with correct final verification.',
      });
    }
  });

  // If student answered all questions without errors, celebrate mastery
  if (gaps.length === 0 && evaluations.length > 0) {
    gaps.push({
      id: 'gap-mastery',
      topicName: 'Curriculum Mastery Confirmed',
      grade: targetGrade,
      lessonName: subject,
      lessonId: 'les-mastery',
      evidence: 'Student demonstrated working steps consistent with rubric across all assessed questions.',
      likelihood: 'Low',
      status: 'Mastery Validated',
      dependentTopics: ['Advanced Problem Solving', 'Enrichment Units'],
      misconception: 'No critical foundational gaps detected.',
    });

    roadmap.push({
      id: 'rm-enrichment',
      rank: 1,
      topic: 'Advanced Problem Solving & Extension Tasks',
      grade: targetGrade,
      lessonId: 'les-enrichment',
      prereqChain: 'Core Syllabus Competencies',
      recommendedActivity: 'Challenging multi-step applications and cross-concept Olympiad problems.',
      workedExamples: 'Extension problems with alternative solution pathways.',
      practiceQuestions: 5,
      estimatedMinutes: 30,
      status: 'Not Started',
    });

    testQuestions.push({
      id: 'test-enrichment',
      number: '1',
      prompt: 'Enrichment: Formulate and solve an algebraic application model based on syllabus concepts.',
      type: 'Problem Solving',
      marks: 5,
      targetConcept: 'Advanced Conceptual Application',
      syllabusTopic: subject,
      expectedAnswer: 'Complete mathematical model with justification.',
    });
  }

  return { gaps, roadmap, testQuestions };
}

export default deriveGapsAndRemediation;


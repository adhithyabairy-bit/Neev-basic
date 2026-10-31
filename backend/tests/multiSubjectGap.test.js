import assert from 'node:assert';
import { deriveGapsAndRemediation, detectSubject } from '../../frontend/src/utils/gapSynthesizer.js';

console.log('Testing Multi-Subject Support in gapSynthesizer.js...\n');

// 1. Subject Detection Test
console.log('--- 1. Testing Subject Auto-Detection ---');
assert.strictEqual(detectSubject('Osmosis and diffusion across semi-permeable membrane in potato cells'), 'Science / Physics');
assert.strictEqual(detectSubject('The Indian Constitution preamble establishes secularism and fundamental rights'), 'Social Studies');
assert.strictEqual(detectSubject('Active to passive voice conversion and past perfect continuous tense errors'), 'English Language');
assert.strictEqual(detectSubject('Solve the linear equation 4x - 7 = 2x + 9 and find x'), 'Mathematics');
console.log('PASSED: Subject auto-detection works accurately for all 4 subjects.');

// 2. Science Evaluation Test
console.log('\n--- 2. Testing Science Assessment ---');
const scienceEvals = [
  {
    questionNumber: 'Q1',
    prompt: 'What are scientific models? Explain how they help scientists understand complex systems.',
    studentAnswer: 'A model is just a guess or toy.',
    expectedAnswer: 'A scientific model is a simplified testable representation.',
    maxMarks: 3,
    suggestedMarks: 1,
    observedErrors: 'In Q1, Student confused scientific model with a toy.',
    misconceptionHypothesis: 'Student equates scientific models with arbitrary guesses.',
    affectedLessonName: 'Scientific Models & Experimental Inquiry',
  },
  {
    questionNumber: 'Q3',
    prompt: 'Define osmosis. Explain what happens to a potato piece placed in concentrated salt solution.',
    studentAnswer: 'Potato absorbs salt and becomes bigger.',
    expectedAnswer: 'Water moves out of potato by exosmosis causing shrinkage.',
    maxMarks: 3,
    suggestedMarks: 1,
    observedErrors: 'In Q3, Student stated salt enters potato and potato swells.',
    misconceptionHypothesis: 'Student confuses solvent water movement with solute diffusion.',
    affectedLessonName: 'Osmosis & Cellular Transport',
  },
  {
    questionNumber: 'Q4',
    prompt: 'State two fundamental structural differences between prokaryotic and eukaryotic cells.',
    studentAnswer: 'Prokaryotes have organelles like plant cells.',
    expectedAnswer: 'Prokaryotes lack nuclear membrane and lack membrane-bound organelles.',
    maxMarks: 3,
    suggestedMarks: 1,
    observedErrors: 'In Q4, Stated prokaryotes have membrane bound organelles.',
    misconceptionHypothesis: 'Student conflates bacterial prokaryotes with compartmentalized eukaryotic cells.',
    affectedLessonName: 'Prokaryotic vs Eukaryotic Cell Organization',
  },
];

const scienceResult = deriveGapsAndRemediation(scienceEvals, { selectedSubject: 'Science / Physics', selectedClass: 'Class 8' });
assert.strictEqual(scienceResult.gaps.length, 3, 'Should have 3 gaps for 3 questions with errors');
scienceResult.gaps.forEach((gap) => {
  assert(gap.dependentTopics.some(t => t.includes('Science')), `Gap ${gap.questionNumber} should block Science curriculum, got: ${gap.dependentTopics}`);
  assert(!gap.prerequisiteLesson.chapterName.includes('Math'), `Prerequisite should not be Math, got: ${gap.prerequisiteLesson.chapterName}`);
});
assert(scienceResult.testQuestions.length >= 5 && scienceResult.testQuestions.length <= 10, `Questions count should be 5-10, got: ${scienceResult.testQuestions.length}`);
scienceResult.testQuestions.forEach((q) => {
  assert.strictEqual(q.marks, 2, 'Every question must carry strictly 2 marks');
  assert(!q.prompt.includes('Solve for x'), 'Should not contain math algebra questions in Science test');
});
console.log(`PASSED: Science assessment generated ${scienceResult.gaps.length} Science gaps and ${scienceResult.testQuestions.length} 2-mark Science diagnostic questions.`);

// 3. Social Studies Evaluation Test
console.log('\n--- 3. Testing Social Studies Assessment ---');
const socialEvals = [
  {
    questionNumber: 'Q1',
    prompt: 'Explain the significance of the Preamble of the Indian Constitution.',
    studentAnswer: 'It is just an ordinary law made by parliament.',
    expectedAnswer: 'The Preamble is the guiding spirit outlining sovereign, socialist, secular, democratic republic principles.',
    maxMarks: 3,
    suggestedMarks: 1,
    observedErrors: 'In Q1, Confused constitutional preamble with ordinary statutory act.',
    misconceptionHypothesis: 'Student does not understand foundational constitutional sovereignty.',
    affectedLessonName: 'The Indian Constitution & Democratic Institutions',
  },
  {
    questionNumber: 'Q2',
    prompt: 'Differentiate between primary and secondary economic sectors with examples.',
    studentAnswer: 'Primary sector is banking and secondary sector is farming.',
    expectedAnswer: 'Primary sector extracts natural resources (farming); secondary sector manufactures goods.',
    maxMarks: 3,
    suggestedMarks: 1,
    observedErrors: 'In Q2, Inverted primary and tertiary sectors.',
    misconceptionHypothesis: 'Student inverts natural resource extraction with financial services.',
    affectedLessonName: 'Economic Activities & Sectors of the Economy',
  },
  {
    questionNumber: 'Q3',
    prompt: 'State two significant causes of the Revolt of 1857.',
    studentAnswer: 'Only the greased cartridges caused it.',
    expectedAnswer: 'Doctrine of Lapse political annexations and severe economic taxation of peasants.',
    maxMarks: 3,
    suggestedMarks: 1,
    observedErrors: 'In Q3, Missed political and economic causes.',
    misconceptionHypothesis: 'Student overlooks structural colonial exploitation and state annexation policies.',
    affectedLessonName: 'Colonial Rule & The 1857 Uprising',
  },
];

const socialResult = deriveGapsAndRemediation(socialEvals, { selectedSubject: 'Social Studies', selectedClass: 'Class 8' });
assert.strictEqual(socialResult.gaps.length, 3);
socialResult.gaps.forEach((gap) => {
  assert(gap.dependentTopics.some(t => t.includes('Social')), `Gap ${gap.questionNumber} should block Social Studies curriculum, got: ${gap.dependentTopics}`);
  assert(!gap.prerequisiteLesson.chapterName.includes('Math'), `Prerequisite should not be Math, got: ${gap.prerequisiteLesson.chapterName}`);
  assert(gap.prerequisiteLesson.pdfFileName.includes('Social'), `PDF filename should be Social Studies, got: ${gap.prerequisiteLesson.pdfFileName}`);
});
assert(socialResult.testQuestions.length >= 5 && socialResult.testQuestions.length <= 10, `Questions count should be 5-10, got: ${socialResult.testQuestions.length}`);
socialResult.testQuestions.forEach((q) => {
  assert.strictEqual(q.marks, 2, 'Every question must carry strictly 2 marks');
  assert(!q.prompt.includes('Solve for x'), 'Should not contain math algebra questions in Social Studies test');
});
console.log(`PASSED: Social Studies assessment generated ${socialResult.gaps.length} Social Studies gaps and ${socialResult.testQuestions.length} 2-mark Social Studies diagnostic questions.`);

// 4. English Language Evaluation Test
console.log('\n--- 4. Testing English Language Assessment ---');
const englishEvals = [
  {
    questionNumber: 'Q1',
    prompt: 'Convert the sentence into passive voice: "The students completed the assignment."',
    studentAnswer: 'The assignment completed the students.',
    expectedAnswer: 'The assignment was completed by the students.',
    maxMarks: 3,
    suggestedMarks: 1,
    observedErrors: 'In Q1, Inverted subject and object without auxiliary be-verb.',
    misconceptionHypothesis: 'Student does not understand passive voice auxiliary structure.',
    affectedLessonName: 'English Grammar: Tenses & Voice Transformations',
  },
  {
    questionNumber: 'Q2',
    prompt: 'Choose the correct verb: Neither the teacher nor the students (was/were) present.',
    studentAnswer: 'was present because teacher is singular.',
    expectedAnswer: 'were present because students is plural closer to verb.',
    maxMarks: 3,
    suggestedMarks: 1,
    observedErrors: 'In Q2, Applied first subject rather than proximity rule in concord.',
    misconceptionHypothesis: 'Student violates proximity agreement with neither...nor.',
    affectedLessonName: 'Subject-Verb Concord & Sentence Clauses',
  },
];

const englishResult = deriveGapsAndRemediation(englishEvals, { selectedSubject: 'English Language', selectedClass: 'Class 8' });
assert.strictEqual(englishResult.gaps.length, 2);
englishResult.gaps.forEach((gap) => {
  assert(gap.dependentTopics.some(t => t.includes('English')), `Gap ${gap.questionNumber} should block English curriculum, got: ${gap.dependentTopics}`);
  assert(!gap.prerequisiteLesson.chapterName.includes('Math'), `Prerequisite should not be Math, got: ${gap.prerequisiteLesson.chapterName}`);
  assert(gap.prerequisiteLesson.pdfFileName.includes('English'), `PDF filename should be English, got: ${gap.prerequisiteLesson.pdfFileName}`);
});
assert(englishResult.testQuestions.length >= 5 && englishResult.testQuestions.length <= 10, `Questions count should be 5-10, got: ${englishResult.testQuestions.length}`);
englishResult.testQuestions.forEach((q) => {
  assert.strictEqual(q.marks, 2, 'Every question must carry strictly 2 marks');
  assert(!q.prompt.includes('Solve for x'), 'Should not contain math algebra questions in English test');
});
console.log(`PASSED: English Language assessment generated ${englishResult.gaps.length} English gaps and ${englishResult.testQuestions.length} 2-mark English diagnostic questions.`);

// 5. Universal Dynamic Fallback Test (Custom / Unknown Subject)
console.log('\n--- 5. Testing Custom / Unknown Subject Fallback ---');
const customEvals = [
  {
    questionNumber: 'Q1',
    prompt: 'Explain the difference between compiled and interpreted programming languages.',
    studentAnswer: 'Compiler and interpreter are identical tools.',
    expectedAnswer: 'A compiler translates source code into machine code prior to execution, while an interpreter translates instruction-by-instruction.',
    maxMarks: 3,
    suggestedMarks: 1,
    observedErrors: 'In Q1, Failed to distinguish compilation ahead-of-time from real-time interpretation.',
    misconceptionHypothesis: 'Student does not understand execution pipelines in computer systems.',
    affectedLessonName: 'Language Translators & Program Execution',
  },
];

const customResult = deriveGapsAndRemediation(customEvals, { selectedSubject: 'Computer Science', selectedClass: 'Class 8' });
assert.strictEqual(customResult.gaps.length, 1);
assert(customResult.gaps[0].dependentTopics.some(t => t.includes('Computer Science')), `Should block Computer Science curriculum, got: ${customResult.gaps[0].dependentTopics}`);
assert(!customResult.gaps[0].prerequisiteLesson.chapterName.includes('Math'), `Prerequisite should not be Math, got: ${customResult.gaps[0].prerequisiteLesson.chapterName}`);
assert(customResult.testQuestions.length >= 5 && customResult.testQuestions.length <= 10, `Question count should be 5-10, got: ${customResult.testQuestions.length}`);
customResult.testQuestions.forEach((q) => {
  assert.strictEqual(q.marks, 2, 'Every question must carry strictly 2 marks');
  assert(!q.prompt.includes('Solve for x'), 'Should not contain math algebra questions in Computer Science test');
});
console.log(`PASSED: Custom / Unknown subject generated ${customResult.gaps.length} Computer Science gaps and ${customResult.testQuestions.length} 2-mark diagnostic questions.`);

console.log('\nALL MULTI-SUBJECT TESTS PASSED SUCCESSFULLY!');

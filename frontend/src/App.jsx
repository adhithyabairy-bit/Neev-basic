import React, { useState, useEffect } from 'react';
import './App.css';

// Reusable Layout Components
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MobileNavigation from './components/MobileNavigation';
import WorkflowNavigation from './components/WorkflowNavigation';

// Authentication Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import TeacherDashboard from './pages/TeacherDashboard';
import { getCurrentTeacherSession, logout, subscribeToAuth } from './services/authService';

// Ten Workflow Sections
import ClassSyllabus from './sections/ClassSyllabus';
import UploadAnswerSheets from './sections/UploadAnswerSheets';
import ExtractPreview from './sections/ExtractPreview';
import TeacherCorrection from './sections/TeacherCorrection';
import AIAnswerAnalysis from './sections/AIAnswerAnalysis';
import PrerequisiteGaps from './sections/PrerequisiteGaps';
import LearningRoadmap from './sections/LearningRoadmap';
import GapBasedTest from './sections/GapBasedTest';
import ExportFollowUp from './sections/ExportFollowUp';
import ClassGapOverview from './sections/ClassGapOverview';

// Initial Demonstration Reference Data
import {
  WORKFLOW_STEPS,
  INITIAL_SYLLABUS,
  INITIAL_UPLOADED_FILES,
  INITIAL_EXTRACTION_DATA,
  INITIAL_AI_ANALYSIS,
  INITIAL_PREREQUISITE_GAPS,
  INITIAL_ROADMAP,
  INITIAL_GAP_TEST,
} from './data/initialData';

import { fetchClasses } from './services/classService';
import { createAssessment, updateAssessment } from './services/assessmentService';

const EMPTY_SYLLABUS = {
  selectedClass: '',
  classId: '',
  selectedSubject: 'Mathematics',
  examName: '',
  academicTerm: '',
  totalMarks: 50,
  examDate: new Date().toISOString().split('T')[0],
  lessons: [],
  assessmentId: null,
};

const EMPTY_STUDENT_PROFILE = {
  name: '',
  rollNumber: '',
  section: 'Section A',
};

export default function App() {
  // Authentication & Session State
  const [currentUser, setCurrentUser] = useState(() => getCurrentTeacherSession());
  const [authView, setAuthView] = useState('login'); // 'login' | 'register' | 'forgot-password'
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [teacherClasses, setTeacherClasses] = useState([]);

  // Application View: 'dashboard' | 'workflow'
  const [viewMode, setViewMode] = useState('dashboard');

  // Navigation & Step Tracking State
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([1]);

  // Section 1 State: Syllabus & Exam (Clean empty state for real teacher, demo fixture in demo mode)
  const [syllabusData, setSyllabusData] = useState(() =>
    isDemoMode ? INITIAL_SYLLABUS : EMPTY_SYLLABUS
  );

  // Student Profile State (Shared across workflow)
  const [studentProfile, setStudentProfile] = useState(() =>
    isDemoMode ? { name: 'Aarav Sharma', rollNumber: '2025-08-42', section: 'Section A' } : EMPTY_STUDENT_PROFILE
  );

  // Section 2 State: Uploaded Documents & Active Backend AnswerSheet Record
  const [uploadedFiles, setUploadedFiles] = useState(() =>
    isDemoMode ? INITIAL_UPLOADED_FILES : []
  );
  const [activeAnswerSheet, setActiveAnswerSheet] = useState(null);

  // Section 3 & 4 State: Extracted OCR & Corrections
  const [extractionData, setExtractionData] = useState(() =>
    isDemoMode ? INITIAL_EXTRACTION_DATA : []
  );
  const [isTeacherConfirmed, setIsTeacherConfirmed] = useState(() =>
    isDemoMode ? true : false
  );

  // Section 5 State: AI Analysis Findings
  const [analysisData, setAnalysisData] = useState(() =>
    isDemoMode ? INITIAL_AI_ANALYSIS : []
  );

  // Section 6 State: Prerequisite Gaps
  const [gapsData, setGapsData] = useState(() =>
    isDemoMode ? INITIAL_PREREQUISITE_GAPS : []
  );

  // Section 7 State: Learning Remediation Roadmap
  const [roadmapData, setRoadmapData] = useState(() =>
    isDemoMode ? INITIAL_ROADMAP : []
  );

  // Section 8 State: Diagnostic Gap Test Questions
  const [testQuestions, setTestQuestions] = useState(() =>
    isDemoMode ? INITIAL_GAP_TEST : []
  );

  // Helper to load full demonstration dataset
  const loadDemoData = () => {
    setIsDemoMode(true);
    setActiveAnswerSheet(null);
    setSyllabusData(INITIAL_SYLLABUS);
    setStudentProfile({
      name: 'Aarav Sharma',
      rollNumber: '2025-08-42',
      section: 'Section A',
    });
    setUploadedFiles(INITIAL_UPLOADED_FILES);
    setExtractionData(INITIAL_EXTRACTION_DATA);
    setIsTeacherConfirmed(true);
    setAnalysisData(INITIAL_AI_ANALYSIS);
    setGapsData(INITIAL_PREREQUISITE_GAPS);
    setRoadmapData(INITIAL_ROADMAP);
    setTestQuestions(INITIAL_GAP_TEST);
  };

  // Helper to reset workflow states to empty for real authenticated teacher
  const resetToEmptyWorkflow = () => {
    setIsDemoMode(false);
    setActiveAnswerSheet(null);
    setSyllabusData(EMPTY_SYLLABUS);
    setStudentProfile(EMPTY_STUDENT_PROFILE);
    setUploadedFiles([]);
    setExtractionData([]);
    setIsTeacherConfirmed(false);
    setAnalysisData([]);
    setGapsData([]);
    setRoadmapData([]);
    setTestQuestions([]);
  };

  // Sync auth state
  useEffect(() => {
    const unsubscribe = subscribeToAuth((user) => {
      setCurrentUser(user);
      if (user) {
        setIsDemoMode(false);
        setViewMode('dashboard');
        resetToEmptyWorkflow();
      }
    });
    return unsubscribe;
  }, []);

  // Fetch teacher's real classes when authenticated
  useEffect(() => {
    if (currentUser && !isDemoMode) {
      fetchClasses()
        .then((data) => {
          setTeacherClasses(data || []);
          if (data && data.length > 0 && !syllabusData.classId) {
            setSyllabusData((prev) => ({
              ...prev,
              classId: data[0]._id,
              selectedClass: data[0].grade,
              selectedSubject: data[0].subject || prev.selectedSubject,
            }));
          }
        })
        .catch((err) => {
          console.error('[App] Failed to fetch teacher classes:', err);
        });
    }
  }, [currentUser, isDemoMode]);

  // Handle beginning a new student assessment cleanly without state collision
  const handleStartNewStudentAssessment = () => {
    const confirmed = window.confirm(
      "Begin a new student assessment? This will clear the student's name and staged answer sheets while preserving syllabus configuration."
    );
    if (confirmed) {
      setStudentProfile(EMPTY_STUDENT_PROFILE);
      setActiveAnswerSheet(null);
      setUploadedFiles(uploadedFiles.filter((f) => f.category !== 'answer-sheet'));
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Step Validation Logic
  const getValidationState = () => {
    switch (currentStep) {
      case 1: {
        const hasClass = isDemoMode || Boolean(syllabusData.classId || syllabusData.selectedClass);
        const hasExamName = Boolean(syllabusData.examName && syllabusData.examName.trim().length > 0);
        const hasMarks = Number(syllabusData.totalMarks) > 0;

        if (!hasClass) return { canContinue: false, error: 'Please select a Class for this assessment.' };
        if (!hasExamName) return { canContinue: false, error: 'Please enter an Examination Name.' };
        if (!hasMarks) return { canContinue: false, error: 'Total marks must be greater than zero.' };
        return { canContinue: true, error: null };
      }
      case 2: {
        const hasStudentName = studentProfile?.name && studentProfile.name.trim().length > 0;
        const hasAnswerSheet = uploadedFiles.some((f) => f.category === 'answer-sheet');

        if (!hasStudentName) {
          return { canContinue: false, error: "Please enter the student's full name before continuing." };
        }
        if (!hasAnswerSheet) {
          return { canContinue: false, error: 'Please stage at least one student answer sheet.' };
        }
        return { canContinue: true, error: null };
      }
      case 3:
        return { canContinue: true, error: null };
      case 4: {
        const hasInvalid = extractionData.some((q) => {
          const text = q.correctedText !== undefined ? q.correctedText : q.extractedAnswer || q.rawExtractedText || '';
          const marks = Number(q.awardedMarks !== undefined ? q.awardedMarks : q.detectedMarks);
          const max = Number(q.maxMarks || 5);
          return !text?.trim() || isNaN(marks) || marks < 0 || marks > max;
        });
        if (hasInvalid) {
          return { canContinue: false, error: 'Please resolve errors in awarded marks before proceeding.' };
        }
        return { canContinue: true, error: null };
      }
      case 5:
      case 6:
      case 7:
      case 8:
      case 9:
      case 10:
      default:
        return { canContinue: true, error: null };
    }
  };

  const validation = getValidationState();

  // Explicit Assessment Creation Action linked to backend service
  const handleSaveAssessment = async (currentData) => {
    const dataToSave = currentData || syllabusData;
    if (isDemoMode) {
      return { _id: 'demo-asm-' + Date.now(), ...dataToSave };
    }
    if (!dataToSave.classId) {
      throw new Error('Please select a valid class owned by your account.');
    }
    if (!dataToSave.examName || !dataToSave.examName.trim()) {
      throw new Error('Assessment title is required.');
    }
    if (Number(dataToSave.totalMarks) <= 0) {
      throw new Error('Maximum marks must be greater than zero.');
    }

    const payload = {
      classId: dataToSave.classId,
      title: dataToSave.examName.trim(),
      subject: dataToSave.selectedSubject || 'Mathematics',
      maximumMarks: Number(dataToSave.totalMarks) || 50,
      examDate: dataToSave.examDate || new Date().toISOString(),
      status: 'draft',
      lessons: dataToSave.lessons || [],
      rubric: dataToSave.rubric || [],
    };

    let saved;
    if (dataToSave.assessmentId && !dataToSave.assessmentId.startsWith('demo-')) {
      saved = await updateAssessment(dataToSave.assessmentId, payload);
    } else {
      saved = await createAssessment(payload);
    }

    setSyllabusData((prev) => ({
      ...prev,
      assessmentId: saved._id,
      lessons: saved.lessons || prev.lessons,
      rubric: saved.rubric || prev.rubric,
    }));
    return saved;
  };

  // Navigation Handlers
  const handleNext = async () => {
    if (!validation.canContinue) return;

    // Auto-create assessment if moving past Step 1 and not yet persisted
    if (currentStep === 1 && !isDemoMode && !syllabusData.assessmentId && syllabusData.classId) {
      try {
        const created = await createAssessment({
          classId: syllabusData.classId,
          title: syllabusData.examName.trim(),
          subject: syllabusData.selectedSubject || 'Mathematics',
          maximumMarks: Number(syllabusData.totalMarks) || 50,
          examDate: syllabusData.examDate || new Date().toISOString(),
          status: 'draft',
        });
        setSyllabusData((prev) => ({ ...prev, assessmentId: created._id }));
      } catch (err) {
        console.error('[App] Auto-create assessment failed:', err);
      }
    }

    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps((prev) => [...prev, currentStep]);
    }

    if (currentStep < WORKFLOW_STEPS.length) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Completed final step (Export) - return to Teacher Dashboard
      setViewMode('dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleStepSelect = (stepId) => {
    setCurrentStep(stepId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    logout();
    setCurrentUser(null);
    setIsDemoMode(false);
    setViewMode('dashboard');
    setAuthView('login');
    resetToEmptyWorkflow();
    setCurrentStep(1);
  };

  // If user is not authenticated and not in demo mode, show the Authentication pages
  if (!currentUser && !isDemoMode) {
    if (authView === 'register') {
      return (
        <Register
          onAuthSuccess={(user) => {
            setCurrentUser(user);
            resetToEmptyWorkflow();
            setViewMode('dashboard');
          }}
          onNavigateLogin={() => setAuthView('login')}
          onBypassToDemo={() => {
            loadDemoData();
            setViewMode('dashboard');
          }}
        />
      );
    }

    if (authView === 'forgot-password') {
      return (
        <ForgotPassword
          onNavigateLogin={() => setAuthView('login')}
          onBypassToDemo={() => {
            loadDemoData();
            setViewMode('dashboard');
          }}
        />
      );
    }

    return (
      <Login
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          resetToEmptyWorkflow();
          setViewMode('dashboard');
        }}
        onNavigateRegister={() => setAuthView('register')}
        onNavigateForgotPassword={() => setAuthView('forgot-password')}
        onBypassToDemo={() => {
          loadDemoData();
          setViewMode('dashboard');
        }}
      />
    );
  }

  // If authenticated (or in demo mode) and in dashboard mode, render the Teacher Dashboard
  if (viewMode === 'dashboard') {
    return (
      <TeacherDashboard
        currentUser={currentUser}
        onLogout={handleLogout}
        onStartNewAssessment={() => {
          setViewMode('workflow');
          setCurrentStep(1);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenClassPriorities={(cls) => {
          if (cls) {
            setSyllabusData((prev) => ({
              ...prev,
              classId: cls._id || '',
              selectedClass: cls.grade,
              selectedSubject: cls.subject || prev.selectedSubject,
            }));
          }
          setViewMode('workflow');
          setCurrentStep(10);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenAssessment={(asm) => {
          if (asm) {
            setSyllabusData((prev) => ({
              ...prev,
              assessmentId: asm._id,
              classId: asm.classId?._id || asm.classId,
              examName: asm.title,
              selectedSubject: asm.subject,
              totalMarks: asm.maximumMarks,
              examDate: asm.examDate ? asm.examDate.split('T')[0] : prev.examDate,
              lessons: asm.lessons || [],
              rubric: asm.rubric || [],
            }));
          }
          setViewMode('workflow');
          setCurrentStep(1);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        isDemoMode={isDemoMode}
      />
    );
  }

  // Render the current workflow section
  const renderCurrentSection = () => {
    switch (currentStep) {
      case 1:
        return (
          <ClassSyllabus
            syllabusData={syllabusData}
            onUpdateSyllabus={setSyllabusData}
            classes={teacherClasses}
            isDemoMode={isDemoMode}
            onSaveAssessment={handleSaveAssessment}
          />
        );
      case 2:
        return (
          <UploadAnswerSheets
            syllabusData={syllabusData}
            uploadedFiles={uploadedFiles}
            onUpdateFiles={setUploadedFiles}
            studentProfile={studentProfile}
            onUpdateStudentProfile={setStudentProfile}
            onStartNewStudentAssessment={handleStartNewStudentAssessment}
            isDemoMode={isDemoMode}
            onAnswerSheetLoaded={(sheet) => {
              setActiveAnswerSheet(sheet);
              if (sheet?.answers && sheet.answers.length > 0) {
                setExtractionData(sheet.answers);
                if (sheet.status === 'verified' || sheet.verificationStatus?.isVerified) {
                  setIsTeacherConfirmed(true);
                }
              }
            }}
          />
        );
      case 3:
        return (
          <ExtractPreview
            extractionData={extractionData}
            onUpdateExtraction={setExtractionData}
            uploadedFiles={uploadedFiles}
            studentProfile={studentProfile}
            activeAnswerSheet={activeAnswerSheet}
            isDemoMode={isDemoMode}
            onAnswerSheetUpdated={(updated) => {
              setActiveAnswerSheet(updated);
              if (updated?.answers) {
                setExtractionData(updated.answers);
              }
            }}
          />
        );
      case 4:
        return (
          <TeacherCorrection
            correctionData={extractionData}
            onUpdateCorrections={setExtractionData}
            isConfirmed={isTeacherConfirmed}
            onConfirmChange={setIsTeacherConfirmed}
            activeAnswerSheet={activeAnswerSheet}
            isDemoMode={isDemoMode}
            onAnswerSheetUpdated={(updated) => {
              setActiveAnswerSheet(updated);
              if (updated?.answers) {
                setExtractionData(updated.answers);
              }
            }}
          />
        );
      case 5:
        return (
          <AIAnswerAnalysis
            analysisData={analysisData}
            isTeacherConfirmed={isTeacherConfirmed}
            activeAnswerSheet={activeAnswerSheet}
            syllabusData={syllabusData}
            isDemoMode={isDemoMode}
            onEvaluationsUpdated={(evals) => {
              // Update app state if evaluations generated
              if (evals && evals.length > 0) {
                setAnalysisData(evals);
              }
            }}
          />
        );
      case 6:
        return (
          <PrerequisiteGaps
            gapsData={gapsData}
            syllabusData={syllabusData}
          />
        );
      case 7:
        return (
          <LearningRoadmap
            roadmapData={roadmapData}
            onUpdateRoadmap={setRoadmapData}
          />
        );
      case 8:
        return (
          <GapBasedTest
            testQuestions={testQuestions}
            onUpdateQuestions={setTestQuestions}
            syllabusData={syllabusData}
          />
        );
      case 9:
        return (
          <ExportFollowUp
            syllabusData={syllabusData}
            gapsData={gapsData}
            roadmapData={roadmapData}
            testQuestions={testQuestions}
            studentProfile={studentProfile}
          />
        );
      case 10:
        return (
          <ClassGapOverview
            syllabusData={syllabusData}
            isDemoMode={isDemoMode}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      {/* Sticky Brand Header */}
      <Header
        currentStep={currentStep}
        totalSteps={WORKFLOW_STEPS.length}
        currentUser={currentUser}
        onLogout={handleLogout}
        onNavigateDashboard={() => setViewMode('dashboard')}
        onNavigateAuth={() => {
          setIsDemoMode(false);
          setAuthView('login');
        }}
      />

      {/* Mobile Workflow Pill Navigation (Visible on mobile/tablet) */}
      <MobileNavigation
        steps={WORKFLOW_STEPS}
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepSelect={handleStepSelect}
      />

      {/* App Shell: Desktop Sidebar + Main Content Column (Footer sits beside the sidebar) */}
      <div className="workspace-layout">
        <Sidebar
          steps={WORKFLOW_STEPS}
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepSelect={handleStepSelect}
        />

        <div className="workspace-main-column">
          <main id="main-content" className="main-content">
            <div className="content-inner">
              {renderCurrentSection()}
            </div>
          </main>

          {/* Workflow Navigation Footer positioned beside the sidebar */}
          <WorkflowNavigation
            currentStep={currentStep}
            totalSteps={WORKFLOW_STEPS.length}
            onPrevious={handlePrevious}
            onNext={handleNext}
            canContinue={validation.canContinue}
            validationError={validation.error}
            isFinalStep={currentStep === WORKFLOW_STEPS.length}
          />
        </div>
      </div>
    </div>
  );
}

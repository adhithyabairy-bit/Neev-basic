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

export default function App() {
  // Authentication & Session State
  const [currentUser, setCurrentUser] = useState(() => getCurrentTeacherSession());
  const [authView, setAuthView] = useState('login'); // 'login' | 'register' | 'forgot-password'
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Application View: 'dashboard' | 'workflow'
  const [viewMode, setViewMode] = useState('dashboard');

  // Sync auth state
  useEffect(() => {
    const unsubscribe = subscribeToAuth((user) => {
      setCurrentUser(user);
      if (user) {
        setIsDemoMode(false);
        setViewMode('dashboard');
      }
    });
    return unsubscribe;
  }, []);

  // Navigation & Step Tracking State
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([1]);

  // Section 1 State: Syllabus & Exam
  const [syllabusData, setSyllabusData] = useState(INITIAL_SYLLABUS);

  // Student Profile State (Shared across workflow)
  const [studentProfile, setStudentProfile] = useState({
    name: 'Aarav Sharma',
    rollNumber: '2025-08-42',
    section: 'Section A',
  });

  // Section 2 State: Uploaded Documents
  const [uploadedFiles, setUploadedFiles] = useState(INITIAL_UPLOADED_FILES);

  // Section 3 & 4 State: Extracted OCR & Corrections
  const [extractionData, setExtractionData] = useState(INITIAL_EXTRACTION_DATA);
  const [isTeacherConfirmed, setIsTeacherConfirmed] = useState(true);

  // Section 5 State: AI Analysis Findings
  const [analysisData, setAnalysisData] = useState(INITIAL_AI_ANALYSIS);

  // Section 6 State: Prerequisite Gaps
  const [gapsData, setGapsData] = useState(INITIAL_PREREQUISITE_GAPS);

  // Section 7 State: Learning Remediation Roadmap
  const [roadmapData, setRoadmapData] = useState(INITIAL_ROADMAP);

  // Section 8 State: Diagnostic Gap Test Questions
  const [testQuestions, setTestQuestions] = useState(INITIAL_GAP_TEST);

  // Handle beginning a new student assessment cleanly without state collision
  const handleStartNewStudentAssessment = () => {
    const confirmed = window.confirm(
      "Begin a new student assessment? This will clear the student's name and staged answer sheets while preserving syllabus configuration."
    );
    if (confirmed) {
      setStudentProfile({ name: '', rollNumber: '', section: 'Section A' });
      setUploadedFiles(uploadedFiles.filter((f) => f.category !== 'answer-sheet'));
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Step Validation Logic
  const getValidationState = () => {
    switch (currentStep) {
      case 1: {
        const hasExamName = syllabusData.examName && syllabusData.examName.trim().length > 0;
        const hasMarks = Number(syllabusData.totalMarks) > 0;
        const hasLessons = syllabusData.lessons && syllabusData.lessons.length > 0;

        if (!hasExamName) return { canContinue: false, error: 'Please enter an Examination Name.' };
        if (!hasMarks) return { canContinue: false, error: 'Total marks must be greater than zero.' };
        if (!hasLessons) return { canContinue: false, error: 'Add at least one lesson or topic to the syllabus.' };
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
        const hasInvalid = extractionData.some(
          (q) => !q.extractedAnswer?.trim() || Number(q.detectedMarks) < 0 || Number(q.detectedMarks) > q.maxMarks
        );
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

  // Navigation Handlers
  const handleNext = () => {
    if (!validation.canContinue) return;

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
    setStudentProfile({ name: '', rollNumber: '', section: 'Section A' });
    setUploadedFiles([]);
    setCurrentStep(1);
  };

  // If user is not authenticated and not in demo mode, show the Authentication pages
  if (!currentUser && !isDemoMode) {
    if (authView === 'register') {
      return (
        <Register
          onAuthSuccess={(user) => {
            setCurrentUser(user);
            setIsDemoMode(false);
            setViewMode('dashboard');
          }}
          onNavigateLogin={() => setAuthView('login')}
          onBypassToDemo={() => {
            setIsDemoMode(true);
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
            setIsDemoMode(true);
            setViewMode('dashboard');
          }}
        />
      );
    }

    return (
      <Login
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          setIsDemoMode(false);
          setViewMode('dashboard');
        }}
        onNavigateRegister={() => setAuthView('register')}
        onNavigateForgotPassword={() => setAuthView('forgot-password')}
        onBypassToDemo={() => {
          setIsDemoMode(true);
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
              selectedClass: cls.grade,
            }));
          }
          setViewMode('workflow');
          setCurrentStep(10);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenAssessment={() => {
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
          />
        );
      case 3:
        return (
          <ExtractPreview
            extractionData={extractionData}
            onUpdateExtraction={setExtractionData}
            uploadedFiles={uploadedFiles}
            studentProfile={studentProfile}
          />
        );
      case 4:
        return (
          <TeacherCorrection
            correctionData={extractionData}
            onUpdateCorrections={setExtractionData}
            isConfirmed={isTeacherConfirmed}
            onConfirmChange={setIsTeacherConfirmed}
          />
        );
      case 5:
        return (
          <AIAnswerAnalysis
            analysisData={analysisData}
            isTeacherConfirmed={isTeacherConfirmed}
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

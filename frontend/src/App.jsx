import React, { useState, useEffect } from 'react';
import './App.css';
import ErrorBoundary from './components/ErrorBoundary';

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

// Public Marketing & SEO Pages
import PublicHomePage from './public-pages/PublicHomePage';
import PublicFeaturesPage from './public-pages/PublicFeaturesPage';
import PublicHowItWorksPage from './public-pages/PublicHowItWorksPage';
import PublicCurriculumCoveragePage from './public-pages/PublicCurriculumCoveragePage';
import PublicFaqPage from './public-pages/PublicFaqPage';
import PublicAboutPage from './public-pages/PublicAboutPage';
import PublicContactPage from './public-pages/PublicContactPage';
import PublicPrivacyPage from './public-pages/PublicPrivacyPage';

// Nine Workflow Sections
import ClassSyllabus from './sections/ClassSyllabus';
import UploadAnswerSheets from './sections/UploadAnswerSheets';
import ExtractPreview from './sections/ExtractPreview';
import TeacherCorrection from './sections/TeacherCorrection';
import AIAnswerAnalysis from './sections/AIAnswerAnalysis';
import PrerequisiteGaps from './sections/PrerequisiteGaps';
import LearningRoadmap from './sections/LearningRoadmap';
import GapBasedTest from './sections/GapBasedTest';
import ExportFollowUp from './sections/ExportFollowUp';

// Workflow steps and business logic
import { WORKFLOW_STEPS } from './data/initialData';
import { deriveGapsAndRemediation } from './utils/gapSynthesizer';
import { fetchClasses, createClass } from './services/classService';
import { createAssessment, updateAssessment } from './services/assessmentService';
import { verifyAnswerSheet } from './services/answerSheetService';

const EMPTY_SYLLABUS = {
  selectedClass: 'Class 8',
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
  // Routing State for Public Marketing and App
  const [currentPath, setCurrentPath] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname || '/';
    }
    return '/';
  });

  // Authentication & Session State
  const [currentUser, setCurrentUser] = useState(() => getCurrentTeacherSession());
  const [authView, setAuthView] = useState('login'); // 'login' | 'register' | 'forgot-password'
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [teacherClasses, setTeacherClasses] = useState([]);

  // Application View: 'dashboard' | 'workflow'
  const [viewMode, setViewMode] = useState('dashboard');

  // Navigation & Step Tracking State
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);

  // Section 1 State: Syllabus & Exam
  const [syllabusData, setSyllabusData] = useState(EMPTY_SYLLABUS);

  // Student Profile State (Shared across workflow)
  const [studentProfile, setStudentProfile] = useState(EMPTY_STUDENT_PROFILE);

  // Section 2 State: Uploaded Documents & Active Backend AnswerSheet Record
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [activeAnswerSheet, setActiveAnswerSheet] = useState(null);

  // Section 3 & 4 State: Extracted OCR & Corrections
  const [extractionData, setExtractionData] = useState([]);
  const [isTeacherConfirmed, setIsTeacherConfirmed] = useState(false);

  // Section 5 State: AI Analysis Findings
  const [analysisData, setAnalysisData] = useState([]);

  // Section 6 State: Prerequisite Gaps
  const [gapsData, setGapsData] = useState([]);

  // Section 7 State: Learning Remediation Roadmap
  const [roadmapData, setRoadmapData] = useState([]);

  // Section 8 State: Diagnostic Gap Test Questions
  const [testQuestions, setTestQuestions] = useState([]);

  // Client-side routing popstate listener
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLaunchApp = () => {
    if (currentUser) {
      navigateTo('/app');
    } else {
      navigateTo('/login');
    }
  };

  // Helper to reset workflow states to clean empty state
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
    setCompletedSteps([]);
    setCurrentStep(1);
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

  // Maintain robots meta tag for public SEO vs private app views
  useEffect(() => {
    const isPublicPage = [
      '/',
      '/features',
      '/how-it-works',
      '/curriculum-coverage',
      '/faq',
      '/about',
      '/contact',
      '/privacy',
    ].includes(currentPath);

    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.name = 'robots';
      document.head.appendChild(robotsMeta);
    }

    if (isPublicPage) {
      robotsMeta.content = 'index, follow';
    } else {
      robotsMeta.content = 'noindex, nofollow';
    }
  }, [currentPath, currentUser]);

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
        const hasClass = Boolean(syllabusData.classId || syllabusData.selectedClass);
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
          const text = (q.correctedText !== undefined && q.correctedText !== null && q.correctedText !== '')
            ? q.correctedText
            : q.extractedAnswer || q.rawExtractedText || '';
          const marks = Number(q.awardedMarks !== undefined ? q.awardedMarks : q.detectedMarks);
          const max = Number(q.maxMarks || 5);
          return isNaN(marks) || marks < 0 || marks > max || (marks > 0 && !text?.trim());
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
      default:
        return { canContinue: true, error: null };
    }
  };

  const validation = getValidationState();

  // Explicit Assessment Creation Action linked to backend service
  const handleSaveAssessment = async (currentData) => {
    const dataToSave = currentData || syllabusData;

    let targetClassId = dataToSave.classId;
    if (!targetClassId) {
      try {
        const existingClasses = await fetchClasses();
        const selClass = dataToSave.selectedClass || 'Class 8';
        const matched = existingClasses.find(
          (c) =>
            c.grade === selClass ||
            c.grade === selClass.replace('Class', 'Grade') ||
            c.name === selClass ||
            c.name.includes(selClass)
        );
        if (matched) {
          targetClassId = matched._id;
        } else {
          const newClass = await createClass({
            name: `${selClass} - ${dataToSave.selectedSubject || 'Mathematics'}`,
            grade: selClass,
            subject: dataToSave.selectedSubject || 'Mathematics',
          });
          targetClassId = newClass._id;
          setTeacherClasses((prev) => [...prev, newClass]);
        }
      } catch (err) {
        console.warn('[App] Could not resolve or auto-create class:', err);
      }
    }

    if (!targetClassId) {
      throw new Error('Please select or create a valid class owned by your account.');
    }

    const examTitle = (dataToSave.examName || '').trim() || 'Mid-Term Assessment';
    if (Number(dataToSave.totalMarks) <= 0) {
      throw new Error('Maximum marks must be greater than zero.');
    }

    const payload = {
      classId: targetClassId,
      title: examTitle,
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
      classId: targetClassId,
      examName: examTitle,
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
    if (currentStep === 1 && !syllabusData.assessmentId && syllabusData.classId) {
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

    // Verify answer sheet before moving past Step 4 (Teacher Correction) to unlock Step 5 (AI Evaluation)
    if (currentStep === 4) {
      if (!isDemoMode && activeAnswerSheet?._id) {
        try {
          const verified = await verifyAnswerSheet(activeAnswerSheet._id, extractionData);
          if (verified && (verified.status === 'verified' || verified.verificationStatus?.isVerified)) {
            setActiveAnswerSheet(verified);
            setIsTeacherConfirmed(true);
          } else {
            throw new Error('Verification request completed but answer sheet was not confirmed as verified.');
          }
        } catch (vErr) {
          console.error('[App] Verification failed on continue:', vErr);
          setIsTeacherConfirmed(false);
          alert(`Verification required: ${vErr.message || 'Please fix marks and confirm ground truth before proceeding to AI Evaluation.'}`);
          return; // Strictly abort advancement to Step 5
        }
      } else {
        setIsTeacherConfirmed(true);
      }
    }

    if (currentStep === 5) {
      const sourceEvals = analysisData.length > 0 ? analysisData : activeAnswerSheet?.answers || [];
      if (sourceEvals.length > 0) {
        const derived = deriveGapsAndRemediation(sourceEvals, syllabusData);
        setGapsData(derived.gaps);
        setRoadmapData(derived.roadmap);
        setTestQuestions(derived.testQuestions);
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
    const isUnlocked =
      stepId === 1 ||
      completedSteps.includes(stepId) ||
      completedSteps.includes(stepId - 1) ||
      stepId === currentStep;

    if (isUnlocked) {
      setCurrentStep(stepId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLogout = () => {
    logout();
    setCurrentUser(null);
    setIsDemoMode(false);
    setViewMode('dashboard');
    setAuthView('login');
    resetToEmptyWorkflow();
    setCurrentStep(1);
    navigateTo('/');
  };

  // -------------------------------------------------------------
  // Public Marketing Routes Rendering (Single Page with Smooth Anchors)
  // -------------------------------------------------------------
  if (['/', '/features', '/how-it-works', '/curriculum-coverage', '/faq', '/about', '/contact'].includes(currentPath)) {
    return (
      <PublicHomePage
        onNavigate={navigateTo}
        onLaunchApp={handleLaunchApp}
        activeSection={currentPath}
      />
    );
  }
  if (currentPath === '/privacy') {
    return <PublicPrivacyPage onNavigate={navigateTo} onLaunchApp={handleLaunchApp} />;
  }

  // -------------------------------------------------------------
  // Authentication Routes (/login, /register, /forgot-password)
  // -------------------------------------------------------------
  // Redirect logged-in users visiting /login, /register, or /forgot-password to /app
  if (currentUser && (currentPath === '/login' || currentPath === '/register' || currentPath === '/forgot-password')) {
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/app');
    }
    setCurrentPath('/app');
  }

  if (currentPath === '/register') {
    return (
      <Register
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          resetToEmptyWorkflow();
          setViewMode('dashboard');
          navigateTo('/app');
        }}
        onNavigateLogin={() => navigateTo('/login')}
      />
    );
  }

  if (currentPath === '/forgot-password') {
    return (
      <ForgotPassword
        onNavigateLogin={() => navigateTo('/login')}
      />
    );
  }

  if (currentPath === '/login') {
    return (
      <Login
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          resetToEmptyWorkflow();
          setViewMode('dashboard');
          navigateTo('/app');
        }}
        onNavigateRegister={() => navigateTo('/register')}
        onNavigateForgotPassword={() => navigateTo('/forgot-password')}
      />
    );
  }

  // -------------------------------------------------------------
  // Application Workspace Rendering (/app)
  // -------------------------------------------------------------
  // If user is not authenticated and attempts to access /app, route to /login
  if (!currentUser) {
    return (
      <Login
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          resetToEmptyWorkflow();
          setViewMode('dashboard');
          navigateTo('/app');
        }}
        onNavigateRegister={() => navigateTo('/register')}
        onNavigateForgotPassword={() => navigateTo('/forgot-password')}
      />
    );
  }

  // If authenticated and in dashboard mode, render Teacher Dashboard
  if (viewMode === 'dashboard') {
    return (
      <TeacherDashboard
        currentUser={currentUser}
        onLogout={handleLogout}
        onStartNewAssessment={() => {
          resetToEmptyWorkflow();
          setViewMode('workflow');
          setCurrentStep(1);
          setCompletedSteps([]);
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
            setCompletedSteps([1]);
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
            onSaveAssessment={handleSaveAssessment}
            onAnswerSheetLoaded={(sheet) => {
              if (!sheet || sheet.category === 'marking-scheme' || sheet.category === 'question-paper') {
                return;
              }
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
            onAnswerSheetUpdated={(sheet) => {
              setActiveAnswerSheet(sheet);
              if (sheet?.status === 'verified' || sheet?.verificationStatus?.isVerified) {
                setIsTeacherConfirmed(true);
              }
            }}
            onEvaluationsUpdated={(evals) => {
              if (evals && evals.length > 0) {
                setAnalysisData(evals);
                const derived = deriveGapsAndRemediation(evals, syllabusData);
                setGapsData(derived.gaps);
                setRoadmapData(derived.roadmap);
                setTestQuestions(derived.testQuestions);
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

      {/* App Shell: Desktop Sidebar + Main Content Column */}
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
              <ErrorBoundary onReset={() => window.location.reload()}>
                {renderCurrentSection()}
              </ErrorBoundary>
            </div>
          </main>

          {/* Workflow Navigation Footer positioned beside sidebar */}
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

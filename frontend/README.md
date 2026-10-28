# Neev — AI-Powered Learning Gap Analysis Platform

Neev (Foundation) is a teacher-focused educational platform that analyzes student answer sheets, detects conceptual learning gaps, traces prerequisite dependencies across grade levels, and generates personalized remediation roadmaps, diagnostic retest papers, and class-wide teaching priorities.

## Features & 10-Step Teacher Workflow

1. **Class & Syllabus Setup**: Configure examinations and build progressive syllabus maps with prerequisite anchors.
2. **Upload Answer Sheets**: Enter student full name, roll number, and section; stage student answer papers, question papers, and marking schemes with drag-and-drop validation.
3. **Extract & Preview**: Inspect computer-vision and OCR transcription confidence and bounding boxes.
4. **Teacher Correction**: Verify student responses, adjust marks, and ground-truth corrections before AI processing.
5. **AI Answer Analysis**: Pedagogical breakdown separating observed evidence from AI conceptual hypotheses.
6. **Prerequisite Gaps**: Trace errors to earlier grade foundations (e.g., Grade 7 signed numbers before Grade 8 linear equations).
7. **Learning Roadmap**: Ordered remediation sequence prioritizing root foundational concepts.
8. **Gap-Based Test**: Diagnostic retests tailored to verify resolution of specific identified gaps.
9. **Export & Follow-up**: Download genuine client-side PDF deliverables with student-specific filenames (`studentname_gap.pdf`, `studentname_questions.pdf`) and post-intervention retest tracking.
10. **Class Gap Overview & Teaching Priorities**: Class-wide gap aggregation, prerequisite-first teaching sequence, interactive reordering, topic completion tracking, and flagged individual support.

## Teacher Authentication (Firebase Authentication)

Neev integrates Firebase Authentication for teacher login, registration, and password recovery.

### Configuration
To connect live Firebase Authentication:
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Populate your Firebase project web credentials:
   ```env
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef123456
   ```

*Note: If Firebase variables are not set, the platform prevents fake login claims and displays a clear configuration banner. Reviewers can explore the full 10-step workflow directly using the "Explore 10-Step Workflow (Demo Mode)" option.*

## Filename Conventions for PDF Deliverables

- **Student Gap Report**: `studentname_gap.pdf` (e.g. `aarav_sharma_gap.pdf`)
- **Diagnostic Practice Questions**: `studentname_questions.pdf` (e.g. `aarav_sharma_questions.pdf`)
- **Sanitization rules**: Names are lowercased, whitespace converted to single underscores, invalid filename characters stripped, repeated underscores collapsed, and clean fallbacks applied.

## Technology Stack

- **React 19** with functional components and modern hooks
- **Vite** build tooling
- **Modular Vanilla CSS** adhering to the Neev Warm Minimalist design system:
  - `styles/variables.css`: Design tokens and color palette
  - `styles/global.css`: Reset and typography
  - `styles/layout.css`: App shell, sticky header, and sidebar
  - `styles/components.css`: Buttons, cards, modals, and forms
  - `styles/auth.css`: Teacher login, registration, and password reset styles
  - `styles/class-gap-overview.css`: Class-wide gap breakdown and teaching priority styles
  - `styles/responsive.css`: Breakpoint adaptations for mobile (320px+), tablet, and desktop

## Running the Application Locally

```bash
cd frontend
npm install
npm run dev
```

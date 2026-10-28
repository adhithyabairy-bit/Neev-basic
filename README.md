# Neev — AI-Powered Learning Gap Analysis Platform

Neev (Foundation) is a teacher-focused educational platform that analyzes student answer sheets, detects conceptual learning gaps, traces prerequisite dependencies across grade levels, and generates personalized remediation roadmaps, diagnostic retests, and class-wide teaching priorities.

## Project Structure

```text
Neev/
├── frontend/                     # React 19 + Vite frontend application
│   ├── package.json              # Frontend dependencies & scripts
│   ├── vite.config.js            # Vite build configuration
│   ├── index.html                # HTML entry point with Plus Jakarta Sans
│   ├── public/                   # Static public assets
│   ├── .env.example              # Public Firebase client & API URL template
│   └── src/
│       ├── components/           # Reusable UI components (Header, Sidebar, Forms, Icons, Auth)
│       ├── pages/                # High-level pages (Login, Register, ForgotPassword, TeacherDashboard)
│       ├── sections/             # 10-step teacher assessment workflow sections
│       ├── services/             # Auth service connecting to Firebase & Express backend
│       ├── styles/               # Modular CSS system (dashboard, auth, class-gap-overview, etc.)
│       ├── utils/                # Utilities (filename sanitization, PDF generation)
│       ├── data/                 # Initial syllabus & dashboard demonstration data
│       ├── App.jsx               # View coordinator (Dashboard / Auth / 10-Step Workflow)
│       ├── App.css               # Style bundle entry point
│       └── main.jsx              # React application bootstrap
│
├── backend/                      # Express.js Authentication Backend
│   ├── package.json              # Express, CORS, Dotenv, Firebase Admin SDK
│   ├── .env.example              # Backend environment configuration template
│   └── src/
│       ├── config/
│       │   └── firebaseAdmin.js  # Singleton Firebase Admin SDK initialization
│       ├── middleware/
│       │   └── verifyFirebaseToken.js # Bearer ID token verification middleware
│       ├── controllers/
│       │   └── authController.js # Session, current user, and health check handlers
│       ├── routes/
│       │   └── authRoutes.js     # /api/auth/session, /api/auth/me, /api/health
│       ├── app.js                # Express app configuration & middleware
│       └── server.js             # Server startup & graceful shutdown
│
└── package.json                  # Root scripts for running frontend & backend
```

## Running the Application

### 1. Install Dependencies

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install
```

Or from the root directory:
```bash
npm run install:all
```

### 2. Configure Environment Variables

**Frontend (`frontend/.env`):**
```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef123456
VITE_API_BASE_URL=http://localhost:5000
```

**Backend (`backend/.env`):**
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
FIREBASE_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
```

### 3. Start Development Servers

Run the backend:
```bash
cd backend
npm run dev
```

Run the frontend (in another terminal):
```bash
cd frontend
npm run dev
```

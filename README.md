# OmniWriter

AI-powered professional writing platform for generating novels, essays, and articles.

## Overview

OmniWriter is a comprehensive writing platform that leverages artificial intelligence to help writers create professional-quality content. It features three specialized areas:

- **Romanziere** (Novelist): Chapter-by-chapter novel generation with character management, plot tracking, and style replication
- **Saggista** (Essayist): Essay creation with source management, citations, and bibliography generation
- **Redattore** (Editor): Article, press release, and blog post generation with SEO optimization

## Technology Stack

- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Node.js + Express.js + TypeScript
- **Database**: SQLite (via better-sqlite3)
- **AI**: Vercel AI SDK with multi-model orchestration
- **Auth**: Passport.js (email/password + Google OAuth)
- **i18n**: Italian + English (i18next)

## Getting Started

### Prerequisites

- Node.js >= 18.x
- npm or pnpm

### Quick Start

```bash
# Clone the repository
git clone <repo-url>
cd omniwriter

# Run the setup script
./init.sh
```

This will install dependencies and start both frontend and backend servers.

### Manual Setup

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install

# Start backend (port 3001)
cd ../server
npm run dev

# Start frontend (port 3000) - in a new terminal
cd ../client
npm run dev
```

### Access

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api
- **Health Check**: http://localhost:3001/api/health

## Project Structure

```
omniwriter/
├── client/               # React frontend
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── utils/        # Utility functions
│   │   ├── i18n/         # Internationalization
│   │   ├── styles/       # Global styles
│   │   ├── contexts/     # React contexts
│   │   └── services/     # API service layer
│   └── public/           # Static assets
├── server/               # Express backend
│   ├── src/
│   │   ├── routes/       # API route handlers
│   │   ├── middleware/   # Express middleware
│   │   ├── models/       # Data models
│   │   ├── config/       # Configuration
│   │   ├── db/           # Database setup and migrations
│   │   └── utils/        # Utility functions
│   └── data/             # SQLite database (gitignored)
├── init.sh               # Development setup script
└── README.md
```

## Features

### User Roles
- **Free**: Basic access with limited generation length and exports
- **Premium**: Full access with unlimited generation, EPUB export, Google Drive
- **Lifetime**: Permanent premium access
- **Admin**: Platform management and analytics

### Key Features
- Multi-model AI orchestration with visible generation phases
- Human Model: AI style replication from user writings
- Source management with file upload and web search
- Rich text editor with version history
- Export to DOCX, EPUB, RTF, PDF, TXT
- Dark/Light mode with full Italian/English support
- Responsive design for desktop and tablet

## Environment Variables

Copy `server/.env.example` to `server/.env` and configure:

- `DATABASE_PATH` - SQLite database file path
- `JWT_SECRET` - JWT signing secret
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Google OAuth credentials
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` - AI provider keys

## License

Proprietary - All rights reserved.

# OmniWriter

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://reactjs.org/)

**AI-Powered Professional Writing Platform for Novelists, Essayists, and Content Creators**

![OmniWriter Landing Page](docs/screenshot-landing.png)

## Overview

OmniWriter is a comprehensive, AI-powered writing platform that helps you create professional-quality novels, essays, and articles. It features three specialized creative areas, each designed for a specific type of writing:

- **Novelist (Romanziere)**: Chapter-by-chapter novel generation with character management, plot tracking, and AI-powered style replication. Perfect for fiction writers who want to craft compelling stories.

- **Essayist (Saggista)**: Professional essay and non-fiction writing with source management, automatic citations, and bibliography generation. Ideal for researchers, academics, and non-fiction authors.

- **Editor (Redattore)**: Article, press release, and blog post generation with SEO optimization. Designed for journalists, content marketers, and communications professionals.

### Marketplace

OmniWriter also features a built-in **Marketplace** where users can share their novels and essays with the community. Download works from other writers in EPUB format, leave reviews, and discover inspiring content.

## Who Can Use It

OmniWriter is designed for:

- **Fiction Writers & Novelists**: Create full-length novels with consistent characters and plot development
- **Non-Fiction Authors & Essayists**: Write well-researched essays with proper citations and bibliography
- **Journalists & Reporters**: Generate news articles, press releases, and investigative reports
- **Content Creators & Bloggers**: Produce engaging blog posts and SEO-optimized articles
- **Academic Researchers**: Develop papers with source integration and proper referencing
- **Professional Communicators**: Create press materials, newsletters, and corporate content

## Key Features

### AI-Powered Writing
- **Multi-Model AI Orchestration**: Leverages multiple AI models for different phases of content generation
- **Visible Generation Phases**: Watch your content being created in real-time with transparent AI processing
- **Human Model**: Train the AI to replicate your writing style from your existing texts

### Source Management
- **File Upload**: Import PDF, DOCX, RTF, and TXT files as sources
- **Web Search**: Real-time web search integration for research
- **Citation Management**: Automatic citation generation and bibliography

### Rich Editing
- **Rich Text Editor**: Full-featured editor with formatting options
- **Version History**: Track changes and restore previous versions
- **Chapter Organization**: Organize long-form content into manageable sections

### Export Options
- **Multiple Formats**: Export to DOCX, EPUB, PDF, RTF, and TXT
- **Branded EPUBs**: Published works include OmniWriter branding with professional formatting

### User Experience
- **Dark/Light Mode**: Choose your preferred visual theme
- **Bilingual Support**: Full Italian and English interface
- **Responsive Design**: Works on desktop and tablet devices

### Marketplace
- **Publish Works**: Share novels and essays with the community
- **Download EPUBs**: Download community works for offline reading
- **Reviews & Ratings**: Rate and review works from other authors

## Technology Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, TypeScript, Tailwind CSS |
| **Backend** | Node.js, Express.js, TypeScript |
| **Database** | SQLite (better-sqlite3 + Drizzle ORM) |
| **AI Integration** | OpenAI, Anthropic, OpenRouter, Requesty, Gemini, Custom |
| **Authentication** | Passport.js (email/password + Google OAuth) |
| **Internationalization** | i18next (Italian + English) |

## Requirements

- **Node.js**: Version 18.0.0 or higher
- **npm** or **pnpm**: For package management
- **SQLite3**: Included (no external database setup needed)

## Installation

### Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/omniwriter.git
cd omniwriter

# Run the setup script (installs dependencies and starts servers)
./init.sh
```

### Manual Setup

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install

# Start backend server (port 3001)
cd ../server
npm run dev

# In a new terminal, start frontend (port 3000)
cd ../client
npm run dev
```

### Environment Variables

Copy `server/.env.example` to `server/.env` and configure:

```env
# Database
DATABASE_PATH=./data/omniwriter.db

# Authentication
JWT_SECRET=your-super-secret-jwt-key

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# AI Providers (at least one required)
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

### Access Points

After starting the servers:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api
- **Health Check**: http://localhost:3001/api/health

## Cloud Deployment

### Prerequisites for Production

1. **Environment Variables**: Set all required environment variables in your production environment
2. **Database**: The SQLite database file persists in `server/data/`. For production, consider:
   - Regular backups of the database file
   - Using a cloud database service for better scalability
3. **HTTPS**: Use a reverse proxy (nginx, Apache) with SSL certificates

### Deploy to VPS

```bash
# 1. SSH into your server
ssh user@your-server

# 2. Clone the repository
git clone https://github.com/yourusername/omniwriter.git
cd omniwriter

# 3. Install dependencies
cd server && npm install --production
cd ../client && npm install && npm run build
cd ..

# 4. Set up environment variables
cp server/.env.example server/.env
nano server/.env  # Edit with production values

# 5. Use PM2 for process management
npm install -g pm2
pm2 start server/npm run dev --name "omniwriter-api"
pm2 serve client/dist 3000 --name "omniwriter-frontend"
pm2 save
pm2 startup
```

### Deploy to Docker

```dockerfile
# Example Dockerfile (create in project root)
FROM node:18-alpine

WORKDIR /app
COPY . .

WORKDIR /app/server
RUN npm install --production

WORKDIR /app/client
RUN npm install && npm run build

EXPOSE 3000 3001

CMD ["sh", "-c", "cd /app/server && npm run dev & cd /app/client && npm run preview -- --host 0.0.0.0 --port 3000"]
```

### Recommended Cloud Providers

- **VPS**: DigitalOcean, Linode, Hetzner, Vultr
- **PaaS**: Railway, Render, Fly.io
- **Container**: Google Cloud Run, AWS ECS, Azure Container Instances

## Project Structure

```
omniwriter/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── utils/          # Utility functions
│   │   ├── i18n/           # Internationalization files
│   │   ├── styles/         # Global styles
│   │   ├── contexts/       # React contexts
│   │   └── services/       # API service layer
│   └── public/             # Static assets
├── server/                 # Express backend
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── middleware/     # Express middleware
│   │   ├── db/             # Database setup and migrations
│   │   └── utils/          # Utility functions
│   └── data/               # SQLite database (gitignored)
├── docs/                   # Documentation and screenshots
├── uploads/                # User uploaded files
├── init.sh                 # Development setup script
├── LICENSE.md              # AGPL v3 License
└── README.md               # This file
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the **GNU Affero General Public License v3.0**.

See the [LICENSE.md](LICENSE.md) file for details.

Copyright (C) 2026 Rosario Moscato (https://rosmoscato.xyz)

---

<p align="center">
  <strong>OmniWriter</strong> - Professional AI-Powered Writing Platform
</p>

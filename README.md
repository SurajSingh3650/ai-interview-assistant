# AI Interview Assistant

AI Interview Assistant is a full-stack, multi-platform interview preparation system for web, mobile, and desktop. It helps users capture interview questions from speech or screen content, generate concise AI answers and hints, maintain session context, and review interview history and analytics.

All clients connect to the same backend API and share the same core interview workflow.

## Overview

Core capabilities:

- Speech-to-text question capture
- AI-generated answers, hints, and speaking formats
- Real-time partial transcript streaming
- Session conversation memory
- Desktop screen capture with OCR-based question detection
- Session history and analytics
- Shared authentication and backend API across all platforms

Supported clients:

- Web application
- Mobile application
- Desktop application (Tauri)
- Shared backend API

## Technology Stack

Frontend, web:

- React
- Next.js
- Tailwind CSS

Mobile:

- React Native
- Expo

Desktop:

- Tauri
- React
- WebView-based UI

Backend:

- Node.js
- Express.js
- REST API
- WebSocket support

AI and supporting services:

- OpenAI
- OpenRouter
- Speech-to-text integration
- OCR for screen question extraction
- Redis for session memory and caching
- MongoDB for application data

## Architecture

```text
                   +----------------------+
                   |     Web Client       |
                   |   Next.js + React    |
                   +----------+-----------+
                              |
                   +----------v-----------+
                   |    Mobile Client     |
                   | React Native + Expo  |
                   +----------+-----------+
                              |
                   +----------v-----------+
                   |   Desktop Client     |
                   |   Tauri + React      |
                   +----------+-----------+
                              |
                         HTTPS / WSS
                              |
                   +----------v-----------+
                   |  Backend API Layer   |
                   | Node.js + Express    |
                   +----------+-----------+
                              |
          +-------------------+-------------------+
          |                                       |
 +--------v--------+                     +--------v--------+
 | Redis           |                     | Database        |
 | cache, sessions |                     | MongoDB         |
 | memory, rate    |                     |                 |
 +--------+--------+                     +--------+--------+
          |                                       |
          +-------------------+-------------------+
                              |
                   +----------v-----------+
                   | AI Provider Layer    |
                   | OpenAI / OpenRouter  |
                   +----------------------+
```

## Interview Flow

1. User signs in on web, mobile, or desktop.
2. User starts an interview session.
3. Microphone input streams partial transcript results in real time.
4. Desktop can also capture the screen, run OCR, and detect visible interview questions.
5. Transcript or detected question is sent to `/v1/ai-help`.
6. Backend enriches the request with session memory and provider context.
7. AI provider returns a short, professional interview answer.
8. Client renders:
   - Answer
   - Key points
   - Speaking format
9. Session data is stored for analytics and later review.

## Repository Layout

Current workspace:

```text
ai-ass/
├── apps/
│   ├── desktop/        # Tauri desktop client
│   ├── mobile/         # Expo / React Native client
│   └── web/            # Web client
├── backend/            # Node.js / Express backend
└── README.md
```

Recommended production monorepo layout:

```text
ai-interview-assistant/
├── apps/
│   ├── web/            # React web app
│   ├── mobile/         # React Native mobile app
│   └── desktop/        # Tauri desktop app
├── services/
│   └── backend/        # Node.js API server
├── packages/
│   └── shared/         # shared types, utils, SDK wrappers
├── infrastructure/
│   ├── docker/         # Dockerfiles, Compose, deployment assets
│   └── ci-cd/          # CI/CD templates and scripts
├── docs/               # architecture, API, operations docs
├── .github/
│   └── workflows/      # GitHub Actions pipelines
├── package.json        # monorepo root manifest
└── README.md
```

Folder responsibilities:

- `apps/web`: browser-based interview experience
- `apps/mobile`: mobile interview workflow and session UX
- `apps/desktop`: desktop-focused workflow with screen capture and OCR
- `services/backend`: shared API, auth, WebSocket realtime, AI orchestration
- `packages/shared`: cross-platform contracts, shared types, SDK utilities
- `infrastructure/docker`: local and deployment container assets
- `infrastructure/ci-cd`: reusable CI/CD pipeline configuration
- `docs`: architecture decision records, API docs, ops runbooks
- `.github/workflows`: GitHub Actions automation

## Features

- Multi-platform client support
- Shared authentication and session management
- Realtime transcript updates
- AI answer generation with provider abstraction
- Redis-backed conversation memory
- Desktop OCR-based screen question extraction
- Session history and analytics reporting
- User-friendly client-side error handling

## Environment Variables

Example `.env.example`:

```env
PORT=8082
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/
MONGODB_DB_NAME=aicopilot
REDIS_URL=redis://localhost:6379

AI_PROVIDER=openrouter
OPENAI_API_KEY=
OPENROUTER_API_KEY=

JWT_SECRET=replace_with_strong_secret_value
NODE_ENV=development
LOG_LEVEL=info
```

Minimum required variables:

- `OPENAI_API_KEY`
- `AI_PROVIDER`
- `PORT`
- `REDIS_URL`
- `MONGODB_URL`
- `MONGODB_DB_NAME`

Best practices:

- Never commit secrets to Git
- Use secret managers in hosted environments
- Rotate compromised API keys immediately
- Use different secrets per environment
- Restrict provider keys to the minimum required scope

## Local Development

### Prerequisites

- Node.js 20+
- npm 10+
- Redis
- MongoDB instance for development
- Expo tooling for mobile
- Rust toolchain and Tauri prerequisites for desktop

### Setup

1. Clone the repository

```bash
git clone <your-repo-url>
cd ai-interview-assistant
```

2. Install dependencies

```bash
cd backend && npm install
cd ../apps/web && npm install
cd ../mobile && npm install
cd ../desktop && npm install
```

3. Configure environment variables

- Copy `.env.example` to `.env`
- Fill in provider keys, Redis, and database configuration

4. Run backend server

```bash
cd backend
npm run dev
```

5. Start web app

```bash
cd apps/web
npm run dev
```

6. Run mobile app with Expo

```bash
cd apps/mobile
npm run dev
```

7. Launch desktop app with Tauri

```bash
cd apps/desktop
npm run tauri:dev
```

### Example monorepo scripts

If you add a root package manager workspace, the following script aliases are recommended:

```bash
npm install

npm run dev:backend
npm run dev:web
npm run dev:mobile
npm run dev:desktop
```

## Build Commands

Recommended build commands:

```bash
# Backend
npm run start

# Web
npm run build:web

# Mobile
npm run build:mobile

# Desktop
npm run build:desktop
```

Current workspace equivalents:

```bash
cd backend && npm start
cd apps/web && npm run build
cd apps/mobile && npx expo export --platform all
cd apps/desktop && npm run tauri:build
```

## Backend and API

Representative endpoints:

- `POST /v1/auth/login`
- `POST /v1/auth/register`
- `POST /v1/interviews`
- `GET /v1/interviews/:id/report`
- `POST /v1/ai-help`
- `POST /v1/auth/realtime/token`

Representative realtime events:

Client to server:

- `start_recording`
- `audio_stream`
- `stop_recording`
- `request_ai_help`

Server to client:

- `transcript_update`
- `ai_response`
- `system.error`

## Desktop OCR and Screen Capture Pipeline

Desktop-specific assistance pipeline:

```text
Screen Capture
  -> Frame Extraction
  -> OCR Text Detection
  -> Question Extraction
  -> POST /v1/ai-help
  -> Render AI Hint
```

This workflow is designed for interview scenarios where the question appears on the user’s screen and the desktop app should detect it automatically.

## Free Tier Deployment Strategy

Backend API:

- Render
- Railway
- Fly.io

Web application:

- Vercel
- Netlify

Mobile:

- Expo EAS Build
- Expo OTA Updates

Desktop:

- Tauri build system
- GitHub Releases

Installer targets:

- Windows: `.msi`, `.exe`
- macOS: `.dmg`
- Linux: `.AppImage`, `.deb`

Database:

- MongoDB Atlas
- another managed MongoDB provider

Redis:

- Upstash Redis
- Railway Redis
- self-hosted Redis for non-production use

## CI/CD

Recommended CI/CD flow:

1. Install dependencies
2. Run lint checks
3. Run automated tests
4. Build backend
5. Build web app
6. Build mobile app
7. Build desktop app
8. Deploy backend
9. Deploy web
10. Publish desktop artifacts to GitHub Releases

### Example GitHub Actions Workflow

`.github/workflows/deploy.yml`

```yaml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install backend dependencies
        run: npm install
        working-directory: backend

      - name: Install web dependencies
        run: npm install
        working-directory: apps/web

      - name: Install mobile dependencies
        run: npm install
        working-directory: apps/mobile

      - name: Install desktop dependencies
        run: npm install
        working-directory: apps/desktop

      - name: Lint
        run: npm run lint
        working-directory: apps/web

      - name: Test backend
        run: npm test
        working-directory: backend

      - name: Build backend
        run: npm run start
        working-directory: backend

      - name: Build web
        run: npm run build
        working-directory: apps/web

      - name: Build mobile
        run: npm run build
        working-directory: apps/mobile

      - name: Build desktop
        run: npm run tauri:build
        working-directory: apps/desktop

  deploy-backend:
    needs: ci
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy backend to Render
        run: echo "Trigger Render or Railway deploy here"

  deploy-web:
    needs: ci
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy web to Vercel
        run: echo "Trigger Vercel deploy here"

  publish-desktop:
    needs: ci
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Publish desktop artifacts
        run: echo "Upload Tauri build artifacts to GitHub Releases"
```

Notes:

- Add environment-specific secrets in GitHub Actions secrets
- Split CI and deploy workflows for larger teams
- Sign desktop binaries before public release

## Security Best Practices

- Never expose provider API keys in frontend code
- Use environment variables and secret managers
- Enforce HTTPS and secure WebSocket transport
- Apply rate limiting on all sensitive endpoints
- Validate and sanitize all API inputs
- Rotate leaked keys immediately
- Use short-lived auth and realtime tokens
- Restrict CORS and origin policies per environment

## Scalability

Recommended scaling strategy:

- Use Redis for session memory, caching, and rate limiting
- Scale backend API horizontally behind a load balancer
- Serve web assets through a CDN
- Offload OCR, speech processing, or transcript enrichment to background workers when throughput grows
- Add message queues for heavy asynchronous processing

## Testing Strategy

Backend:

- API endpoint tests
- service-layer unit tests
- auth and rate-limit tests

Frontend:

- component tests
- state and hook tests
- API integration mocks

End-to-end:

- login and session creation flow
- live transcript to AI hint flow
- desktop screen-capture to OCR to AI flow

Recommended tools:

- Jest or Vitest
- React Testing Library
- Playwright
- Supertest

## Observability

Production recommendations:

- structured application logs
- centralized log aggregation
- request tracing
- AI request latency monitoring
- Redis health checks
- provider quota and failure alerting

## Contributing

Contributions are welcome.

Recommended workflow:

1. Fork the repository
2. Create a feature branch
3. Keep changes scoped and well documented
4. Add or update tests
5. Run local quality checks
6. Open a pull request with a clear summary

Contribution guidelines:

- Use descriptive branch names
- Follow existing code style
- Document new environment variables
- Do not commit secrets
- Include screenshots or recordings for UI changes

Recommended pre-PR checks:

```bash
npm run lint
npm run test
npm run typecheck
```

## License

This project can be released under the MIT License.

Example:

```text
MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Production Readiness Checklist

- Secrets stored outside source control
- Redis and database provisioned
- API provider quotas monitored
- HTTPS enabled
- CI pipeline passing
- Deploy targets configured
- Error tracking enabled
- Desktop binaries signed
- Mobile OTA strategy defined

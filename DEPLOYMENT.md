# AI Interview Assistant Deployment Guide

This document provides a detailed deployment guide for the AI Interview Assistant platform across backend, web, and desktop delivery channels.

It is written as an operational runbook for engineers deploying the system in staging or production.

## Scope

This guide covers:

- backend deployment
- web deployment
- desktop packaging and distribution
- environment configuration
- secrets handling
- infrastructure recommendations
- CI/CD pipeline design
- production validation checklist
- rollback strategy

## Deployment Targets

Recommended hosting targets:

- Backend API: Render, Railway, or Fly.io
- Web app: Vercel or Netlify
- Desktop app: Tauri build pipeline + GitHub Releases
- Database: MongoDB Atlas or another managed MongoDB provider
- Redis: Upstash Redis, Railway Redis, or managed Redis provider

## Production Architecture

```text
Web Client
   |
Desktop Client
   |
HTTPS / WSS
   |
Backend API (Node.js / Express)
   |
   +--> Redis (session memory, cache, rate limit)
   |
   +--> Database (MongoDB)
   |
   +--> AI Providers (OpenAI / OpenRouter)
```

## 1. Pre-Deployment Checklist

Before deploying anything, confirm the following:

- Backend runs locally without startup errors
- All required environment variables are defined
- API keys are valid and not exposed in source control
- Redis is reachable from the backend environment
- Database is reachable from the backend environment
- Web app points to the correct backend base URL
- Desktop app points to the correct backend base URL
- Type checks pass for backend, web, and desktop
- Build commands pass locally

Recommended local checks:

```bash
cd backend && npm run dev
cd apps/web && npm run build
cd apps/desktop && npm run tauri:build
```

## 2. Environment Variables

Create a production environment file or configure platform secrets with the following variables.

Example:

```env
NODE_ENV=production
PORT=8082

MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/
MONGODB_DB_NAME=aicopilot
REDIS_URL=redis://redis-host:6379

JWT_SECRET=replace_with_strong_secret
JWT_EXPIRES_IN=1h
REALTIME_TOKEN_EXPIRES_IN=10m

AI_PROVIDER=openrouter
OPENAI_API_KEY=
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openai/gpt-5.2

AI_TIMEOUT_MS=15000
AI_HELP_RATE_LIMIT=30
AI_HELP_RATE_LIMIT_WINDOW_SEC=60
SESSION_MEMORY_TTL_SEC=21600
SESSION_MEMORY_MAX_TURNS=6

LOG_LEVEL=info
```

Required minimum variables:

- `PORT`
- `MONGODB_URL`
- `MONGODB_DB_NAME`
- `REDIS_URL`
- `JWT_SECRET`
- `AI_PROVIDER`
- `OPENAI_API_KEY` or `OPENROUTER_API_KEY`

Best practices:

- never commit real secrets
- use platform-managed secrets instead of `.env` in production
- rotate leaked keys immediately
- use separate secrets for development, staging, and production

## 3. Secrets Management

Recommended approach:

- Render: use service environment variables
- Railway: use project variables
- Fly.io: use `fly secrets set`
- Vercel: use project environment variables
- GitHub Actions: use repository or environment secrets

Never store the following in Git:

- OpenAI keys
- OpenRouter keys
- database passwords
- JWT secrets
- Redis credentials

If a key has been exposed:

1. Revoke it immediately at the provider dashboard
2. Generate a replacement key
3. Update the deployment platform secret
4. Redeploy affected services

## 4. Backend Deployment

The backend is the central service used by all clients.

Current workspace path:

- `backend/`

Recommended runtime:

- Node.js 20+

### 4.1 Backend Build and Start

Typical commands:

```bash
cd backend
npm install
npm start
```

Development:

```bash
cd backend
npm run dev
```

### 4.2 Deploy Backend to Render

1. Push the repository to GitHub
2. Create a new Web Service in Render
3. Connect the GitHub repository
4. Set root directory to `backend`
5. Set runtime to `Node`
6. Set build command:

```bash
npm install
```

7. Set start command:

```bash
npm start
```

8. Add all required environment variables in Render dashboard
9. Attach Redis and MongoDB connection settings
10. Deploy

### 4.3 Deploy Backend to Railway

1. Create a new Railway project
2. Connect the GitHub repository
3. Point the service to the `backend` folder
4. Add environment variables
5. Ensure `PORT` is provided by Railway or mapped correctly
6. Deploy

### 4.4 Deploy Backend to Fly.io

1. Install Fly CLI
2. Run:

```bash
cd backend
fly launch
```

3. Configure `fly.toml`
4. Set secrets:

```bash
fly secrets set JWT_SECRET=... MONGODB_URL=... REDIS_URL=... OPENROUTER_API_KEY=...
```

5. Deploy:

```bash
fly deploy
```

### 4.5 Backend Health Validation

After deploy, verify:

- service starts successfully
- Redis connects
- database connects
- `/v1/auth/login` responds
- `/v1/ai-help` responds
- WebSocket connection works

Recommended smoke tests:

```bash
curl https://your-backend-domain/health
curl -X POST https://your-backend-domain/v1/ai-help
```

If there is no health route yet, add one before production rollout.

## 5. Database Deployment

Recommended providers:

- MongoDB Atlas
- another managed MongoDB provider

### 5.1 MongoDB Atlas

1. Create a new MongoDB Atlas project and cluster
2. Create a database user with least-privilege access
3. Copy the connection string
4. Set `MONGODB_URL` and `MONGODB_DB_NAME` in backend environment
5. Configure network access for the deployment platform

### 5.2 Alternative Managed MongoDB

1. Provision a managed MongoDB instance
2. Create credentials and network rules
3. Copy the connection string
4. Set `MONGODB_URL` and `MONGODB_DB_NAME` in backend environment

### 5.3 Release Order

Recommended release order:

1. Apply any database changes needed by the release
2. Deploy backend
3. Deploy frontend clients

## 6. Redis Deployment

Redis is used for:

- session memory
- rate limiting
- transcript state
- short-term caching

Recommended providers:

- Upstash Redis
- Railway Redis
- managed Redis instance on cloud provider

Set:

```env
REDIS_URL=redis://...
```

Validate:

- connection at startup succeeds
- rate limiting works
- session memory persists between requests

## 7. Web App Deployment

Current workspace path:

- `apps/web/`

Recommended platforms:

- Vercel
- Netlify

### 7.1 Required Web Environment Variables

Example:

```env
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
NEXT_PUBLIC_WS_BASE_URL=wss://api.example.com
```

Adjust names to match the actual web config in the app.

### 7.2 Deploy to Vercel

1. Import the repository into Vercel
2. Set root directory to `apps/web`
3. Configure build command:

```bash
npm install && npm run build
```

4. Configure output settings if needed
5. Add environment variables
6. Deploy

### 7.3 Deploy to Netlify

1. Create a new site from Git
2. Set base directory to `apps/web`
3. Set build command:

```bash
npm run build
```

4. Set publish directory according to framework output
5. Add environment variables
6. Deploy

### 7.4 Web Validation

Check:

- login works
- session start works
- microphone access works
- transcript box updates live
- AI hint renders
- error states display clearly

## 8. Desktop Deployment

Current workspace path:

- `apps/desktop/`

Framework:

- Tauri

### 8.1 Desktop Environment Configuration

Set backend URLs in the desktop app configuration or environment:

```env
VITE_API_BASE_URL=https://api.example.com
VITE_WS_BASE_URL=wss://api.example.com
```

Use the exact variable names expected by the desktop config.

### 8.2 Build Desktop Application

```bash
cd apps/desktop
npm install
npm run tauri:build
```

Expected output targets:

- Windows: `.msi` or `.exe`
- macOS: `.dmg`
- Linux: `.AppImage` or `.deb`

### 8.3 GitHub Releases Distribution

Recommended release flow:

1. Build desktop binaries in CI
2. Collect artifacts
3. Create a GitHub Release
4. Upload generated binaries
5. Publish release notes

### 8.4 Desktop Validation

Check:

- login works
- realtime session works
- microphone transcription works
- screen capture permission prompt appears
- OCR detects visible question text
- auto-population of transcript works
- AI hint renders from detected question

## 9. CI/CD Pipeline

Recommended workflow file:

- `.github/workflows/deploy.yml`

### 9.1 Pipeline Stages

1. Checkout repository
2. Install dependencies
3. Run lint
4. Run tests
5. Build backend
6. Build web
7. Build desktop
8. Deploy backend
9. Deploy web
10. Publish desktop builds

### 9.2 Example Workflow

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install backend dependencies
        run: npm install
        working-directory: backend

      - name: Install web dependencies
        run: npm install
        working-directory: apps/web

      - name: Install desktop dependencies
        run: npm install
        working-directory: apps/desktop

      - name: Typecheck backend
        run: node --check src/server.js
        working-directory: backend

      - name: Build web
        run: npm run build
        working-directory: apps/web

      - name: Build desktop
        run: npm run tauri:build
        working-directory: apps/desktop

  deploy-backend:
    needs: ci
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Trigger backend deploy
        run: echo "Deploy backend here"

  deploy-web:
    needs: ci
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Trigger web deploy
        run: echo "Deploy web here"

  publish-desktop:
    needs: ci
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Publish GitHub Release artifacts
        run: echo "Upload desktop binaries here"
```

### 9.3 CI/CD Secrets

Store these in GitHub Actions secrets:

- `OPENAI_API_KEY`
- `OPENROUTER_API_KEY`
- `JWT_SECRET`
- `MONGODB_URL`
- `MONGODB_DB_NAME`
- `REDIS_URL`
- deployment platform tokens
- signing credentials for desktop binaries

## 10. Recommended Release Order

Deploy in this order:

1. database migrations
2. Redis configuration changes
3. backend API
4. web client
5. desktop build and GitHub release

This order reduces the chance of clients pointing to incompatible API behavior.

## 11. Post-Deployment Validation

After production deployment, test these flows:

### Backend

- auth login
- auth register
- session creation
- `/v1/ai-help`
- WebSocket connect
- Redis-backed session memory

### Web

- login
- start session
- start mic
- partial transcript updates
- send transcript
- receive AI hint

### Desktop

- login
- session start
- microphone transcription
- screen capture start
- OCR question extraction
- transcript auto-fill
- AI hint generation

## 12. Monitoring and Alerts

In production, monitor:

- backend error rate
- request latency
- AI provider failures
- quota exhaustion
- Redis connectivity
- database latency
- deployment failures

Recommended tools:

- Render logs / Railway logs / Fly logs
- Sentry
- Datadog
- Grafana
- provider-specific dashboards

Set alerts for:

- repeated 429 provider errors
- backend crash loops
- Redis disconnects
- elevated login failures
- elevated AI help failure rate

## 13. Rollback Strategy

If deployment introduces regressions:

### Backend rollback

1. Revert to the previous working release
2. Restore previous environment variables if they changed
3. Validate auth and `/v1/ai-help`

### Web rollback

1. Re-deploy previous build in Vercel or Netlify
2. Validate login and API base URL

### Desktop rollback

1. Restore previous GitHub Release build
2. Mark the broken release as deprecated

## 14. Common Deployment Issues

### Backend starts locally but fails in production

Possible causes:

- missing environment variables
- Redis not reachable
- database URL incorrect
- invalid provider key
- incorrect port binding

### AI hints fail in production

Possible causes:

- provider quota exhausted
- invalid provider key
- backend cannot reach provider API
- wrong `AI_PROVIDER` value

### Web or desktop cannot connect to backend

Possible causes:

- wrong API base URL
- wrong WebSocket URL
- CORS configuration issue
- HTTPS/WSS mismatch

### Desktop OCR is not detecting questions

Possible causes:

- screen text too small
- low contrast screen content
- wrong display selected
- OCR dependency not bundled correctly

## 15. Security Controls for Production

Production requirements:

- HTTPS only
- secure WebSocket only
- secrets stored outside repo
- rate limiting enabled
- request validation enabled
- auth token expiry enforced
- leaked keys rotated immediately
- desktop builds signed where required

## 16. Final Go-Live Checklist

- production environment variables configured
- database reachable
- Redis reachable
- backend healthy
- web app healthy
- desktop build validated
- AI provider key valid
- provider quota verified
- monitoring enabled
- rollback plan documented

## 17. Recommended Future Improvements

For a stronger production deployment setup, add:

- root workspace package.json
- Dockerfiles for backend and web
- health endpoint
- database migration tooling
- staging environment
- preview environments for pull requests
- signed desktop release workflow
- automated smoke tests after deploy

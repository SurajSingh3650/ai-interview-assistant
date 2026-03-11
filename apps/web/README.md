# AI Interview Copilot Web (Next.js)

## Run

```bash
npm install
npm run dev
```

Create `.env` from `.env.example`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:8080
```

## Pages

- Public: `/`, `/features`, `/pricing`, `/login`, `/register`
- Protected: `/dashboard`, `/live-interview`, `/practice`, `/analytics`, `/settings`

## Architecture Notes

- App Router + TypeScript + Tailwind CSS
- Zustand for auth/ui state
- Axios for API integration
- WebSocket reusable service with reconnect logic
- React Hook Form for auth/settings forms
- Framer Motion for landing/dashboard transitions
- Recharts on analytics page

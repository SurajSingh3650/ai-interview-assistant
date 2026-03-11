# Real-Time AI Interview Assistant Backend

## Folder Structure

```text
backend/
  src/
    app.js
    server.js
    config/
      env.js
      logger.js
    db/
      mongodb.js
      redis.js
    middleware/
      auth.js
      errorHandler.js
      notFound.js
      rateLimit.js
      requestContext.js
    modules/
      ai/
        ai.controller.js
        ai.routes.js
        ai.service.js
        openaiClient.js
      auth/
        auth.controller.js
        auth.routes.js
        auth.service.js
        sessionAuth.js
      realtime/
        wsServer.js
      session/
        session.controller.js
        session.routes.js
        session.service.js
      speech/
        transcription.service.js
    routes/
      index.js
    utils/
      AppError.js
      asyncHandler.js
```

## API Layer

- `POST /v1/auth/login`
- `POST /v1/auth/register`
- `POST /v1/auth/realtime/token`
- `POST /v1/interviews`
- `POST /v1/ai-response`

`POST /v1/ai-response`

Request:

```json
{
  "transcript": "Why do you want to work in our company?",
  "context": {
    "role": "Backend Engineer",
    "company": "Acme",
    "speakingStyle": "short speaking format"
  }
}
```

Response:

```json
{
  "data": {
    "answer": "I want to work here because your team is solving meaningful problems at scale, and my backend experience can help contribute quickly while I continue learning from a strong engineering culture.",
    "bulletPoints": [
      "Meaningful problems at scale",
      "Relevant backend experience",
      "Strong learning environment"
    ],
    "speakingFormat": "Your mission and engineering challenges are a strong match for my background. I can contribute quickly, and I value the opportunity to keep learning in a strong team.",
    "cached": false,
    "model": "gpt-4.1-mini"
  }
}
```

## WebSocket Contract

Connection:

```text
ws://<host>:<port>/realtime?token=<realtime_jwt>&sessionId=<session_id>
```

Client to server:

- `start_recording`
- `audio_stream`
- `stop_recording`
- `request_ai_help`

Server to client:

- `transcript_update`
- `ai_response`
- `heartbeat`
- `system.error`

Example `audio_stream` payload:

```json
{
  "type": "audio_stream",
  "payload": {
    "transcriptChunk": "I enjoy solving problems",
    "isFinal": false
  }
}
```

Example `request_ai_help` payload:

```json
{
  "type": "request_ai_help",
  "payload": {
    "transcript": "Why should we hire you?"
  }
}
```

Example `ai_response` event:

```json
{
  "type": "ai_response",
  "payload": {
    "answer": "I'm a strong fit because I have hands-on experience building scalable products, I communicate clearly, and I focus on delivering practical results with the team.",
    "bulletPoints": [
      "Scalable product experience",
      "Clear communication",
      "Results-focused"
    ],
    "speakingFormat": "I bring relevant experience, clear communication, and a practical approach to delivering results with the team.",
    "cached": false,
    "model": "gpt-4.1-mini"
  }
}
```

## Real-Time Data Flow Diagram

```text
Client Mic
  -> WebSocket `audio_stream`
  -> Speech transcription service
  -> Redis stream state
  -> WebSocket `transcript_update`
  -> User clicks `AI Help`
  -> WebSocket `request_ai_help` or POST /v1/ai-response
  -> AI service
  -> Redis cache lookup
  -> OpenAI Responses API
  -> MongoDB interview history
  -> WebSocket `ai_response`
  -> Web / Desktop / Mobile UI
```

## Speech-To-Text Integration

Current implementation uses a provider abstraction in `modules/speech/transcription.service.js`.

- `pass_through`: accepts transcript chunks produced by client-side or gateway speech recognition and streams partial/final transcript state through the backend.
- `stub`: rejects raw audio-only transcription requests until a provider adapter is added.

This keeps the backend event model stable while allowing a later drop-in provider such as Deepgram, AssemblyAI, Azure Speech, or an OpenAI realtime transcription adapter.

## OpenAI Integration

- `modules/ai/openaiClient.js` creates a singleton client from `OPENAI_API_KEY`
- `modules/ai/ai.service.js` builds a strict prompt and requests structured JSON
- responses are cached in Redis for 10 minutes
- if `OPENAI_API_KEY` is missing, the service returns a deterministic fallback response instead of crashing

## Security

- OpenAI key stays server-side in env only
- auth required for `/v1/ai-response`
- Redis-backed rate limiting on AI help
- Zod request validation
- JWT-protected realtime channel

## Notes

- If you pasted a real OpenAI key into chat or source control, revoke it and issue a new one.
- Install the new backend dependency before running:

```bash
cd backend
npm install
```

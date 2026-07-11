# InterviewForge

A real-time AI-based interview platform supporting technical and coding interviews, combining LLM-driven conversation, live voice interaction, and secure remote code execution.

> **Note:** Coding interviews require the companion [sandbox-executor](https://github.com/SIDHANT-SIN/sandbox-executor) service to be running alongside this app. Without it, code submissions will fail to compile/run.

---

## Features

- **Real-time voice interviews** — Candidates talk to an AI interviewer over LiveKit WebRTC, with natural back-and-forth conversation instead of a static chat interface.
- **LLM-driven interview logic** — LangGraph workflows powered by GPT-OSS (Groq) drive the technical and coding interview flow, deciding what to ask, following up on answers, and evaluating responses.
- **Live voice pipeline** — LiveKit WebRTC handles real-time audio, with Deepgram powering speech-to-text and text-to-speech.
- **Coding interview module** — Monaco Editor provides an in-browser IDE experience for candidates to write and submit code during coding rounds.
- **Secure remote code execution** — Code submissions are forwarded to a separate, sandboxed Go execution service supporting C++, Python, and Java, isolated via Docker with strict CPU/memory limits and hardened further with gVisor.
- **Authentication** — Candidate identity and session access is handled via Clerk.
- **Persistent evaluation data** — Interview and evaluation data is stored in MongoDB, with Redis used to buffer writes for asynchronous persistence.
- **Test case management** — Coding problem test cases are stored and served via Azure Blob Storage.
- **Containerized deployment** — The full stack runs via Docker Compose, with a network-isolated execution sandbox and an Nginx reverse proxy in front of the app in production.

---

## Architecture

This repository contains three services, run together via Docker Compose:

| Service  | Description |
|----------|--------------|
| `client` | React (Vite) frontend — candidate-facing interview UI, built with Monaco Editor for coding rounds. |
| `api`    | FastAPI backend — handles auth, room setup, problem data, and persists evaluation results. |
| `agent`  | LiveKit agent worker (Python) — joins the interview room, runs the LangGraph-driven conversation loop, and handles the voice pipeline. |

`sandbox-executor` is intentionally a **separate repository and service** — it runs on its own Docker network with no public exposure, reachable only from `api` over an internal Docker bridge network (`interview_tier_network`).

---

## Tech Stack

- **Frontend:** React, Vite, Monaco Editor, Clerk (Auth)
- **Backend:** FastAPI, LangGraph, GPT-OSS, LiveKit WebRTC, Deepgram (STT/TTS)
- **Data:** MongoDB, Redis
- **Storage:** Azure Blob Storage (test cases)
- **Infrastructure:** Docker, Docker Compose, Azure VM, Nginx
- **Companion Service:** Go, Gin, Docker (isolation), gVisor (sandbox hardening)

---

## Prerequisites

- Docker and Docker Compose installed
- Accounts/API keys for:
  - MongoDB (e.g. MongoDB Atlas)
  - Redis (e.g. Upstash)
  - Clerk (authentication)
  - LiveKit (Cloud or self-hosted)
  - GPT-OSS / LLM provider API key
  - Azure Blob Storage connection string

---

## Environment Variables

### `server_ai/.env`
```dotenv
MONGODB_URI=your_mongodb_uri
REDIS_URL=your_redis_url
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_ISSUER=your_clerk_issuer
LIVEKIT_URL=your_livekit_url
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
GPT_OSS_API_KEY=your_gpt_oss_api_key
DEEPGRAM_API_KEY=your_deepgram_api_key
AZURE_STORAGE_CONNECTION_STRING=your_azure_storage_connection_string
EXECUTOR_URL=http://go_executor:8050
EXECUTOR_KEY=your_shared_secret_key
```

### `client/.env`
```dotenv
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_API_URL=your_backend_api_url
```

> `VITE_*` variables are baked into the static build at build time. If you change them, rebuild the client image (`docker compose up --build client`) — a `.env` edit alone will not apply to an already-built image.

---

## Running with the Code Execution Sandbox

The coding interview module depends on `sandbox-executor` running and reachable over a shared Docker network. Set that up first:

```bash
# 1. Create the shared network (only needs to be done once)
docker network create interview_tier_network

# 2. Clone and start the executor service
git clone https://github.com/SIDHANT-SIN/sandbox-executor.git
cd sandbox-executor
# create go-executor/.env
docker compose up --build -d
```

Confirm it's up and reachable, without exposing it publicly:
```bash
docker run --rm -it --network interview_tier_network curlimages/curl \
  curl -X POST http://go_executor:8050/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SHARED_SECRET_KEY>" \
  -d '{"lang":"cpp","code":"...","problem_id":"..."}'
```

---

## Getting Started

```bash
# Clone this repo
git clone https://github.com/SIDHANT-SIN/AI-based-Interview-App.git
cd AI-based-Interview-App

# Set up environment files
# server_ai/.env  and  client/.env  (see Environment Variables above)

# Build and start all services
docker compose up --build -d
```

Once running:
- Frontend: `http://localhost`
- API: `http://localhost:8000`

Make sure `sandbox-executor` is already running on `interview_tier_network` (see above) before testing a coding round — the `api` service reaches it internally via `http://go_executor:8050/execute`.

---

## License

MIT License



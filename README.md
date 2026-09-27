# Run-Neeti

Run-Neeti turns a PDF (notes, a textbook chapter, a syllabus) into an **interactive knowledge graph**.
Upload a document and Google Gemini maps its concepts into a tree of topics, sub-topics and details.
It also builds a study roadmap and a quiz, and saves everything to your account.

## Features
- **AI concept map:** one core concept, main topics, sub-topics and key details, each with a short explanation.
- **Interactive graph:** pan, zoom, full-screen mode, hover highlighting, and a popup with each concept's connections.
- **Details page:** a study roadmap, related topics to explore next, exploration progress and a quiz.
- **Scanned PDFs work too:** when a PDF has no text layer, Gemini reads the file directly.
- **Accounts and history:** sign up or log in (passwords are hashed on the server) and reopen or delete saved maps.
- **Caching:** uploading the same document again returns the earlier result instantly.
- **Graceful fallback:** if the AI is unavailable, you still get a basic keyword map and a clear message.

## Tech stack
| Part | Tech |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS 4, Motion, d3-force |
| API | Node.js, Express 5, Multer, pdf-parse |
| AI | Google Gemini (`@google/genai`), default `gemini-flash-latest` with `gemini-flash-lite-latest` as backup |
| Database | MongoDB (Mongoose), falling back to in-memory storage |
| Hosting | Vercel (static frontend + serverless `api/index.js`) |

## Getting started
Requires Node.js 20 or newer.

```bash
git clone https://github.com/mitarthpathak/Run-Neeti.git
cd Run-Neeti
npm install
npm install --prefix server

cp server/.env.example server/.env   # then fill in GEMINI_API_KEY, MONGO_URI, AUTH_SECRET
npm start                             # web on http://localhost:5173, API on http://localhost:3001
```

### Environment variables (`server/.env`)
| Variable | Required | Notes |
|---|---|---|
| `GEMINI_API_KEY` | yes | From [Google AI Studio](https://aistudio.google.com/apikey). |
| `MONGO_URI` | recommended | Without it, data lives in memory and is lost on restart. URL-encode special characters in the password (`@` becomes `%40`). |
| `AUTH_SECRET` | recommended | Long random string used to sign login tokens. |
| `GEMINI_MODEL` | no | Comma-separated list of models tried in order. |
| `CORS_ORIGIN` | no | Only needed if the frontend is on a different origin. |

Check `http://localhost:3001/api/health` to see whether the AI and the database are connected.

## Scripts
| Command | What it does |
|---|---|
| `npm start` | Runs the Vite dev server and the API together |
| `npm run build` | Builds the frontend into `dist/` |
| `npm run lint` | Type-checks the frontend |
| `npm test` | Runs the API tests (no database or API key needed) |

## Deploying to Vercel
1. Import the repository in Vercel. The build command is `npm run build` and the output directory is `dist`.
2. Under **Settings → Environment Variables**, add `GEMINI_API_KEY`, `MONGO_URI` and `AUTH_SECRET`.
3. In MongoDB Atlas, go to **Network Access** and allow `0.0.0.0/0`, because Vercel's IP addresses change.

Uploads are limited to 4 MB (Vercel's request size limit), and analysis must finish within the 60-second function limit.

## Project structure
```
api/index.js          Vercel serverless entry (wraps the Express app)
server/
  index.js            Express app: routes, health check, error handling
  lib/ai.js           Gemini prompt, response validation, keyword fallback
  lib/db.js           MongoDB with in-memory fallback
  lib/auth.js         Password hashing and signed tokens
  routes/             auth, upload, graphs
  test/               API and unit tests (node:test)
src/
  App.tsx             Screens and app state
  lib/api.ts          API client and graph normalisation
  components/         Hero, Upload, Graph, Details, Quiz, History, Auth
```

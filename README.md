
# AI Exam Coach - Backend
## Overview
Node.js + Express backend that exposes two endpoints:
- POST /generate  -> { subject, topic, language }  returns generated question JSON
- POST /explain   -> { questionText, language, hint } returns hint or step-by-step explanation

Uses OpenAI's Chat Completions (gpt-4o-mini). If the API call fails, a small seed bank provides fallback questions.

## Setup (local)
1. Install Node.js v18+.
2. cd backend
3. npm install
4. copy .env.example to .env and set OPENAI_API_KEY
5. npm start
The server listens on port 5000 by default.

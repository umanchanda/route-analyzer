# Route Analyzer

Find every aircraft type that has ever flown between any two airports, powered by Claude AI.

## Project Structure

```
route-analyzer/
├── client/   # React + Vite frontend
└── server/   # Express backend (Anthropic API proxy)
```

## Setup

### 1. Backend

```bash
cd server
npm install
cp .env.example .env
# Edit .env and add your Anthropic API key
npm run dev
```

The server runs on http://localhost:3001

### 2. Frontend (in a new terminal)

```bash
cd client
npm install
npm run dev
```

The app runs on http://localhost:5173

## Getting an Anthropic API Key

1. Go to https://console.anthropic.com
2. Sign in or create an account
3. Navigate to **API Keys** and create a new key
4. Paste it into `server/.env` as `ANTHROPIC_API_KEY=sk-ant-...`

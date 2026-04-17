# ⚡ CodeCoach AI — Mini ChatGPT for DSA & Interview Prep

A full-stack AI-powered coding assistant built with **Angular** + **Node.js** + **LLaMA 3.3** (via Groq). More than just a chatbot — it has memory, document understanding (RAG), tool calling, and a mock interview engine.
---
## 🚀 Live Features

| Feature | Description |
|---|---|
| 💬 **Streaming Chat** | Real-time token-by-token responses like ChatGPT |
| 🧠 **Memory** | All conversations saved to MongoDB, resumable anytime |
| 📄 **File Upload** | Attach code files — AI reads and analyzes them |
| 📚 **RAG** | Upload PDFs, ask questions answered from your documents |
| 🎯 **Mock Interview** | AI interviews you on DSA with feedback and scoring |
| 🔍 **Web Search** | Live DuckDuckGo search results inside the app |
| 💡 **Hint Mode** | Get hints only — not full solutions (great for practice) |
| 🎨 **Markdown + Code** | Syntax highlighted code blocks with Copy button |
| 📋 **File Preview** | Click attached files to view contents in a modal |

---
## 🏗️ Architecture
```
Angular Frontend (port 4200)
        ↓
Node.js + Express Backend (port 3000)
        ↓
Groq API (LLaMA 3.3 70B)
        ↓
MongoDB Atlas (chat history + documents)
        ↓
Tools: Code Executor · Web Search · RAG · Interview Engine
```
---

## 🛠️ Tech Stack

### Frontend
- **Angular 17+** (standalone components)
- **highlight.js** — syntax highlighting
- **marked** — markdown rendering
- **SCSS** with CSS variables for theming

### Backend
- **Node.js + Express**
- **Groq SDK** (LLaMA 3.3 70B — free tier)
- **MongoDB + Mongoose** (chat history & documents)
- **pdf-parse** (PDF text extraction)
- **vm2** (safe JavaScript sandbox for code execution)
- **multer** (file upload handling)
- **Server-Sent Events** (streaming responses)

---

## 📁 Folder Structure

```
mini-chatgpt/                  ← Angular frontend
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── chat/          ← Main chat component
│   │   │   ├── message/       ← Individual message bubble
│   │   │   ├── sidebar/       ← Session history + RAG panel
│   │   │   ├── rag-panel/     ← PDF upload + document Q&A
│   │   │   └── toolbar/       ← Mode switcher (Chat/Interview/Search/Hint)
│   │   ├── services/
│   │   │   ├── chat.service.ts   ← API calls + streaming
│   │   │   └── tools.service.ts  ← Code execution, search, interview
│   │   └── pipes/
│   │       └── markdown.pipe.ts  ← Markdown → HTML with code highlighting
│   └── styles.scss            ← Global dark theme variables

chatgpt-backend/               ← Node.js backend
├── models/
│   ├── Chat.js                ← MongoDB chat session schema
│   └── Document.js            ← MongoDB document/chunk schema
├── executor.js                ← JavaScript sandbox (vm2)
├── rag.js                     ← Chunking + keyword retrieval
├── uploads/                   ← Temp PDF storage (auto-cleaned)
├── index.js                   ← Main Express server
└── .env                       ← API keys (not committed)
```

---

## ⚙️ Setup & Installation

### Prerequisites

- Node.js v18+
- Angular CLI (`npm install -g @angular/cli`)
- MongoDB Atlas account (free)
- Groq API key (free at console.groq.com)

---

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/mini-chatgpt.git
cd mini-chatgpt
```

---

### 2. Backend setup

```bash
cd chatgpt-backend
npm install
```

Create a `.env` file:

```env
GROQ_API_KEY=your_groq_api_key_here
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/codecoach
PORT=3000
```

Start the backend:

```bash
npm run dev
```

You should see:
```
🚀 CodeCoach backend running on http://localhost:3000
✅ MongoDB connected
```

---

### 3. Frontend setup

```bash
cd mini-chatgpt
npm install
ng serve
```

Open **http://localhost:4200**

---

## 🔑 Getting API Keys

### Groq (Free — no credit card)
1. Go to [console.groq.com](https://console.groq.com)
2. Sign up → API Keys → Create key
3. Paste into `.env` as `GROQ_API_KEY`

### MongoDB Atlas (Free tier)
1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create free cluster (M0)
3. Connect → Drivers → copy connection string
4. Paste into `.env` as `MONGODB_URI`

---

## 🎮 How to Use

### 💬 Chat Mode (default)
Just type your question. The AI streams responses with formatted markdown and syntax-highlighted code.

### 🎯 Interview Mode
1. Click the **Interview** button in the toolbar
2. Select topic (DSA, Arrays, Trees, DP, System Design)
3. Select difficulty (Easy / Medium / Hard)
4. Click **Start Interview** — AI asks questions one by one
5. Answer each question — get real-time feedback and a final score

### 🔍 Search Mode
1. Click **Search** in the toolbar
2. Type a search query
3. Live DuckDuckGo results appear instantly
4. Ask follow-up questions in the chat

### 💡 Hint Mode
1. Click **Hint** in the toolbar
2. Paste your LeetCode/DSA problem
3. AI gives you hints only — not the full solution (great for learning!)

### 📚 RAG — Ask from your PDFs
1. In the sidebar → **My Documents** → click upload area
2. Upload any PDF (lecture notes, DSA book, docs)
3. Click the uploaded document to select it
4. Type a question → AI answers from your PDF

### 📄 File Upload
1. Click the 📎 paperclip in the chat input
2. Attach any code file (.py, .js, .ts, .cpp, etc.)
3. Ask "Debug this", "Explain this", "Optimize this"
4. Click the file card in the message to view full file contents

---

## 🗺️ Roadmap

- [x] Phase 1 — Basic chat + streaming + markdown
- [x] Phase 1 — Syntax highlighted code blocks + copy button
- [x] Phase 1 — File upload + file preview modal
- [x] Phase 2 — Memory (MongoDB chat history)
- [x] Phase 2 — Sidebar with session management
- [x] Phase 3 — RAG (PDF upload + document Q&A)
- [x] Phase 4 — Tool calling (interview, search, hint, code execution)
- [ ] Phase 5 — Personalization (user profiles, learning tracker)
- [ ] Voice input / output
- [ ] Python code execution (Docker sandbox)
- [ ] Deploy to cloud (Vercel + Railway)

---

## 🔌 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/sessions` | Create new chat session |
| `GET` | `/api/sessions` | Get all sessions (sidebar) |
| `GET` | `/api/sessions/:id` | Get session with messages |
| `DELETE` | `/api/sessions/:id` | Delete a session |
| `POST` | `/api/sessions/:id/messages` | Save a message |
| `POST` | `/api/chat/stream` | Streaming chat (SSE) |
| `POST` | `/api/chat/rag` | RAG chat from document |
| `POST` | `/api/documents/upload` | Upload + process PDF |
| `GET` | `/api/documents` | List all documents |
| `DELETE` | `/api/documents/:id` | Delete a document |
| `POST` | `/api/tools/execute` | Run JavaScript code |
| `POST` | `/api/tools/search` | Web search |
| `POST` | `/api/tools/explain` | Explain/debug/optimize code |
| `POST` | `/api/tools/interview` | Mock interview engine |
| `GET` | `/api/health` | Health check |

---

## 🐛 Common Issues

**"Stream failed" error**
→ Make sure the backend is running on port 3000 (`npm run dev`)

**"Connection failed. Is the backend running?"**
→ Check your terminal for backend errors. Most common: wrong Groq API key in `.env`

**"You exceeded your quota" (OpenAI)**
→ Switch to Groq (free). See Getting API Keys section above.

**Copy button not working**
→ Edge/Chrome may block clipboard on localhost. The app uses `execCommand` fallback automatically.

**PDF upload fails**
→ Make sure the PDF is text-based (not a scanned image). Scanned PDFs need OCR which is not supported yet.

**MongoDB not connecting**
→ Check your Atlas cluster IP allowlist — add `0.0.0.0/0` for development.

---

## 👤 Author

Built as a full-stack AI project demonstrating:
- Real-time streaming with Server-Sent Events
- RAG (Retrieval Augmented Generation) without a vector database
- Angular standalone components architecture
- MongoDB for persistent AI memory
- LLM tool calling patterns

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

> 💡 **Pro tip:** Use **Hint Mode** when solving LeetCode problems. It builds problem-solving intuition instead of just memorizing solutions.

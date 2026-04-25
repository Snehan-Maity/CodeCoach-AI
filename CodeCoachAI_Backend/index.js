const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const Groq = require('groq-sdk');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const Chat = require('./models/Chat');

//For RAG :
const multer = require('multer');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const Document = require('./models/Document');
const { chunkText, retrieveRelevantChunks, buildContext } = require('./rag');

// ── Multer config ────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────────────
app.use(cors({
  origin: 'http://localhost:4200',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// ── Groq client ──────────────────────────────────────────────────
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// ── MongoDB connection ───────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));


// For using GPT API
// const express = require('express');
// const cors = require('cors');
// const dotenv = require('dotenv');
// const OpenAI = require('openai');

// dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 3000;

// app.use(cors({ origin: 'http://localhost:4200' }));
// app.use(express.json());

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY
// });

// System prompt — this makes the AI a specialized coding coach
const SYSTEM_PROMPT = `You are CodeCoach AI, an expert DSA and interview preparation assistant.

Your specialties:
- Explaining Data Structures and Algorithms clearly with examples
- Writing clean, well-commented code in any language the user asks
- Debugging code and explaining what went wrong
- Conducting mock technical interviews
- Breaking down complex problems step by step

Rules:
- Always format code inside proper markdown code blocks with the language name
- When explaining algorithms, mention Time and Space complexity
- Be encouraging and supportive like a personal tutor
- Keep explanations clear — avoid unnecessary jargon
- If asked for a mock interview, ask one question at a time and wait for the answer`;



// // ── CORS preflight ───────────────────────────────────────────────
// app.options('/{*any}', (req, res) => {
//   res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4200');
//   res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
//   res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
//   res.sendStatus(200);
// });

// ════════════════════════════════════════════════════════════════
// SESSION ROUTES
// ════════════════════════════════════════════════════════════════

// Create new session
// app.post('/api/sessions', async (req, res) => {
//   try {
//     const sessionId = uuidv4();
//     const chat = new Chat({ sessionId, title: 'New Chat', messages: [] });
//     await chat.save();
//     res.json({ sessionId, title: chat.title, createdAt: chat.createdAt });
//   } catch (err) {
//     console.error('Create session error:', err);
//     res.status(500).json({ error: err.message });
//   }
// });


app.post('/api/sessions', async (req, res) => {
  try {
    const { userId } = req.body;
    const sessionId = uuidv4();
    const chat = new Chat({
      sessionId,
      userId,
      title: 'New Chat',
      messages: []
    });

    await chat.save();

    res.json({ sessionId, title: chat.title, createdAt: chat.createdAt });
  } catch (err) {
    console.error('Create session full error:', err);
    console.error('Stack:', err.stack);
    res.status(500).json({ error: err.message });
  }
});


// Get all sessions (for sidebar)
app.get('/api/sessions', async (req, res) => {
  try {
    const { userId } = req.query;

    const sessions = await Chat.find({userId})
      .select('sessionId title createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(50); // Setting limit for number of conversations
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single session with messages
app.get('/api/sessions/:sessionId', async (req, res) => {
  try {
    const chat = await Chat.findOne({ sessionId: req.params.sessionId });
    if (!chat) return res.status(404).json({ error: 'Session not found' });
    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a session
// app.delete('/api/sessions/:sessionId', async (req, res) => {
//   try {
//     await Chat.deleteOne({ sessionId: req.params.sessionId });
//     res.json({ success: true });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });


app.delete('/api/sessions/:sessionId', async (req, res) => {
  try {
    const userId = req.query.userId;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const result = await Chat.deleteOne({
      sessionId: req.params.sessionId
      //userId
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Delete session error:', err);
    res.status(500).json({ error: err.message });
  }
  // console.log('DELETE request:', {
  // sessionId: req.params.sessionId,
  // userId: req.query.userId
  // });
  // this.chatService.triggerSessionsRefresh();
});


// ════════════════════════════════════════════════════════════════
// CHAT ROUTES
// ════════════════════════════════════════════════════════════════

// Save a message to session
app.post('/api/sessions/:sessionId/messages', async (req, res) => {
  try {
    const { role, content,   userId } = req.body;
    const chat = await Chat.findOne({ sessionId: req.params.sessionId, userId });
    if (!chat) return res.status(404).json({ error: 'Session not found' });

    chat.messages.push({ role, content });

    // Auto-generate title from first user message
    if (chat.title === 'New Chat' && role === 'user') {
      chat.title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
    }

    await chat.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Regular (non-streaming) chat route ──────────────────────────
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  try {

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',   // ← change this line only
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages
      ],
      max_tokens: 1500,
      temperature: 0.7
    });

    // For GPT
    // const completion = await openai.chat.completions.create({
    //   model: 'gpt-4o',
    //   messages: [
    //     { role: 'system', content: SYSTEM_PROMPT },
    //     ...messages
    //   ],
    //   max_tokens: 1500,
    //   temperature: 0.7
    // });

    const reply = completion.choices[0].message.content;
    res.json({ reply });

  } catch (error) {
    console.error('OpenAI error:', error.message);
    res.status(500).json({ error: 'Failed to get response from AI' });
  }
});


// ── Streaming chat route ─────────────────────────────────────────
app.post('/api/chat/stream', async (req, res) => {
  const { messages, sessionId, userId } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4200');
  res.flushHeaders();

  let fullResponse = '';

  try {
    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages
      ],
      max_tokens: 1500,
      temperature: 0.7,
      stream: true
    });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content;
      if (token) {
        fullResponse += token;
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }
    }

    // Save assistant response to MongoDB
    if (sessionId && fullResponse) {
      try {
        const chat = await Chat.findOne({ sessionId, userId });
        if (chat) {
          chat.messages.push({ role: 'assistant', content: fullResponse });
          await chat.save();
        }
      } catch (dbErr) {
        console.error('Failed to save assistant message:', dbErr);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

  } catch (error) {
    console.error('Stream error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// ════════════════════════════════════════════════════════════════
// RAG ROUTES
// ════════════════════════════════════════════════════════════════

// Upload and process a PDF
app.post('/api/documents/upload', upload.single('pdf'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No PDF file uploaded' });
  }

  try {
    // Extract text from PDF
    const fileBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(fileBuffer);
    const rawText = pdfData.text;

    if (!rawText || rawText.trim().length < 50) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Could not extract text from PDF. Make sure it is not a scanned image.' });
    }

    // Chunk the text
    const chunks = chunkText(rawText, 500, 100);

    // Save to MongoDB
    const document = new Document({
      fileName: req.file.originalname,
      fileSize: req.file.size,
      totalChunks: chunks.length,
      chunks: chunks.map((text, index) => ({ text, index }))
    });

    await document.save();

    // Delete the temp file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      documentId: document._id,
      fileName: document.fileName,
      totalChunks: document.totalChunks,
      preview: rawText.slice(0, 200) + '...'
    });

  } catch (error) {
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('PDF processing error:', error);
    res.status(500).json({ error: 'Failed to process PDF: ' + error.message });
  }
});

// Get all uploaded documents
app.get('/api/documents', async (req, res) => {
  try {
    const documents = await Document.find({})
      .select('fileName fileSize totalChunks uploadedAt')
      .sort({ uploadedAt: -1 });
    res.json(documents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a document
app.delete('/api/documents/:id', async (req, res) => {
  try {
    await Document.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// RAG-powered chat — answers from documents
app.post('/api/chat/rag', async (req, res) => {
  const { question, documentId, sessionId } = req.body;

  if (!question || !documentId) {
    return res.status(400).json({ error: 'question and documentId are required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4200');
  res.flushHeaders();

  try {
    // Load document chunks from DB
    const document = await Document.findById(documentId);
    if (!document) {
      res.write(`data: ${JSON.stringify({ error: 'Document not found' })}\n\n`);
      return res.end();
    }

    // Retrieve relevant chunks
    const relevantChunks = retrieveRelevantChunks(question, document.chunks, 3);
    const context = buildContext(relevantChunks, document.fileName);

    if (!context) {
      res.write(`data: ${JSON.stringify({ token: "I couldn't find relevant information in the document for your question. Try rephrasing or asking something else." })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      return res.end();
    }

    // Build RAG prompt
    const ragMessages = [
      {
        role: 'system',
        content: `${SYSTEM_PROMPT}\n\nYou have been given document excerpts to answer the user's question. Answer ONLY based on the provided document content. If the answer is not in the document, say so clearly.`
      },
      {
        role: 'user',
        content: `${context}\n\nQuestion: ${question}`
      }
    ];

    // Stream the response
    let fullResponse = '';
    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: ragMessages,
      max_tokens: 1500,
      temperature: 0.5,
      stream: true
    });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content;
      if (token) {
        fullResponse += token;
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }
    }

    // Save to session if provided
    if (sessionId && fullResponse) {
      const chat = await Chat.findOne({ sessionId });
      if (chat) {
        chat.messages.push({ role: 'user', content: question });
        chat.messages.push({ role: 'assistant', content: fullResponse });
        await chat.save();
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

  } catch (error) {
    console.error('RAG error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});


// ── Health check ─────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 CodeCoach backend running on http://localhost:${PORT}`);
});

// ── Streaming chat route ─────────────────────────────────────────
// app.post('/api/chat/stream', async (req, res) => {
//   const { messages } = req.body;

//   if (!messages || !Array.isArray(messages)) {
//     return res.status(400).json({ error: 'messages array is required' });
//   }

//   res.setHeader('Content-Type', 'text/event-stream');
//   res.setHeader('Cache-Control', 'no-cache');
//   res.setHeader('Connection', 'keep-alive');
//   res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4200');
//   res.flushHeaders();

//   try {

//     const stream = await groq.chat.completions.create({
//       model: 'llama-3.3-70b-versatile',   // ← change this line only
//       messages: [
//         { role: 'system', content: SYSTEM_PROMPT },
//         ...messages
//       ],
//       max_tokens: 1500,
//       temperature: 0.7,
//       stream: true
//     });

//     //For GPT
//     // const stream = await openai.chat.completions.create({
//     //   model: 'gpt-4o',
//     //   messages: [
//     //     { role: 'system', content: SYSTEM_PROMPT },
//     //     ...messages
//     //   ],
//     //   max_tokens: 1500,
//     //   temperature: 0.7,
//     //   stream: true
//     // });

//     for await (const chunk of stream) {
//       const token = chunk.choices[0]?.delta?.content;
//       if (token) {
//         res.write(`data: ${JSON.stringify({ token })}\n\n`);
//       }
//     }

//     res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
//     res.end();

//   } catch (error) {
//     console.error('Stream error full details:', error);
//     res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
//     res.end();
//   }
// });


// // ── Health check ─────────────────────────────────────────────────
// app.get('/api/health', (req, res) => {
//   res.json({ status: 'ok', message: 'CodeCoach AI backend is running' });
// });


// app.listen(PORT, () => {
//   console.log(`🚀 CodeCoach backend running on http://localhost:${PORT}`);
// });
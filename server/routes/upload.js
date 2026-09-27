import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { createRequire } from 'module';
import { analyzeDocument, buildFallbackGraph } from '../lib/ai.js';
import { findAiGraphByHash, findUserGraphByHash, saveGraph } from '../lib/db.js';
import { rateLimit } from '../lib/rateLimit.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

// Vercel rejects request bodies above ~4.5 MB, so keep uploads under that.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
// The whole request must finish inside Vercel's 60s function limit.
const AI_BUDGET_MS = 50_000;
// Below this many characters we assume a scanned PDF and let Gemini read the file itself.
const MIN_TEXT_CHARS = 200;

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const isPdf = file.mimetype === 'application/pdf' || /\.pdf$/i.test(file.originalname || '');
    cb(isPdf ? null : Object.assign(new Error('Only PDF files are supported.'), { status: 400 }), isPdf);
  },
});
const uploadLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 15, message: 'Upload limit reached. Please try again in a few minutes.' });

function toResponse(doc, extra = {}) {
  return {
    success: true,
    id: String(doc._id),
    filename: doc.filename,
    graph: doc.graph,
    metadata: doc.metadata,
    createdAt: doc.createdAt,
    fallbackUsed: doc.source === 'fallback',
    ...extra,
  };
}

router.post('/upload', uploadLimiter, upload.single('pdf'), async (req, res) => {
  const startedAt = Date.now();
  if (!req.file) return res.status(400).json({ success: false, error: 'Please choose a PDF file to upload.' });
  if (!req.file.buffer.subarray(0, 1024).includes('%PDF')) {
    return res.status(400).json({ success: false, error: 'This file is not a valid PDF.' });
  }

  let text = '';
  try {
    const parsed = await pdfParse(req.file.buffer);
    text = (parsed.text || '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  } catch (err) {
    console.error('[Upload] PDF text extraction failed:', err.message);
  }
  const scanned = text.length < MIN_TEXT_CHARS;

  const filename = req.file.originalname || 'document.pdf';
  const userId = req.user?._id ?? null;
  const contentHash = crypto.createHash('sha256').update(scanned ? req.file.buffer : text).digest('hex');

  // Cache: identical documents are only analysed once.
  const cached = await findAiGraphByHash(contentHash).catch(() => null);
  if (cached) {
    console.log('[Upload] cache hit', contentHash.slice(0, 12));
    let doc = cached;
    if (userId && String(cached.userId) !== String(userId)) {
      // Give this user their own copy so it shows up in their history.
      doc = (await findUserGraphByHash(contentHash, userId).catch(() => null)) ||
        (await saveGraph({ filename, contentHash, graph: cached.graph, metadata: cached.metadata,
          source: 'ai', model: cached.model, userId }).catch(() => cached));
    }
    return res.json(toResponse(doc, { cached: true, filename }));
  }

  let result;
  let source = 'ai';
  let warning;
  try {
    result = await analyzeDocument(scanned ? { pdf: req.file.buffer } : { text }, { deadline: startedAt + AI_BUDGET_MS });
  } catch (err) {
    console.error('[Upload] AI analysis failed:', err.code || err.status || '', err.message);
    if (scanned) {
      return res.status(422).json({
        success: false,
        error: err.code === 'NO_API_KEY'
          ? 'This PDF has no selectable text and the AI service is not configured.'
          : 'This PDF has no selectable text and the AI service is busy right now. Please try again in a minute.',
      });
    }
    result = buildFallbackGraph(text);
    source = 'fallback';
    warning = err.code === 'NO_API_KEY'
      ? 'AI is not configured on the server, so a basic keyword map was generated.'
      : 'The AI service is busy right now, so a basic keyword map was generated. Upload again later for a full AI map.';
  }

  const doc = {
    filename,
    contentHash,
    graph: result.graph,
    metadata: result.metadata,
    source,
    model: result.model,
    userId,
  };
  let saved;
  try {
    saved = await saveGraph(doc);
  } catch (err) {
    // Still return the result even if persistence fails.
    console.error('[Upload] could not save graph:', err.message);
    saved = { ...doc, _id: crypto.randomUUID(), createdAt: new Date() };
  }
  console.log(`[Upload] ${filename}: ${source}, ${result.graph.nodes.length} nodes in ${Date.now() - startedAt}ms`);
  res.json(toResponse(saved, warning ? { warning } : {}));
});

export default router;

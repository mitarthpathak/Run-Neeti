import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import PQueue from 'p-queue';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import Groq from 'groq-sdk';
import GraphModel from '../models/Graph.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Ultra-Conservative Concurrency: Single-request mode to stabilize ultra-low quota keys
const queue = new PQueue({ concurrency: 1, interval: 5000, intervalCap: 1 });

// Tracking rate limit status for health check
let isCurrentlyLimited = false;

/**
 * Optimized Chunking: Overlapping sliding window to ensure semantic continuity
 */
function chunkText(text, size = 10000, overlap = 1000) {
  const chunks = [];
  let start = 0;
  // Process up to 5 chunks (~50k chars) for comprehensive coverage
  while (start < text.length && chunks.length < 5) {
    let end = start + size;
    chunks.push(text.slice(start, Math.min(end, text.length)));
    start = end - overlap;
  }
  return chunks;
}

/**
 * Step 5: Simple regex/frequency analysis fallback
 */
function generateFallbackData(text) {
  const words = text.match(/\b\w{5,}\b/g) || [];
  const freq = {};
  words.forEach(w => {
    const word = w.toLowerCase();
    freq[word] = (freq[word] || 0) + 1;
  });
  
  const topWords = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([w]) => w);

  const nodes = topWords.map((word, i) => ({
    id: `f${i}`,
    label: word.charAt(0).toUpperCase() + word.slice(1),
    type: i < 5 ? 'core' : (i < 15 ? 'header' : (i < 25 ? 'sub-topic' : 'concept')),
    importance: Math.max(1, 10 - Math.floor(i/3)),
    desc: `Key technical term "${word}" identified via frequency analysis. This concept forms part of the ${i < 5 ? 'foundational' : 'structural'} framework of the document.`
  }));

  const edges = [];
  for (let i = 1; i < nodes.length; i++) {
    edges.push({ source: nodes[0].id, target: nodes[i].id, label: 'related', importance: 5 });
  }

  return {
    graph: { nodes, edges },
    metadata: {
      title: "Content Analysis",
      description: "Automated analysis of the uploaded document using heuristic extraction.",
      complexity: 5,
      category: "General Study",
      roadmap: [
        { number: "01", title: "Preliminary Scan", status: "completed", desc: "Initial identification of recurring terminology." },
        { number: "02", title: "Structural Mapping", status: "in-progress", desc: "Organizing identified concepts into a hierarchy." },
        { number: "03", title: "Deep Analysis", status: "locked", desc: "Detailed semantic extraction of sub-topics." }
      ],
      relatedModules: [
        { icon: "analytics", title: "Pattern Recognition", desc: "Statistical distribution of key terms" },
        { icon: "account_tree", title: "Hierarchy Discovery", desc: "Nested relationship identification" }
      ]
    }
  };
}

/**
 * Step 6: 30s, 60s, 120s retry logic
 */
async function callAIWithRetry(fn, retries = 0) {
  const delays = [10000, 30000, 60000, 120000, 180000, 240000, 300000]; // Increasing backoff
  try {
    const res = await fn();
    isCurrentlyLimited = false;
    return res;
  } catch (err) {
    const isRateLimit = err.status === 429 || (err.message && err.message.includes('429')) || (err.message && err.message.includes('Quota'));
    if (isRateLimit && retries < delays.length) {
      isCurrentlyLimited = true;
      const jitter = Math.floor(Math.random() * 5000); 
      const delay = (delays[retries] || delays[delays.length-1]) + jitter;
      console.error(`[AI Throttled] retry ${retries + 1}/${delays.length} in ${delay/1000}s. Error: ${err.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callAIWithRetry(fn, retries + 1);
    }
    console.error(`[AI Critical Failure] Final retry failed:`, err.message);
    throw err;
  }
}

async function analyzeChunk(groq, chunk, chunkIndex) {
  const prompt = `
    Analyze this text (part ${chunkIndex + 1}) and return ONLY RAW JSON for a hierarchical, technical mind-map.
    
    Structure Requirement:
    1. ROOT: One central "Major" concept representing the core theme of this text.
    2. HEADERS: Exactly 3 "Minor" header boxes (Major Chapters or Domains) connected out from the root in a balanced circular way.
    3. SUB-TOPICS: Two separate sub-boxes connected to EVERY header box.
    4. LEAVES: 1 to 3 granular specific concepts/details connected to EVERY sub-box.

    Output Schema:
    {
      "nodes": [{ 
        "id": "unique_string", 
        "label": "Technical name", 
        "type": "major" | "header" | "sub-topic" | "concept",
        "desc": "A clear 2-line technical definition or explanation of this specific topic",
        "importance": 1-10,
        "parentId": "id_of_parent"
      }],
      "edges": [{ 
        "from": "node_id", 
        "to": "node_id", 
        "label": "defines" | "contains" | "leads-to"
      }]
    }
    
    Rules:
    - NON-UNIFORMITY: Ensure each branch has a different weight and depth within the 1-4-2-N rules.
    - DENSE DATA: Use actual scientific/technical terminology from the text.
    - VISUAL HIERARCHY: Ensure the edges strictly reflect this parent-child tree structure.
    
    Text: ${chunk}
  `;
  
  return queue.add(async () => {
    const result = await callAIWithRetry(() => groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: "llama-3.1-8b-instant",
      response_format: { type: "json_object" }
    }));
    const content = result.choices[0].message.content;
    try {
      return JSON.parse(content.replace(/```json|```/g, '').trim());
    } catch (e) {
      const match = content.match(/\{[\s\S]*\}/);
      return match ? JSON.parse(match[0]) : { nodes: [], edges: [] };
    }
  });
}

async function generateSummary(groq, text) {
  const prompt = `
    Analyze this academic text and return a structured JSON summary for a learning dashboard.
    
    Structure:
    {
      "title": "Clear concise subject title (max 3 words)",
      "description": "Engaging high-level summary of what this document covers (2 sentences)",
      "complexity": 1-10 (Difficulty level),
      "category": "Broad academic field (e.g., Computer Science, Linguistics)",
      "roadmap": [
        {
          "number": "01",
          "title": "Phase name",
          "status": "completed" | "in-progress" | "locked",
          "desc": "Short explanation of this learning milestone"
        }
      ],
      "relatedModules": [
        {
          "icon": "material_symbol_name",
          "title": "Related topic",
          "desc": "How it connects"
        }
      ]
    }

    Rules:
    - Return ONLY the raw JSON.
    - BE SPECIFIC: Use actual chapter names, topics, and technical terms from the text provided.
    - Create 4-5 roadmap milestones that logically flow based on the text.
    - Create 3-5 related modules with relevant Material Symbol icon names.
    - Text: ${text.slice(0, 20000)}
  `;
  
  return queue.add(async () => {
    const result = await callAIWithRetry(() => groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: "llama-3.1-8b-instant",
      response_format: { type: "json_object" }
    }));
    const content = result.choices[0].message.content;
    try {
      return JSON.parse(content.replace(/```json|```/g, '').trim());
    } catch (e) {
      const match = content.match(/\{[\s\S]*\}/);
      return match ? JSON.parse(match[0]) : {};
    }
  });
}

// Helper to get rate limit status for health check
export const getRateLimitStatus = () => isCurrentlyLimited;

function mergeGraphData(chunks) {
  const nodeMap = new Map();
  const edges = [];
  const idRemapGlobal = {}; // chunkIndex_localId -> globalId
  let idCounter = 1;

  chunks.forEach((chunk, chunkIndex) => {
    (chunk.nodes || []).forEach(node => {
      const key = (node.label || '').toLowerCase().trim();
      if (!key) return;
      
      let globalId;
      if (!nodeMap.has(key)) {
        globalId = `c${idCounter++}`;
        nodeMap.set(key, { ...node, id: globalId });
      } else {
        globalId = nodeMap.get(key).id;
      }
      idRemapGlobal[`${chunkIndex}_${node.id}`] = globalId;
    });
  });

  // Second pass: process parentIds and edges
  chunks.forEach((chunk, chunkIndex) => {
    (chunk.nodes || []).forEach(node => {
      const key = (node.label || '').toLowerCase().trim();
      if (node.parentId && nodeMap.has(key)) {
        const globalId = nodeMap.get(key).id;
        const globalParentId = idRemapGlobal[`${chunkIndex}_${node.parentId}`];
        if (globalParentId) {
          nodeMap.get(key).parentId = globalParentId;
        }
      }
    });

    (chunk.edges || []).forEach(edge => {
      const fromId = idRemapGlobal[`${chunkIndex}_${edge.from}`];
      const toId = idRemapGlobal[`${chunkIndex}_${edge.to}`];
      if (fromId && toId && fromId !== toId) {
        const exists = edges.find(e => (e.source === fromId && e.target === toId) || (e.source === toId && e.target === fromId));
        if (!exists) {
          edges.push({ source: fromId, target: toId, label: edge.label, importance: edge.importance || 5 });
        }
      }
    });
  });

  return { nodes: Array.from(nodeMap.values()), edges };
}

router.post('/upload', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

    const pdfData = await pdfParse(req.file.buffer);
    const text = pdfData.text;
    if (!text) return res.status(400).json({ success: false, error: 'No text found in PDF' });

    // Smart Cache Strategy: Restore cache but allow force-regeneration for fallback data
    const contentHash = crypto.createHash('sha256').update(text).digest('hex');
    const cached = await GraphModel.findOne({ contentHash });
    
    // Condition: Check if cached data exists and is valid (not a previous fallback)
    const isOldFallback = cached?.metadata?.title === "Content Analysis" || cached?.metadata?.title === "Extracted Concepts (Fallback Mode)";
    if (cached && !isOldFallback) {
      console.log('[Cache Hit] Serving optimized graph for hash:', contentHash);
      return res.json({ success: true, graph: cached.graph, metadata: cached.metadata, filename: cached.filename });
    }
    
    console.log('[Cache Miss/Invalid] Initiating fresh AI analysis...');

    // Step 2: Use Groq with llama-3.1-8b-instant
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    try {
      console.log(`[Consolidated Pipeline] Executing Sequential Deep Analysis: ${text.length} chars...`);
      
      // Step 1: Summary (First, to establish context)
      const metadata = await generateSummary(groq, text);
      
      // Step 2: Chunks (Sequentially, to respect strict quotas)
      const chunks = chunkText(text);
      const chunkResults = [];
      for (let i = 0; i < chunks.length; i++) {
        console.log(`[Pipeline] Processing chunk ${i + 1}/${chunks.length}...`);
        const result = await analyzeChunk(groq, chunks[i], i);
        chunkResults.push(result);
      }

      // Merge results
      const mergedGraph = mergeGraphData(chunkResults);

      const finalResult = {
        filename: req.file.originalname,
        contentHash,
        ...mergedGraph,
        metadata,
        userEmail: req.body.userEmail || null
      };

      await GraphModel.create(finalResult);
      res.json({ success: true, ...finalResult });

    } catch (err) {
      // Step 5: Fallback if AI fails
      console.error('AI Failed, using fallback:', err.message);
      const fallback = generateFallbackData(text);
      const finalFallback = {
        filename: req.file.originalname,
        contentHash,
        ...fallback,
        userEmail: req.body.userEmail || null
      };
      await GraphModel.create(finalFallback);
      res.json({ success: true, ...finalFallback, fallbackUsed: true });
    }
  } catch (err) {
    console.error('Upload Error:', err);
    res.status(500).json({ success: false, error: 'Server processing failed' });
  }
});

export default router;



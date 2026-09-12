import express from 'express';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '20mb' }));

// Lazy initialize Gemini client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Lazy initialize Supabase client
function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key || url.trim() === '' || key.trim() === '') {
    return null;
  }

  try {
    return createClient(url.trim(), key.trim(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  const hasKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY';
  res.json({
    status: 'ok',
    hasGeminiKey: hasKey,
    model: 'gemini-3.6-flash',
    thinkingLevel: 'LOW',
  });
});

// Gemini Analysis Endpoint with Thinking Mode
app.post('/api/analyze', async (req, res) => {
  try {
    const { rawText, enableThinking = true } = req.body;

    if (!rawText || typeof rawText !== 'string') {
      res.status(400).json({ error: 'rawText is required.' });
      return;
    }

    const ai = getGeminiClient();

    // If Gemini is not available or key missing, return fallback flag
    if (!ai) {
      res.json({
        success: false,
        usedAi: false,
        reason: 'GEMINI_API_KEY not configured or placeholder detected. Using enterprise local analyzer.',
      });
      return;
    }

    const prompt = `You are a Senior Principal DevOps Architect, Cloud Architect, Site Reliability Engineer (SRE), and Technical Interview Panelist with 20+ years experience.
Clean the input and analyze EVERY question carefully.
Prioritize correctness over speed. Never randomly classify questions.

Allowed Primary Topics (Choose ONLY ONE):
Ansible, Architecture, Automation, AWS, Azure, CI/CD, CloudWatch, Containerd, Database, DevSecOps, DNS, Docker, GCP, Git, GitHub, Grafana, Helm, IAM, Jenkins, Kubernetes, Linux, Monitoring, Networking, Observability, OCI, OpenShift, Others, Platform Engineering, Podman, Prometheus, Python, Security, Shell Scripting, SRE, Storage, Terraform.

Difficulty Rules:
- Beginner: Definition, Basic Commands, Simple Concepts
- Intermediate: Working knowledge, Daily use
- Advanced: Production implementation, Design, Optimization
- Expert: Architecture, Real production, Edge cases, Trade-offs, Large scale

Question Type:
Choose one from: Theory, Scenario, Troubleshooting, Coding, Architecture, Real-time Experience, Production Incident, Hands-on.

Experience Level:
0-2 Years, 2-4 Years, 4-6 Years, 6-8 Years, 8-12 Years, 12+ Years.

Interview Round:
HR, L1, L2, L3, Manager, Architect, Principal Engineer.

Explanation: Max 50 words about why it belongs to that topic.
Confidence score: 0-100 (integer).

Input Text to analyze:
${rawText}

Return a strictly valid JSON array of objects. Each object MUST have this structure:
[
  {
    "question": "cleaned question text preserving original wording",
    "primary_topic": "Only one allowed topic",
    "cross_topics": ["secondary tech 1", "secondary tech 2"],
    "difficulty": "Beginner | Intermediate | Advanced | Expert",
    "question_type": "Theory | Scenario | Troubleshooting | Coding | Architecture | Real-time Experience | Production Incident | Hands-on",
    "experience_level": "0-2 Years | 2-4 Years | 4-6 Years | 6-8 Years | 8-12 Years | 12+ Years",
    "interview_round": "HR | L1 | L2 | L3 | Manager | Architect | Principal Engineer",
    "tags": ["tag1", "tag2"],
    "search_keywords": ["kw1", "kw2"],
    "confidence_score": 95,
    "explanation": "concise explanation up to 50 words"
  }
]`;

    const config: any = {
      responseMimeType: 'application/json',
      systemInstruction:
        'You are an elite Senior Principal DevOps Architect and Interview Panelist. Output pure JSON without markdown backticks or extra text.',
    };

    const candidateModels = ['gemini-3.6-flash', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    let parsedData: any = null;
    let usedModel = '';
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        const currentConfig = { ...config };
        if (enableThinking) {
          if (model === 'gemini-3.1-flash-lite') {
            currentConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.MINIMAL };
          } else {
            currentConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
          }
        }

        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: currentConfig,
        });

        const responseText = response.text || '';
        const cleaned = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
        parsedData = JSON.parse(cleaned);
        if (Array.isArray(parsedData) && parsedData.length > 0) {
          usedModel = model;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.info(`[Model Cascade] ${model} unavailable (Code: ${err?.status || err?.code || 'temp'}), failing over to next model...`);
      }
    }

    if (parsedData && Array.isArray(parsedData) && parsedData.length > 0) {
      res.json({
        success: true,
        usedAi: true,
        model: usedModel,
        thinkingLevel: enableThinking ? 'LOW' : 'OFF',
        data: parsedData,
      });
    } else {
      res.json({
        success: false,
        usedAi: false,
        fallback: true,
        error: lastError?.message || 'Gemini models unavailable, fallback active',
      });
    }
  } catch (error: any) {
    console.warn('Analysis request failed:', error);
    res.json({
      success: false,
      usedAi: false,
      fallback: true,
      error: error.message || 'Error processing analysis',
    });
  }
});

// Helper to extract Supabase project reference
function getSupabaseProjectRef(url: string): string {
  const match = url.match(/https?:\/\/([^.]+)\.supabase\.co/i);
  return match ? match[1] : '';
}

// Clean production DDL for initializing public.questions with RLS & indexes
const DEFAULT_SUPABASE_DDL = `-- ==========================================
-- SUPABASE POSTGRESQL SCHEMA: public.questions
-- Enterprise DevOps & Cloud Question Bank
-- ==========================================

-- 1. Create table
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    primary_topic VARCHAR(100) NOT NULL,
    cross_topics TEXT[] DEFAULT '{}',
    difficulty VARCHAR(50) NOT NULL,
    question_type VARCHAR(50) NOT NULL,
    experience_level VARCHAR(50) NOT NULL,
    interview_round VARCHAR(50) NOT NULL,
    tags TEXT[] DEFAULT '{}',
    search_keywords TEXT[] DEFAULT '{}',
    confidence_score INTEGER NOT NULL DEFAULT 90,
    duplicate_group VARCHAR(50),
    explanation TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Approved',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes for fast search & filtering
CREATE INDEX IF NOT EXISTS idx_questions_primary_topic ON public.questions(primary_topic);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON public.questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_question_type ON public.questions(question_type);
CREATE INDEX IF NOT EXISTS idx_questions_experience_level ON public.questions(experience_level);
CREATE INDEX IF NOT EXISTS idx_questions_interview_round ON public.questions(interview_round);
CREATE INDEX IF NOT EXISTS idx_questions_tags ON public.questions USING GIN(tags);

-- 3. Row Level Security & Anon access policies
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon and authenticated full access" ON public.questions;
CREATE POLICY "Allow anon and authenticated full access"
    ON public.questions
    FOR ALL
    TO anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);

-- 4. Grant schema permissions
GRANT ALL ON public.questions TO anon, authenticated, service_role;
`;

// Check Supabase Configuration & Connection Status
app.get('/api/supabase/status', async (req, res) => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key || url.trim() === '' || key.trim() === '') {
    res.json({
      configured: false,
      connected: false,
      tableExists: false,
      isMissingTable: false,
      message: 'SUPABASE_URL or SUPABASE_KEY is not configured in environment variables.',
      ddlSql: DEFAULT_SUPABASE_DDL,
    });
    return;
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    res.json({
      configured: false,
      connected: false,
      tableExists: false,
      isMissingTable: false,
      message: 'Failed to initialize Supabase client with current credentials.',
      ddlSql: DEFAULT_SUPABASE_DDL,
    });
    return;
  }

  const projectRef = getSupabaseProjectRef(url);
  const sqlEditorUrl = projectRef
    ? `https://supabase.com/dashboard/project/${projectRef}/sql/new`
    : 'https://supabase.com/dashboard';

  try {
    // Perform active row check to verify table exists in PostgreSQL schema cache
    const { data, error } = await supabase
      .from('questions')
      .select('id')
      .limit(1);

    if (error) {
      const isMissingTable =
        error.code === 'PGRST205' ||
        error.code === '42P01' ||
        error.message?.toLowerCase().includes('does not exist') ||
        error.message?.toLowerCase().includes('schema cache') ||
        error.message?.toLowerCase().includes('could not find the table');

      res.json({
        configured: true,
        connected: !isMissingTable,
        tableExists: !isMissingTable,
        isMissingTable,
        tableName: 'questions',
        projectRef,
        sqlEditorUrl,
        ddlSql: DEFAULT_SUPABASE_DDL,
        url: url.replace(/^(https?:\/\/[^/]+).*/, '$1'),
        error: isMissingTable
          ? "The table 'public.questions' has not been created in your Supabase database yet."
          : error.message,
        errorCode: error.code,
      });
      return;
    }

    // Table exists! Retrieve count
    const { count } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true });

    res.json({
      configured: true,
      connected: true,
      tableExists: true,
      isMissingTable: false,
      tableName: 'questions',
      projectRef,
      sqlEditorUrl,
      ddlSql: DEFAULT_SUPABASE_DDL,
      existingCount: count ?? data?.length ?? 0,
      url: url.replace(/^(https?:\/\/[^/]+).*/, '$1'),
    });
  } catch (err: any) {
    res.json({
      configured: true,
      connected: false,
      tableExists: false,
      isMissingTable: true,
      tableName: 'questions',
      projectRef,
      sqlEditorUrl,
      ddlSql: DEFAULT_SUPABASE_DDL,
      error: err.message || 'Error connecting to Supabase',
    });
  }
});

// Fetch all questions directly from Supabase DB
app.get('/api/supabase/questions', async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      res.json({
        success: false,
        configured: false,
        questions: [],
        message: 'Supabase credentials are not configured.',
      });
      return;
    }

    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase Fetch Questions Error]:', error.message);
      res.json({
        success: false,
        configured: true,
        error: error.message,
        questions: [],
      });
      return;
    }

    const formattedQuestions = (data || []).map((row: any, idx: number) => ({
      id: row.id,
      sl_no: idx + 1,
      question: row.question || '',
      primary_topic: row.primary_topic || 'Others',
      cross_topics: Array.isArray(row.cross_topics) ? row.cross_topics : [],
      difficulty: row.difficulty || 'Intermediate',
      question_type: row.question_type || 'Theory',
      experience_level: row.experience_level || '2-4 Years',
      interview_round: row.interview_round || 'L2',
      tags: Array.isArray(row.tags) ? row.tags : [],
      search_keywords: Array.isArray(row.search_keywords) ? row.search_keywords : [],
      confidence_score: Number(row.confidence_score) || 90,
      duplicate_group: row.duplicate_group || undefined,
      explanation: row.explanation || undefined,
      status: row.status || 'Approved',
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    res.json({
      success: true,
      configured: true,
      count: formattedQuestions.length,
      questions: formattedQuestions,
    });
  } catch (err: any) {
    res.json({
      success: false,
      configured: false,
      error: err.message || 'Failed to fetch questions from Supabase',
      questions: [],
    });
  }
});

// Delete Questions from Supabase DB
app.post('/api/supabase/delete', async (req, res) => {
  try {
    const { id, ids } = req.body;
    const targetIds: string[] = id ? [id] : Array.isArray(ids) ? ids : [];

    if (targetIds.length === 0) {
      res.status(400).json({ success: false, error: 'No question IDs provided for deletion.' });
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      res.status(503).json({ success: false, error: 'Supabase credentials are not configured.' });
      return;
    }

    const { error, count } = await supabase
      .from('questions')
      .delete({ count: 'exact' })
      .in('id', targetIds);

    if (error) {
      console.warn('[Supabase Delete Error]:', error.message);
      res.status(400).json({ success: false, error: error.message });
      return;
    }

    res.json({
      success: true,
      deletedCount: count ?? targetIds.length,
      message: `Successfully deleted ${count ?? targetIds.length} question(s) from database.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error deleting from Supabase' });
  }
});

// Update a Question in Supabase DB
app.post('/api/supabase/update', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || !question.id) {
      res.status(400).json({ success: false, error: 'Valid question with id required.' });
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      res.status(503).json({ success: false, error: 'Supabase credentials are not configured.' });
      return;
    }

    const updatePayload: Record<string, any> = {
      question: question.question,
      primary_topic: question.primary_topic,
      cross_topics: Array.isArray(question.cross_topics) ? question.cross_topics : [],
      difficulty: question.difficulty,
      question_type: question.question_type,
      experience_level: question.experience_level,
      interview_round: question.interview_round,
      tags: Array.isArray(question.tags) ? question.tags : [],
      search_keywords: Array.isArray(question.search_keywords) ? question.search_keywords : [],
      confidence_score: Number(question.confidence_score) || 90,
      duplicate_group: question.duplicate_group || null,
      explanation: question.explanation || null,
      status: question.status || 'Approved',
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('questions')
      .update(updatePayload)
      .eq('id', question.id)
      .select();

    if (error) {
      console.warn('[Supabase Update Error]:', error.message);
      res.status(400).json({ success: false, error: error.message });
      return;
    }

    res.json({
      success: true,
      question: data?.[0] || question,
      message: 'Question updated successfully.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error updating question in Supabase' });
  }
});

// Upload / Upsert Questions Directly into Supabase Database Table
app.post('/api/supabase/upload', async (req, res) => {
  try {
    const { questions, tableName = 'questions' } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No questions provided for Supabase upload.',
      });
      return;
    }

    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const supabase = getSupabaseClient();
    if (!supabase) {
      res.status(503).json({
        success: false,
        configured: false,
        error:
          'Supabase credentials (SUPABASE_URL and SUPABASE_KEY) are not configured. Please add SUPABASE_URL and SUPABASE_KEY to your environment.',
      });
      return;
    }

    const projectRef = getSupabaseProjectRef(url);
    const sqlEditorUrl = projectRef
      ? `https://supabase.com/dashboard/project/${projectRef}/sql/new`
      : 'https://supabase.com/dashboard';

    // Format records to match Supabase database schema
    const formattedRows = questions.map((q: any) => {
      let rowId = q.id;
      const isValidUuid =
        typeof rowId === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          rowId
        );

      if (!isValidUuid) {
        // Deterministically derive a valid RFC4122 UUID v4 from the question content or temporary ID
        const seed = String(q.id || q.question || crypto.randomUUID());
        const hash = crypto.createHash('sha256').update(seed).digest('hex');
        rowId = `${hash.substring(0, 8)}-${hash.substring(8, 12)}-4${hash.substring(13, 16)}-a${hash.substring(17, 20)}-${hash.substring(20, 32)}`;
      }

      return {
        id: rowId,
        question: String(q.question || '').trim(),
        primary_topic: String(q.primary_topic || 'Others'),
        cross_topics: Array.isArray(q.cross_topics) ? q.cross_topics : [],
        difficulty: String(q.difficulty || 'Intermediate'),
        question_type: String(q.question_type || 'Theory'),
        experience_level: String(q.experience_level || '2-4 Years'),
        interview_round: String(q.interview_round || 'L1'),
        tags: Array.isArray(q.tags) ? q.tags : [],
        search_keywords: Array.isArray(q.search_keywords) ? q.search_keywords : [],
        confidence_score: Number(q.confidence_score) || 90,
        duplicate_group: q.duplicate_group ? String(q.duplicate_group) : null,
        explanation: q.explanation ? String(q.explanation) : null,
        status: String(q.status || 'Approved'),
        created_at: q.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    // Attempt insertion / upsert into specified table
    let { data, error } = await supabase
      .from(tableName)
      .upsert(formattedRows, { onConflict: 'id' })
      .select('id');

    // If an error indicates an optional column like 'explanation' does not exist, retry without it
    if (
      error &&
      error.message &&
      error.message.toLowerCase().includes('column') &&
      error.message.toLowerCase().includes('does not exist')
    ) {
      console.warn('Retrying Supabase upload without non-standard optional columns...');
      const minimalRows = formattedRows.map(
        ({ explanation, duplicate_group, ...rest }: any) => rest
      );
      const retryResult = await supabase
        .from(tableName)
        .upsert(minimalRows, { onConflict: 'id' })
        .select('id');
      data = retryResult.data;
      error = retryResult.error;
    }

    if (error) {
      const isMissingTable =
        error.code === 'PGRST205' ||
        error.code === '42P01' ||
        error.message?.toLowerCase().includes('schema cache') ||
        error.message?.toLowerCase().includes('could not find the table') ||
        error.message?.toLowerCase().includes('does not exist');

      const friendlyError = isMissingTable
        ? `Could not find the table 'public.${tableName}' in Supabase. The table needs to be initialized in your Supabase SQL Editor.`
        : (error.message || error.details || error.hint || 'Database upload rejected by Supabase');

      console.warn(`[Supabase Upload Notice] Code: ${error.code || 'N/A'}, Message: ${friendlyError}`);

      res.json({
        success: false,
        configured: true,
        isMissingTable,
        tableName,
        projectRef,
        sqlEditorUrl,
        ddlSql: DEFAULT_SUPABASE_DDL,
        error: friendlyError,
        code: error.code,
        details: error.details,
        hint: isMissingTable
          ? 'Run the provided CREATE TABLE SQL script once in your Supabase SQL editor.'
          : error.hint,
      });
      return;
    }

    res.json({
      success: true,
      configured: true,
      tableName,
      count: formattedRows.length,
      uploadedCount: data?.length ?? formattedRows.length,
      message: `Successfully uploaded ${formattedRows.length} questions to Supabase table "${tableName}".`,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    const errorMsg = err?.message || 'Internal server error during Supabase upload';
    console.warn('[Supabase Upload Exception]:', errorMsg);
    res.json({
      success: false,
      error: errorMsg,
    });
  }
});


// Generate Supabase SQL Migration Script
app.post('/api/supabase-sql', (req, res) => {
  const { questions = [] } = req.body;

  const ddl = `-- ==========================================
-- SUPABASE POSTGRESQL SCHEMA: questions
-- Enterprise Interview Question Bank System
-- ==========================================

CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    primary_topic VARCHAR(100) NOT NULL,
    cross_topics TEXT[] DEFAULT '{}',
    difficulty VARCHAR(50) NOT NULL,
    question_type VARCHAR(50) NOT NULL,
    experience_level VARCHAR(50) NOT NULL,
    interview_round VARCHAR(50) NOT NULL,
    tags TEXT[] DEFAULT '{}',
    search_keywords TEXT[] DEFAULT '{}',
    confidence_score INTEGER NOT NULL DEFAULT 90,
    duplicate_group VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'Approved',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for high-performance enterprise searching
CREATE INDEX IF NOT EXISTS idx_questions_primary_topic ON public.questions(primary_topic);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON public.questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_question_type ON public.questions(question_type);
CREATE INDEX IF NOT EXISTS idx_questions_confidence ON public.questions(confidence_score);
CREATE INDEX IF NOT EXISTS idx_questions_duplicate_group ON public.questions(duplicate_group);
CREATE INDEX IF NOT EXISTS idx_questions_tags ON public.questions USING GIN(tags);

`;

  let inserts = '';
  if (Array.isArray(questions) && questions.length > 0) {
    inserts = `-- Seed data (${questions.length} questions)\nINSERT INTO public.questions (\n  question, primary_topic, cross_topics, difficulty, question_type, experience_level, interview_round, tags, search_keywords, confidence_score, duplicate_group, status\n) VALUES\n`;

    const valueRows = questions.map((q: any) => {
      const escapeStr = (str: string) => (str ? str.replace(/'/g, "''") : '');
      const question = escapeStr(q.question);
      const primary = escapeStr(q.primary_topic);
      const cross = `ARRAY[${(q.cross_topics || []).map((c: string) => `'${escapeStr(c)}'`).join(',')}]`;
      const diff = escapeStr(q.difficulty);
      const qtype = escapeStr(q.question_type);
      const exp = escapeStr(q.experience_level);
      const round = escapeStr(q.interview_round);
      const tags = `ARRAY[${(q.tags || []).map((t: string) => `'${escapeStr(t)}'`).join(',')}]`;
      const keywords = `ARRAY[${(q.search_keywords || []).map((k: string) => `'${escapeStr(k)}'`).join(',')}]`;
      const conf = Number(q.confidence_score) || 90;
      const dupGroup = q.duplicate_group ? `'${escapeStr(q.duplicate_group)}'` : 'NULL';
      const status = escapeStr(q.status || 'Approved');

      return `  ('${question}', '${primary}', ${cross}, '${diff}', '${qtype}', '${exp}', '${round}', ${tags}, ${keywords}, ${conf}, ${dupGroup}, '${status}')`;
    });

    inserts += valueRows.join(',\n') + ';\n';
  }

  res.json({ sql: ddl + inserts });
});

// Setup Vite middleware for development or static serving for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Interview Question Bank Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();

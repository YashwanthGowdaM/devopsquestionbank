import React, { useState, useEffect } from 'react';
import {
  Database,
  FileSpreadsheet,
  FileText,
  Download,
  Copy,
  Check,
  Server,
  Layers,
  Sparkles,
  UploadCloud,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Github,
  Terminal,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { QuestionRecord, SupabaseStatus, formatErrorMessage } from '../types';
import { exportToExcel, exportToCSV, exportToJSON } from '../utils/exportUtils';

interface ExportSupabaseViewProps {
  questions: QuestionRecord[];
  supabaseStatus?: SupabaseStatus;
  onRefreshStatus?: () => void;
  onToast?: (msg: string) => void;
  onOpenSupabaseSetup?: (questions?: QuestionRecord[]) => void;
}

export const ExportSupabaseView: React.FC<ExportSupabaseViewProps> = ({
  questions,
  supabaseStatus,
  onRefreshStatus,
  onToast,
  onOpenSupabaseSetup,
}) => {
  const [sqlScript, setSqlScript] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [loadingSql, setLoadingSql] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeDeployTab, setActiveDeployTab] = useState<'github' | 'supabase' | 'hosting'>('github');
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const handleCopySnippet = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  // Direct Supabase Upload function
  const handleUploadToSupabase = async () => {
    if (questions.length === 0) {
      if (onToast) onToast('No questions in bank to upload.');
      return;
    }

    setIsUploading(true);
    setUploadFeedback({ type: null, message: '' });

    try {
      const resp = await fetch('/api/supabase/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions }),
      });
      const result = await resp.json();

      if (result.success) {
        setUploadFeedback({
          type: 'success',
          message: `Successfully uploaded all ${questions.length} questions directly to Supabase table "questions"!`,
        });
        if (onToast) onToast(`Uploaded ${questions.length} questions to Supabase DB!`);
        if (onRefreshStatus) onRefreshStatus();
      } else if (result.isMissingTable) {
        setUploadFeedback({
          type: 'error',
          message: 'Table public.questions does not exist in your Supabase project yet. Click "Initialize Supabase Table (1-Click)" below to run the schema in your Supabase SQL Editor.',
        });
        if (onOpenSupabaseSetup) {
          onOpenSupabaseSetup(questions);
        }
        if (onToast) onToast('Supabase table setup needed. Setup modal opened.');
      } else {
        const errorMsg = formatErrorMessage(result.error || 'Failed to upload questions to Supabase.');
        setUploadFeedback({
          type: 'error',
          message: errorMsg,
        });
        if (onToast) onToast(`Supabase note: ${errorMsg}`);
      }
    } catch (err: any) {
      const errorMsg = formatErrorMessage(err);
      setUploadFeedback({
        type: 'error',
        message: errorMsg,
      });
      if (onToast) onToast(`Network note: ${errorMsg}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Generate SQL from server endpoint or local fallback
  useEffect(() => {
    async function fetchSql() {
      setLoadingSql(true);
      try {
        const resp = await fetch('/api/supabase-sql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questions }),
        });
        if (resp.ok) {
          const data = await resp.json();
          setSqlScript(data.sql);
        } else {
          throw new Error('Failed to fetch from backend');
        }
      } catch (e) {
        // Local fallback generator
        const ddl = `-- Supabase Table: questions\nCREATE TABLE IF NOT EXISTS public.questions (\n    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    question TEXT NOT NULL,\n    primary_topic VARCHAR(100) NOT NULL,\n    cross_topics TEXT[] DEFAULT '{}',\n    difficulty VARCHAR(50) NOT NULL,\n    question_type VARCHAR(50) NOT NULL,\n    experience_level VARCHAR(50) NOT NULL,\n    interview_round VARCHAR(50) NOT NULL,\n    tags TEXT[] DEFAULT '{}',\n    search_keywords TEXT[] DEFAULT '{}',\n    confidence_score INTEGER NOT NULL DEFAULT 90,\n    duplicate_group VARCHAR(50),\n    status VARCHAR(50) NOT NULL DEFAULT 'Approved',\n    created_at TIMESTAMPTZ DEFAULT NOW(),\n    updated_at TIMESTAMPTZ DEFAULT NOW()\n);\n`;
        setSqlScript(ddl);
      } finally {
        setLoadingSql(false);
      }
    }

    fetchSql();
  }, [questions]);

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleCopyJson = () => {
    const supabaseFormat = questions.map((q) => ({
      id: q.id,
      question: q.question,
      primary_topic: q.primary_topic,
      cross_topics: q.cross_topics || [],
      difficulty: q.difficulty,
      question_type: q.question_type,
      experience_level: q.experience_level,
      interview_round: q.interview_round,
      tags: q.tags || [],
      search_keywords: q.search_keywords || [],
      confidence_score: q.confidence_score,
      duplicate_group: q.duplicate_group || null,
      status: q.status,
      created_at: q.created_at,
      updated_at: q.updated_at,
    }));
    navigator.clipboard.writeText(JSON.stringify(supabaseFormat, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleDownloadSql = () => {
    const blob = new Blob([sqlScript], { type: 'text/sql;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'supabase_questions_migration.sql');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
            <Database className="w-6 h-6 text-indigo-600 mr-2.5" />
            Supabase Schema & Export Hub
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review questions automatically upload to Supabase DB. You can also export to Excel, CSV, or sync your entire question bank anytime.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {onRefreshStatus && (
            <button
              onClick={onRefreshStatus}
              title="Check Supabase Connection"
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          <div className="text-sm font-semibold px-4 py-2 bg-indigo-50 rounded-xl border border-indigo-200 text-indigo-900">
            Bank Questions: <span className="font-bold">{questions.length}</span>
          </div>
        </div>
      </div>

      {/* Supabase Live Integration & Automatic Database Sync Panel */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white border border-slate-800 rounded-2xl p-6 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center space-x-2.5">
              <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                <UploadCloud className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-white">
                Supabase Automated Database Sync
              </h2>
              {supabaseStatus?.configured ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
                  Connected to Supabase
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  Credentials in Settings/env
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              When you click <strong className="text-white">"Review Completed"</strong> in the Review Queue, all approved questions are automatically uploaded to your Supabase <code className="text-emerald-300 font-mono">public.questions</code> table via the server API without requiring any manual SQL execution.
            </p>

            {supabaseStatus?.configured ? (
              <div className="pt-1 flex flex-wrap items-center gap-4 text-xs text-slate-300">
                <div className="flex items-center space-x-1.5">
                  <span className="text-slate-400">Database Host:</span>
                  <span className="font-mono text-white bg-slate-800 px-2 py-0.5 rounded">
                    {supabaseStatus.url || 'Configured'}
                  </span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-slate-400">Target Table:</span>
                  <span className="font-mono text-emerald-300 bg-slate-800 px-2 py-0.5 rounded">
                    public.questions
                  </span>
                </div>
                {typeof supabaseStatus.existingCount === 'number' && (
                  <div className="flex items-center space-x-1.5">
                    <span className="text-slate-400">Live DB Rows:</span>
                    <span className="font-semibold text-emerald-400">
                      {supabaseStatus.existingCount} questions in DB
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="pt-1 text-xs text-slate-300">
                <span>Configure </span>
                <code className="bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded font-mono">SUPABASE_URL</code>
                <span> and </span>
                <code className="bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded font-mono">SUPABASE_KEY</code>
                <span> in your project settings to activate automated real-time uploads.</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
            <button
              id="btn-upload-bank-supabase"
              disabled={isUploading}
              onClick={handleUploadToSupabase}
              className={`px-5 py-3 rounded-xl font-bold text-sm shadow-md transition-all active:scale-98 flex items-center justify-center ${
                isUploading
                  ? 'bg-slate-700 text-slate-300 cursor-wait'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
              }`}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin text-slate-950" />
                  Syncing to Supabase DB...
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4 mr-2 text-slate-950" />
                  Sync All ({questions.length}) to Supabase DB
                </>
              )}
            </button>
          </div>
        </div>

        {/* Missing Table Setup Warning & Action */}
        {supabaseStatus?.configured && !supabaseStatus?.tableExists && (
          <div className="mt-4 p-4 rounded-xl bg-amber-950/80 border border-amber-600/60 text-amber-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-white">Table public.questions Not Found in Supabase</h4>
                <p className="text-xs text-amber-200/90 mt-0.5">
                  Your Supabase credentials are valid, but the target table has not been initialized yet. Run the 1-click SQL in your Supabase SQL Editor to enable automatic uploads.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenSupabaseSetup && onOpenSupabaseSetup(questions)}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 transition-colors shadow-xs cursor-pointer"
            >
              Open 1-Click SQL Setup
            </button>
          </div>
        )}

        {uploadFeedback.type && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs flex items-center space-x-2 ${
              uploadFeedback.type === 'success'
                ? 'bg-emerald-900/40 text-emerald-200 border border-emerald-700/50'
                : 'bg-rose-900/40 text-rose-200 border border-rose-700/50'
            }`}
          >
            {uploadFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{uploadFeedback.message}</span>
          </div>
        )}
      </div>

      {/* Export Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Excel (.xlsx) */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold mb-3">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Microsoft Excel (.xlsx)</h3>
            <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
              Standardized column layout matching all interview taxonomy fields (Sl No, Question, Topic, Cross Topics, Difficulty, Type, Round, Tags).
            </p>
          </div>
          <button
            id="btn-export-excel-card"
            onClick={() => exportToExcel(questions)}
            className="mt-5 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm flex items-center justify-center shadow-xs transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Excel Workbook
          </button>
        </div>

        {/* CSV Format */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold mb-3">
              <Download className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Standard CSV (.csv)</h3>
            <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
              Clean comma-separated format compatible with Google Sheets, Pandas, Airtable, and custom data pipelines.
            </p>
          </div>
          <button
            id="btn-export-csv-card"
            onClick={() => exportToCSV(questions)}
            className="mt-5 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-sm flex items-center justify-center shadow-xs transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Download CSV File
          </button>
        </div>

        {/* JSON / Supabase Table Payload */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold mb-3">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Supabase JSON Payload</h3>
            <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
              Full structured document with arrays for cross_topics, tags, and keywords matching Supabase table schema.
            </p>
          </div>
          <div className="mt-5 flex space-x-2">
            <button
              id="btn-copy-json"
              onClick={handleCopyJson}
              className="flex-1 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-sm flex items-center justify-center shadow-xs transition-colors"
            >
              {copiedJson ? <Check className="w-4 h-4 mr-1.5 text-emerald-600" /> : <Copy className="w-4 h-4 mr-1.5" />}
              {copiedJson ? 'Copied' : 'Copy JSON'}
            </button>
            <button
              id="btn-download-json"
              onClick={() => exportToJSON(questions)}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm flex items-center justify-center shadow-xs transition-colors"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Download
            </button>
          </div>
        </div>
      </div>

      {/* Supabase SQL Migration Script Section */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-lg flex items-center">
              <Server className="w-5 h-5 text-indigo-600 mr-2" />
              Supabase SQL Editor Script (DDL + Seed Data)
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Paste directly into your Supabase project's SQL Editor to create the <code>questions</code> table with GIN indexes and insert all verified questions.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="btn-copy-sql"
              onClick={handleCopySql}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center transition-colors"
            >
              {copiedSql ? <Check className="w-4 h-4 mr-1.5 text-emerald-600" /> : <Copy className="w-4 h-4 mr-1.5" />}
              {copiedSql ? 'Copied!' : 'Copy SQL Script'}
            </button>

            <button
              id="btn-download-sql"
              onClick={handleDownloadSql}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white flex items-center shadow-xs transition-colors"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Download .sql
            </button>
          </div>
        </div>

        {/* Code View */}
        <div className="relative">
          <pre className="p-4 bg-slate-950 text-slate-200 rounded-xl font-mono text-xs overflow-x-auto max-h-[420px] leading-relaxed border border-slate-800 selection:bg-indigo-700">
            {loadingSql ? 'Generating Supabase PostgreSQL statements...' : sqlScript}
          </pre>
        </div>
      </div>

      {/* GitHub & Supabase Hosting Setup Guide Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-xs">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg flex items-center">
                GitHub Repository & Supabase Hosting Guide
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Step-by-step instructions to upload your project to GitHub and host the PostgreSQL database on Supabase.
              </p>
            </div>
          </div>

          {/* Guide Tabs */}
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveDeployTab('github')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer ${
                activeDeployTab === 'github'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Github className="w-3.5 h-3.5" />
              <span>1. GitHub Upload</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveDeployTab('supabase')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer ${
                activeDeployTab === 'supabase'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>2. Supabase Host</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveDeployTab('hosting')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer ${
                activeDeployTab === 'hosting'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>3. Deploy & Run</span>
            </button>
          </div>
        </div>

        {/* Tab Content: GitHub */}
        {activeDeployTab === 'github' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-600 leading-relaxed space-y-2">
              <p>
                Follow these standard commands to upload this full-stack project to your GitHub account:
              </p>
              <ol className="list-decimal pl-4 space-y-1 font-medium text-slate-700">
                <li>Create an empty repository on <a href="https://github.com/new" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-semibold hover:text-indigo-800">GitHub.com</a> (e.g. <code>devops-question-bank</code>).</li>
                <li>In your local terminal, run the commands below to initialize, commit, and push:</li>
              </ol>
            </div>

            <div className="relative">
              <pre className="p-4 bg-slate-950 text-emerald-400 rounded-xl font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed">
{`# 1. Initialize Git repository
git init

# 2. Stage all project files (safe .gitignore already configured)
git add .

# 3. Create your initial commit
git commit -m "feat: complete DevOps interview question bank system with AI analysis & Supabase sync"

# 4. Set main branch & attach your GitHub repository URL
git branch -M main
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPO_NAME>.git

# 5. Push code to GitHub
git push -u origin main`}
              </pre>
              <button
                type="button"
                onClick={() => handleCopySnippet(`git init\ngit add .\ngit commit -m "feat: complete DevOps interview question bank system with AI analysis & Supabase sync"\ngit branch -M main\ngit remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPO_NAME>.git\ngit push -u origin main`)}
                className="absolute top-3 right-3 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center border border-slate-700 cursor-pointer"
              >
                {copiedSnippet ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copiedSnippet ? 'Copied' : 'Copy Commands'}
              </button>
            </div>
          </div>
        )}

        {/* Tab Content: Supabase */}
        {activeDeployTab === 'supabase' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-600 leading-relaxed space-y-2">
              <p>
                Host your enterprise questions table on a PostgreSQL database with Supabase:
              </p>
              <ol className="list-decimal pl-4 space-y-1 font-medium text-slate-700">
                <li>Create a free account or sign in at <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-semibold hover:text-indigo-800">Supabase.com</a> and click <strong>New Project</strong>.</li>
                <li>Go to the <strong>SQL Editor</strong> tab in Supabase dashboard and run the script from <code>supabase/schema.sql</code> (or click "Copy SQL Script" above).</li>
                <li>Navigate to <strong>Project Settings &rarr; API</strong> to find your <strong>Project URL</strong> and <strong>anon key</strong> / <strong>service_role key</strong>.</li>
                <li>Add them to your <code>.env</code> file:</li>
              </ol>
            </div>

            <div className="relative">
              <pre className="p-4 bg-slate-950 text-indigo-300 rounded-xl font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed">
{`# Add to your .env file or hosting provider environment settings:
SUPABASE_URL="https://<your-project-id>.supabase.co"
SUPABASE_KEY="<your-supabase-service-role-or-anon-key>"
GEMINI_API_KEY="<your-gemini-api-key>"`}
              </pre>
              <button
                type="button"
                onClick={() => handleCopySnippet(`SUPABASE_URL="https://<your-project-id>.supabase.co"\nSUPABASE_KEY="<your-supabase-service-role-or-anon-key>"\nGEMINI_API_KEY="<your-gemini-api-key>"`)}
                className="absolute top-3 right-3 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center border border-slate-700 cursor-pointer"
              >
                {copiedSnippet ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copiedSnippet ? 'Copied' : 'Copy Env Template'}
              </button>
            </div>
          </div>
        )}

        {/* Tab Content: Hosting */}
        {activeDeployTab === 'hosting' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-600 leading-relaxed space-y-2">
              <p>
                Deploy the complete full-stack web application on any cloud provider:
              </p>
              <ul className="list-disc pl-4 space-y-1 font-medium text-slate-700">
                <li><strong>Local or Self-Hosted:</strong> Run <code>npm install</code>, then <code>npm run build</code>, then <code>npm start</code>.</li>
                <li><strong>Render / Railway / Cloud Run:</strong> Connect your GitHub repo, set Build Command to <code>npm run build</code> and Start Command to <code>npm start</code>.</li>
                <li><strong>Environment variables:</strong> Set <code>GEMINI_API_KEY</code>, <code>SUPABASE_URL</code>, and <code>SUPABASE_KEY</code>.</li>
              </ul>
            </div>

            <div className="relative">
              <pre className="p-4 bg-slate-950 text-amber-300 rounded-xl font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed">
{`# Install production & dev dependencies
npm install

# Build client Vite SPA + bundled Node.js Express server
npm run build

# Start production server (runs on port 3000)
npm start`}
              </pre>
              <button
                type="button"
                onClick={() => handleCopySnippet(`npm install\nnpm run build\nnpm start`)}
                className="absolute top-3 right-3 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center border border-slate-700 cursor-pointer"
              >
                {copiedSnippet ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copiedSnippet ? 'Copied' : 'Copy Commands'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Database,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Code2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { SupabaseStatus, QuestionRecord, formatErrorMessage } from '../types';

interface SupabaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: SupabaseStatus;
  onRefreshStatus: () => Promise<SupabaseStatus | null>;
  pendingQuestionsToUpload?: QuestionRecord[];
  onUploadSuccess?: (count: number) => void;
  onToast?: (msg: string) => void;
}

export const SupabaseSetupModal: React.FC<SupabaseSetupModalProps> = ({
  isOpen,
  onClose,
  status,
  onRefreshStatus,
  pendingQuestionsToUpload,
  onUploadSuccess,
  onToast,
}) => {
  const [copied, setCopied] = useState(false);
  const [showSqlPreview, setShowSqlPreview] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<{
    type: 'success' | 'error' | 'info' | null;
    text: string;
  }>({ type: null, text: '' });

  if (!isOpen) return null;

  const projectRef = status.projectRef || 'your-project';
  const sqlEditorUrl =
    status.sqlEditorUrl ||
    `https://supabase.com/dashboard/project/${projectRef}/sql/new`;

  const ddlSql =
    status.ddlSql ||
    `-- 1. Create table
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

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_questions_primary_topic ON public.questions(primary_topic);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON public.questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_question_type ON public.questions(question_type);
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

GRANT ALL ON public.questions TO anon, authenticated, service_role;
`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(ddlSql);
      setCopied(true);
      if (onToast) onToast('SQL schema copied to clipboard!');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(false);
    }
  };

  const handleVerifyAndUpload = async () => {
    setIsVerifying(true);
    setVerifyMessage({ type: 'info', text: 'Checking Supabase schema cache...' });

    try {
      const updatedStatus = await onRefreshStatus();

      if (updatedStatus && updatedStatus.tableExists) {
        setVerifyMessage({
          type: 'success',
          text: 'Table public.questions detected in Supabase!',
        });

        // If there are questions queued up, upload them now
        if (pendingQuestionsToUpload && pendingQuestionsToUpload.length > 0) {
          setVerifyMessage({
            type: 'info',
            text: `Table verified! Uploading ${pendingQuestionsToUpload.length} questions...`,
          });

          const uploadResp = await fetch('/api/supabase/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ questions: pendingQuestionsToUpload }),
          });
          const uploadResult = await uploadResp.json();

          if (uploadResult.success) {
            if (onToast) {
              onToast(
                `🎉 Success! ${pendingQuestionsToUpload.length} questions uploaded to Supabase!`
              );
            }
            if (onUploadSuccess) {
              onUploadSuccess(pendingQuestionsToUpload.length);
            }
            setTimeout(() => {
              onClose();
            }, 1200);
            return;
          } else {
            const errorMsg = formatErrorMessage(uploadResult.error || 'Upload failed after verification.');
            setVerifyMessage({
              type: 'error',
              text: errorMsg,
            });
          }
        } else {
          if (onToast) onToast('Table verified successfully!');
          setTimeout(() => {
            onClose();
          }, 1200);
        }
      } else {
        setVerifyMessage({
          type: 'error',
          text: "Table 'public.questions' not found yet. Make sure you pasted the SQL and clicked 'Run' in Supabase, then click verify again.",
        });
      }
    } catch (err: any) {
      setVerifyMessage({
        type: 'error',
        text: err.message || 'Error connecting to server',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div
      id="supabase-setup-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="supabase-setup-modal-card"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base text-white">
                  Initialize Supabase Table
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {projectRef}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Run the 1-click SQL script in Supabase once to create{' '}
                <code className="text-emerald-300 font-mono">public.questions</code>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-700 text-sm">
          {/* Explanation Alert */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 space-y-1">
              <p className="font-semibold text-amber-950">
                Why is this step required?
              </p>
              <p className="leading-relaxed">
                Your Supabase project credentials are valid, but the PostgreSQL table{' '}
                <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-amber-950 font-bold">
                  public.questions
                </code>{' '}
                does not exist yet. Running the script below takes <strong>5 seconds</strong> and enables automated question uploads.
              </p>
            </div>
          </div>

          {/* Step 1: Copy SQL */}
          <div className="space-y-2 border border-slate-200 rounded-xl p-4 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <span className="font-bold text-slate-900">
                  Copy PostgreSQL Schema Script
                </span>
              </div>

              <button
                id="btn-copy-supabase-schema"
                onClick={handleCopy}
                className={`inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1.5" />
                    Copied SQL!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    Copy SQL Script
                  </>
                )}
              </button>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowSqlPreview(!showSqlPreview)}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center space-x-1 font-medium"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>{showSqlPreview ? 'Hide SQL Code' : 'Preview SQL Code (32 lines)'}</span>
                {showSqlPreview ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {showSqlPreview && (
                <div className="mt-2.5 relative">
                  <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto max-h-48 border border-slate-800 leading-relaxed">
                    {ddlSql}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Open SQL Editor */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                2
              </span>
              <div>
                <span className="font-bold text-slate-900 block">
                  Open Supabase SQL Editor
                </span>
                <span className="text-xs text-slate-500">
                  Opens your project's new query tab in a new window.
                </span>
              </div>
            </div>

            <a
              id="link-open-supabase-sql-editor"
              href={sqlEditorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 shadow-xs transition-colors shrink-0"
            >
              <span>Open SQL Editor</span>
              <ExternalLink className="w-3.5 h-3.5 ml-1.5 text-slate-500" />
            </a>
          </div>

          {/* Step 3: Run & Verify */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                3
              </span>
              <span className="font-bold text-slate-900">
                Paste, Click "Run", Then Verify
              </span>
            </div>
            <p className="text-xs text-slate-500 pl-8">
              Paste the copied SQL into the editor, click the green <strong>"Run"</strong> button in Supabase, then click <strong>"Verify & Upload"</strong> below.
            </p>
          </div>

          {/* Verification Status Message */}
          {verifyMessage.type && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
                verifyMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : verifyMessage.type === 'error'
                  ? 'bg-rose-50 text-rose-900 border border-rose-200'
                  : 'bg-indigo-50 text-indigo-900 border border-indigo-200'
              }`}
            >
              {verifyMessage.type === 'success' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              {verifyMessage.type === 'error' && (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              {verifyMessage.type === 'info' && (
                <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
              )}
              <span>{verifyMessage.text}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            Cancel / Do Later
          </button>

          <button
            id="btn-verify-supabase-table"
            disabled={isVerifying}
            onClick={handleVerifyAndUpload}
            className={`w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition-all active:scale-98 ${
              isVerifying
                ? 'bg-emerald-700/80 cursor-wait'
                : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isVerifying ? 'animate-spin' : ''}`}
            />
            <span>
              {isVerifying
                ? 'Verifying Table in Supabase...'
                : pendingQuestionsToUpload && pendingQuestionsToUpload.length > 0
                ? `I've Run It — Verify & Upload (${pendingQuestionsToUpload.length} Qs)`
                : "I've Run It — Verify Table"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

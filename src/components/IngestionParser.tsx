import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  Sparkles,
  FileText,
  Clipboard,
  Trash2,
  BrainCircuit,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { SAMPLE_RAW_TEXT } from '../data/sampleQuestions';
import { cleanRawText, processQuestionsBatch } from '../utils/analyzer';
import { QuestionRecord, AnalysisSummary, ValidationReportItem } from '../types';
import { TextEditorWithToolbar } from './TextEditorWithToolbar';

interface IngestionParserProps {
  onQuestionsAnalyzed: (
    questions: QuestionRecord[],
    summary: AnalysisSummary,
    report: ValidationReportItem[],
    rawInput: string
  ) => void;
  existingBank: QuestionRecord[];
}

export const IngestionParser: React.FC<IngestionParserProps> = ({
  onQuestionsAnalyzed,
  existingBank,
}) => {
  const [inputText, setInputText] = useState('');
  const [enableThinking, setEnableThinking] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick stats on input
  const previewCleanLines = cleanRawText(inputText);

  // Handle sample dataset load
  const handleLoadSample = () => {
    setInputText(SAMPLE_RAW_TEXT.trim());
    setErrorMsg(null);
  };

  // Handle clear
  const handleClear = () => {
    setInputText('');
    setErrorMsg(null);
    setProcessStatus('');
  };

  // Handle clipboard paste
  const handleClipboardPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputText((prev) => (prev ? prev + '\n\n' + text : text));
      }
    } catch (err) {
      setErrorMsg('Clipboard access not granted. Please paste directly into the box.');
    }
  };

  // Handle file uploads (TXT, CSV, XLSX, MD)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

          const lines: string[] = [];
          data.forEach((row: any) => {
            if (Array.isArray(row)) {
              row.forEach((cell) => {
                if (typeof cell === 'string' && cell.trim().length > 10) {
                  lines.push(cell.trim());
                }
              });
            }
          });
          setInputText(lines.join('\n'));
        } catch (err: any) {
          setErrorMsg('Failed to parse Excel file: ' + err.message);
        }
      };
      reader.readAsBinaryString(file);
    } else {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const content = evt.target?.result as string;
        setInputText(content);
      };
      reader.readAsText(file);
    }
  };

  // Main processing action
  const handleAnalyze = async () => {
    if (!inputText.trim()) {
      setErrorMsg('Please paste text or load sample questions first.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setProcessStatus('Step 1: Normalizing text, stripping duplicate numbering & fixing OCR...');

    try {
      const cleaned = cleanRawText(inputText);

      if (cleaned.length === 0) {
        throw new Error('No valid questions found after cleaning the input text.');
      }

      setProcessStatus(
        `Step 2: Classifying ${cleaned.length} questions with 20+ Yrs DevOps Panelist heuristics...`
      );

      // Attempt server Gemini call with High Thinking
      let geminiSuccess = false;
      let geminiQuestions: any[] = [];

      try {
        setProcessStatus(
          `Classifying questions with Gemini and panelist heuristics...`
        );

        const resp = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rawText: inputText,
            enableThinking: enableThinking,
          }),
        });

        if (resp.ok) {
          const result = await resp.json();
          if (result.success && Array.isArray(result.data) && result.data.length > 0) {
            geminiQuestions = result.data;
            geminiSuccess = true;
          } else if (result.reason || result.error) {
            console.info('Using panelist heuristics engine:', result.reason || result.error);
          }
        }
      } catch (geminiErr) {
        console.info('Server Gemini call bypassed or fallback engaged:', geminiErr);
      }

      let processedBatch;
      if (geminiSuccess && geminiQuestions.length > 0) {
        const rawStrings = geminiQuestions.map((g) => g.question || String(g));
        const baseBatch = processQuestionsBatch(rawStrings, existingBank);
        baseBatch.questions = baseBatch.questions.map((q, idx) => {
          const g = geminiQuestions[idx];
          if (!g) return q;
          return {
            ...q,
            primary_topic: g.primary_topic || q.primary_topic,
            cross_topics: g.cross_topics || q.cross_topics,
            difficulty: g.difficulty || q.difficulty,
            question_type: g.question_type || q.question_type,
            experience_level: g.experience_level || q.experience_level,
            interview_round: g.interview_round || q.interview_round,
            tags: g.tags || q.tags,
            explanation: g.explanation || q.explanation,
            confidence_score: g.confidence_score || q.confidence_score,
          };
        });
        processedBatch = baseBatch;
      } else {
        processedBatch = processQuestionsBatch(cleaned, existingBank);
      }

      setProcessStatus('Completed! Opening Review Queue...');
      setTimeout(() => {
        onQuestionsAnalyzed(
          processedBatch.questions,
          processedBatch.summary,
          processedBatch.report,
          inputText
        );
        setIsProcessing(false);
      }, 350);
    } catch (err: any) {
      setErrorMsg(err.message || 'Analysis encountered an error');
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
              <Sparkles className="w-6 h-6 text-indigo-600 mr-2.5" />
              Add & Classify Questions
            </h1>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              Paste unformatted questions from notes, word docs, or OCR. The system strips numbering,
              detects duplicates, assigns primary topics, and maps interviewer rationale.
            </p>
          </div>

          {/* Quick Helper Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="btn-load-sample"
              onClick={handleLoadSample}
              className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors border border-indigo-200"
            >
              <FileText className="w-4 h-4 mr-1.5 text-indigo-600" />
              Try Sample Questions (20 Qs)
            </button>

            <button
              id="btn-paste-clipboard"
              onClick={handleClipboardPaste}
              className="inline-flex items-center px-3.5 py-2 text-sm font-semibold rounded-xl bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <Clipboard className="w-4 h-4 mr-1.5 text-slate-500" />
              Paste Clipboard
            </button>

            <label className="inline-flex items-center px-3.5 py-2 text-sm font-semibold rounded-xl bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer shadow-xs">
              <Upload className="w-4 h-4 mr-1.5 text-slate-500" />
              Upload File
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.csv,.xlsx,.xls,.md,.json"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>

            {inputText && (
              <button
                id="btn-clear-input"
                onClick={handleClear}
                className="inline-flex items-center px-3 py-2 text-sm font-semibold rounded-xl text-rose-600 hover:bg-rose-50 transition-colors"
                title="Clear input"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Input Area with Rich Text Editor, Alignment & Points Toolbar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-bold text-slate-900">Questions Text Editor</span>
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
              Formatting • Alignment • Points & Lists
            </span>
          </div>
          {previewCleanLines.length > 0 && (
            <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 w-fit">
              Detected Questions: <strong>{previewCleanLines.length}</strong>
            </div>
          )}
        </div>

        {/* Full Rich Text Editor with Formatting, Alignment, Bullets & Numbers */}
        <TextEditorWithToolbar
          id="raw-questions-textarea"
          value={inputText}
          onChange={setInputText}
          detectedCount={previewCleanLines.length}
          placeholder={`Paste your raw interview questions here, or use the editor toolbar above:

1. What is the difference between Docker bind mount and volume?
• How does Kubernetes kube-proxy manage iptables vs IPVS mode?
Q3: How do you design a zero-downtime multi-region active-active disaster recovery architecture?
- In Terraform, how do you handle state locking using AWS S3 and DynamoDB?
Troubleshoot a pod stuck in CrashLoopBackOff with Exit Code 137.`}
          rows={12}
        />

        {/* Configuration Bar & Primary Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
          {/* AI Thinking Toggle */}
          <label className="flex items-center cursor-pointer space-x-2.5 select-none">
            <input
              id="checkbox-enable-thinking"
              type="checkbox"
              checked={enableThinking}
              onChange={(e) => setEnableThinking(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-slate-800 flex items-center">
              <BrainCircuit className="w-4 h-4 text-indigo-600 mr-1.5" />
              Enable High Thinking AI Mode
            </span>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono hidden sm:inline">
              gemini-3.1-pro-preview
            </span>
          </label>

          {/* Action Button */}
          <button
            id="btn-analyze-questions"
            onClick={handleAnalyze}
            disabled={isProcessing || !inputText.trim()}
            className={`inline-flex items-center justify-center px-6 py-3 text-base font-bold rounded-xl text-white transition-all shadow-md ${
              isProcessing || !inputText.trim()
                ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                : 'bg-indigo-600 hover:bg-indigo-700 active:scale-98'
            }`}
          >
            {isProcessing ? (
              <>
                <RotateCcw className="w-5 h-5 mr-2 animate-spin text-amber-300" />
                <span>Processing Questions...</span>
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 mr-2 text-amber-300 fill-amber-300" />
                <span>
                  Clean & Classify {previewCleanLines.length > 0 ? `(${previewCleanLines.length} Qs)` : ''}
                </span>
                <ArrowRight className="w-4 h-4 ml-2 opacity-80" />
              </>
            )}
          </button>
        </div>

        {/* Status indicator during processing */}
        {isProcessing && (
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-sm text-indigo-950 flex items-center space-x-3">
            <RotateCcw className="w-5 h-5 text-indigo-600 animate-spin shrink-0" />
            <span className="font-medium">{processStatus}</span>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800 flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
};

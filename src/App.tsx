import React, { useState, useEffect } from 'react';
import { Navbar, NavTab } from './components/Navbar';
import { DashboardAnalytics } from './components/DashboardAnalytics';
import { IngestionParser } from './components/IngestionParser';
import { ReviewTable } from './components/ReviewTable';
import { QuestionBrowser } from './components/QuestionBrowser';
import { SupabaseSetupModal } from './components/SupabaseSetupModal';
import {
  QuestionRecord,
  AnalysisSummary,
  ValidationReportItem,
  SupabaseStatus,
  formatErrorMessage,
} from './types';
import { CheckCircle2, ShieldCheck } from 'lucide-react';

const STORAGE_KEY_REVIEW = 'devops_review_table_records_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('browser');
  // Bank questions rely ONLY on real-time database data. If DB is empty, this is empty!
  const [bankQuestions, setBankQuestions] = useState<QuestionRecord[]>([]);
  const [isLoadingBank, setIsLoadingBank] = useState(false);

  const [reviewQuestions, setReviewQuestions] = useState<QuestionRecord[]>([]);
  const [reviewSummary, setReviewSummary] = useState<AnalysisSummary | null>(null);
  const [validationReport, setValidationReport] = useState<ValidationReportItem[]>([]);
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isUploadingToSupabase, setIsUploadingToSupabase] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseStatus>({
    configured: false,
    connected: false,
    tableExists: false,
  });
  const [showSupabaseSetupModal, setShowSupabaseSetupModal] = useState(false);
  const [pendingSupabaseQuestions, setPendingSupabaseQuestions] = useState<QuestionRecord[]>([]);

  // Fetch real-time questions exclusively from Supabase DB
  const fetchBankFromDb = async () => {
    setIsLoadingBank(true);
    try {
      const resp = await fetch('/api/supabase/questions');
      const data = await resp.json();
      if (data.success && Array.isArray(data.questions)) {
        setBankQuestions(data.questions);
      } else {
        setBankQuestions([]);
      }
    } catch (err) {
      console.error('Failed to fetch from DB:', err);
      setBankQuestions([]);
    } finally {
      setIsLoadingBank(false);
    }
  };

  const checkSupabaseStatus = async () => {
    try {
      const resp = await fetch('/api/supabase/status');
      const data: SupabaseStatus = await resp.json();
      setSupabaseStatus(data);
      return data;
    } catch (err) {
      return null;
    }
  };

  // Initialize: Check server health, Supabase status, and fetch data ONLY from DB
  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((data) => {
        if (data.hasGeminiKey) {
          setHasGeminiKey(true);
        }
      })
      .catch(() => {});

    checkSupabaseStatus();
    fetchBankFromDb();

    // Load any existing in-progress review queue questions (client temporary draft)
    try {
      const savedReview = localStorage.getItem(STORAGE_KEY_REVIEW);
      if (savedReview) {
        const parsed = JSON.parse(savedReview);
        setReviewQuestions(parsed);
      }
    } catch (err) {
      console.error('Error loading review questions:', err);
    }
  }, []);

  // Save review queue drafts to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_REVIEW, JSON.stringify(reviewQuestions));
    } catch (e) {}
  }, [reviewQuestions]);

  // Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Callback when ingestion completes
  const handleQuestionsAnalyzed = (
    questions: QuestionRecord[],
    summary: AnalysisSummary,
    report: ValidationReportItem[],
    _rawInput: string
  ) => {
    setReviewQuestions(questions);
    setReviewSummary(summary);
    setValidationReport(report);
    setActiveTab('review');
    showToast(`${questions.length} questions parsed & classified. Ready for review.`);
  };

  // Real-time DB delete handler: Deletes from Supabase and refreshes data
  const handleDeleteQuestions = async (ids: string[]) => {
    try {
      const resp = await fetch('/api/supabase/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const result = await resp.json();
      if (result.success) {
        showToast(`Deleted ${result.deletedCount ?? ids.length} question(s) from database.`);
        await fetchBankFromDb();
      } else {
        showToast(`Failed to delete from DB: ${result.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      showToast(`Delete error: ${err.message}`);
    }
  };

  // Real-time DB update handler: Updates question in Supabase and refreshes data
  const handleEditQuestion = async (updated: QuestionRecord) => {
    try {
      const resp = await fetch('/api/supabase/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: updated }),
      });
      const result = await resp.json();
      if (result.success) {
        showToast('Question updated successfully in database.');
        await fetchBankFromDb();
      } else {
        showToast(`Failed to update in DB: ${result.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      showToast(`Update error: ${err.message}`);
    }
  };

  // Callback when Review Completed is clicked in ReviewTable: pushes to DB and refetches
  const handleReviewCompleted = async (finalQuestions: QuestionRecord[]) => {
    setIsUploadingToSupabase(true);
    const nextSl = bankQuestions.length + 1;
    const readyQuestions = finalQuestions.map((q, idx) => ({
      ...q,
      sl_no: nextSl + idx,
      status: 'Approved' as const,
      updated_at: new Date().toISOString(),
    }));

    try {
      const resp = await fetch('/api/supabase/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: readyQuestions }),
      });
      const result = await resp.json();

      if (result.success) {
        showToast(`Review Completed! ${readyQuestions.length} questions saved to database.`);
        checkSupabaseStatus();
        await fetchBankFromDb();
      } else if (result.isMissingTable) {
        setPendingSupabaseQuestions(readyQuestions);
        setShowSupabaseSetupModal(true);
        showToast('Table public.questions needs initialization.');
        checkSupabaseStatus();
      } else {
        const errorMsg = formatErrorMessage(result.error || 'Database error');
        showToast(`Supabase note: ${errorMsg}`);
      }
    } catch (err: any) {
      const errorMsg = formatErrorMessage(err);
      showToast(`Database error: ${errorMsg}`);
    } finally {
      setIsUploadingToSupabase(false);
    }

    // Clear review questions
    setReviewQuestions([]);
    setReviewSummary(null);
    setValidationReport([]);
    localStorage.removeItem(STORAGE_KEY_REVIEW);

    setActiveTab('browser');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={reviewQuestions.length}
        totalBankCount={bankQuestions.length}
        hasGeminiKey={hasGeminiKey}
        supabaseStatus={supabaseStatus}
        onOpenSupabaseSetup={() => {
          setPendingSupabaseQuestions(bankQuestions);
          setShowSupabaseSetupModal(true);
        }}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'browser' && (
          <QuestionBrowser
            questions={bankQuestions}
            onUpdateQuestions={setBankQuestions}
            onEditQuestion={handleEditQuestion}
            onDeleteQuestions={handleDeleteQuestions}
            onNavigateToIngest={() => setActiveTab('ingest')}
            onToast={showToast}
            supabaseStatus={supabaseStatus}
            onRefreshSupabase={fetchBankFromDb}
            onOpenSupabaseSetup={(qs) => {
              setPendingSupabaseQuestions(qs || bankQuestions);
              setShowSupabaseSetupModal(true);
            }}
            isLoading={isLoadingBank}
          />
        )}

        {activeTab === 'ingest' && (
          <IngestionParser
            onQuestionsAnalyzed={handleQuestionsAnalyzed}
            existingBank={bankQuestions}
          />
        )}

        {activeTab === 'review' && (
          <div className="space-y-6">
            {reviewQuestions.length === 0 ? (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Review Queue is Empty</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto mt-1.5 mb-6 leading-relaxed">
                  All questions are up to date. Paste or upload new interview questions in the Add Questions tab to classify and review them.
                </p>
                <button
                  onClick={() => setActiveTab('ingest')}
                  className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
                >
                  + Add New Questions
                </button>
              </div>
            ) : (
              <ReviewTable
                questions={reviewQuestions}
                summary={reviewSummary}
                validationReport={validationReport}
                onUpdateQuestions={setReviewQuestions}
                onReviewCompleted={handleReviewCompleted}
                isUploading={isUploadingToSupabase}
                supabaseStatus={supabaseStatus}
                onOpenSupabaseSetup={() => {
                  setPendingSupabaseQuestions(reviewQuestions);
                  setShowSupabaseSetupModal(true);
                }}
              />
            )}
          </div>
        )}

        {activeTab === 'dashboard' && (
          <DashboardAnalytics
            questions={bankQuestions}
            onNavigateToBrowser={() => setActiveTab('browser')}
            onNavigateToIngest={() => setActiveTab('ingest')}
          />
        )}
      </main>

      {/* Clean Footer (without 20+ Year Panelist Heuristics or Supabase Ready) */}
      <footer className="border-t border-slate-200 bg-white py-6 text-sm text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 font-medium text-slate-600">
            <span>DevOps & SRE Interview Question Bank</span>
          </div>
          <div className="flex items-center space-x-3 text-xs text-slate-400">
            <span>Excel (.xlsx)</span>
            <span>•</span>
            <span>CSV</span>
            <span>•</span>
            <span>JSON</span>
          </div>
        </div>
      </footer>

      {/* Supabase 1-Click Setup & Verification Modal */}
      <SupabaseSetupModal
        isOpen={showSupabaseSetupModal}
        onClose={() => setShowSupabaseSetupModal(false)}
        status={supabaseStatus}
        onRefreshStatus={checkSupabaseStatus}
        pendingQuestionsToUpload={pendingSupabaseQuestions}
        onUploadSuccess={(count) => {
          showToast(`Successfully uploaded ${count} questions to Supabase table "questions"!`);
          checkSupabaseStatus();
          fetchBankFromDb();
        }}
        onToast={showToast}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl text-sm font-medium border border-slate-700 flex items-center space-x-2.5 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

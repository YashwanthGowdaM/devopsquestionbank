import React, { useState, useMemo } from 'react';
import {
  Search,
  FileSpreadsheet,
  FileText,
  Eye,
  Trash2,
  CheckSquare,
  Square,
  ArrowUpDown,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Edit3,
  X,
  UploadCloud,
  Loader2,
  ChevronUp,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import {
  QuestionRecord,
  PRIMARY_TOPICS,
  DIFFICULTIES,
  QUESTION_TYPES,
  formatErrorMessage,
} from '../types';
import { exportToExcel, exportToCSV, exportToJSON } from '../utils/exportUtils';
import { QuestionDetailModal } from './QuestionDetailModal';
import { EditQuestionModal } from './EditQuestionModal';

interface QuestionBrowserProps {
  questions: QuestionRecord[];
  onUpdateQuestions: (updated: QuestionRecord[]) => void;
  onEditQuestion?: (updated: QuestionRecord) => Promise<void> | void;
  onDeleteQuestions?: (ids: string[]) => Promise<void> | void;
  onNavigateToIngest: () => void;
  onToast?: (msg: string) => void;
  supabaseStatus?: {
    configured: boolean;
    connected: boolean;
    tableExists: boolean;
    url?: string;
  };
  onRefreshSupabase?: () => void;
  onOpenSupabaseSetup?: (questions?: QuestionRecord[]) => void;
  isLoading?: boolean;
}

export const QuestionBrowser: React.FC<QuestionBrowserProps> = ({
  questions,
  onUpdateQuestions,
  onEditQuestion,
  onDeleteQuestions,
  onNavigateToIngest,
  onToast,
  supabaseStatus,
  onRefreshSupabase,
  onOpenSupabaseSetup,
  isLoading = false,
}) => {
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedDuplicate, setSelectedDuplicate] = useState('ALL'); // ALL, DUP, UNIQUE
  // Table view is the default view as requested
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');

  // Sorting state
  const [sortField, setSortField] = useState<keyof QuestionRecord>('sl_no');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals
  const [detailModalQuestion, setDetailModalQuestion] = useState<QuestionRecord | null>(null);
  const [editModalQuestion, setEditModalQuestion] = useState<QuestionRecord | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Difficulty & Round rank maps for intuitive sorting
  const difficultyRank: Record<string, number> = {
    Beginner: 1,
    Intermediate: 2,
    Advanced: 3,
    Expert: 4,
  };

  const roundRank: Record<string, number> = {
    L1: 1,
    L2: 2,
    L3: 3,
    Managerial: 4,
    HR: 5,
  };

  const handleSort = (field: keyof QuestionRecord) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const renderSortIndicator = (field: keyof QuestionRecord) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 ml-1 text-slate-400 group-hover:text-slate-600 inline shrink-0" />;
    }
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5 ml-1 text-indigo-600 inline shrink-0" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 ml-1 text-indigo-600 inline shrink-0" />
    );
  };

  // Filtered & Sorted questions
  const filteredQuestions = useMemo(() => {
    return questions
      .filter((q) => {
        if (searchQuery.trim()) {
          const s = searchQuery.toLowerCase();
          const matchQ = q.question.toLowerCase().includes(s);
          const matchExp = (q.explanation || '').toLowerCase().includes(s);
          const matchTags = (q.tags || []).some((t) => t.toLowerCase().includes(s));
          const matchKeys = (q.search_keywords || []).some((k) => k.toLowerCase().includes(s));
          const matchTopic = q.primary_topic.toLowerCase().includes(s);
          if (!matchQ && !matchExp && !matchTags && !matchKeys && !matchTopic) return false;
        }

        if (selectedTopic !== 'ALL' && q.primary_topic !== selectedTopic) return false;
        if (selectedDifficulty !== 'ALL' && q.difficulty !== selectedDifficulty) return false;
        if (selectedType !== 'ALL' && q.question_type !== selectedType) return false;

        if (selectedDuplicate === 'DUP' && !q.duplicate_group) return false;
        if (selectedDuplicate === 'UNIQUE' && q.duplicate_group) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortField === 'difficulty') {
          const rankA = difficultyRank[a.difficulty] || 0;
          const rankB = difficultyRank[b.difficulty] || 0;
          return sortOrder === 'asc' ? rankA - rankB : rankB - rankA;
        }

        if (sortField === 'interview_round') {
          const rankA = roundRank[a.interview_round] || 0;
          const rankB = roundRank[b.interview_round] || 0;
          return sortOrder === 'asc' ? rankA - rankB : rankB - rankA;
        }

        if (sortField === 'confidence_score' || sortField === 'sl_no') {
          const numA = Number(a[sortField]) || 0;
          const numB = Number(b[sortField]) || 0;
          return sortOrder === 'asc' ? numA - numB : numB - numA;
        }

        const valA = a[sortField];
        const valB = b[sortField];

        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;

        if (typeof valA === 'string') {
          return sortOrder === 'asc'
            ? valA.localeCompare(String(valB))
            : String(valB).localeCompare(valA);
        }

        return 0;
      });
  }, [
    questions,
    searchQuery,
    selectedTopic,
    selectedDifficulty,
    selectedType,
    selectedDuplicate,
    sortField,
    sortOrder,
  ]);

  // Paginated questions
  const totalPages = Math.ceil(filteredQuestions.length / pageSize) || 1;
  const paginatedQuestions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredQuestions.slice(start, start + pageSize);
  }, [filteredQuestions, currentPage, pageSize]);

  // Row selection
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllOnPage = () => {
    const pageIds = paginatedQuestions.map((q) => q.id);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  // Bulk & Single actions
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} question(s) from the database?`)) {
      return;
    }
    if (onDeleteQuestions) {
      await onDeleteQuestions(selectedIds);
    } else {
      const updated = questions.filter((q) => !selectedIds.includes(q.id));
      onUpdateQuestions(updated);
    }
    setSelectedIds([]);
  };

  const handleDeleteSingle = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this question from the database?')) {
      return;
    }
    if (onDeleteQuestions) {
      await onDeleteQuestions([id]);
    } else {
      const updated = questions.filter((q) => q.id !== id);
      onUpdateQuestions(updated);
    }
    setSelectedIds((prev) => prev.filter((item) => item !== id));
  };

  const handleSaveEdit = async (updated: QuestionRecord) => {
    setIsSavingEdit(true);
    try {
      if (onEditQuestion) {
        await onEditQuestion(updated);
      } else {
        const updatedList = questions.map((q) => (q.id === updated.id ? updated : q));
        onUpdateQuestions(updatedList);
      }
      setEditModalQuestion(null);
    } catch (err: any) {
      if (onToast) onToast(`Save failed: ${err.message}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Exports
  const handleExportExcel = () => {
    exportToExcel(filteredQuestions, 'devops_interview_questions.xlsx');
  };

  const handleExportCSV = () => {
    exportToCSV(filteredQuestions, 'devops_interview_questions.csv');
  };

  const handleExportJSON = () => {
    exportToJSON(filteredQuestions, 'devops_interview_questions_supabase.json');
  };

  // Dynamically include custom topics, difficulties, types from current questions
  const allAvailableTopics = useMemo(() => {
    const custom = questions.map((q) => q.primary_topic).filter((t) => t && !PRIMARY_TOPICS.includes(t));
    return Array.from(new Set([...PRIMARY_TOPICS, ...custom])).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    );
  }, [questions]);

  const allAvailableDifficulties = useMemo(() => {
    const custom = questions.map((q) => q.difficulty).filter((d) => d && !DIFFICULTIES.includes(d));
    return Array.from(new Set([...DIFFICULTIES, ...custom]));
  }, [questions]);

  const allAvailableTypes = useMemo(() => {
    const custom = questions.map((q) => q.question_type).filter((t) => t && !QUESTION_TYPES.includes(t));
    return Array.from(new Set([...QUESTION_TYPES, ...custom]));
  }, [questions]);

  // Difficulty badge styling helper
  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Intermediate':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'Advanced':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Expert':
        return 'bg-purple-100 text-purple-800 border-purple-200 font-bold';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const handleSyncToSupabase = async () => {
    if (filteredQuestions.length === 0) {
      if (onToast) onToast('No questions match current filter to sync.');
      return;
    }

    setIsSyncingSupabase(true);
    try {
      const resp = await fetch('/api/supabase/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: filteredQuestions }),
      });
      const result = await resp.json();

      if (result.success) {
        if (onToast)
          onToast(
            `✅ Synced ${filteredQuestions.length} questions to Supabase table "questions"!`
          );
        if (onRefreshSupabase) onRefreshSupabase();
      } else if (result.isMissingTable) {
        if (onOpenSupabaseSetup) {
          onOpenSupabaseSetup(filteredQuestions);
        }
        if (onToast) {
          onToast('Supabase table public.questions needs to be initialized. Follow the steps on screen.');
        }
      } else {
        const errorMsg = formatErrorMessage(result.error || 'Failed to upload to Supabase');
        if (onToast) onToast(`Supabase note: ${errorMsg}`);
      }
    } catch (err: any) {
      const errorMsg = formatErrorMessage(err);
      if (onToast) onToast(`Supabase sync note: ${errorMsg}`);
    } finally {
      setIsSyncingSupabase(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and 1-Click Export Buttons */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
            <BookOpen className="w-6 h-6 text-indigo-600 mr-2.5" />
            Interview Question Bank
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse and filter verified DevOps & SRE interview questions synchronized with database.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onRefreshSupabase && (
            <button
              onClick={onRefreshSupabase}
              disabled={isLoading}
              className="inline-flex items-center px-3.5 py-2.5 text-sm font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shadow-xs"
              title="Refresh questions from Supabase Database"
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 text-slate-600 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          )}

          <button
            id="btn-sync-supabase-browser"
            disabled={isSyncingSupabase}
            onClick={handleSyncToSupabase}
            className={`inline-flex items-center px-3.5 py-2.5 text-sm font-semibold rounded-xl transition-all shadow-xs ${
              isSyncingSupabase
                ? 'bg-slate-800 text-slate-300 cursor-wait'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
            title="Upload current filtered questions directly to Supabase database table questions"
          >
            {isSyncingSupabase ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin text-white" />
            ) : (
              <UploadCloud className="w-4 h-4 mr-1.5 text-white" />
            )}
            <span>
              {isSyncingSupabase ? 'Syncing...' : `Sync to Supabase (${filteredQuestions.length})`}
            </span>
          </button>

          <button
            id="btn-export-excel"
            onClick={handleExportExcel}
            className="inline-flex items-center px-4 py-2.5 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export to Excel
          </button>

          <button
            id="btn-export-csv"
            onClick={handleExportCSV}
            className="inline-flex items-center px-3.5 py-2.5 text-sm font-semibold rounded-xl bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 shadow-xs transition-colors"
          >
            <FileText className="w-4 h-4 mr-1.5 text-slate-600" />
            CSV
          </button>

          <button
            id="btn-export-json"
            onClick={handleExportJSON}
            className="inline-flex items-center px-3.5 py-2.5 text-sm font-semibold rounded-xl bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 shadow-xs transition-colors"
          >
            <FileText className="w-4 h-4 mr-1.5 text-indigo-600" />
            JSON
          </button>
        </div>
      </div>

      {/* Search & Clean Filter Controls (Filter pills bar removed as encircled in red) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        {/* Large Search Bar */}
        <div className="relative">
          <input
            id="search-questions-input"
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search questions, topics, tags, or concepts (e.g., CrashLoopBackOff, Terraform state, zero downtime)..."
            className="w-full pl-12 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-base text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
          />
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-4" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-3.5 p-1 text-slate-400 hover:text-slate-600 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Dropdown Filters Row & View Mode Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {/* All Topics Dropdown */}
            <div className="flex items-center space-x-1.5">
              <span className="text-xs text-slate-500 font-medium">Topic:</span>
              <select
                value={selectedTopic}
                onChange={(e) => {
                  setSelectedTopic(e.target.value);
                  setCurrentPage(1);
                }}
                className="py-1.5 px-3 border border-slate-200 rounded-lg bg-white text-slate-800 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
              >
                <option value="ALL">All Topics ({allAvailableTopics.length})</option>
                {allAvailableTopics.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Difficulty Dropdown */}
            <div className="flex items-center space-x-1.5">
              <span className="text-xs text-slate-500 font-medium">Difficulty:</span>
              <select
                value={selectedDifficulty}
                onChange={(e) => {
                  setSelectedDifficulty(e.target.value);
                  setCurrentPage(1);
                }}
                className="py-1.5 px-3 border border-slate-200 rounded-lg bg-white text-slate-800 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
              >
                <option value="ALL">All Difficulties ({allAvailableDifficulties.length})</option>
                {allAvailableDifficulties.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Question Type Dropdown */}
            <div className="flex items-center space-x-1.5">
              <span className="text-xs text-slate-500 font-medium">Type:</span>
              <select
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setCurrentPage(1);
                }}
                className="py-1.5 px-3 border border-slate-200 rounded-lg bg-white text-slate-800 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
              >
                <option value="ALL">All Types ({allAvailableTypes.length})</option>
                {allAvailableTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Duplicates Dropdown */}
            <div className="flex items-center space-x-1.5">
              <span className="text-xs text-slate-500 font-medium">Duplicates:</span>
              <select
                value={selectedDuplicate}
                onChange={(e) => {
                  setSelectedDuplicate(e.target.value);
                  setCurrentPage(1);
                }}
                className="py-1.5 px-3 border border-slate-200 rounded-lg bg-white text-slate-800 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
              >
                <option value="ALL">All Status</option>
                <option value="DUP">Has Duplicate Group</option>
                <option value="UNIQUE">Unique Only</option>
              </select>
            </div>
          </div>

          {/* View Toggle (Default is Table as requested; Card view is optional) */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 font-medium mr-1">
              Showing <strong className="text-slate-900">{filteredQuestions.length}</strong> questions
            </span>
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md text-xs font-semibold flex items-center transition-all ${
                  viewMode === 'table'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Default Table View"
              >
                <List className="w-4 h-4 mr-1" />
                Table
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-md text-xs font-semibold flex items-center transition-all ${
                  viewMode === 'cards'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Optional Card View"
              >
                <LayoutGrid className="w-4 h-4 mr-1" />
                Cards
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Action Banner when Items are Selected (Includes Edit button marked in green) */}
      {selectedIds.length > 0 && (
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between text-sm text-indigo-950 shadow-xs">
          <span className="font-semibold">
            {selectedIds.length} question(s) selected
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                const target = questions.find((q) => q.id === selectedIds[0]);
                if (target) setEditModalQuestion(target);
              }}
              className="px-3.5 py-1.5 bg-white border border-indigo-300 rounded-lg font-bold text-indigo-700 hover:bg-indigo-100 shadow-xs flex items-center space-x-1 cursor-pointer transition-colors"
              title="Edit the first selected question"
            >
              <Edit3 className="w-4 h-4 mr-1 text-indigo-600" />
              <span>Edit</span>
            </button>
            <button
              onClick={() => {
                const selectedObjs = questions.filter((q) => selectedIds.includes(q.id));
                exportToExcel(selectedObjs, 'selected_questions.xlsx');
              }}
              className="px-3.5 py-1.5 bg-white border border-indigo-300 rounded-lg font-semibold text-indigo-700 hover:bg-indigo-50 shadow-xs"
            >
              Export Selected ({selectedIds.length})
            </button>
            <button
              onClick={handleDeleteSelected}
              className="px-3.5 py-1.5 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700 shadow-xs"
            >
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredQuestions.length === 0 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-xs">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900">
            {questions.length === 0 ? 'Database is empty' : 'No matching questions found'}
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-5">
            {questions.length === 0
              ? 'No questions currently exist in the database. Ingest new questions or sync with your Supabase database.'
              : 'Try adjusting your search query or reset the filters to view the full question bank.'}
          </p>
          <div className="flex items-center justify-center space-x-3">
            {questions.length === 0 ? (
              <>
                <button
                  onClick={onNavigateToIngest}
                  className="px-4 py-2 text-sm font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs"
                >
                  + Ingest Questions
                </button>
                {onRefreshSupabase && (
                  <button
                    onClick={onRefreshSupabase}
                    className="px-4 py-2 text-sm font-semibold rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
                  >
                    Refresh from Database
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedTopic('ALL');
                  setSelectedDifficulty('ALL');
                  setSelectedType('ALL');
                  setSelectedDuplicate('ALL');
                }}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* 1. SPACIOUS TABLE VIEW (Default Display Mode) with Sort & Edit on all marked columns */}
      {viewMode === 'table' && filteredQuestions.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 select-none">
                <tr>
                  <th className="p-4 w-12 text-center">
                    <button onClick={handleSelectAllOnPage} className="text-slate-500 hover:text-slate-900">
                      {paginatedQuestions.length > 0 &&
                      paginatedQuestions.every((q) => selectedIds.includes(q.id)) ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-4 w-16 text-slate-400 font-mono">
                    <button
                      onClick={() => handleSort('sl_no')}
                      className="group flex items-center space-x-1 hover:text-slate-900 font-semibold text-xs"
                    >
                      <span>Sl No</span>
                      {renderSortIndicator('sl_no')}
                    </button>
                  </th>
                  {/* Sortable Question */}
                  <th className="p-4 min-w-[340px]">
                    <button
                      onClick={() => handleSort('question')}
                      className="group flex items-center space-x-1 hover:text-indigo-600 text-slate-700 font-semibold text-sm"
                    >
                      <span>Question</span>
                      {renderSortIndicator('question')}
                    </button>
                  </th>
                  {/* Sortable Topic */}
                  <th className="p-4 w-40">
                    <button
                      onClick={() => handleSort('primary_topic')}
                      className="group flex items-center space-x-1 hover:text-indigo-600 text-slate-700 font-semibold text-sm"
                    >
                      <span>Topic</span>
                      {renderSortIndicator('primary_topic')}
                    </button>
                  </th>
                  {/* Sortable Difficulty */}
                  <th className="p-4 w-32">
                    <button
                      onClick={() => handleSort('difficulty')}
                      className="group flex items-center space-x-1 hover:text-indigo-600 text-slate-700 font-semibold text-sm"
                    >
                      <span>Difficulty</span>
                      {renderSortIndicator('difficulty')}
                    </button>
                  </th>
                  {/* Sortable Type */}
                  <th className="p-4 w-36">
                    <button
                      onClick={() => handleSort('question_type')}
                      className="group flex items-center space-x-1 hover:text-indigo-600 text-slate-700 font-semibold text-sm"
                    >
                      <span>Type</span>
                      {renderSortIndicator('question_type')}
                    </button>
                  </th>
                  {/* Sortable Round */}
                  <th className="p-4 w-32">
                    <button
                      onClick={() => handleSort('interview_round')}
                      className="group flex items-center space-x-1 hover:text-indigo-600 text-slate-700 font-semibold text-sm"
                    >
                      <span>Round</span>
                      {renderSortIndicator('interview_round')}
                    </button>
                  </th>
                  {/* Sortable Confidence */}
                  <th className="p-4 w-28 text-center">
                    <button
                      onClick={() => handleSort('confidence_score')}
                      className="group flex items-center justify-center space-x-1 hover:text-indigo-600 text-slate-700 font-semibold text-sm mx-auto"
                    >
                      <span>Confidence</span>
                      {renderSortIndicator('confidence_score')}
                    </button>
                  </th>
                  {/* Action Column with Edit & Delete */}
                  <th className="p-4 w-28 text-center font-semibold text-slate-700">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80">
                {paginatedQuestions.map((q, idx) => {
                  const isSelected = selectedIds.includes(q.id);
                  return (
                    <tr
                      key={q.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-indigo-50/40' : ''
                      }`}
                    >
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleToggleSelect(q.id)}
                          className="text-slate-400 hover:text-slate-900"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="p-4 font-mono text-slate-400 text-xs">
                        #{q.sl_no || (currentPage - 1) * pageSize + idx + 1}
                      </td>
                      <td className="p-4">
                        <div
                          className="font-medium text-slate-900 hover:text-indigo-600 cursor-pointer leading-snug text-base"
                          onClick={() => setDetailModalQuestion(q)}
                        >
                          {q.question}
                        </div>
                        {q.tags && q.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {q.tags.slice(0, 3).map((t) => (
                              <span
                                key={t}
                                className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-slate-800 text-xs bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                          {q.primary_topic}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getDifficultyBadge(
                            q.difficulty
                          )}`}
                        >
                          {q.difficulty}
                        </span>
                      </td>
                      <td className="p-4 text-slate-700 text-xs">{q.question_type}</td>
                      <td className="p-4 text-slate-700 text-xs font-medium">{q.interview_round}</td>
                      <td className="p-4 text-center font-mono text-xs">
                        <span className="font-semibold text-slate-700">{q.confidence_score}%</span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          {/* Edit Action Button */}
                          <button
                            onClick={() => setEditModalQuestion(q)}
                            className="p-1.5 text-indigo-600 hover:text-indigo-900 rounded-lg hover:bg-indigo-50 transition-colors"
                            title="Edit Question"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {/* View Details */}
                          <button
                            onClick={() => setDetailModalQuestion(q)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {/* Delete Question */}
                          <button
                            onClick={() => handleDeleteSingle(q.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Delete Question"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. OPTIONAL CARD VIEW (No italic explanation box) */}
      {viewMode === 'cards' && filteredQuestions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {paginatedQuestions.map((q, idx) => {
            const isSelected = selectedIds.includes(q.id);
            const isLowConf = q.confidence_score < 75;

            return (
              <div
                key={q.id}
                className={`bg-white rounded-2xl border transition-all p-5 flex flex-col justify-between shadow-xs hover:shadow-md ${
                  isSelected
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20'
                    : isLowConf
                    ? 'border-amber-300 bg-amber-50/30'
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div>
                  {/* Card Top Row: Checkbox, Sl No, Topic, Difficulty */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center space-x-2.5">
                      <button
                        onClick={() => handleToggleSelect(q.id)}
                        className="text-slate-400 hover:text-slate-900 p-0.5"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-indigo-600" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                      <span className="text-xs font-mono font-semibold text-slate-400">
                        #{q.sl_no || (currentPage - 1) * pageSize + idx + 1}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {q.primary_topic}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getDifficultyBadge(
                          q.difficulty
                        )}`}
                      >
                        {q.difficulty}
                      </span>
                    </div>
                  </div>

                  {/* Question Text */}
                  <h3
                    onClick={() => setDetailModalQuestion(q)}
                    className="text-base font-semibold text-slate-900 leading-relaxed hover:text-indigo-600 cursor-pointer transition-colors mb-3"
                  >
                    {q.question}
                  </h3>

                  {/* Cross topics & tags */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    {q.cross_topics && q.cross_topics.length > 0 && (
                      <span className="text-xs text-slate-500 mr-1">
                        Cross:{' '}
                        <strong className="text-slate-700 font-medium">
                          {q.cross_topics.slice(0, 3).join(', ')}
                        </strong>
                      </span>
                    )}

                    {q.tags &&
                      q.tags.map((t) => (
                        <span
                          key={t}
                          className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md"
                        >
                          #{t}
                        </span>
                      ))}

                    {q.duplicate_group && (
                      <span className="text-xs font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md font-mono">
                        Dup Group: {q.duplicate_group}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Bottom Row: Metadata & Quick Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center space-x-3">
                    <span>
                      Type: <strong className="text-slate-700">{q.question_type}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Round: <strong className="text-slate-700">{q.interview_round}</strong>
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {/* Edit button on card */}
                    <button
                      onClick={() => setEditModalQuestion(q)}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center transition-colors cursor-pointer"
                      title="Edit question attributes"
                    >
                      <Edit3 className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                      Edit
                    </button>
                    <button
                      onClick={() => setDetailModalQuestion(q)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center transition-colors"
                      title="View details"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" />
                      Details
                    </button>
                    <button
                      onClick={() => handleDeleteSingle(q.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Delete question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {filteredQuestions.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
          <div className="flex items-center space-x-2 text-slate-600">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="py-1 px-2 border border-slate-200 rounded-lg bg-white font-semibold text-xs text-slate-800"
            >
              <option value={10}>10</option>
              <option value={12}>12</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="text-slate-400">•</span>
            <span>
              Page {currentPage} of {totalPages} ({filteredQuestions.length} total)
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 font-bold text-slate-800 text-sm">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Edit Question Modal */}
      <EditQuestionModal
        isOpen={!!editModalQuestion}
        question={editModalQuestion}
        onClose={() => setEditModalQuestion(null)}
        onSave={handleSaveEdit}
        isSaving={isSavingEdit}
      />

      {/* Detail Modal */}
      <QuestionDetailModal
        isOpen={!!detailModalQuestion}
        onClose={() => setDetailModalQuestion(null)}
        question={detailModalQuestion}
        onSave={async (updated) => {
          if (onEditQuestion) {
            await onEditQuestion(updated);
          } else {
            const newQuestions = questions.map((q) => (q.id === updated.id ? updated : q));
            onUpdateQuestions(newQuestions);
          }
          setDetailModalQuestion(updated);
        }}
      />
    </div>
  );
};

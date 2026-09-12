import React, { useState } from 'react';
import {
  CheckSquare,
  Square,
  Trash2,
  GitMerge,
  Split,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Search,
  Check,
  Edit3,
  LayoutGrid,
  List,
  Loader2,
  Database,
  UploadCloud,
} from 'lucide-react';
import {
  QuestionRecord,
  PRIMARY_TOPICS,
  DIFFICULTIES,
  QUESTION_TYPES,
  EXPERIENCE_LEVELS,
  INTERVIEW_ROUNDS,
  AnalysisSummary,
  ValidationReportItem,
} from '../types';
import { MergeModal, SplitModal } from './MergeSplitModal';
import { QuestionDetailModal } from './QuestionDetailModal';
import { CustomEnumSelect } from './CustomEnumSelect';

interface ReviewTableProps {
  questions: QuestionRecord[];
  summary: AnalysisSummary | null;
  validationReport: ValidationReportItem[];
  onUpdateQuestions: (updated: QuestionRecord[]) => void;
  onReviewCompleted: (finalQuestions: QuestionRecord[]) => void;
  isUploading?: boolean;
  supabaseStatus?: {
    configured: boolean;
    connected: boolean;
    tableExists: boolean;
    url?: string;
  };
  onOpenSupabaseSetup?: () => void;
}

export const ReviewTable: React.FC<ReviewTableProps> = ({
  questions,
  summary,
  validationReport,
  onUpdateQuestions,
  onReviewCompleted,
  isUploading = false,
  supabaseStatus,
  onOpenSupabaseSetup,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterTopic, setFilterTopic] = useState<string>('ALL');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('ALL');
  const [filterDuplicate, setFilterDuplicate] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Modals state
  const [detailModalQuestion, setDetailModalQuestion] = useState<QuestionRecord | null>(null);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [splitTargetQuestion, setSplitTargetQuestion] = useState<QuestionRecord | null>(null);

  // Dynamically include any custom topics and difficulties found in the questions
  const availableTopics = React.useMemo(() => {
    const custom = questions
      .map((q) => q.primary_topic)
      .filter((t) => t && !PRIMARY_TOPICS.includes(t));
    return Array.from(new Set([...PRIMARY_TOPICS, ...custom])).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    );
  }, [questions]);

  const availableDifficulties = React.useMemo(() => {
    const custom = questions
      .map((q) => q.difficulty)
      .filter((d) => d && !DIFFICULTIES.includes(d));
    return Array.from(new Set([...DIFFICULTIES, ...custom]));
  }, [questions]);

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredQuestions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredQuestions.map((q) => q.id));
    }
  };

  // Field change handler
  const handleFieldChange = (id: string, field: keyof QuestionRecord, value: any) => {
    const updated = questions.map((q) => {
      if (q.id === id) {
        return {
          ...q,
          [field]: value,
          updated_at: new Date().toISOString(),
        };
      }
      return q;
    });
    onUpdateQuestions(updated);
  };

  // Delete single question
  const handleDelete = (id: string) => {
    const updated = questions.filter((q) => q.id !== id);
    onUpdateQuestions(updated);
    setSelectedIds((prev) => prev.filter((i) => i !== id));
  };

  // Bulk delete selected
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    const updated = questions.filter((q) => !selectedIds.includes(q.id));
    onUpdateQuestions(updated);
    setSelectedIds([]);
  };

  // Bulk approve selected
  const handleBulkApprove = () => {
    if (selectedIds.length === 0) return;
    const updated = questions.map((q) => {
      if (selectedIds.includes(q.id)) {
        return { ...q, status: 'Approved' as const };
      }
      return q;
    });
    onUpdateQuestions(updated);
  };

  // Handle Merge completion
  const handleMergeComplete = (merged: QuestionRecord, originalIds: string[]) => {
    const updated = questions.filter((q) => !originalIds.includes(q.id));
    updated.unshift(merged);
    onUpdateQuestions(updated);
    setSelectedIds([]);
  };

  // Handle Split completion
  const handleSplitComplete = (originalId: string, splitList: QuestionRecord[]) => {
    const idx = questions.findIndex((q) => q.id === originalId);
    if (idx >= 0) {
      const updated = [...questions];
      updated.splice(idx, 1, ...splitList);
      onUpdateQuestions(updated);
    }
  };

  // Filter questions
  const filteredQuestions = questions.filter((q) => {
    if (filterTopic !== 'ALL' && q.primary_topic !== filterTopic) return false;
    if (filterDifficulty !== 'ALL' && q.difficulty !== filterDifficulty) return false;
    if (filterDuplicate === 'DUPLICATES' && !q.duplicate_group) return false;
    if (filterDuplicate === 'UNIQUE' && q.duplicate_group) return false;
    if (searchQuery.trim()) {
      const qText = q.question.toLowerCase();
      const tagsText = (q.tags || []).join(' ').toLowerCase();
      const s = searchQuery.toLowerCase();
      if (!qText.includes(s) && !tagsText.includes(s)) return false;
    }
    return true;
  });

  const selectedQuestionObjects = questions.filter((q) => selectedIds.includes(q.id));

  return (
    <div className="space-y-6">
      {/* 1. Ingestion Summary Cards */}
      {summary && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mr-2" />
                Ingestion & Classification Overview
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluated by 20+ Yrs DevOps Panelist heuristics
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Avg Confidence: {summary.averageConfidence}%
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-xs font-semibold text-slate-500">Processed Questions</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {summary.questionsProcessed}
              </div>
            </div>

            <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/80">
              <span className="text-xs font-semibold text-amber-800">Duplicate Groups</span>
              <div className="text-2xl font-bold text-amber-900 mt-1">
                {summary.duplicatesFound}
              </div>
            </div>

            <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-200/80">
              <span className="text-xs font-semibold text-indigo-800">Unique Topics</span>
              <div className="text-2xl font-bold text-indigo-900 mt-1">
                {summary.topicsCount}
              </div>
            </div>

            <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-200/80">
              <span className="text-xs font-semibold text-purple-800">Expert Difficulty</span>
              <div className="text-2xl font-bold text-purple-900 mt-1">
                {summary.expertQuestions}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Review Table Header & Action Controls */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Review Queue ({filteredQuestions.length} Questions)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Review questions, adjust topics or difficulty, split/merge duplicates, then finalize.
            </p>
          </div>

          {/* View toggle */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center transition-all ${
                  viewMode === 'cards'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5 mr-1" />
                Cards
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center transition-all ${
                  viewMode === 'table'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5 mr-1" />
                Table
              </button>
            </div>

            <button
              onClick={handleSelectAll}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700"
            >
              {selectedIds.length === filteredQuestions.length && filteredQuestions.length > 0
                ? 'Deselect All'
                : 'Select All'}
            </button>
          </div>
        </div>

        {/* Filters and search */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search queue..."
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white w-44 focus:w-56 transition-all outline-none"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>

            <select
              value={filterTopic}
              onChange={(e) => setFilterTopic(e.target.value)}
              className="py-1.5 px-2.5 border border-slate-300 rounded-lg bg-white text-xs font-medium"
            >
              <option value="ALL">All Topics ({availableTopics.length})</option>
              {availableTopics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <select
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
              className="py-1.5 px-2.5 border border-slate-300 rounded-lg bg-white text-xs font-medium"
            >
              <option value="ALL">All Difficulties ({availableDifficulties.length})</option>
              {availableDifficulties.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <select
              value={filterDuplicate}
              onChange={(e) => setFilterDuplicate(e.target.value)}
              className="py-1.5 px-2.5 border border-slate-300 rounded-lg bg-white text-xs font-medium"
            >
              <option value="ALL">All Duplicates</option>
              <option value="DUPLICATES">Only Duplicates</option>
              <option value="UNIQUE">Only Unique</option>
            </select>
          </div>

          {/* Bulk Selection Actions */}
          {selectedIds.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-indigo-700">
                {selectedIds.length} Selected
              </span>

              <button
                onClick={handleBulkApprove}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                Approve Selected
              </button>

              {selectedIds.length >= 2 && (
                <button
                  onClick={() => setIsMergeModalOpen(true)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center shadow-xs"
                >
                  <GitMerge className="w-3.5 h-3.5 mr-1" />
                  Merge Selected
                </button>
              )}

              <button
                onClick={handleBulkDelete}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
              >
                Delete Selected
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. Cards View (Comfortable & High Legibility) */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredQuestions.map((q, idx) => {
            const isSelected = selectedIds.includes(q.id);
            const isLowConf = q.confidence_score < 75;

            return (
              <div
                key={q.id}
                className={`bg-white rounded-2xl border p-5 transition-all shadow-xs flex flex-col justify-between ${
                  isSelected
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20'
                    : isLowConf
                    ? 'border-amber-300 bg-amber-50/40'
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2.5">
                      <button
                        onClick={() => handleToggleSelect(q.id)}
                        className="text-slate-400 hover:text-slate-900"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-indigo-600" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                      <span className="text-xs font-mono font-bold text-slate-400">
                        #{idx + 1}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {isLowConf && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                          Review Conf ({q.confidence_score}%)
                        </span>
                      )}
                      {q.duplicate_group && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300">
                          Dup: {q.duplicate_group}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Question (Inline Editable textarea with comfortable font) */}
                  <textarea
                    value={q.question}
                    onChange={(e) => handleFieldChange(q.id, 'question', e.target.value)}
                    rows={2}
                    className="w-full text-base font-semibold text-slate-900 bg-slate-50/60 p-3 rounded-xl border border-slate-200/80 focus:border-indigo-500 focus:bg-white outline-none leading-relaxed transition-all resize-y mb-3"
                  />

                  {/* Selectors for Topic and Difficulty */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <span className="block text-xs font-bold text-slate-400 mb-1">Topic</span>
                      <CustomEnumSelect
                        value={q.primary_topic}
                        options={availableTopics}
                        onChange={(newVal) =>
                          handleFieldChange(q.id, 'primary_topic', newVal)
                        }
                        placeholder="Custom Topic..."
                        size="xs"
                      />
                    </div>

                    <div>
                      <span className="block text-xs font-bold text-slate-400 mb-1">Difficulty</span>
                      <CustomEnumSelect
                        value={q.difficulty}
                        options={availableDifficulties}
                        onChange={(newVal) =>
                          handleFieldChange(q.id, 'difficulty', newVal)
                        }
                        placeholder="Custom Difficulty..."
                        size="xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-500">
                      Round: <strong className="text-slate-700">{q.interview_round}</strong>
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => setDetailModalQuestion(q)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center"
                      title="View Details"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Details
                    </button>
                    <button
                      onClick={() => setSplitTargetQuestion(q)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 flex items-center"
                      title="Split Question"
                    >
                      <Split className="w-3.5 h-3.5 mr-1" />
                      Split
                    </button>
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                      title="Delete Question"
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

      {/* 4. Table View (Clean & Spacious) */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-4 w-12 text-center">
                    <button onClick={handleSelectAll} className="text-slate-500 hover:text-slate-900">
                      {selectedIds.length === filteredQuestions.length && filteredQuestions.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-4 w-14 text-slate-400 font-mono">#</th>
                  <th className="p-4 min-w-[320px]">Question</th>
                  <th className="p-4 w-44">Topic</th>
                  <th className="p-4 w-32">Difficulty</th>
                  <th className="p-4 w-28 text-center">Confidence</th>
                  <th className="p-4 w-24 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredQuestions.map((q, idx) => {
                  const isSelected = selectedIds.includes(q.id);
                  const isLowConf = q.confidence_score < 75;
                  return (
                    <tr
                      key={q.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isSelected
                          ? 'bg-indigo-50/40'
                          : isLowConf
                          ? 'bg-amber-50/40'
                          : ''
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
                      <td className="p-4 font-mono text-slate-400 text-xs">#{idx + 1}</td>
                      <td className="p-4">
                        <textarea
                          value={q.question}
                          onChange={(e) => handleFieldChange(q.id, 'question', e.target.value)}
                          rows={2}
                          className="w-full text-sm font-medium text-slate-900 p-2 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none"
                        />
                      </td>
                      <td className="p-4 min-w-[170px]">
                        <CustomEnumSelect
                          value={q.primary_topic}
                          options={availableTopics}
                          onChange={(newVal) =>
                            handleFieldChange(q.id, 'primary_topic', newVal)
                          }
                          placeholder="Custom Topic..."
                          size="xs"
                        />
                      </td>
                      <td className="p-4 min-w-[150px]">
                        <CustomEnumSelect
                          value={q.difficulty}
                          options={availableDifficulties}
                          onChange={(newVal) =>
                            handleFieldChange(q.id, 'difficulty', newVal)
                          }
                          placeholder="Custom Difficulty..."
                          size="xs"
                        />
                      </td>
                      <td className="p-4 text-center font-mono text-xs">
                        <span
                          className={`inline-block px-2 py-0.5 rounded font-bold ${
                            isLowConf ? 'bg-amber-100 text-amber-900' : 'text-emerald-700'
                          }`}
                        >
                          {q.confidence_score}%
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => setDetailModalQuestion(q)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(q.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100"
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

      {/* 5. Validation Quality Checks */}
      {validationReport.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center">
            <AlertTriangle className="w-5 h-5 text-amber-600 mr-2" />
            Quality Checks & Notifications
          </h3>
          <div className="max-h-40 overflow-y-auto space-y-2 text-xs">
            {validationReport.map((rep, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg flex items-center justify-between border bg-amber-50/60 border-amber-200/80 text-amber-900"
              >
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold uppercase text-xs px-1.5 py-0.5 rounded bg-white">
                    {rep.field}
                  </span>
                  <span>{rep.message}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Ready to Finalize Action Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-lg text-white flex items-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 mr-2" />
              Approve & Save to Question Bank
            </h3>
            {supabaseStatus?.configured ? (
              supabaseStatus.tableExists ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
                  Supabase DB Ready
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onOpenSupabaseSetup}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-950 text-amber-300 border border-amber-800 hover:bg-amber-900 cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping mr-1.5" />
                  Table Setup Needed (1-Click SQL)
                </button>
              )
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                <Database className="w-3 h-3 mr-1 text-slate-400" />
                Local Bank (Supabase Credentials in Settings)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            Click <strong className="text-white">Review Completed</strong> to save approved questions to your Bank and auto-upload directly to Supabase (<code className="text-emerald-300 font-mono">public.questions</code>).
            {supabaseStatus?.configured && !supabaseStatus?.tableExists && (
              <span className="block text-amber-300 font-medium mt-0.5">
                Notice: Table public.questions has not been created yet.{' '}
                <button
                  type="button"
                  onClick={onOpenSupabaseSetup}
                  className="underline hover:text-white font-bold"
                >
                  Run 1-click table setup
                </button>
              </span>
            )}
          </p>
        </div>

        <button
          id="btn-review-completed"
          disabled={isUploading}
          onClick={() => onReviewCompleted(questions)}
          className={`px-6 py-3 rounded-xl font-bold text-sm shadow-md transition-all active:scale-98 flex items-center justify-center shrink-0 ${
            isUploading
              ? 'bg-emerald-600/80 text-white cursor-wait'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 hover:shadow-emerald-500/20'
          }`}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin text-slate-950" />
              Uploading to Supabase DB...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2 text-slate-950" />
              Review Completed ({questions.length} Qs)
            </>
          )}
        </button>
      </div>

      {/* Merge & Split Modals */}
      <MergeModal
        isOpen={isMergeModalOpen}
        onClose={() => setIsMergeModalOpen(false)}
        selectedQuestions={selectedQuestionObjects}
        onMergeComplete={handleMergeComplete}
      />

      <SplitModal
        isOpen={!!splitTargetQuestion}
        onClose={() => setSplitTargetQuestion(null)}
        questionToSplit={splitTargetQuestion}
        onSplitComplete={handleSplitComplete}
      />

      <QuestionDetailModal
        isOpen={!!detailModalQuestion}
        onClose={() => setDetailModalQuestion(null)}
        question={detailModalQuestion}
        onSave={(updated) => {
          const newQuestions = questions.map((q) => (q.id === updated.id ? updated : q));
          onUpdateQuestions(newQuestions);
        }}
      />
    </div>
  );
};

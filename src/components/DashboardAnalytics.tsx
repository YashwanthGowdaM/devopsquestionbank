import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Award,
  Layers,
  HelpCircle,
  TrendingUp,
  CheckCircle2,
  Code,
  Wrench,
  BookOpen,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { QuestionRecord, DIFFICULTIES, QUESTION_TYPES } from '../types';

interface DashboardAnalyticsProps {
  questions: QuestionRecord[];
  onNavigateToBrowser: () => void;
  onNavigateToIngest: () => void;
}

export const DashboardAnalytics: React.FC<DashboardAnalyticsProps> = ({
  questions,
  onNavigateToBrowser,
  onNavigateToIngest,
}) => {
  // Aggregate Metrics
  const metrics = useMemo(() => {
    const total = questions.length;
    const uniqueTopics = new Set(questions.map((q) => q.primary_topic)).size;

    const expert = questions.filter((q) => q.difficulty === 'Expert').length;
    const advanced = questions.filter((q) => q.difficulty === 'Advanced').length;
    const intermediate = questions.filter((q) => q.difficulty === 'Intermediate').length;
    const beginner = questions.filter((q) => q.difficulty === 'Beginner').length;

    const troubleshooting = questions.filter(
      (q) => q.question_type === 'Troubleshooting' || q.question_type === 'Production Incident'
    ).length;
    const architecture = questions.filter((q) => q.question_type === 'Architecture').length;
    const theory = questions.filter((q) => q.question_type === 'Theory').length;
    const scenario = questions.filter(
      (q) => q.question_type === 'Scenario' || q.question_type === 'Real-time Experience'
    ).length;

    return {
      total,
      uniqueTopics,
      expert,
      advanced,
      intermediate,
      beginner,
      troubleshooting,
      architecture,
      theory,
      scenario,
    };
  }, [questions]);

  const [topicSort, setTopicSort] = useState<'alphabetical' | 'count'>('alphabetical');

  // Topic Distribution - default alphabetical (A-Z)
  const displayedTopics = useMemo(() => {
    const counts: Record<string, number> = {};
    questions.forEach((q) => {
      counts[q.primary_topic] = (counts[q.primary_topic] || 0) + 1;
    });
    const entries = Object.entries(counts);
    if (topicSort === 'alphabetical') {
      return entries.sort((a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: 'base' }));
    } else {
      return entries.sort((a, b) => b[1] - a[1]);
    }
  }, [questions, topicSort]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
            <BarChart3 className="w-6 h-6 text-indigo-600 mr-2.5" />
            Bank Analytics & Coverage
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Overview of question distribution, technical domain depth, and difficulty levels.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={onNavigateToIngest}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors"
          >
            + Ingest New Questions
          </button>
          <button
            onClick={onNavigateToBrowser}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 shadow-xs transition-colors"
          >
            View All ({questions.length})
          </button>
        </div>
      </div>

      {/* 4 Core KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Questions */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-500">Total Questions</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">{metrics.total}</div>
          <span className="text-xs text-emerald-600 font-medium mt-1 inline-block">
            Verified in active bank
          </span>
        </div>

        {/* Unique Topics */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-500">Technical Domains</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">{metrics.uniqueTopics}</div>
          <span className="text-xs text-slate-500 font-medium mt-1 inline-block">
            Across 36 DevOps taxonomy
          </span>
        </div>

        {/* Expert & Advanced */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-500">Expert & Advanced</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-purple-700">
            {metrics.expert + metrics.advanced}
          </div>
          <span className="text-xs text-purple-600 font-medium mt-1 inline-block">
            {metrics.total > 0
              ? Math.round(((metrics.expert + metrics.advanced) / metrics.total) * 100)
              : 0}
            % senior interview questions
          </span>
        </div>

        {/* Hands-on & Incident */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-500">Incident & Hands-on</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-rose-700">
            {metrics.troubleshooting + metrics.scenario}
          </div>
          <span className="text-xs text-rose-600 font-medium mt-1 inline-block">
            Troubleshooting & real incidents
          </span>
        </div>
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Difficulty Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Difficulty Distribution</h2>
          <div className="space-y-3">
            {[
              { label: 'Beginner', count: metrics.beginner, color: 'bg-emerald-500', text: 'text-emerald-700' },
              { label: 'Intermediate', count: metrics.intermediate, color: 'bg-sky-500', text: 'text-sky-700' },
              { label: 'Advanced', count: metrics.advanced, color: 'bg-amber-500', text: 'text-amber-700' },
              { label: 'Expert', count: metrics.expert, color: 'bg-purple-600', text: 'text-purple-700' },
            ].map((item) => {
              const pct = metrics.total > 0 ? Math.round((item.count / metrics.total) * 100) : 0;
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-semibold text-slate-800">{item.label}</span>
                    <span className="font-bold text-slate-700">
                      {item.count} questions ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Technical Domains List */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Technical Domains Coverage</h2>
              <p className="text-xs text-slate-500">
                {topicSort === 'alphabetical' ? 'Sorted in Alphabetical Order (A–Z)' : 'Sorted by Question Count'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setTopicSort('alphabetical')}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    topicSort === 'alphabetical'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  A–Z (Alphabetical)
                </button>
                <button
                  type="button"
                  onClick={() => setTopicSort('count')}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    topicSort === 'count'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  By Count
                </button>
              </div>
              <button
                onClick={onNavigateToBrowser}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center shrink-0 ml-1"
              >
                Explore all <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {displayedTopics.map(([topic, count]) => {
              const pct = metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0;
              return (
                <div
                  key={topic}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-indigo-50/30 hover:border-indigo-200 transition-colors"
                >
                  <span className="text-sm font-semibold text-slate-800">{topic}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-500">{pct}%</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white text-indigo-700 border border-slate-200 shadow-xs">
                      {count} Qs
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

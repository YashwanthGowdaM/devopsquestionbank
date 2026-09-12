import React from 'react';
import {
  BookOpen,
  PlusCircle,
  CheckCircle2,
  BarChart2,
  DownloadCloud,
  Sparkles,
  Database,
} from 'lucide-react';

export type NavTab = 'browser' | 'ingest' | 'review' | 'dashboard';

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  pendingCount: number;
  totalBankCount: number;
  hasGeminiKey: boolean;
  supabaseStatus?: {
    configured: boolean;
    connected: boolean;
    tableExists: boolean;
    url?: string;
  };
  onOpenSupabaseSetup?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  pendingCount,
  totalBankCount,
  supabaseStatus,
  onOpenSupabaseSetup,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('browser')}>
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-900 text-lg tracking-tight">
                  DevOps Question Bank
                </span>
              </div>
            </div>
          </div>

          {/* Simple, Clean Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            {/* 1. Questions (Main Bank) */}
            <button
              id="nav-tab-browser"
              onClick={() => setActiveTab('browser')}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center space-x-2 ${
                activeTab === 'browser'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Questions</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'browser' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {totalBankCount}
              </span>
            </button>

            {/* 2. Add Questions */}
            <button
              id="nav-tab-ingest"
              onClick={() => setActiveTab('ingest')}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center space-x-2 ${
                activeTab === 'ingest'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <PlusCircle className="w-4 h-4 text-amber-500" />
              <span>Add Questions</span>
            </button>

            {/* 3. Review Queue */}
            <button
              id="nav-tab-review"
              onClick={() => setActiveTab('review')}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center space-x-2 relative ${
                activeTab === 'review'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Review Queue</span>
              {pendingCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white animate-pulse">
                  {pendingCount}
                </span>
              )}
            </button>

            {/* 4. Analytics */}
            <button
              id="nav-tab-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center space-x-2 ${
                activeTab === 'dashboard'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              <span className="hidden sm:inline">Analytics</span>
            </button>

            {/* Supabase Status Indicator */}
            {supabaseStatus?.configured ? (
              supabaseStatus.tableExists ? (
                <div
                  title={`Connected to Supabase (${supabaseStatus.url || 'Database'}). Live table public.questions ready for automated uploads.`}
                  className="hidden xl:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-mono">Supabase: Live</span>
                </div>
              ) : (
                <button
                  type="button"
                  id="btn-navbar-init-supabase-table"
                  onClick={onOpenSupabaseSetup}
                  title="Supabase is connected, but table 'public.questions' has not been created yet. Click for 1-click SQL setup."
                  className="hidden xl:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-colors shadow-xs cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  <span>Supabase: Init Table (1-Click)</span>
                </button>
              )
            ) : (
              <div
                title="Supabase auto-upload ready (configure SUPABASE_URL & SUPABASE_KEY in Settings/env)"
                className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200"
              >
                <Database className="w-3.5 h-3.5 text-slate-400" />
                <span>Supabase Auto-Sync</span>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Code,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  CheckSquare,
  Heading1,
  Heading2,
  Quote,
  Undo2,
  Redo2,
  Trash2,
  Copy,
  Check,
  Eraser,
  Sparkles,
  Type,
  ChevronDown,
  Eye,
  Edit3,
} from 'lucide-react';

interface TextEditorWithToolbarProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
  id?: string;
  detectedCount?: number;
}

export type TextAlignment = 'left' | 'center' | 'right' | 'justify';
export type FontSize = 'sm' | 'base' | 'lg';

export const TextEditorWithToolbar: React.FC<TextEditorWithToolbarProps> = ({
  value,
  onChange,
  placeholder,
  rows = 12,
  id = 'rich-questions-editor',
  detectedCount,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [alignment, setAlignment] = useState<TextAlignment>('left');
  const [fontSize, setFontSize] = useState<FontSize>('base');
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [copied, setCopied] = useState(false);
  const [showPointsMenu, setShowPointsMenu] = useState(false);
  const [showFormatMenu, setShowFormatMenu] = useState(false);

  // Undo/Redo history stack
  const [history, setHistory] = useState<string[]>([value]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Update history on user edits (debounced)
  const pushHistory = (newVal: string) => {
    if (newVal === value) return;
    const nextHist = history.slice(0, historyIndex + 1);
    nextHist.push(newVal);
    if (nextHist.length > 50) nextHist.shift();
    setHistory(nextHist);
    setHistoryIndex(nextHist.length - 1);
    onChange(newVal);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      setHistoryIndex(newIdx);
      onChange(history[newIdx]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIdx = historyIndex + 1;
      setHistoryIndex(newIdx);
      onChange(history[newIdx]);
    }
  };

  // Helper to wrap selected text or insert text at cursor
  const wrapSelection = (prefix: string, suffix: string = prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    let newText = '';
    if (start === end) {
      // Nothing selected, insert placeholder wrapped
      newText = value.substring(0, start) + prefix + 'question' + suffix + value.substring(end);
      pushHistory(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, start + prefix.length + 8);
      }, 50);
    } else {
      newText = value.substring(0, start) + prefix + selectedText + suffix + value.substring(end);
      pushHistory(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, end + prefix.length);
      }, 50);
    }
  };

  // Apply Points (Bullet, Numbered, Dash, Checkbox, Letters)
  const applyPoints = (type: 'bullet' | 'number' | 'dash' | 'checkbox' | 'letter' | 'q_prefix') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // If nothing selected or whole text, apply to all non-empty lines or selected range lines
    let targetText = value;
    let isFullText = false;

    if (start === end) {
      isFullText = true;
    } else {
      // Find beginning of first selected line and end of last selected line
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      let lineEnd = value.indexOf('\n', end);
      if (lineEnd === -1) lineEnd = value.length;
      targetText = value.substring(lineStart, lineEnd);
    }

    const lines = targetText.split('\n');
    let counter = 1;
    const transformedLines = lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      // Clean existing prefixes first (bullets, numbers, dashes, Q1:)
      const cleanLine = trimmed
        .replace(/^([•\-\*+]|\d+[\.\)]|[A-Z][\.\)]|\[[ xX]?\]|Q\d+:?|Question\s*\d+:?)\s*/i, '')
        .trim();

      if (type === 'bullet') {
        return `• ${cleanLine}`;
      } else if (type === 'number') {
        const res = `${counter}. ${cleanLine}`;
        counter++;
        return res;
      } else if (type === 'dash') {
        return `- ${cleanLine}`;
      } else if (type === 'checkbox') {
        return `[ ] ${cleanLine}`;
      } else if (type === 'letter') {
        const char = String.fromCharCode(64 + ((counter - 1) % 26) + 1);
        const res = `${char}. ${cleanLine}`;
        counter++;
        return res;
      } else if (type === 'q_prefix') {
        const res = `Q${counter}: ${cleanLine}`;
        counter++;
        return res;
      }
      return cleanLine;
    });

    const replaced = transformedLines.join('\n');

    if (isFullText) {
      pushHistory(replaced);
    } else {
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      let lineEnd = value.indexOf('\n', end);
      if (lineEnd === -1) lineEnd = value.length;
      const finalVal = value.substring(0, lineStart) + replaced + value.substring(lineEnd);
      pushHistory(finalVal);
    }

    setShowPointsMenu(false);
  };

  // Strip all bullets, points, numbers, and prefixes
  const handleStripPoints = () => {
    const lines = value.split('\n');
    const cleaned = lines.map((line) => {
      return line
        .replace(/^\s*([•\-\*+]|\d+[\.\)]|[A-Z][\.\)]|\[[ xX]?\]|Q\d+:?|Question\s*\d+:?)\s*/i, '')
        .trim();
    });
    pushHistory(cleaned.join('\n'));
    setShowPointsMenu(false);
  };

  // Clear Markdown formatting (bold, italic, code, underline)
  const handleClearFormatting = () => {
    let text = value
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      .replace(/`{1,3}(.*?)`{1,3}/g, '$1')
      .replace(/<\/?u>/g, '');
    pushHistory(text);
    setShowFormatMenu(false);
  };

  // Title Case / Capitalize first letters of each question
  const handleCapitalizeQuestions = () => {
    const lines = value.split('\n');
    const capitalized = lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      // Find first alphabetic character and capitalize
      return line.replace(/^(\s*([•\-\*+]|\d+[\.\)]|Q\d+:?|\[ \])?\s*)([a-z])/, (_m, prefix, _p2, char) => {
        return (prefix || '') + char.toUpperCase();
      });
    });
    pushHistory(capitalized.join('\n'));
    setShowFormatMenu(false);
  };

  // Trim extra blank lines
  const handleTrimBlankLines = () => {
    const lines = value.split('\n');
    const filtered: string[] = [];
    let lastWasEmpty = false;
    for (const l of lines) {
      const isEmp = l.trim().length === 0;
      if (isEmp) {
        if (!lastWasEmpty) {
          filtered.push('');
          lastWasEmpty = true;
        }
      } else {
        filtered.push(l.trimEnd());
        lastWasEmpty = false;
      }
    }
    pushHistory(filtered.join('\n').trim());
    setShowFormatMenu(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Alignment class mapping
  const alignmentClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
    justify: 'text-justify',
  }[alignment];

  // Font size class mapping
  const fontSizeClass = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
  }[fontSize];

  return (
    <div className="rounded-2xl border border-slate-300 bg-white shadow-xs overflow-hidden focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
      {/* 1. Primary Rich Text Editor Toolbar */}
      <div className="bg-slate-100/90 border-b border-slate-200 px-3 py-2 flex flex-wrap items-center justify-between gap-2 select-none">
        {/* Left Toolbar Cluster: Editor Styles, Formatting, Points, Alignment */}
        <div className="flex flex-wrap items-center gap-1">
          {/* Undo / Redo */}
          <div className="flex items-center space-x-0.5 pr-1.5 border-r border-slate-300">
            <button
              type="button"
              id="btn-editor-undo"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              title="Undo (Ctrl+Z)"
              className="p-1.5 rounded-lg text-slate-700 hover:bg-white disabled:text-slate-300 disabled:hover:bg-transparent transition-colors"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              id="btn-editor-redo"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              title="Redo (Ctrl+Y)"
              className="p-1.5 rounded-lg text-slate-700 hover:bg-white disabled:text-slate-300 disabled:hover:bg-transparent transition-colors"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          {/* Text Formatting: Bold, Italic, Underline, Code */}
          <div className="flex items-center space-x-0.5 px-1.5 border-r border-slate-300">
            <button
              type="button"
              id="btn-format-bold"
              onClick={() => wrapSelection('**')}
              title="Bold (**text**)"
              className="p-1.5 rounded-lg text-slate-700 hover:bg-white hover:text-indigo-600 font-bold transition-colors"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              id="btn-format-italic"
              onClick={() => wrapSelection('*')}
              title="Italic (*text*)"
              className="p-1.5 rounded-lg text-slate-700 hover:bg-white hover:text-indigo-600 italic transition-colors"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              id="btn-format-underline"
              onClick={() => wrapSelection('<u>', '</u>')}
              title="Underline (<u>text</u>)"
              className="p-1.5 rounded-lg text-slate-700 hover:bg-white hover:text-indigo-600 transition-colors"
            >
              <Underline className="w-4 h-4" />
            </button>
            <button
              type="button"
              id="btn-format-code"
              onClick={() => wrapSelection('`')}
              title="Inline Code (`code`)"
              className="p-1.5 rounded-lg text-slate-700 hover:bg-white hover:text-indigo-600 transition-colors"
            >
              <Code className="w-4 h-4" />
            </button>
            <button
              type="button"
              id="btn-format-quote"
              onClick={() => wrapSelection('> ')}
              title="Quote / Callout"
              className="p-1.5 rounded-lg text-slate-700 hover:bg-white hover:text-indigo-600 transition-colors"
            >
              <Quote className="w-4 h-4" />
            </button>
          </div>

          {/* Alignment Controls: Left, Center, Right, Justify */}
          <div className="flex items-center space-x-0.5 px-1.5 border-r border-slate-300">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">
              Align:
            </span>
            <button
              type="button"
              id="btn-align-left"
              onClick={() => setAlignment('left')}
              title="Align Left"
              className={`p-1.5 rounded-lg transition-colors ${
                alignment === 'left'
                  ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                  : 'text-slate-700 hover:bg-white hover:text-slate-900'
              }`}
            >
              <AlignLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              id="btn-align-center"
              onClick={() => setAlignment('center')}
              title="Align Center"
              className={`p-1.5 rounded-lg transition-colors ${
                alignment === 'center'
                  ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                  : 'text-slate-700 hover:bg-white hover:text-slate-900'
              }`}
            >
              <AlignCenter className="w-4 h-4" />
            </button>
            <button
              type="button"
              id="btn-align-right"
              onClick={() => setAlignment('right')}
              title="Align Right"
              className={`p-1.5 rounded-lg transition-colors ${
                alignment === 'right'
                  ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                  : 'text-slate-700 hover:bg-white hover:text-slate-900'
              }`}
            >
              <AlignRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              id="btn-align-justify"
              onClick={() => setAlignment('justify')}
              title="Justify Text"
              className={`p-1.5 rounded-lg transition-colors ${
                alignment === 'justify'
                  ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                  : 'text-slate-700 hover:bg-white hover:text-slate-900'
              }`}
            >
              <AlignJustify className="w-4 h-4" />
            </button>
          </div>

          {/* Points & Lists Controls: Bullet Points, Numbered Points, More Points */}
          <div className="flex items-center space-x-1 px-1.5 border-r border-slate-300 relative">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">
              Points:
            </span>
            <button
              type="button"
              id="btn-points-bullet"
              onClick={() => applyPoints('bullet')}
              title="Bullet Points (• Question)"
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white hover:bg-slate-200 text-slate-800 border border-slate-200 flex items-center shadow-2xs transition-colors"
            >
              <List className="w-3.5 h-3.5 mr-1 text-indigo-600" />
              Bullets
            </button>

            <button
              type="button"
              id="btn-points-numbered"
              onClick={() => applyPoints('number')}
              title="Numbered Points (1. 2. 3.)"
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white hover:bg-slate-200 text-slate-800 border border-slate-200 flex items-center shadow-2xs transition-colors"
            >
              <ListOrdered className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              Numbers
            </button>

            {/* Points dropdown for Dash, Checkbox, Q1 prefix, Strip */}
            <div className="relative">
              <button
                type="button"
                id="btn-points-dropdown"
                onClick={() => setShowPointsMenu(!showPointsMenu)}
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center transition-colors"
                title="More Points Styles & Strip"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {showPointsMenu && (
                <div className="absolute top-full left-0 mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 animate-in fade-in">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Apply Points Style
                  </div>
                  <button
                    type="button"
                    onClick={() => applyPoints('dash')}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center"
                  >
                    <span className="font-bold mr-2 text-slate-500">-</span> Dash List (- Question)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPoints('q_prefix')}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center"
                  >
                    <span className="font-bold font-mono mr-2 text-indigo-600">Q#:</span> Q1: Q2: Q3:
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPoints('letter')}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center"
                  >
                    <span className="font-bold font-mono mr-2 text-emerald-600">A.</span> A. B. C. Points
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPoints('checkbox')}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center"
                  >
                    <CheckSquare className="w-3.5 h-3.5 mr-2 text-slate-500" /> [ ] Task / Checkbox
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    type="button"
                    onClick={handleStripPoints}
                    className="w-full text-left px-3 py-2 text-xs text-rose-700 hover:bg-rose-50 flex items-center font-medium"
                  >
                    <Eraser className="w-3.5 h-3.5 mr-2 text-rose-500" /> Strip All Points & Numbers
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Clean & Format Menu */}
          <div className="relative">
            <button
              type="button"
              id="btn-format-menu"
              onClick={() => setShowFormatMenu(!showFormatMenu)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white hover:bg-slate-200 text-slate-800 border border-slate-200 flex items-center shadow-2xs transition-colors"
              title="Clean formatting, spacing, and capitalization"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-500" />
              Clean & Format
              <ChevronDown className="w-3 h-3 ml-1 text-slate-400" />
            </button>

            {showFormatMenu && (
              <div className="absolute top-full left-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 animate-in fade-in">
                <button
                  type="button"
                  onClick={handleCapitalizeQuestions}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center"
                >
                  <Type className="w-3.5 h-3.5 mr-2 text-indigo-500" /> Capitalize First Letter of Qs
                </button>
                <button
                  type="button"
                  onClick={handleTrimBlankLines}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center"
                >
                  <List className="w-3.5 h-3.5 mr-2 text-emerald-500" /> Remove Extra Empty Lines
                </button>
                <button
                  type="button"
                  onClick={handleClearFormatting}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center"
                >
                  <Eraser className="w-3.5 h-3.5 mr-2 text-amber-500" /> Remove Markdown Bold/Code
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Toolbar Cluster: Font Size, Editor/Preview toggle, Copy */}
        <div className="flex items-center space-x-2">
          {/* Font Size Selector */}
          <div className="flex items-center bg-white rounded-lg border border-slate-200 p-0.5">
            <button
              type="button"
              onClick={() => setFontSize('sm')}
              title="Small text size"
              className={`px-2 py-0.5 text-xs font-semibold rounded ${
                fontSize === 'sm' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              A-
            </button>
            <button
              type="button"
              onClick={() => setFontSize('base')}
              title="Normal text size"
              className={`px-2 py-0.5 text-xs font-semibold rounded ${
                fontSize === 'base' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              A
            </button>
            <button
              type="button"
              onClick={() => setFontSize('lg')}
              title="Large text size"
              className={`px-2 py-0.5 text-xs font-semibold rounded ${
                fontSize === 'lg' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              A+
            </button>
          </div>

          {/* Copy Button */}
          <button
            type="button"
            id="btn-editor-copy"
            onClick={handleCopy}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center transition-colors"
            title="Copy editor content"
          >
            {copied ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1 text-slate-500" />}
            {copied ? 'Copied' : 'Copy'}
          </button>

          {/* Edit / Preview Tabs */}
          <div className="flex items-center bg-slate-200 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center transition-colors ${
                activeTab === 'editor'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5 mr-1" />
              Editor
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center transition-colors ${
                activeTab === 'preview'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5 mr-1" />
              Preview
            </button>
          </div>
        </div>
      </div>

      {/* 2. Text Input Area / Live Preview */}
      {activeTab === 'editor' ? (
        <div className="relative">
          <textarea
            ref={textareaRef}
            id={id}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
            }}
            placeholder={placeholder}
            rows={rows}
            className={`w-full font-sans ${fontSizeClass} ${alignmentClass} p-4 outline-none leading-relaxed text-slate-900 resize-y bg-white border-0 transition-all placeholder:text-slate-400`}
            style={{ minHeight: '260px' }}
          />
        </div>
      ) : (
        /* Live Rendered Markdown & Points Preview */
        <div
          className={`w-full font-sans ${fontSizeClass} ${alignmentClass} p-5 min-h-[260px] max-h-[460px] overflow-y-auto bg-slate-50/60 leading-relaxed text-slate-800 divide-y divide-slate-200/60`}
        >
          {value.trim() ? (
            value.split('\n').map((line, idx) => {
              const trimmed = line.trim();
              if (!trimmed) {
                return <div key={idx} className="h-3" />;
              }

              const isBullet = /^[•\-\*+]\s+/.test(trimmed);
              const isNumbered = /^\d+[\.\)]\s+/.test(trimmed);
              const isCheckbox = /^\[[ xX]?\]\s+/.test(trimmed);

              return (
                <div key={idx} className="py-1.5 flex items-start space-x-2">
                  {isBullet && <span className="text-indigo-600 font-bold">•</span>}
                  {isNumbered && (
                    <span className="font-mono font-bold text-emerald-700 text-xs px-1.5 py-0.5 bg-emerald-50 rounded">
                      {trimmed.match(/^\d+[\.\)]/)?.[0]}
                    </span>
                  )}
                  {isCheckbox && (
                    <input
                      type="checkbox"
                      readOnly
                      checked={trimmed.includes('[x]') || trimmed.includes('[X]')}
                      className="mt-1 rounded text-indigo-600"
                    />
                  )}
                  <span className="flex-1 font-medium text-slate-900">
                    {trimmed.replace(/^([•\-\*+]|\d+[\.\)]|\[[ xX]?\])\s*/, '')}
                  </span>
                </div>
              );
            })
          ) : (
            <p className="text-slate-400 italic">Preview is empty. Type or paste questions in the Editor tab.</p>
          )}
        </div>
      )}

      {/* 3. Editor Status Bar */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between text-xs text-slate-500">
        <div className="flex items-center space-x-3">
          <span>
            Alignment: <strong className="text-slate-700 capitalize">{alignment}</strong>
          </span>
          <span>•</span>
          <span>
            Lines: <strong className="text-slate-700">{value ? value.split('\n').length : 0}</strong>
          </span>
          <span>•</span>
          <span>
            Characters: <strong className="text-slate-700">{value.length}</strong>
          </span>
          {detectedCount !== undefined && (
            <>
              <span>•</span>
              <span className="text-indigo-600 font-semibold">
                Detected Questions: <strong>{detectedCount}</strong>
              </span>
            </>
          )}
        </div>

        <div className="flex items-center space-x-2 text-[11px] text-slate-400">
          <span>Keyboard shortcuts: Select text & click Bullets / Numbers / Bold / Alignment</span>
        </div>
      </div>
    </div>
  );
};

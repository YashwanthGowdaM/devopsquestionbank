import React, { useState, useMemo } from 'react';
import { X, GitMerge, Split, Check } from 'lucide-react';
import { QuestionRecord, PRIMARY_TOPICS, DIFFICULTIES } from '../types';
import { CustomEnumSelect } from './CustomEnumSelect';

interface MergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedQuestions: QuestionRecord[];
  onMergeComplete: (mergedQuestion: QuestionRecord, originalIds: string[]) => void;
}

export const MergeModal: React.FC<MergeModalProps> = ({
  isOpen,
  onClose,
  selectedQuestions,
  onMergeComplete,
}) => {
  if (!isOpen || selectedQuestions.length < 2) return null;

  const initialMergedText = selectedQuestions.map((q) => q.question).join(' / ');
  const [mergedText, setMergedText] = useState(initialMergedText);
  const [primaryTopic, setPrimaryTopic] = useState(selectedQuestions[0].primary_topic);
  const [difficulty, setDifficulty] = useState(selectedQuestions[0].difficulty);

  const topicOptions = useMemo(() => {
    const list = primaryTopic && !PRIMARY_TOPICS.includes(primaryTopic)
      ? [...PRIMARY_TOPICS, primaryTopic]
      : [...PRIMARY_TOPICS];
    return Array.from(new Set(list)).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    );
  }, [primaryTopic]);

  const handleMerge = () => {
    const combinedTags = Array.from(
      new Set(selectedQuestions.flatMap((q) => q.tags || []))
    );
    const combinedCross = Array.from(
      new Set(selectedQuestions.flatMap((q) => q.cross_topics || []))
    );

    const mergedRecord: QuestionRecord = {
      ...selectedQuestions[0],
      id: `merged_${Date.now()}`,
      question: mergedText.trim(),
      primary_topic: primaryTopic,
      cross_topics: combinedCross,
      difficulty: difficulty,
      tags: combinedTags,
      explanation: `Consolidated composite question: ${selectedQuestions[0].explanation}`,
      duplicate_group: undefined,
      duplicate_type: 'None',
      status: 'Pending Review',
      updated_at: new Date().toISOString(),
    };

    onMergeComplete(
      mergedRecord,
      selectedQuestions.map((q) => q.id)
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <GitMerge className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">
              Merge {selectedQuestions.length} Questions
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-500">
          Consolidate multiple duplicate or multi-part questions into a single cohesive question. Tags and cross-topics will be merged.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Consolidated Question Text
            </label>
            <textarea
              value={mergedText}
              onChange={(e) => setMergedText(e.target.value)}
              rows={4}
              className="w-full text-base p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Primary Topic
              </label>
              <CustomEnumSelect
                value={primaryTopic}
                options={topicOptions}
                onChange={setPrimaryTopic}
                placeholder="Custom Topic..."
                size="base"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Difficulty
              </label>
              <CustomEnumSelect
                value={difficulty}
                options={DIFFICULTIES}
                onChange={setDifficulty}
                placeholder="Custom Difficulty..."
                size="base"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold rounded-xl text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={handleMerge}
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs flex items-center"
          >
            <Check className="w-4 h-4 mr-1.5" />
            Confirm Merge
          </button>
        </div>
      </div>
    </div>
  );
};

interface SplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionToSplit: QuestionRecord | null;
  onSplitComplete: (originalId: string, splitQuestions: QuestionRecord[]) => void;
}

export const SplitModal: React.FC<SplitModalProps> = ({
  isOpen,
  onClose,
  questionToSplit,
  onSplitComplete,
}) => {
  if (!isOpen || !questionToSplit) return null;

  const [part1, setPart1] = useState(questionToSplit.question);
  const [part2, setPart2] = useState('');

  const handleSplit = () => {
    if (!part1.trim() || !part2.trim()) return;

    const q1: QuestionRecord = {
      ...questionToSplit,
      id: `split_${Date.now()}_1`,
      question: part1.trim(),
      updated_at: new Date().toISOString(),
    };

    const q2: QuestionRecord = {
      ...questionToSplit,
      id: `split_${Date.now()}_2`,
      question: part2.trim(),
      updated_at: new Date().toISOString(),
    };

    onSplitComplete(questionToSplit.id, [q1, q2]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Split className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Split Compound Question</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-500">
          Separate a multi-clause question into two discrete, targeted interview questions.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Part 1 (First Question)
            </label>
            <textarea
              value={part1}
              onChange={(e) => setPart1(e.target.value)}
              rows={3}
              className="w-full text-base p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Part 2 (Second Question)
            </label>
            <textarea
              value={part2}
              onChange={(e) => setPart2(e.target.value)}
              rows={3}
              placeholder="e.g., How do you troubleshoot volume plugin attachment failures in Kubernetes?"
              className="w-full text-base p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold rounded-xl text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSplit}
            disabled={!part1.trim() || !part2.trim()}
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-300 shadow-xs flex items-center"
          >
            <Check className="w-4 h-4 mr-1.5" />
            Apply Split
          </button>
        </div>
      </div>
    </div>
  );
};

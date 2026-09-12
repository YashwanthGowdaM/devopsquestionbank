import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import {
  QuestionRecord,
  PRIMARY_TOPICS,
  DIFFICULTIES,
  QUESTION_TYPES,
  EXPERIENCE_LEVELS,
  INTERVIEW_ROUNDS,
} from '../types';

interface EditQuestionModalProps {
  isOpen: boolean;
  question: QuestionRecord | null;
  onClose: () => void;
  onSave: (updated: QuestionRecord) => Promise<boolean | void> | void;
  isSaving?: boolean;
}

export const EditQuestionModal: React.FC<EditQuestionModalProps> = ({
  isOpen,
  question,
  onClose,
  onSave,
  isSaving = false,
}) => {
  const [formData, setFormData] = useState<QuestionRecord | null>(null);
  const [tagsInput, setTagsInput] = useState('');
  const [crossTopicsInput, setCrossTopicsInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const topicOptions = React.useMemo(() => {
    const list = formData?.primary_topic && !PRIMARY_TOPICS.includes(formData.primary_topic)
      ? [...PRIMARY_TOPICS, formData.primary_topic]
      : [...PRIMARY_TOPICS];
    return Array.from(new Set(list)).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    );
  }, [formData?.primary_topic]);

  useEffect(() => {
    if (question) {
      setFormData({ ...question });
      setTagsInput(question.tags ? question.tags.join(', ') : '');
      setCrossTopicsInput(question.cross_topics ? question.cross_topics.join(', ') : '');
      setError(null);
    } else {
      setFormData(null);
    }
  }, [question, isOpen]);

  if (!isOpen || !formData) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.question.trim()) {
      setError('Question text cannot be empty.');
      return;
    }

    const cleanedTags = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase().replace(/^#/, ''))
      .filter(Boolean);

    const cleanedCrossTopics = crossTopicsInput
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    const updatedQuestion: QuestionRecord = {
      ...formData,
      question: formData.question.trim(),
      tags: cleanedTags,
      cross_topics: cleanedCrossTopics,
    };

    await onSave(updatedQuestion);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Edit Question</h2>
            <p className="text-xs text-slate-500">
              Update question attributes and synchronize changes with the database.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-xs text-rose-700 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Question Text */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Question Text <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors leading-relaxed"
              placeholder="Enter interview question text..."
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Primary Topic */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Primary Topic
              </label>
              <select
                value={formData.primary_topic}
                onChange={(e) => setFormData({ ...formData, primary_topic: e.target.value })}
                className="w-full px-3 py-2 text-sm text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium"
              >
                {topicOptions.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Difficulty
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="w-full px-3 py-2 text-sm text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium"
              >
                {DIFFICULTIES.map((diff) => (
                  <option key={diff} value={diff}>
                    {diff}
                  </option>
                ))}
              </select>
            </div>

            {/* Question Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Question Type
              </label>
              <select
                value={formData.question_type}
                onChange={(e) => setFormData({ ...formData, question_type: e.target.value })}
                className="w-full px-3 py-2 text-sm text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium"
              >
                {QUESTION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Experience Level */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Experience Level
              </label>
              <select
                value={formData.experience_level}
                onChange={(e) => setFormData({ ...formData, experience_level: e.target.value })}
                className="w-full px-3 py-2 text-sm text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium"
              >
                {EXPERIENCE_LEVELS.map((exp) => (
                  <option key={exp} value={exp}>
                    {exp}
                  </option>
                ))}
              </select>
            </div>

            {/* Interview Round */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Interview Round
              </label>
              <select
                value={formData.interview_round}
                onChange={(e) => setFormData({ ...formData, interview_round: e.target.value })}
                className="w-full px-3 py-2 text-sm text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium"
              >
                {INTERVIEW_ROUNDS.map((round) => (
                  <option key={round} value={round}>
                    {round}
                  </option>
                ))}
              </select>
            </div>

            {/* Confidence Score */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Confidence Score ({formData.confidence_score}%)
              </label>
              <input
                type="range"
                min="50"
                max="100"
                value={formData.confidence_score}
                onChange={(e) => setFormData({ ...formData, confidence_score: Number(e.target.value) })}
                className="w-full accent-indigo-600 mt-2"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full px-3.5 py-2 text-sm text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="kubernetes, troubleshooting, ingress"
            />
          </div>

          {/* Cross Topics */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Cross Topics (optional)
            </label>
            <input
              type="text"
              value={crossTopicsInput}
              onChange={(e) => setCrossTopicsInput(e.target.value)}
              className="w-full px-3.5 py-2 text-sm text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="AWS, Networking, Docker"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4 mr-1.5" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

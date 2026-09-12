import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Edit3,
  Check,
  Tag,
  BookOpen,
  Award,
  Layers,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';
import {
  QuestionRecord,
  PRIMARY_TOPICS,
  DIFFICULTIES,
  QUESTION_TYPES,
  EXPERIENCE_LEVELS,
  INTERVIEW_ROUNDS,
} from '../types';
import { CustomEnumSelect } from './CustomEnumSelect';

interface QuestionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: QuestionRecord | null;
  onSave: (updated: QuestionRecord) => void;
}

export const QuestionDetailModal: React.FC<QuestionDetailModalProps> = ({
  isOpen,
  onClose,
  question,
  onSave,
}) => {
  if (!isOpen || !question) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<QuestionRecord>({ ...question });
  const [newTag, setNewTag] = useState('');

  // Keep synced if question prop changes
  useEffect(() => {
    setFormData({ ...question });
    setIsEditing(false);
  }, [question]);

  const topicOptions = useMemo(() => {
    const list = formData?.primary_topic && !PRIMARY_TOPICS.includes(formData.primary_topic)
      ? [...PRIMARY_TOPICS, formData.primary_topic]
      : [...PRIMARY_TOPICS];
    return Array.from(new Set(list)).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    );
  }, [formData?.primary_topic]);

  const handleSave = () => {
    onSave({
      ...formData,
      updated_at: new Date().toISOString(),
    });
    setIsEditing(false);
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()],
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tagToRemove),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">
                {isEditing ? 'Edit Question' : 'Question Details'}
              </h3>
              <p className="text-xs text-slate-500">
                20+ Year Panelist Classification & Heuristics
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!isEditing ? (
              <button
                id="btn-edit-question-modal"
                onClick={() => setIsEditing(true)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center shadow-xs"
              >
                <Edit3 className="w-3.5 h-3.5 mr-1 text-slate-500" />
                Edit
              </button>
            ) : (
              <button
                id="btn-save-question-modal"
                onClick={handleSave}
                className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center shadow-xs"
              >
                <Check className="w-3.5 h-3.5 mr-1" />
                Save
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Question Text */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Question Text
            </label>
            {isEditing ? (
              <textarea
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                rows={3}
                className="w-full p-3 border border-slate-300 rounded-xl font-medium text-slate-900 text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            ) : (
              <div className="text-slate-900 font-semibold text-lg leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                {formData.question}
              </div>
            )}
          </div>

          {/* Primary Topic & Cross Topics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Primary Topic (Dominant)
              </label>
              {isEditing ? (
                <CustomEnumSelect
                  value={formData.primary_topic}
                  options={topicOptions}
                  onChange={(val) => setFormData({ ...formData, primary_topic: val })}
                  placeholder="Custom Primary Topic..."
                  size="base"
                />
              ) : (
                <span className="inline-flex items-center px-3.5 py-1.5 rounded-lg font-bold text-sm bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {formData.primary_topic}
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Cross Topics (Secondary)
              </label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {formData.cross_topics.length > 0 ? (
                  formData.cross_topics.map((ct) => (
                    <span
                      key={ct}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      {ct}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">None</span>
                )}
              </div>
            </div>
          </div>

          {/* Difficulty, Type, Experience & Round */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <div>
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Difficulty</span>
              {isEditing ? (
                <CustomEnumSelect
                  value={formData.difficulty}
                  options={DIFFICULTIES}
                  onChange={(val) => setFormData({ ...formData, difficulty: val })}
                  placeholder="Custom Difficulty..."
                  size="xs"
                />
              ) : (
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">{formData.difficulty}</span>
              )}
            </div>

            <div>
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Question Type</span>
              {isEditing ? (
                <CustomEnumSelect
                  value={formData.question_type}
                  options={QUESTION_TYPES}
                  onChange={(val) => setFormData({ ...formData, question_type: val })}
                  placeholder="Custom Type..."
                  size="xs"
                />
              ) : (
                <span className="font-medium text-slate-800 text-sm mt-0.5 block">{formData.question_type}</span>
              )}
            </div>

            <div>
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Experience Level</span>
              {isEditing ? (
                <CustomEnumSelect
                  value={formData.experience_level}
                  options={EXPERIENCE_LEVELS}
                  onChange={(val) => setFormData({ ...formData, experience_level: val })}
                  placeholder="Custom Level..."
                  size="xs"
                />
              ) : (
                <span className="font-medium text-slate-800 text-sm mt-0.5 block">{formData.experience_level}</span>
              )}
            </div>

            <div>
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Target Round</span>
              {isEditing ? (
                <CustomEnumSelect
                  value={formData.interview_round}
                  options={INTERVIEW_ROUNDS}
                  onChange={(val) => setFormData({ ...formData, interview_round: val })}
                  placeholder="Custom Round..."
                  size="xs"
                />
              ) : (
                <span className="font-medium text-slate-800 text-sm mt-0.5 block">{formData.interview_round}</span>
              )}
            </div>
          </div>

          {/* Explanation (Interviewer rationale) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Interviewer Perspective & Core Concept
              </label>
              <span className="text-xs text-slate-400">
                {formData.explanation.split(/\s+/).filter(Boolean).length} / 50 words
              </span>
            </div>
            {isEditing ? (
              <textarea
                value={formData.explanation}
                onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                rows={3}
                className="w-full p-3 border border-slate-300 rounded-xl text-sm text-slate-900"
              />
            ) : (
              <p className="text-slate-700 text-sm leading-relaxed bg-amber-50/60 p-4 rounded-xl border border-amber-200/80 italic">
                "{formData.explanation}"
              </p>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
              <Tag className="w-3.5 h-3.5 mr-1" />
              Tags
            </label>
            <div className="flex flex-wrap gap-1.5 items-center">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200"
                >
                  #{tag}
                  {isEditing && (
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1.5 text-slate-400 hover:text-rose-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </span>
              ))}
              {isEditing && (
                <div className="inline-flex items-center space-x-1.5">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                    placeholder="Add tag..."
                    className="p-1.5 text-xs border border-slate-300 rounded-lg w-28"
                  />
                  <button
                    onClick={handleAddTag}
                    className="px-2.5 py-1.5 text-xs bg-slate-900 text-white rounded-lg font-semibold"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Confidence & Duplicate Info */}
          <div className="border-t border-slate-100 pt-4 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
            <div>
              <span className="font-semibold text-slate-600">Keywords: </span>
              {(formData.search_keywords || []).slice(0, 8).join(', ')}
            </div>
            <div className="flex items-center space-x-3">
              <span>
                Confidence:{' '}
                <strong
                  className={formData.confidence_score < 75 ? 'text-amber-600' : 'text-emerald-600'}
                >
                  {formData.confidence_score}%
                </strong>
              </span>
              {formData.duplicate_group && (
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-mono text-xs font-semibold">
                  Duplicate Group: {formData.duplicate_group}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

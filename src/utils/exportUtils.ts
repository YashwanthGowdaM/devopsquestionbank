import * as XLSX from 'xlsx';
import { QuestionRecord } from '../types';

export function exportToExcel(questions: QuestionRecord[], filename = 'interview_question_bank.xlsx') {
  // Required Excel Columns from prompt:
  // Sl No, Question, Primary Topic, Cross Topics, Difficulty, Question Type, Experience Level, Interview Round, Tags, Confidence
  const data = questions.map((q, idx) => ({
    'Sl No': q.sl_no || idx + 1,
    Question: q.question,
    'Primary Topic': q.primary_topic,
    'Cross Topics': (q.cross_topics || []).join(', '),
    Difficulty: q.difficulty,
    'Question Type': q.question_type,
    'Experience Level': q.experience_level,
    'Interview Round': q.interview_round,
    Tags: (q.tags || []).join(', '),
    Confidence: `${q.confidence_score}%`,
    'Duplicate Group': q.duplicate_group || 'None',
    Status: q.status,
    Explanation: q.explanation,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Set column widths for readability
  worksheet['!cols'] = [
    { wch: 8 },  // Sl No
    { wch: 60 }, // Question
    { wch: 18 }, // Primary Topic
    { wch: 25 }, // Cross Topics
    { wch: 14 }, // Difficulty
    { wch: 20 }, // Question Type
    { wch: 16 }, // Experience Level
    { wch: 18 }, // Interview Round
    { wch: 30 }, // Tags
    { wch: 12 }, // Confidence
    { wch: 16 }, // Duplicate Group
    { wch: 14 }, // Status
    { wch: 45 }, // Explanation
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');
  XLSX.writeFile(workbook, filename);
}

export function exportToCSV(questions: QuestionRecord[], filename = 'interview_question_bank.csv') {
  const data = questions.map((q, idx) => ({
    'Sl No': q.sl_no || idx + 1,
    Question: q.question,
    'Primary Topic': q.primary_topic,
    'Cross Topics': (q.cross_topics || []).join('; '),
    Difficulty: q.difficulty,
    'Question Type': q.question_type,
    'Experience Level': q.experience_level,
    'Interview Round': q.interview_round,
    Tags: (q.tags || []).join('; '),
    Confidence: q.confidence_score,
    Status: q.status,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToJSON(questions: QuestionRecord[], filename = 'supabase_questions.json') {
  // Supabase table columns schema:
  // id, question, primary_topic, cross_topics, difficulty, question_type, experience_level, interview_round, tags, search_keywords, confidence_score, duplicate_group, status, created_at, updated_at
  const supabaseFormat = questions.map((q) => ({
    id: q.id,
    question: q.question,
    primary_topic: q.primary_topic,
    cross_topics: q.cross_topics || [],
    difficulty: q.difficulty,
    question_type: q.question_type,
    experience_level: q.experience_level,
    interview_round: q.interview_round,
    tags: q.tags || [],
    search_keywords: q.search_keywords || [],
    confidence_score: q.confidence_score,
    duplicate_group: q.duplicate_group || null,
    status: q.status,
    created_at: q.created_at || new Date().toISOString(),
    updated_at: q.updated_at || new Date().toISOString(),
  }));

  const blob = new Blob([JSON.stringify(supabaseFormat, null, 2)], {
    type: 'application/json',
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

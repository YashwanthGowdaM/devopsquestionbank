export type PrimaryTopic =
  | 'Ansible'
  | 'Architecture'
  | 'Automation'
  | 'AWS'
  | 'Azure'
  | 'CI/CD'
  | 'CloudWatch'
  | 'Containerd'
  | 'Database'
  | 'DevSecOps'
  | 'DNS'
  | 'Docker'
  | 'GCP'
  | 'Git'
  | 'GitHub'
  | 'Grafana'
  | 'Helm'
  | 'IAM'
  | 'Jenkins'
  | 'Kubernetes'
  | 'Linux'
  | 'Monitoring'
  | 'Networking'
  | 'Observability'
  | 'OCI'
  | 'OpenShift'
  | 'Others'
  | 'Platform Engineering'
  | 'Podman'
  | 'Prometheus'
  | 'Python'
  | 'Security'
  | 'Shell Scripting'
  | 'SRE'
  | 'Storage'
  | 'Terraform'
  | (string & {});

export const PRIMARY_TOPICS: string[] = [
  'Ansible',
  'Architecture',
  'Automation',
  'AWS',
  'Azure',
  'CI/CD',
  'CloudWatch',
  'Containerd',
  'Database',
  'DevSecOps',
  'DNS',
  'Docker',
  'GCP',
  'Git',
  'GitHub',
  'Grafana',
  'Helm',
  'IAM',
  'Jenkins',
  'Kubernetes',
  'Linux',
  'Monitoring',
  'Networking',
  'Observability',
  'OCI',
  'OpenShift',
  'Others',
  'Platform Engineering',
  'Podman',
  'Prometheus',
  'Python',
  'Security',
  'Shell Scripting',
  'SRE',
  'Storage',
  'Terraform',
];

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' | (string & {});
export const DIFFICULTIES: string[] = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

export type QuestionType =
  | 'Theory'
  | 'Scenario'
  | 'Troubleshooting'
  | 'Coding'
  | 'Architecture'
  | 'Real-time Experience'
  | 'Production Incident'
  | 'Hands-on'
  | (string & {});

export const QUESTION_TYPES: string[] = [
  'Theory',
  'Scenario',
  'Troubleshooting',
  'Coding',
  'Architecture',
  'Real-time Experience',
  'Production Incident',
  'Hands-on',
];

export type ExperienceLevel =
  | '0-2 Years'
  | '2-4 Years'
  | '4-6 Years'
  | '6-8 Years'
  | '8-12 Years'
  | '12+ Years'
  | (string & {});

export const EXPERIENCE_LEVELS: string[] = [
  '0-2 Years',
  '2-4 Years',
  '4-6 Years',
  '6-8 Years',
  '8-12 Years',
  '12+ Years',
];

export type InterviewRound =
  | 'HR'
  | 'L1'
  | 'L2'
  | 'L3'
  | 'Manager'
  | 'Architect'
  | 'Principal Engineer'
  | (string & {});

export const INTERVIEW_ROUNDS: string[] = [
  'HR',
  'L1',
  'L2',
  'L3',
  'Manager',
  'Architect',
  'Principal Engineer',
];

export type DuplicateType = 'None' | 'Exact' | 'Near' | 'Rephrased';

export type QuestionStatus = 'Pending Review' | 'Approved' | 'Flagged' | 'Rejected';

export interface QuestionRecord {
  id: string;
  sl_no?: number;
  question: string;
  primary_topic: PrimaryTopic;
  cross_topics: string[];
  difficulty: Difficulty;
  question_type: QuestionType;
  experience_level: ExperienceLevel;
  interview_round: InterviewRound;
  tags: string[];
  search_keywords: string[];
  confidence_score: number; // 0-100 (<75 highlight row in light yellow)
  duplicate_type?: DuplicateType;
  duplicate_group?: string; // e.g. DUP-01 or null
  explanation: string; // max 50 words
  status: QuestionStatus;
  created_at: string;
  updated_at: string;
}

export interface ValidationReportItem {
  type: 'error' | 'warning' | 'info';
  questionId: string;
  field: string;
  message: string;
}

export interface AnalysisSummary {
  questionsProcessed: number;
  duplicatesFound: number;
  topicsCount: number;
  expertQuestions: number;
  reviewRequired: number; // confidence < 75 or duplicates
  averageConfidence: number;
}

export interface SupabaseStatus {
  configured: boolean;
  connected: boolean;
  tableExists: boolean;
  isMissingTable?: boolean;
  tableName?: string;
  url?: string;
  projectRef?: string;
  sqlEditorUrl?: string;
  existingCount?: number;
  error?: string;
  errorCode?: string;
  ddlSql?: string;
}

export function formatErrorMessage(err: unknown): string {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (typeof err === 'object') {
    const record = err as Record<string, any>;
    if (typeof record.message === 'string' && record.message.trim()) return record.message;
    if (typeof record.error === 'string' && record.error.trim()) return record.error;
    if (typeof record.details === 'string' && record.details.trim()) return record.details;
    if (typeof record.hint === 'string' && record.hint.trim()) return record.hint;
    try {
      const json = JSON.stringify(err);
      if (json && json !== '{}') return json;
    } catch {
      // ignore
    }
  }
  return String(err);
}

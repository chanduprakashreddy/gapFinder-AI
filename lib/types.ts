import type { PlanItem, TopicGap } from './gap';

export type Subject = { id: string; name: string; exam_date: string | null; daily_minutes: number };
export type TopicRow = { id: string; name: string; description: string | null; weight: number; paperFreq: number; chunkCount: number };
export type ReviseSource = { title: string; heading: string; page: number | null; count: number };
export type HistoryPoint = {
  quizId: string; at: string; answered: number; correct: number; accuracy: number;
  overall: number | null; topics: Record<string, number | null>;
};
export type Diagnosis = {
  subject: Subject;
  topics: TopicRow[];
  gaps: TopicGap[];
  plan: { items: PlanItem[]; maintenance: PlanItem[]; daysLeft: number | null; totalMinutes: number | null };
  overall: { mastery: number | null; coverage: number };
  history: HistoryPoint[];
  revise: Record<string, ReviseSource[]>;
  totals: { attempts: number };
};
export type QuizQuestion = {
  id: string; topicId: string; topicName: string; question: string; options: string[]; difficulty: number;
  citation: { title: string; heading: string; page: number | null };
};

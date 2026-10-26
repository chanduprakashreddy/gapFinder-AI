import type { SupabaseClient } from '@supabase/supabase-js';
import { embedQuery } from './ai';

export type Passage = {
  id: string; document_id: string; topic_id: string | null;
  heading: string; content: string; page: number | null; similarity: number;
};

/** RETRIEVAL. The only place facts come from. Returns the student's own passages with similarity scores. */
export async function retrieve(
  sb: SupabaseClient,
  o: { query: string; subjectId: string; topicId?: string | null; k?: number },
): Promise<Passage[]> {
  const query_embedding = await embedQuery(o.query);
  const { data, error } = await sb.rpc('match_chunks', {
    query_embedding, p_subject: o.subjectId, match_count: o.k ?? 6, p_topic: o.topicId ?? null,
  });
  if (error) throw new Error(`Retrieval failed: ${error.message}`);
  return (data ?? []) as Passage[];
}

export async function documentTitles(sb: SupabaseClient, ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids)];
  if (!unique.length) return new Map();
  const { data } = await sb.from('documents').select('id,title').in('id', unique);
  return new Map((data ?? []).map((d: { id: string; title: string }) => [d.id, d.title]));
}

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
  let data: Passage[] | null = null;
  let error: { message: string } | null = null;

  try {
    const query_embedding = await embedQuery(o.query);
    const res = await sb.rpc('match_chunks', {
      query_embedding, p_subject: o.subjectId, match_count: o.k ?? 6, p_topic: o.topicId ?? null,
    });
    data = res.data;
    error = res.error;

    // If topic-specific retrieval returned nothing, fall back to searching all passages for this subject
    if ((!data || data.length === 0) && o.topicId) {
      const fallback = await sb.rpc('match_chunks', {
        query_embedding, p_subject: o.subjectId, match_count: o.k ?? 6, p_topic: null,
      });
      if (fallback.data && fallback.data.length > 0) {
        data = fallback.data;
        error = fallback.error;
      }
    }
  } catch (e) {
    console.warn('Vector retrieval failed, falling back to text-based retrieval:', e);
    // Fallback: use text-based retrieval if vector search fails
    return textBasedRetrieve(sb, o);
  }

  if (error) {
    console.warn(`Vector retrieval error: ${error.message}, falling back to text-based`);
    return textBasedRetrieve(sb, o);
  }

  // If vector search returned results but all have very low similarity (embedding mismatch),
  // supplement with text-based retrieval
  const results = (data ?? []) as Passage[];
  if (results.length > 0 && results.every(r => r.similarity < 0.1)) {
    console.log('All vector results have very low similarity, supplementing with text-based retrieval');
    const textResults = await textBasedRetrieve(sb, o);
    if (textResults.length > 0) return textResults;
  }

  return results;
}

/**
 * Text-based retrieval fallback when vector search is unavailable or returns poor results.
 * Uses Supabase's text search/filtering to find relevant chunks by topic or keyword matching.
 */
async function textBasedRetrieve(
  sb: SupabaseClient,
  o: { query: string; subjectId: string; topicId?: string | null; k?: number },
): Promise<Passage[]> {
  const k = o.k ?? 6;

  // Strategy 1: Get chunks by topic_id if specified
  if (o.topicId) {
    const { data } = await sb
      .from('chunks')
      .select('id, document_id, topic_id, heading, content, page')
      .eq('subject_id', o.subjectId)
      .eq('topic_id', o.topicId)
      .in('kind', ['notes', 'textbook'])
      .limit(k);

    if (data && data.length > 0) {
      return data.map((r: any) => ({ ...r, similarity: 0.5 })) as Passage[];
    }
  }

  // Strategy 2: Get chunks matching keywords from the query
  const queryWords = o.query.toLowerCase().match(/[a-z]{4,}/g) ?? [];
  const searchTerms = queryWords.slice(0, 3);

  if (searchTerms.length > 0) {
    // Try to find chunks that contain any of the key terms
    for (const term of searchTerms) {
      const { data } = await sb
        .from('chunks')
        .select('id, document_id, topic_id, heading, content, page')
        .eq('subject_id', o.subjectId)
        .in('kind', ['notes', 'textbook'])
        .ilike('content', `%${term}%`)
        .limit(k);

      if (data && data.length > 0) {
        return data.map((r: any) => ({ ...r, similarity: 0.4 })) as Passage[];
      }
    }
  }

  // Strategy 3: Just get any chunks for this subject
  const { data } = await sb
    .from('chunks')
    .select('id, document_id, topic_id, heading, content, page')
    .eq('subject_id', o.subjectId)
    .in('kind', ['notes', 'textbook'])
    .limit(k);

  return (data ?? []).map((r: any) => ({ ...r, similarity: 0.3 })) as Passage[];
}

export async function documentTitles(sb: SupabaseClient, ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids)];
  if (!unique.length) return new Map();
  const { data } = await sb.from('documents').select('id,title').in('id', unique);
  return new Map((data ?? []).map((d: { id: string; title: string }) => [d.id, d.title]));
}

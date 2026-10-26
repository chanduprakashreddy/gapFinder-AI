import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { fetchSupabase } from './supabase-fetch';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Builds a Supabase client from the caller's JWT, so row-level security applies to every query. */
export async function authed(req: Request): Promise<{ sb: SupabaseClient; user: User }> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'Sign in required.');
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` }, fetch: fetchSupabase },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'Your session expired. Sign in again.');
  return { sb, user: data.user };
}

export function fail(e: unknown) {
  if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
  const apiStatus = typeof e === 'object' && e !== null && 'statusCode' in e && typeof e.statusCode === 'number'
    ? e.statusCode
    : null;
  const message = e instanceof Error ? e.message : 'Unexpected error';

  // Check for common AI provider errors and give actionable messages
  if (apiStatus === 401 || /user not found/i.test(message) || /api key/i.test(message) || /invalid.*key/i.test(message) || /authentication/i.test(message)) {
    return Response.json({ error: 'The AI provider key was rejected. The app will use built-in fallbacks. For full AI features, update GEMINI_API_KEY in .env.local with a valid key from https://aistudio.google.com/app/apikey' }, { status: 502 });
  }
  if (apiStatus === 429 || /rate limit|quota exceeded/i.test(message)) {
    return Response.json({ error: 'AI provider rate limit reached. Wait about a minute and try again.' }, { status: 429 });
  }
  if (/fetch failed|ECONNREFUSED|ETIMEDOUT|network/i.test(message)) {
    return Response.json({ error: 'Could not reach the AI provider. Check your internet connection.' }, { status: 503 });
  }
  console.error(e);
  return Response.json({ error: message }, { status: 500 });
}

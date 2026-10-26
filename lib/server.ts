import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Builds a Supabase client from the caller's JWT, so row-level security applies to every query. */
export async function authed(req: Request): Promise<{ sb: SupabaseClient; user: User }> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'Sign in required.');
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'Your session expired. Sign in again.');
  return { sb, user: data.user };
}

export function fail(e: unknown) {
  if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
  console.error(e);
  return Response.json({ error: e instanceof Error ? e.message : 'Unexpected error' }, { status: 500 });
}

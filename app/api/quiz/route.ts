import { authed, fail, HttpError } from '@/lib/server';
import { createQuiz } from '@/lib/quiz';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { sb, user } = await authed(req);
    const body = await req.json().catch(() => ({}));
    if (!body.subjectId) throw new HttpError(400, 'subjectId is required.');
    const { keys: _keys, ...result } = await createQuiz(sb, user.id, body.subjectId, { count: body.count, topicIds: body.topicIds });
    return Response.json(result); // answer keys never leave the server
  } catch (e) { return fail(e); }
}

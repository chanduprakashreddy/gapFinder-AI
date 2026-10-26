import { authed, fail, HttpError } from '@/lib/server';
import { extractPages } from '@/lib/pdf';
import { ingestDocument, KINDS, type Kind } from '@/lib/ingest';

export const runtime = 'nodejs';
export const maxDuration = 60;
const MAX_FILE = 4 * 1024 * 1024; // Vercel serverless request bodies are capped at ~4.5 MB

export async function POST(req: Request) {
  try {
    const { sb, user } = await authed(req);
    const form = await req.formData();
    const subjectId = String(form.get('subjectId') ?? '');
    const kind = String(form.get('kind') ?? 'notes') as Kind;
    if (!subjectId) throw new HttpError(400, 'Choose a subject first.');
    if (!KINDS.includes(kind)) throw new HttpError(400, 'Unknown document type.');

    const file = form.get('file');
    const pasted = String(form.get('text') ?? '');
    let pages;
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_FILE) throw new HttpError(413, 'Files must be under 4 MB. Split the document or paste the text.');
      pages = await extractPages(file);
    } else if (pasted.trim()) {
      pages = [{ page: 1, text: pasted }];
    } else {
      throw new HttpError(400, 'Attach a file or paste some text.');
    }
    const title = (String(form.get('title') ?? '').trim() || (file instanceof File && file.size > 0 ? file.name : 'Pasted text')).slice(0, 200);
    return Response.json(await ingestDocument(sb, user.id, { subjectId, kind, title, pages }));
  } catch (e) { return fail(e); }
}

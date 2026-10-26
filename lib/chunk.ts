// Heading-aware chunking. Pure functions, no I/O.
export type Page = { page: number; text: string };
export type RawChunk = { heading: string; content: string; page: number; position: number };

export const CHUNK_SIZE = 900;
export const OVERLAP = 120;
const MIN_CHARS = 30;

export type Heading = { text: string; level: number };

export function headingInfo(line: string): Heading | null {
  const t = line.trim();
  if (!t || t.length > 90) return null;
  const md = t.match(/^(#{1,6})\s+(.+)$/);
  if (md) return { text: md[2].trim(), level: md[1].length };
  if (/^(chapter|unit|module|topic|section|part)\s+[\w.]+/i.test(t)) return { text: t, level: 1 };
  const num = t.match(/^(\d+(?:\.\d+)*)[.)]?\s+[A-Z][^.!?]{2,80}$/);
  if (num) return { text: t, level: num[1].split('.').length };
  const letters = t.replace(/[^A-Za-z]/g, '');
  if (letters.length >= 4 && t === t.toUpperCase() && t.split(/\s+/).length <= 8 && !/[.!?]$/.test(t)) {
    return { text: t, level: 2 };
  }
  return null;
}

/** Split text into windows of ~size chars, preferring paragraph/sentence boundaries, with overlap. */
export function windows(text: string, size = CHUNK_SIZE, overlap = OVERLAP): string[] {
  const clean = text.trim();
  if (clean.length <= size) return clean.length >= MIN_CHARS ? [clean] : [];
  const out: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + size, clean.length);
    if (end < clean.length) {
      const slice = clean.slice(start, end);
      const cut = Math.max(slice.lastIndexOf('\n\n'), slice.lastIndexOf('. '), slice.lastIndexOf('? '), slice.lastIndexOf('! '));
      if (cut > size * 0.5) end = start + cut + 1;
    }
    const piece = clean.slice(start, end).trim();
    if (piece.length >= MIN_CHARS) out.push(piece);
    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return out;
}

/** Heading-aware chunks. A heading stack gives each chunk its full path, e.g. "Photosynthesis › Calvin cycle". */
export function chunkPages(pages: Page[], size = CHUNK_SIZE, overlap = OVERLAP): RawChunk[] {
  type Section = { heading: string; page: number; text: string };
  const sections: Section[] = [];
  const stack: Heading[] = [];
  let cur: Section = { heading: 'Introduction', page: pages[0]?.page ?? 1, text: '' };
  for (const p of pages) {
    for (const line of p.text.split(/\r?\n/)) {
      const h = headingInfo(line);
      if (h) {
        if (cur.text.trim()) sections.push(cur);
        while (stack.length && stack[stack.length - 1].level >= h.level) stack.pop();
        stack.push(h);
        cur = { heading: stack.map((s) => s.text).join(' › '), page: p.page, text: '' };
      } else {
        cur.text += line + '\n';
      }
    }
  }
  if (cur.text.trim()) sections.push(cur);

  const out: RawChunk[] = [];
  let position = 0;
  for (const s of sections) {
    for (const piece of windows(s.text.replace(/\n{3,}/g, '\n\n'), size, overlap)) {
      out.push({ heading: s.heading, content: piece, page: s.page, position: position++ });
    }
  }
  return out;
}

/** Past papers: one chunk per numbered question, so each question can be linked to its own topic. */
export function chunkQuestions(pages: Page[]): RawChunk[] {
  const out: RawChunk[] = [];
  let position = 0;
  for (const p of pages) {
    const parts = p.text.split(/^\s*(?:Q\.?\s*)?(\d{1,3})[.)]\s+/m);
    // split() with a capture group yields [pre, num, body, num, body, ...]
    for (let i = 1; i < parts.length; i += 2) {
      const body = parts[i + 1]?.trim() ?? '';
      if (body.length >= MIN_CHARS / 2) {
        out.push({ heading: `Past paper question ${parts[i]}`, content: body.slice(0, CHUNK_SIZE), page: p.page, position: position++ });
      }
    }
  }
  return out;
}

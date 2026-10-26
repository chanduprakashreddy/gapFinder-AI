import pdfParse from 'pdf-parse/lib/pdf-parse.js'; // the package root import runs a debug block that breaks on serverless
import { HttpError } from './server';
import type { Page } from './chunk';

export async function extractPages(file: File): Promise<Page[]> {
  const name = file.name.toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());
  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    const pages: string[] = [];
    try {
      await pdfParse(buf, {
        pagerender: async (pageData: any) => {
          const tc = await pageData.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false });
          let lastY: number | undefined, text = '';
          for (const item of tc.items) {
            text += lastY === undefined || lastY === item.transform[5] ? item.str : '\n' + item.str;
            lastY = item.transform[5];
          }
          pages.push(text);
          return text;
        },
      });
    } catch {
      throw new HttpError(422, 'This PDF could not be read. It may be encrypted or corrupted.');
    }
    return pages.map((text, i) => ({ page: i + 1, text }));
  }
  if (/\.(txt|md|markdown)$/.test(name) || file.type.startsWith('text/')) return [{ page: 1, text: buf.toString('utf8') }];
  throw new HttpError(415, 'Upload a PDF, .txt or .md file, or paste the text.');
}

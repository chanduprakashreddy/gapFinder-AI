import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf8');
env.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0) {
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    process.env[k] = v;
  }
});

import { ingestDocument } from '../lib/ingest.js';
import { createQuiz } from '../lib/quiz.js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function testNotesUpload() {
  const userId = '37927eab-7063-4645-8654-ea209da93347';
  const subjectId = '0b2ae3c9-c585-4315-b22f-7515c7c482fe'; // biology2

  console.log('Testing ingesting notes for biology2...');
  const sampleText = `
# Solution Architecture and Content Ingestion
GapFinder AI uses a Next.js frontend with Supabase backend and pgvector for semantic retrieval.
When documents are uploaded, text is chunked into semantic passages and embedded using Gemini embedding models.
Each chunk is assigned an embedding vector with 768 dimensions.
The RAG pipeline matches chunks against topic queries to provide factual grounding.
Questions are generated strictly using retrieved passages to avoid hallucinations.
`;

  try {
    const res = await ingestDocument(sb, userId, {
      subjectId,
      kind: 'notes',
      title: 'Architecture Study Notes',
      pages: [{ page: 1, text: sampleText }],
    });
    console.log('Ingest notes result:', res);

    console.log('\nNow testing createQuiz for biology2:');
    const quiz = await createQuiz(sb, userId, subjectId, { count: 3 });
    console.log('Quiz created successfully! Questions count:', quiz.questions?.length);
    console.log('Sample question:', quiz.questions?.[0]);
  } catch (e) {
    console.error('Test failed with error:', e);
  }
}

testNotesUpload();

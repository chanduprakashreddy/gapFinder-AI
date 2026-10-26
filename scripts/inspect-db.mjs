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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;

const sb = createClient(url, key);

async function inspect() {
  console.log('--- Subjects ---');
  const { data: subjects, error: sErr } = await sb.from('subjects').select('*');
  console.log('Subjects count:', subjects?.length, 'Error:', sErr?.message);
  if (subjects?.length) console.log('Subjects:', subjects);

  console.log('\n--- Topics ---');
  const { data: topics, error: tErr } = await sb.from('topics').select('id, subject_id, name, weight, position');
  console.log('Topics count:', topics?.length, 'Error:', tErr?.message);
  if (topics?.length) console.log('Sample topics:', topics.slice(0, 5));

  console.log('\n--- Documents ---');
  const { data: docs, error: dErr } = await sb.from('documents').select('*');
  console.log('Documents count:', docs?.length, 'Error:', dErr?.message);
  if (docs?.length) console.log('Documents:', docs);

  console.log('\n--- Chunks ---');
  const { data: chunks, error: cErr } = await sb.from('chunks').select('id, subject_id, document_id, topic_id, kind, heading, topic_score').limit(10);
  console.log('Chunks count sample:', chunks?.length, 'Error:', cErr?.message);
  if (chunks?.length) console.log('Sample chunks:', chunks);

  // Check chunks count total
  const { count: totalChunks } = await sb.from('chunks').select('*', { count: 'exact', head: true });
  console.log('Total chunks:', totalChunks);

  // Check test match_chunks RPC
  console.log('\n--- Testing match_chunks RPC ---');
  if (subjects?.length) {
    const subId = subjects[0].id;
    const dummyVector = new Array(768).fill(0.01);
    const { data: matches, error: mErr } = await sb.rpc('match_chunks', {
      query_embedding: dummyVector,
      p_subject: subId,
      match_count: 5
    });
    console.log('match_chunks result count:', matches?.length, 'Error:', mErr);
  }
}

inspect();

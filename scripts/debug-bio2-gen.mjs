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

import { generateForTopic } from '../lib/quiz.js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function run() {
  const subjectId = '0b2ae3c9-c585-4315-b22f-7515c7c482fe'; // biology2
  const { data: topics } = await sb.from('topics').select('*').eq('subject_id', subjectId);
  console.log('Testing generateForTopic for topic:', topics[0].name, 'id:', topics[0].id);

  const res = await generateForTopic(sb, subjectId, topics[0], 2);
  console.log('Result:', res);
}

run();

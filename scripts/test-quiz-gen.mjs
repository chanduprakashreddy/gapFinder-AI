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

import { createQuiz } from '../lib/quiz.js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function test() {
  const { data: subjects } = await sb.from('subjects').select('*');
  console.log('Testing quiz generation across subjects:');
  for (const s of subjects) {
    console.log(`\nSubject: ${s.name} (${s.id}) user: ${s.user_id}`);
    try {
      const res = await createQuiz(sb, s.user_id, s.id, { count: 3 });
      console.log('SUCCESS! Questions generated:', res.questions?.length);
    } catch (e) {
      console.error('FAILED with error:', e.status || e.statusCode, e.message);
    }
  }
}

test();

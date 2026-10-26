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

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testGrounding() {
  const { data: auth } = await sb.auth.signInWithPassword({
    email: process.env.DEMO_EMAIL,
    password: process.env.DEMO_PASSWORD,
  });

  const subjectId = '16873b91-b23e-47b3-9e75-464ec8aa1b47';
  const { data: topics } = await sb.from('topics').select('*').eq('subject_id', subjectId);

  console.log('Testing generateForTopic for topic:', topics[0].name);
  const res = await generateForTopic(sb, subjectId, topics[0], 3);
  console.log('Generated questions:', res.questions.length);
  console.log('Rejected questions count:', res.rejected);
  if (res.questions.length) {
    console.log('Sample question:', res.questions[0]);
  }
}

testGrounding();

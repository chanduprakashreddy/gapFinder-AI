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
import { retrieve } from '../lib/rag.js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const sb = createClient(url, anon);

async function test() {
  console.log('Logging in as:', process.env.DEMO_EMAIL);
  const { data: auth, error: authErr } = await sb.auth.signInWithPassword({
    email: process.env.DEMO_EMAIL,
    password: process.env.DEMO_PASSWORD,
  });

  if (authErr) {
    console.error('Login failed:', authErr.message);
    return;
  }

  console.log('Logged in as user id:', auth.user.id);

  const { data: subjects } = await sb.from('subjects').select('*');
  console.log('User subjects:', subjects);
  if (!subjects?.length) {
    console.log('No subjects found for demo user.');
    return;
  }

  const s = subjects[0];
  console.log('Testing subject:', s.name, s.id);

  const { data: topics } = await sb.from('topics').select('*').eq('subject_id', s.id);
  console.log('Topics count:', topics?.length);

  const { data: chunks } = await sb.from('chunks').select('id, topic_id, kind').eq('subject_id', s.id);
  console.log('Chunks count for subject:', chunks?.length);
  console.log('Chunks with topic_id:', chunks?.filter(c => c.topic_id).length);

  if (topics?.length) {
    console.log('\nTesting retrieve with user auth:');
    try {
      const passages = await retrieve(sb, {
        query: `${topics[0].name}. ${topics[0].description ?? ''}`,
        subjectId: s.id,
        topicId: topics[0].id,
        k: 6,
      });
      console.log('Passages returned by retrieve:', passages.length);
      if (passages.length) {
        console.log('Sample passage heading:', passages[0].heading);
      }
    } catch (e) {
      console.error('Retrieve error:', e);
    }
  }

  console.log('\nTesting createQuiz with user auth:');
  try {
    const quizRes = await createQuiz(sb, auth.user.id, s.id, { count: 3 });
    console.log('Quiz created successfully! Question count:', quizRes.questions?.length);
  } catch (e) {
    console.error('Quiz creation failed:', e.status || e.statusCode, e.message);
  }
}

test();

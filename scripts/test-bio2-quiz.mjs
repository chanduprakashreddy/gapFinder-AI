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

async function run() {
  const userId = '37927eab-7063-4645-8654-ea209da93347';
  const subjectId = '0b2ae3c9-c585-4315-b22f-7515c7c482fe'; // biology2
  console.log('Testing createQuiz on biology2...');
  try {
    const quiz = await createQuiz(sb, userId, subjectId, { count: 3 });
    console.log('Quiz created successfully for biology2! Questions count:', quiz.questions.length);
    console.log('Question 1:', quiz.questions[0].question);
  } catch (e) {
    console.error('Quiz creation failed:', e);
  }
}

run();

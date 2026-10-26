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

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testLink() {
  const { data: auth, error: authErr } = await sb.auth.signInWithPassword({
    email: process.env.DEMO_EMAIL,
    password: process.env.DEMO_PASSWORD,
  });
  if (authErr) {
    console.error('Login error:', authErr);
    return;
  }
  console.log('Logged in as demo user:', auth.user.id);
  const subjectId = '16873b91-b23e-47b3-9e75-464ec8aa1b47';

  const { data: linked, error: linkErr } = await sb.rpc('link_chunks', { p_subject: subjectId });
  console.log('link_chunks result:', linked, 'Error:', linkErr);
}

testLink();

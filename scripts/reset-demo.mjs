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

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const { data, error } = await sb.auth.admin.updateUserById('982cc8f5-441c-46bf-a30b-ef929dc79f68', {
  password: 'GapFinder#2026',
});
console.log('Update result:', data?.user?.email, 'Error:', error?.message);

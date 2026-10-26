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
const { data, error } = await sb.auth.admin.listUsers();
if (error) {
  console.error(error);
} else {
  console.log('Users:');
  for (const u of data.users) {
    console.log(`- ${u.id}: ${u.email} (confirmed: ${!!u.email_confirmed_at})`);
  }
}

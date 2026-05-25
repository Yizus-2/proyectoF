import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabase = createClient(
  env['VITE_SUPABASE_URL'],
  env['VITE_SUPABASE_ANON_KEY']
);

async function inspect() {
  const { data: reports } = await supabase.from('reports').select('id, tracking_code, status, address').order('updated_at', { ascending: false }).limit(5);
  console.log('--- ULTIMOS 5 REPORTES ---');
  console.log(JSON.stringify(reports, null, 2));

  const { data: evidences } = await supabase.from('evidences').select('*').order('created_at', { ascending: false }).limit(5);
  console.log('--- ULTIMAS 5 EVIDENCIAS ---');
  console.log(JSON.stringify(evidences, null, 2));
}

inspect();

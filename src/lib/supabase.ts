import { createClient } from '@supabase/supabase-js';

// Якщо URL не задано (локальна розробка) — ходимо на той самий origin, а Vite
// проксіює запити на локальний Supabase. У проді VITE_SUPABASE_URL задано явно.
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || window.location.origin;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.error('Supabase configuration missing: VITE_SUPABASE_ANON_KEY');
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'X-Client-Info': 'payments-app',
    },
  },
});

import { createClient } from '@supabase/supabase-js';

// In your deployment platform (Vercel, Netlify, etc.)
// set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.warn('Supabase env vars missing: SUPABASE_URL & SUPABASE_ANON_KEY');
}

export const supabase = createClient(SUPABASE_URL ?? '', SUPABASE_ANON ?? ''); 
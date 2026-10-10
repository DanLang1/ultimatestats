import { createClient } from '@supabase/supabase-js';

// Real client wired to the test's `global.fetch`, so route tests stub the network boundary only.
export const supabase = createClient('https://example.supabase.co', 'test-key', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: (...args) => global.fetch(...args) },
});

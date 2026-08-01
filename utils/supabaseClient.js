import { createClient } from '@supabase/supabase-js';

// These are publishable browser credentials, not server secrets. The checked-in
// fallback keeps claimable/preview deployments functional when no build-time
// environment is attached.
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://jlvjnnltynebenflkcua.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_LXzMM6HjPlwUmbMQfqyYXw_QthfwjsU";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/database.types';

const DEFAULT_SUPABASE_URL = 'https://terjvhdjfbyfvimwwdxl.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_e5OePjtd7KSVsRz90G4SzQ_Q-vb6ZoH';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

import { createClient } from '@supabase/supabase-js';

import type { Database, Tables, TablesInsert, TablesUpdate } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_API_KEY;

if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL is not defined in environment variables');
}

if (!supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_API_KEY is not defined in environment variables');
}

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export default supabase;

// Profile 타입 내보내기
export type Profile = Tables<'profile'>;
export type ProfileInsert = TablesInsert<'profile'>;
export type ProfileUpdate = TablesUpdate<'profile'>;
export type PartialProfile = Partial<Profile>;

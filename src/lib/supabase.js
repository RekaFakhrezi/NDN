import { createClient } from '@supabase/supabase-js';

// Mengambil data dari file .env sesuai penamaan di dashboard Supabase kamu
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Pengaman internal: Jika kunci kosong, gunakan string cadangan agar React tidak crash total
const safeUrl = supabaseUrl || 'https://placeholder.supabase.co';
const safeKey = supabaseAnonKey || 'placeholder-key';

export const supabase = createClient(safeUrl, safeKey);
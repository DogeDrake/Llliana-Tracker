import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Exportamos la constante 'supabase' para que otros archivos la importen
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

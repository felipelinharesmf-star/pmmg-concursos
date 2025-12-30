import { createClient } from '@supabase/supabase-js';

// These should be in your .env.local file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase URL or Key missing!');
    alert('ERRO CRÍTICO: Variáveis de ambiente (URL ou Chave do Supabase) não encontradas. Verifique o arquivo .env');
    throw new Error('Supabase configuration missing');
}

let supabaseInstance;
try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
} catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    alert('Erro ao conectar com o servidor. Verifique sua conexão.');
    throw error;
}

export const supabase = supabaseInstance;

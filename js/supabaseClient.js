/* ============================================================
   Configuração da conexão com o Supabase
   ============================================================
   1. Crie um projeto gratuito em https://supabase.com
   2. No painel do projeto, vá em Project Settings > API
   3. Copie a "Project URL" e a chave "anon public"
   4. Cole os dois valores abaixo, no lugar dos textos entre aspas
   ============================================================ */

const SUPABASE_URL = 'https://lzkqjlenlhaujuhqdink.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6a3FqbGVubGhhdWp1aHFkaW5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwODU3MjEsImV4cCI6MjEwNDY2MTcyMX0.HfsD6X2t326fPDfI_n9NOEMQxPrGM_MVGdB9F1Gi1U0';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

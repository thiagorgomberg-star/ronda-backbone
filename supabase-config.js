/*
  CONFIGURAÇÃO DA NUVEM (Supabase) — Ronda Backbone Multivale

  Enquanto SUPABASE_URL estiver vazio, o app funciona só no celular (sem nuvem).

  Para ligar a nuvem (veja o guia SUPABASE.md):
  1. No Supabase, abra o projeto > Project Settings (engrenagem) > API (ou "Data API" / "API Keys").
  2. Copie a "Project URL" e a chave "anon public" (ou "publishable"). NUNCA use a chave "service_role" / "secret".
  3. Cole abaixo, entre as aspas, e suba este arquivo no GitHub.

  Exemplo:
  window.SUPABASE_URL = 'https://abcdefghijk.supabase.co';
  window.SUPABASE_KEY = 'eyJhbGciOi...';
*/
window.SUPABASE_URL = '';
window.SUPABASE_KEY = '';

/* Alertas com o app fechado (Web Push): cole aqui a chave PÚBLICA VAPID (veja SUPABASE.md, parte "Alertas"). */
window.VAPID_PUBLIC = 'BGo2iAnkzXJWE6K0ZMu3_zfFps99n-IkdQu5ZOILP5Bt1gYxRBBNwNXyOXA3MYRire5aEWI-6UNdQ6Fhw0PlUVQ';

/* Jornada dos técnicos: fora do expediente nesse horário, o app alarma "Expediente não iniciado".
   dias: 0 = domingo, 1 = segunda ... 6 = sábado. refeicaoMin: duração da refeição (alarma ao terminar). */
window.JORNADA = { inicio: '08:00', fim: '18:00', refeicaoMin: 60, dias: [0, 1, 2, 3, 4, 5, 6] };

/* Nome da equipe/empresa. Todos os registros ficam marcados com este nome. */
window.NUVEM_ORG = 'multivale';

/* Configuração do alojamento próprio.
   Preencha com os dados do seu projeto Supabase (Project Settings → API Keys).
   Use SEMPRE a chave publicável (sb_publishable_…). Nunca a chave secreta. */
window.CTG_CONFIG = {
  supabaseUrl: 'https://SEU-PROJETO.supabase.co',
  supabaseKey: 'sb_publishable_COLE_AQUI',
  /* opcional: endereço público do site, usado no QR code (ex.: https://simulador-ctg.vercel.app/) */
  siteUrl: ''
};
/* enquanto não estiver preenchido, o exame em sala funciona só no próprio telemóvel */
if (/SEU-PROJETO|COLE_AQUI/.test(window.CTG_CONFIG.supabaseUrl + window.CTG_CONFIG.supabaseKey)) window.CTG_CONFIG = null;

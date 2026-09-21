/**
 * Cloudflare Worker: Keep-Alive do Supabase
 *
 * Executa periodicamente via Cron Trigger para impedir que o projeto
 * Supabase seja pausado por inatividade no plano gratuito.
 */

const SUPABASE_URL = 'https://edyjpusrdpotmskgobws.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_3OKeFVTkqUa7uy-U1M4AZQ_bKHp2SVu';

async function pingSupabase() {
  const url = `${SUPABASE_URL}/rest/v1/trabalhos?select=id&limit=1`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'User-Agent': 'Cloudflare-Worker-KeepAlive/1.0',
    },
  });

  const texto = await res.text();
  return {
    status: res.status,
    ok: res.ok,
    corpo: texto,
    timestamp: new Date().toISOString(),
  };
}

export default {
  // Disparado automaticamente pelo agendador (Cron Trigger)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      pingSupabase().then((resultado) => {
        console.log('[Keep-Alive Supabase] Executado via Cron:', JSON.stringify(resultado));
      }).catch((erro) => {
        console.error('[Keep-Alive Supabase] Erro ao executar:', erro);
      })
    );
  },

  // Permite testar manualmente acessando a URL do Worker pelo navegador ou curl
  async fetch(request, env, ctx) {
    try {
      const resultado = await pingSupabase();
      return new Response(JSON.stringify(resultado, null, 2), {
        status: resultado.ok ? 200 : 502,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    } catch (err) {
      return new Response(JSON.stringify({ erro: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }
  },
};

# Supabase Keep-Alive (Cloudflare Worker)

Este Worker tem como único objetivo realizar uma requisição periódica à API REST do Supabase para evitar que o projeto seja pausado por inatividade após 7 dias no plano gratuito.

## Como ativar

### Método 1: Pelo Painel da Cloudflare (Sem instalar nada)

1. Acesse o [Painel da Cloudflare](https://dash.cloudflare.com/).
2. No menu lateral, vá em **Workers & Pages** > **Create application** > **Create Worker**.
3. Defina o nome como `supabase-keep-alive` e clique em **Deploy**.
4. Na tela seguinte, clique em **Edit code** (ou Editar código).
5. Substitua todo o código pelo conteúdo de [`index.js`](./index.js) e clique em **Deploy**.
6. Volte à página do Worker, clique na aba **Settings** (Configurações) > **Triggers** (Gatilhos).
7. Em **Cron Triggers**, clique em **Add Cron Trigger** e configure:
   - Expressão Cron: `0 6 */2 * *` (Executa a cada 2 dias às 06:00 UTC).
8. Pronto! O Worker executará a cada 2 dias mantendo o Supabase ativo.

### Método 2: Pela Linha de Comando (Wrangler)

No seu terminal com acesso à internet:

```bash
cd worker
npx wrangler deploy
```

O Wrangler solicitará login na Cloudflare (se ainda não estiver autenticado) e fará o deploy com o Cron Trigger configurado automaticamente no `wrangler.toml`.

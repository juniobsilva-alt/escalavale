---
name: git-agora
description: Use when the user types /git-agora or asks to commit and publish the current changes (commit + push to GitHub). Triggers on "commita", "publica", "sobe as alterações", "git agora".
---

# Git Agora — commit + publicação

Fluxo para commitar e publicar as alterações do projeto atual no GitHub
(o deploy no Cloudflare acontece sozinho após o push).

## Passos

1. **Inspecione antes de tudo:**
   `git status --short`, `git diff --stat` e `git log --oneline -3`.
   Mostre ao usuário o que será commitado.
2. **Valide** (se existir JS no projeto): `node --check` nos arquivos alterados.
   Não commite código com erro de sintaxe.
3. **Stage:** `git add -A`, respeitando o `.gitignore`.
4. **NUNCA commite segredos:** `.env`, tokens, senhas, chaves (`sb_secret_*`,
   `service_role`, `ghp_`). Se aparecerem no status, avise e pare.
5. **Mensagem:** use o texto que o usuário passou junto ao comando. Se não passou,
   resuma as mudanças em uma linha no estilo do histórico (`git log --oneline`).
6. **Commit + push:**
   `git commit -m "<mensagem>" && git push -u origin main`
   Não use `--force`, não altere remote sem pedir.
7. **Reporte:** commit publicado (hash curto) e lembre que o deploy sai em ~1-2 min.

## Se o push falhar por autenticação

- Oriente: `cd <projeto> && git push -u origin main` digitando o token, e
  `git config --global credential.helper store` para salvar uma única vez.
- Não peça que colem o token no chat como primeira opção.

# EscalaVale — Sistema de Escalas (JavaScript)

Equivalente web do projeto Lazarus em `/home/junio/Projetos/Escala`, reescrito em
HTML + CSS + JavaScript puro (ES Modules, sem build), com dados em `localStorage`.

## Como usar

```bash
cd /home/junio/Projetos/EscalaVale
python3 -m http.server 8080
# abrir http://localhost:8080
```

> Abrir via `file://` bloqueia ES Modules — use um servidor estático qualquer.

## Funcionalidades (paridade com o original)

| Original (Pascal/SQLite) | EscalaVale (JS) |
|---|---|
| `mediuns` (nome, telefone, email, observação, ativo) | Tela **Médiuns**: busca, novo/editar em modal, exclusão lógica |
| `trabalhos` (nome, descrição) | Tela **Trabalhos** |
| `horarios_trabalho` (trabalho, dia_semana 0–6, hora início/fim) | Tela **Horários** com filtros por trabalho/dia + validação HH:MM |
| `escala` por data (slot = horário do dia + LEFT JOIN lançamento) | Tela **Escala**: grade do dia, painel de atribuição, presença (Não definido/Presente/Ausente), observação |
| `TemConflitoHorario` (overlap de horas, mesmo médium/dia) | Bloqueio + alerta na Escala |
| `MediumDisponivelNaData` (regras dia + ocorrência 1ª–5ª/Última) | Tela **Disponibilidade** (chips) + validação na Escala |
| `disponibilidade` (dia_semana, ocorrência) | Tela **Disponibilidade** |

## Padrões UX aplicados

- **Navegação**: sidebar fixa + topbar, `aria-current`, drawer no mobile, skip-link.
- **Descoberta**: dashboard com KPIs, "escala de hoje", próximas escalas, ações rápidas.
- **Busca**: global (`/` foca) + filtros por tela com contador e empty-state orientado a ação.
- **Formulários**: modais com foco automático, `Esc` fecha, validação inline (nome obrigatório, e-mail, HH:MM, início &lt; fim).
- **Feedback**: toasts de sucesso/erro, pills de situação coloridas, alertas de conflito/disponibilidade antes de salvar.
- **Prevenção de erro**: confirmação de exclusão (exclusão lógica como no original), avisos proativos na escala.
- **Acessibilidade/responsivo**: labels, roles, teclado (Enter/Espaço nos slots), layout 1 coluna no mobile, impressão da escala.
- **Portabilidade**: Exportar/Importar JSON (backup), seed de demonstração.

## Estrutura

```
index.html
css/style.css        # design system (variáveis, cards, tabelas, modal, toast)
js/
  app.js             # roteador + topbar + backup
  store.js           # modelo + regras (conflito, disponibilidade) + localStorage
  utils.js           # modal, toast, máscaras, empty-state
  views/             # dashboard, mediuns, trabalhos, horarios, escala, disponibilidade
```

## Grade mensal (impressão)

A aba **Escala → Grade mensal** reproduz a "Escala de trabalho do mês": linhas = dias
de sessão, colunas = trabalhos, células com N nomes, marcador **LEITO** e rodapé de avisos.

Pré-requisitos para preencher corretamente (a tela mostra um checklist):

1. **Trabalhos** — os 10 do modelo (a ordem da tela define as colunas; use ↑↓).
2. **Horários** — ao menos 1 por trabalho em cada dia de sessão (Qua/Sáb/Dom 19h–21h
   no modelo). Sem horário, a célula não aceita vínculo.
3. **Médiuns** — podem ser cadastrados na hora, dentro da célula.
4. **Vínculos** — clique na célula para adicionar/remover; valida conflito de horário
   e disponibilidade como na visão diária.
5. **Avisos do rodapé** — texto livre por mês (ex.: "Aramê: 20 | … | Leito Magnético: 03, 24").

O botão **Criar grade modelo** executa os passos 1–2 de uma vez (sem duplicar).

## Nuvem (Supabase + Cloudflare Pages)

O app tem dois modos:

- **Nuvem** (padrão): login com usuário de dirigente → dados no Postgres do Supabase,
  compartilhados entre todos os dispositivos. Sem usuário logado, nada é lido nem
  escrito (RLS `authenticated` em todas as tabelas).
- **Local** (demonstração offline): botão na tela de login, dados só no navegador.

Arquitetura: `index.html` + `js/` estáticos no **Cloudflare Pages** (sem build);
`js/nuvem.js` usa `@supabase/supabase-js` via CDN; `js/store.js` mantém um cache em
memória e delega `criar/atualizar/excluir` ao backend ativo (Supabase ou localStorage).

Na nuvem, `medio_id`/`horario_id` zerados (ex.: LEITO) são gravados como `NULL`
(FK anulável). O botão **Importar** aparece só no modo local; na nuvem, restauração
de backup é via SQL no painel do Supabase.

## Contextos de escala (dirigentes / ajanãs)

Trabalhos, horários, escala, disponibilidade e avisos pertencem a um **contexto**
(`dirigentes` ou `ajanas`). O menu tem o grupo **Escala de dirigentes**
(Grade, Trabalhos, Horários, Disponibilidade) e a **Escala de Ajanãs** logo abaixo.
Médiuns são cadastro único global. Dados legados migram sozinhos para `dirigentes`.

Antes de usar esta versão na nuvem, rode `supabase/migracao-contexto.sql` no SQL Editor.

## Escala de Ajanãs

Mesmas telas dos dirigentes (Grade, Trabalhos, Horários, Disponibilidade) com dados
isolados por contexto. Grade segue o modelo do documento oficial: título
"TARAJO DO AMANHECER — ESCALA DOS AJANÃS", aviso de apresentação ao comandante,
células cinzas quando o trabalho não tem horário no dia, LEITO/Leito Externo e
rodapé institucional. Modelo inicial: Imunização, Cura, Defumação, Randy (qtd 2).
Montagem (manual e automática) e disponibilidade usam só função Ajanã.

## Grades da Escala de Ajanãs

Além da Grade Templo (Imunização, Cura, Defumação, Randy), há Grade Oráculo,
Grade Libertação, Grade Sanday Tronos e Grade Sublimação e Turigano — cada uma
filtra seus trabalhos, dias de sessão, distribuição e limpeza. Grade sem
trabalhos cadastrados oferece o botão "Criar trabalhos desta grade".

## Vínculo trabalho-grade (Ajanãs)

No cadastro de trabalhos (menu Ajanãs) há o campo **Grade**: o trabalho participa
só da grade selecionada (nulo = todas). Rode `supabase/migracao-grade.sql` na nuvem.

## Grades bimestrais (Ajanãs)

As grades da Escala de Ajanãs exibem **2 meses consecutivos** a partir do mês
escolhido (ex.: setembro e outubro), como no documento oficial. Distribuição,
limpeza, avisos e impressão operam no período todo. Dirigentes segue mensal.

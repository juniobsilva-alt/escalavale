# 📋 Lista de Tarefas e Melhorias — EscalaVale

Roadmap de melhorias técnicas, arquiteturais e de experiência do usuário (UX) para o sistema de gestão de escalas do Vale do Amanhecer.

---

## 🚀 1. Funcionalidades e Recursos para Dirigentes

- [x] **Compartilhamento e Notificações via WhatsApp**
  - [x] Criar botão para copiar texto formatado da escala do dia (com horários, trabalhos e nomes) pronto para colar em grupos de WhatsApp.
  - [x] Criar botão para copiar resumo da escala mensal/bimestral de um trabalho específico.
  - [x] Adicionar botão de envio individual na lista de médiuns e na escala (`https://wa.me/55...`), gerando mensagem personalizada com as datas e horários em que o médium está escalado (*"Salve Deus, Irmão(ã) [Nome], segue sua escala para [Mês]: ..."*).

- [x] **Destaque Visual de Médium na Grade Mensal e Bimestral**
  - [x] Adicionar um campo de busca/seleção "Destacar médium" na barra de ferramentas da grade mensal.
  - [x] Ao selecionar um médium, aplicar classe de destaque visual (cor contrastante ou contorno) em todas as células onde ele aparece.
  - [x] Exibir um contador com a quantidade de escalas daquele médium no período selecionado.

- [x] **Visão de Consulta Individual do Médium (Pública / Sem Senha)**
  - [x] Criar tela ou modal simplificado onde qualquer médium possa buscar seu próprio nome.
  - [x] Exibir a lista cronológica das próximas escalas do médium selecionado (data, dia da semana, horário e trabalho).
  - [x] Permitir acesso direto via link com parâmetro de URL (ex.: `?consulta=1`).

- [x] **Exportação da Grade em Imagem (PNG) e PDF**
  - [x] Adicionar botão para baixar a grade mensal/bimestral formatada como imagem (PNG/JPEG) ou PDF para facilitar o envio em grupos sem depender do diálogo nativo de impressão (`window.print()`).
  - [x] Garantir que a imagem gerada preserve o cabeçalho oficial ("TARAJO DO AMANHECER"), avisos e rodapés institucionais.

- [x] **Aprimoramentos no Algoritmo de Distribuição Automática**
  - [x] Adicionar opção de limite máximo de escalas por médium no período (ex.: no máximo 2 ou 3 vezes por mês/bimestre).
  - [x] Na escala bimestral dos Ajanãs, unificar a contagem de vínculos entre os dois meses para garantir que a distribuição seja equilibrada ao longo de todo o bimestre.

---

## ⚡ 2. Arquitetura, Dados e Performance

- [x] **Carregamento sob Demanda da Tabela `escala` (Paginação Temporal)**
  - [x] Substituir a busca irrestrita `supabase.from('escala').select('*')` em `js/nuvem.js` por filtro de intervalo de datas (ex.: ano corrente ou mês atual ± 2 meses).
  - [x] Implementar carregamento sob demanda caso o usuário navegue para meses fora do intervalo em cache.
  - [x] Reduzir o tempo de inicialização do app e o consumo de cota de dados do Supabase.

- [x] **Sincronização em Tempo Real (Supabase Realtime)**
  - [x] Configurar canais do Supabase (`supabase.channel`) para escutar eventos de `INSERT`, `UPDATE` e `DELETE` na tabela `escala`.
  - [x] Atualizar dinamicamente a grade na tela quando outro dirigente fizer alterações simultâneas, evitando sobrescritas acidentais.

- [x] **Ajuste de Cache-Control e Cache-Busting de Assets**
  - [x] Corrigir o cabeçalho `_headers` para `/css/*`, reduzindo de `max-age=31536000, immutable` para um valor dinâmico ou adicionando versionamento nos links de importação em `index.html` (ex.: `css/style.css?v=1.1`).
  - [x] Garantir que atualizações de CSS e JS cheguem imediatamente aos usuários sem que eles precisem limpar o cache manualmente.

- [x] **Resiliência e Rollback em Operações em Lote**
  - [x] Tratar falhas parciais em `distribuirAutomaticamente` e `limparMes` quando operando na nuvem.
  - [x] Garantir que o estado em memória (`store.db`) não divirja do Supabase em caso de erro de rede no meio da requisição.

---

## 📱 3. Experiência do Usuário (UX) e Mobile

- [x] **Service Worker e PWA Offline de Verdade**
  - [x] Criar o arquivo `sw.js` com estratégia de cache *Stale-While-Revalidate* para assets estáticos (HTML, CSS, JS, ícones e fontes).
  - [x] Registrar o Service Worker no `index.html` ou `app.js`.
  - [x] Permitir a abertura e navegação pelo app mesmo em locais com sinal de celular fraco ou sem internet (usando dados locais ou cache do último carregamento).

- [x] **Máscaras e Validações de Formulário**
  - [x] Adicionar máscara automática para telefone no formulário de médium: `(99) 99999-9999`.
  - [x] Melhorar o feedback visual de campos inválidos antes de submeter o formulário.

- [x] **Visualização Responsiva da Grade no Celular**
  - [x] Adicionar opção de alternar a visualização da grade no mobile: modo "Tabela com rolagem horizontal suave" ou modo "Cards agrupados por dia".

- [x] **Histórico e Função Desfazer (Undo)**
  - [x] Implementar confirmação reforçada ou botão de desfazer (Undo) para ações em massa, como "Limpar grade" ou "Limpar célula".

---

## 🧪 4. Confiabilidade e Testes Automatizados

- [x] **Testes Unitários Nativos com `node:test` e `node:assert`**
  - [x] Criar suíte de testes (sem dependências externas) para as regras centrais de negócio:
    - [x] `mediumDisponivelNaData`: teste de 1ª, 2ª, 3ª, 4ª, 5ª ocorrência e "Última" ocorrência do dia no mês.
    - [x] `haConflitoHorario`: detecção de sobreposição de horários no mesmo dia para o mesmo médium.
    - [x] `diasDeSessaoDoMes`: cálculo correto de dias de sessão e dias da semana.
    - [x] `distribuirAutomaticamente`: validação de que células com `LEITO` e médiuns sem disponibilidade não são preenchidos indevidamente.
- [x] **Integração dos Testes no Script de Publicação**
  - [x] Atualizar `publicar.sh` para rodar a suíte de testes antes do commit e deploy no Cloudflare Pages.
- [x] **Validação de Schema no `store.importar(json)`**
  - [x] Adicionar checagem estrutural dos dados importados via JSON para evitar que arquivos corrompidos quebrem a aplicação local.

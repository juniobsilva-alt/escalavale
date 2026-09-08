import {
  store, slotsDaData, celulaMensal, diasDeSessaoDoMes,
  haConflitoHorario, mediumDisponivelNaData,
  DIAS_SEMANA, DIAS_CURTO, MESES, SITUACAO, LEITO,
  MODELOS_GRADE, GRADE_CONFIG, FUNCAO_POR_CONTEXTO,
} from '../store.js';
import { hojeISO, formatarData, diaSemanaDe, escapar, toast, pillSituacao, estadoVazio } from '../utils.js';

export function renderEscala(el, dataInicial) {
  let aba = 'dia';
  let dataISO = dataInicial || hojeISO();
  let mes = dataISO.slice(0, 7);
  let selecionado = -1;

  el.innerHTML = `
    <div class="page-head no-print">
      <div><h1>${store.nomeContexto()}</h1><p>Atribua médiuns aos horários do dia ou monte a grade mensal para impressão.</p></div>
    </div>
    <div class="tabs" role="tablist" aria-label="Modo da escala">
      <button class="tab is-active" data-aba="dia" role="tab" aria-selected="true">Por dia</button>
      <button class="tab" data-aba="mensal" role="tab" aria-selected="false">Grade mensal</button>
    </div>
    <div id="conteudo-escala"></div>`;

  const area = el.querySelector('#conteudo-escala');
  el.querySelectorAll('.tab').forEach((t) => (t.onclick = () => {
    aba = t.dataset.aba;
    el.querySelectorAll('.tab').forEach((x) => {
      const on = x === t;
      x.classList.toggle('is-active', on);
      x.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    if (aba === 'mensal') mes = dataISO.slice(0, 7);
    desenhar();
  }));

  function desenhar() {
    if (aba === 'dia') desenharDia();
    else desenharMensal();
  }

  // ============================ ABA POR DIA ============================
  function desenharDia() {
    area.innerHTML = `
      <div class="toolbar">
        <input type="date" id="f-data" value="${dataISO}" aria-label="Data da escala" />
        <button class="btn btn-sm" id="btn-hoje">Hoje</button>
        <div class="spacer"></div>
        <button class="btn btn-sm" id="btn-imprimir">Imprimir</button>
      </div>
      <div id="dia-corpo"></div>`;
    const corpo = area.querySelector('#dia-corpo');
    area.querySelector('#f-data').onchange = (e) => { dataISO = e.target.value || hojeISO(); selecionado = -1; desenharDia(); };
    area.querySelector('#btn-hoje').onclick = () => { dataISO = hojeISO(); selecionado = -1; desenharDia(); };
    area.querySelector('#btn-imprimir').onclick = () => window.print();

    const slots = slotsDaData(dataISO);
    const dia = DIAS_SEMANA[diaSemanaDe(dataISO)];
    const mediuns = store.mediunsParaMontagem();
    const restrito = store.contextoAtual === 'ajanas';

    if (slots.length === 0) {
      corpo.innerHTML = estadoVazio({
        icone: '📅', titulo: `Sem grade para ${dia}`,
        descricao: 'Não há horários cadastrados para este dia da semana.',
      });
      return;
    }

    corpo.innerHTML = `
      <p class="muted">${formatarData(dataISO)} (${dia}) — clique num horário para atribuir.</p>
      <div class="escala-layout">
        <div>${slots.map((s, i) => {
          const nomes = s.todos_nomes.length ? escapar(s.todos_nomes.join(' · ')) : 'Vaga em aberto';
          const extra = s.todos_nomes.length > 1 ? ` <span class="pill info">+${s.todos_nomes.length - 1}</span>` : '';
          const leito = s.tem_leito ? ' <span class="pill danger">LEITO</span>' : '';
          return `
          <div class="slot ${i === selecionado ? 'is-selected' : ''}" data-slot="${i}" role="button" tabindex="0"
               aria-label="${escapar(s.trabalho_nome)} ${s.hora_inicio}">
            <div class="slot-head"><strong>${escapar(s.trabalho_nome)}</strong>${pillSituacao(s.presente)}</div>
            <div class="slot-meta">⏰ ${s.hora_inicio} – ${s.hora_fim} · 👤 ${nomes}${extra}${leito}</div>
          </div>`;
        }).join('')}</div>
        <div class="card panel-sticky" id="painel"></div>
      </div>`;

    corpo.querySelectorAll('[data-slot]').forEach((card) => {
      const abrir = () => { selecionado = Number(card.dataset.slot); desenharDia(); };
      card.onclick = abrir;
      card.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); } };
    });

    const painel = corpo.querySelector('#painel');
    if (selecionado < 0) {
      painel.innerHTML = `<h3>Nenhum horário selecionado</h3><p class="muted">Selecione um horário ao lado para atribuir médium, presença e observação.</p>`;
      return;
    }

    const s = slots[selecionado];
    painel.innerHTML = `
      <h3>${escapar(s.trabalho_nome)}</h3>
      <p class="muted">${formatarData(dataISO)} · ${s.hora_inicio}–${s.hora_fim}</p>
      ${s.vinculos.length > 1 ? `<div class="alert info">Este horário tem ${s.vinculos.length} médiuns (${escapar(s.todos_nomes.join(', '))}). A edição aqui altera o primeiro; use a <strong>Grade mensal</strong> para gerenciar todos.</div>` : ''}
      <div class="field"><label for="p-medium">Médium</label>
        <select id="p-medium">
          <option value="0">(Nenhum / liberar vaga)</option>
          ${mediuns.map((m) => `<option value="${m.id}" ${s.medio_id === m.id ? 'selected' : ''}>${escapar(m.nome)}</option>`).join('')}
        </select>${restrito ? '<p class="hint muted">Somente médiuns com função Ajanã participam desta escala.</p>' : ''}</div>
      <div class="field"><label for="p-sit">Situação</label>
        <select id="p-sit">${[0, 1, 2].map((v) => `<option value="${v}" ${s.presente === v ? 'selected' : ''}>${SITUACAO[v]}</option>`).join('')}</select></div>
      <div class="field"><label for="p-obs">Observação</label>
        <textarea id="p-obs" rows="2">${escapar(s.observacao)}</textarea></div>
      <div id="avisos"></div>
      <div class="quick-actions">
        <button class="btn btn-primary" id="p-salvar">Salvar</button>
        ${s.escala_id ? `<button class="btn" id="p-liberar">Liberar vaga</button>` : ''}
      </div>`;

    const selMedium = painel.querySelector('#p-medium');
    const avisos = painel.querySelector('#avisos');

    function atualizarAvisos() {
      const mid = Number(selMedium.value);
      avisos.innerHTML = '';
      if (!mid) return;
      if (haConflitoHorario(mid, dataISO, s.hora_inicio, s.hora_fim, s.escala_id)) {
        avisos.innerHTML += `<div class="alert danger" role="alert">⚠️ Conflito: este médium já está escalado em outro trabalho neste horário.</div>`;
      }
      if (!mediumDisponivelNaData(mid, dataISO)) {
        avisos.innerHTML += `<div class="alert warn" role="alert">⚠️ Disponibilidade: as regras deste médium não contemplam esta data.</div>`;
      }
    }
    selMedium.onchange = atualizarAvisos;
    atualizarAvisos();

    painel.querySelector('#p-salvar').onclick = async () => {
      const medioId = Number(selMedium.value);
      const presente = Number(painel.querySelector('#p-sit').value);
      const obs = painel.querySelector('#p-obs').value.trim();
      if (restrito && medioId > 0 && !mediuns.some((m) => m.id === medioId)) {
        toast('Somente médiuns com função Ajanã nesta escala.', 'error'); return;
      }
      if (medioId > 0) {
        if (haConflitoHorario(medioId, dataISO, s.hora_inicio, s.hora_fim, s.escala_id)) {
          toast('Conflito de horário: escolha outro médium.', 'error'); return;
        }
        if (!mediumDisponivelNaData(medioId, dataISO)) {
          toast('Médium sem disponibilidade para esta data.', 'error'); return;
        }
      }
      try {
        if (s.escala_id > 0) {
          if (medioId === 0) await store.excluir('escala', s.escala_id);
          else await store.atualizar('escala', s.escala_id, { medio_id: medioId, presente, observacao: obs });
        } else {
          if (medioId === 0) { toast('Escolha um médium.', 'error'); return; }
          await store.criar('escala', {
            medio_id: medioId, trabalho_id: s.trabalho_id,
            data: dataISO, horario_id: s.horario_id, presente, observacao: obs,
          });
        }
      } catch (err) { toast(err.message, 'error'); return; }
      toast('Escala salva.'); desenharDia();
    };
    painel.querySelector('#p-liberar')?.addEventListener('click', async () => {
      try {
        await store.excluir('escala', s.escala_id);
      } catch (err) { toast(err.message, 'error'); return; }
      selecionado = -1; toast('Vaga liberada.', 'info'); desenharDia();
    });
  }

  // ============================ GRADE MENSAL ============================
  function desenharMensal() {
    const [ano, mesNum] = mes.split('-').map(Number);
    const trabalhos = store.trabalhosAtivos();
    const dias = diasDeSessaoDoMes(ano, mesNum);
    const totalCelulas = dias.length * trabalhos.length;
    const preenchidas = dias.reduce((acc, d) => acc + trabalhos.filter((t) => {
      const c = celulaMensal(d.iso, t.id);
      return c.nomes.length > 0 || c.temLeito;
    }).length, 0);

    const modelo = MODELOS_GRADE[store.contextoAtual] ?? MODELOS_GRADE.dirigentes;
    const cfg = GRADE_CONFIG[store.contextoAtual] ?? GRADE_CONFIG.dirigentes;
    const faltamTrabalhos = modelo.trabalhos.filter((n) =>
      !store.db.trabalhos.some((t) => t.ativo === 1 && t.nome.toLowerCase() === n.toLowerCase()));
    const diasSessao = [...new Set(store.db.horarios.map((h) => h.dia_semana))].sort();

    area.innerHTML = `
      <div class="toolbar no-print">
        <input type="month" id="f-mes" value="${mes}" aria-label="Mês da grade" />
        <span class="muted">${preenchidas}/${totalCelulas} células preenchidas</span>
        <div class="spacer"></div>
        <button class="btn btn-sm" id="btn-limpar-grade">Limpar grade</button>
        <button class="btn btn-sm" id="btn-distribuir">🎲 Distribuir Mediuns Automaticamente</button>
        <button class="btn btn-sm" id="btn-modelo">Criar grade modelo</button>
        <button class="btn btn-sm btn-primary" id="btn-imprimir">Imprimir</button>
      </div>
      ${(trabalhos.length === 0 || dias.length === 0 || store.mediunsAtivos().length === 0) ? `
      <div class="card no-print">
        <h3>Para preencher a grade corretamente</h3>
        <ul class="check">
          <li>${trabalhos.length > 0 ? '✅' : '⬜'} <strong>Trabalhos (colunas):</strong> ${trabalhos.length} cadastrado(s). O modelo usa ${modelo.trabalhos.length}: ${modelo.trabalhos.join(' · ')}.${faltamTrabalhos.length ? ` Faltam: ${faltamTrabalhos.join(', ')}.` : ''}</li>
          <li>${dias.length > 0 ? '✅' : '⬜'} <strong>Horários (linhas):</strong> cadastre ao menos 1 horário por trabalho em cada dia de sessão. Dias com grade hoje: ${diasSessao.length ? diasSessao.map((d) => DIAS_SEMANA[d]).join(', ') : 'nenhum'}.</li>
          <li>${store.mediunsAtivos().length > 0 ? '✅' : '⬜'} <strong>Médiuns (nomes):</strong> ${store.mediunsAtivos().length} ativo(s). Dá para cadastrar na hora, clicando na célula.</li>
        </ul>
        <p class="muted">O botão <strong>Criar grade modelo</strong> cadastra os trabalhos (${modelo.trabalhos.join(', ')}) e os horários de Qua/Sáb/Dom (19h–21h) sem duplicar o que já existe.</p>
      </div>` : ''}
      ${cfg.titulo ? `<h2 class="titulo-grade">${cfg.titulo}</h2><h3 class="titulo-grade-sub">ESCALA DOS AJANÃS — ${MESES[mesNum - 1].toUpperCase()} DE ${ano}</h3>` : ''}
      ${cfg.aviso ? `<p class="aviso-grade">${cfg.aviso}</p>` : ''}
      <h2 class="titulo-grade">Escala de trabalho do mês de ${MESES[mesNum - 1]} de ${ano}</h2>
      ${trabalhos.length === 0 || dias.length === 0 ? estadoVazio({ icone: '📅', titulo: 'Grade vazia', descricao: 'Complete os itens acima para gerar a grade.' }) : `
      <div class="table-wrap grade-wrap"><table class="grade">
        <thead><tr><th class="col-dia">DIA</th>${trabalhos.map((t) => `<th>${escapar(t.nome)}</th>`).join('')}</tr></thead>
        <tbody>
          ${dias.map((d) => `<tr>
            <td class="col-dia"><strong>${d.dia}-${DIAS_CURTO[d.dow].toLowerCase()}</strong><br/><small>${DIAS_CURTO[d.dow].toUpperCase()}</small></td>
            ${trabalhos.map((t) => {
              const semGrade = store.horariosDoTrabalhoNoDia(t.id, d.dow).length === 0;
              if (semGrade) return `<td class="fora-grade"><span class="muted">—</span></td>`;
              const c = celulaMensal(d.iso, t.id);
              const corpoNomes = c.nomes.map((n) => `<div class="nome">${escapar(n)}</div>`).join('');
              const leito = c.temLeito ? `<div class="nome leito">${escapar(c.itens.find((e) => e.medio_id === 0)?.observacao?.toUpperCase() || 'LEITO')}</div>` : '';
              const vazia = !c.nomes.length && !c.temLeito;
              return `<td class="${vazia ? 'vazia' : ''}"><button class="celula" data-dia="${d.iso}" data-trab="${t.id}" aria-label="${escapar(t.nome)} ${d.iso}">${corpoNomes}${leito}${vazia ? '<span class="muted">—</span>' : ''}</button></td>`;
            }).join('')}
          </tr>`).join('')}
        </tbody>
      </table></div>
      <p class="rodape-grade" id="rodape-grade">${escapar(store.notaDoMes(mes))}</p>
      ${cfg.rodapeFixo ? `<p class="rodape-fixo">${escapar(cfg.rodapeFixo)}</p>` : ''}
      <div class="card no-print">
        <h3>Avisos do rodapé</h3>
        <p class="muted">Ex.: Aramê: 20 &nbsp;|&nbsp; Angical: 15 &nbsp;|&nbsp; Julgamento: NT &nbsp;|&nbsp; Sessão Branca: 22 &nbsp;|&nbsp; Turigano: 14, 21, 28 &nbsp;|&nbsp; Leito Magnético: 03, 24</p>
        <div class="field"><label for="f-nota">Texto do rodapé de ${MESES[mesNum - 1]} de ${ano}</label>
        <textarea id="f-nota" rows="2">${escapar(store.notaDoMes(mes))}</textarea></div>
        <button class="btn btn-primary btn-sm" id="btn-nota">Salvar avisos</button>
      </div>`}`;

    area.querySelector('#f-mes').onchange = (e) => { mes = e.target.value || mes; desenharMensal(); };
    area.querySelector('#btn-imprimir').onclick = () => window.print();
    area.querySelector('#btn-limpar-grade').onclick = async (e) => {
      const btn = e.currentTarget;
      const total = store.db.escala.filter((em) =>
        em.data.startsWith(mes) && (em.contexto ?? 'dirigentes') === store.contextoAtual && em.medio_id > 0).length;
      if (!total) { toast('A grade deste mês já está vazia.', 'info'); return; }
      if (!confirm(`Remover os ${total} vínculo(s) de ${MESES[mes.split('-')[1] - 1]} de ${mes.split('-')[0]}? (LEITO é mantido)`)) return;
      btn.disabled = true;
      try {
        const n = await store.limparMes(mes);
        toast(`${n} vínculo(s) removido(s). Grade pronta para nova montagem.`);
      } catch (err) {
        toast(err.message, 'error');
      }
      desenharMensal();
    };
    area.querySelector('#btn-distribuir').onclick = () => abrirDistribuicao();
    area.querySelector('#btn-modelo').onclick = async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      try {
        await store.criarGradeModelo();
        toast('Grade modelo criada (10 trabalhos + horários Qua/Sáb/Dom).');
      } catch (err) { toast(err.message, 'error'); }
      btn.disabled = false;
      desenharMensal();
    };
    area.querySelector('#btn-nota')?.addEventListener('click', async () => {
      try {
        await store.salvarNotaDoMes(mes, area.querySelector('#f-nota').value.trim());
        toast('Avisos salvos.');
      } catch (err) { toast(err.message, 'error'); return; }
      desenharMensal();
    });
    area.querySelectorAll('.celula').forEach((b) => (b.onclick = () => abrirCelula(b.dataset.dia, Number(b.dataset.trab))));
  }

  // ---- Distribuição automática do mês ----
  function abrirDistribuicao() {
    const raiz = document.getElementById('modal-root');
    raiz.innerHTML = `
      <div class="modal-backdrop" id="dist-backdrop">
        <div class="modal" role="dialog" aria-modal="true" aria-label="Distribuição automática">
          <h2>Distribuir Mediuns Automaticamente</h2>
          <p class="modal-sub">Sorteio com rodízio justo para ${MESES[mes.split('-')[1] - 1]} de ${mes.split('-')[0]}.</p>
          <div class="alert info">Somente médiuns com função <strong>${FUNCAO_POR_CONTEXTO[store.contextoAtual] ?? '—'}</strong>. Respeita <strong>disponibilidade</strong> e <strong>conflitos de horário</strong>. Pula células <strong>LEITO</strong> e trabalhos sem horário no dia.</div>
          <div class="alert info">Quantidade por célula conforme o campo <strong>Quantidade de Mediuns</strong> de cada trabalho (menu Trabalhos).</div>
          <div class="quick-actions" style="flex-direction:column;align-items:stretch">
            <button class="btn btn-primary" id="d-vazias">Preencher células vazias</button>
            <button class="btn" id="d-tudo">Limpar e redistribuir tudo</button>
            <button class="btn btn-ghost" id="d-cancelar">Cancelar</button>
          </div>
        </div>
      </div>`;

    const fechar = (redesenhar = true) => { raiz.innerHTML = ''; document.removeEventListener('keydown', aoTecla); if (redesenhar) desenharMensal(); };
    function aoTecla(e) { if (e.key === 'Escape') fechar(); }
    document.addEventListener('keydown', aoTecla);
    raiz.querySelector('#dist-backdrop').addEventListener('mousedown', (e) => { if (e.target.id === 'dist-backdrop') fechar(); });
    raiz.querySelector('#d-cancelar').onclick = () => fechar();

    async function executar(modo, btn) {
      btn.disabled = true;
      btn.textContent = 'Distribuindo…';
      try {
        const r = await store.distribuirAutomaticamente(mes, { modo });
        let msg = `${r.preenchidas} célula(s) preenchida(s).`;
        if (r.removidas) msg += ` ${r.removidas} vínculo(s) anterior(es) removido(s).`;
        if (r.semHorario) msg += ` ${r.semHorario} sem horário cadastrado.`;
        if (r.incompletas) msg += ` ${r.incompletas} parcial(is) (faltou doutrinador elegível).`;
        if (r.semElegivel) msg += ` ${r.semElegivel} sem médium elegível (disponibilidade/conflito/função).`;
        toast(msg, r.preenchidas ? 'success' : 'info');
      } catch (err) {
        toast(err.message, 'error');
        fechar(false);
        desenharMensal();
        return;
      }
      fechar();
    }
    raiz.querySelector('#d-vazias').onclick = (e) => executar('vazias', e.currentTarget);
    raiz.querySelector('#d-tudo').onclick = (e) => {
      if (!confirm('Apagar todos os vínculos do mês e redistribuir do zero? (LEITO é mantido)')) return;
      executar('tudo', e.currentTarget);
    };
  }

  // ---- Modal da célula (vários médiuns + LEITO) ----
  function abrirCelula(dataISO, trabalhoId) {
    const trabalho = store.db.trabalhos.find((t) => t.id === trabalhoId);
    const dow = diaSemanaDe(dataISO);
    const horarios = store.horariosDoTrabalhoNoDia(trabalhoId, dow);
    const raiz = document.getElementById('modal-root');

    function pintar() {
      const c = celulaMensal(dataISO, trabalhoId);
      const ocupados = new Set(c.itens.map((e) => e.medio_id));
      const elegiveis = store.mediunsParaMontagem();
      const restrito = store.contextoAtual === 'ajanas';
      const livres = elegiveis.filter((m) => !ocupados.has(m.id));
      raiz.innerHTML = `
        <div class="modal-backdrop" id="cel-backdrop">
          <div class="modal" role="dialog" aria-modal="true" aria-label="Célula ${escapar(trabalho.nome)}">
            <h2>${escapar(trabalho.nome)}</h2>
            <p class="modal-sub">${formatarData(dataISO)} (${DIAS_SEMANA[dow]})${horarios.length ? ` · ${horarios[0].hora_inicio}–${horarios[0].hora_fim}` : ' · sem horário neste dia'}</p>
            ${horarios.length === 0 ? `<div class="alert danger">Cadastre um horário de <strong>${escapar(trabalho.nome)}</strong> para ${DIAS_SEMANA[dow]} antes de escalar (menu Horários).</div>` : ''}
            <h3>Escalados (${c.nomes.length}${c.temLeito ? ' + LEITO' : ''})</h3>
            ${c.itens.length === 0 ? '<p class="muted">Célula vazia.</p>' : `<ul class="list-clean">
              ${c.itens.map((e) => `<li><span>${e.observacao === LEITO ? '<strong class="leito">LEITO</strong>' : `<strong>${escapar(store.nomeMedium(e.medio_id))}</strong>`}</span>
                <button class="btn btn-sm" data-rm="${e.id}">Remover</button></li>`).join('')}
            </ul>`}
            ${horarios.length > 0 ? `
            <div class="field"><label for="c-medium">Adicionar médium</label>${restrito ? '<p class="hint muted">Somente função Ajanã.</p>' : ''}
              <div class="linha-add">
                <select id="c-medium">${livres.map((m) => `<option value="${m.id}">${escapar(m.nome)}</option>`).join('') || '<option value="">— todos já escalados —</option>'}</select>
                <button class="btn btn-primary btn-sm" id="c-add">Adicionar</button>
              </div></div>
            <div class="field"><label for="c-novo">Ou cadastrar médium com este nome</label>
              <div class="linha-add">
                <input id="c-novo" maxlength="100" placeholder="Nome do médium" />
                <button class="btn btn-sm" id="c-criar">Cadastrar e vincular</button>
              </div></div>` : ''}
            <div class="quick-actions">
              <button class="btn btn-sm" id="c-leito">${c.temLeito ? 'Desmarcar LEITO' : 'Marcar LEITO'}</button>
              ${c.itens.length ? '<button class="btn btn-sm" id="c-limpar">Limpar célula</button>' : ''}
            </div>
            <div class="modal-footer"><button class="btn btn-primary" id="c-fechar">Concluir</button></div>
          </div>
        </div>`;

      const fechar = () => { raiz.innerHTML = ''; document.removeEventListener('keydown', aoTecla); desenharMensal(); };
      function aoTecla(e) { if (e.key === 'Escape') fechar(); }
      document.addEventListener('keydown', aoTecla);
      raiz.querySelector('#cel-backdrop').addEventListener('mousedown', (e) => { if (e.target.id === 'cel-backdrop') fechar(); });
      raiz.querySelector('#c-fechar').onclick = fechar;
      raiz.querySelectorAll('[data-rm]').forEach((b) => (b.onclick = async () => {
        try {
          await store.excluir('escala', Number(b.dataset.rm));
          toast('Removido.', 'info');
        } catch (err) { toast(err.message, 'error'); return; }
        pintar();
      }));
      raiz.querySelector('#c-limpar')?.addEventListener('click', async () => {
        try {
          await store.excluirCelula(dataISO, trabalhoId);
          toast('Célula limpa.', 'info');
        } catch (err) { toast(err.message, 'error'); return; }
        pintar();
      });
      raiz.querySelector('#c-leito')?.addEventListener('click', async () => {
        try {
          if (c.temLeito) {
            const ids = c.itens.filter((e) => e.observacao === LEITO).map((e) => e.id);
            for (const id of ids) await store.excluir('escala', id);
            toast('LEITO desmarcado.', 'info');
          } else {
            await store.criar('escala', {
              medio_id: 0, trabalho_id: trabalhoId, data: dataISO,
              horario_id: horarios[0]?.id ?? 0, presente: 0, observacao: LEITO,
            });
            toast('LEITO marcado.');
          }
        } catch (err) { toast(err.message, 'error'); return; }
        pintar();
      });

      async function vincular(medioId) {
        const ref = horarios[0];
        if (restrito && !elegiveis.some((m) => m.id === medioId)) {
          toast('Somente médiuns com função Ajanã nesta escala.', 'error'); return;
        }
        if (haConflitoHorario(medioId, dataISO, ref.hora_inicio, ref.hora_fim, 0)) {
          toast('Conflito: médium já escalado neste horário.', 'error'); return;
        }
        if (!mediumDisponivelNaData(medioId, dataISO)) {
          toast('Médium sem disponibilidade para esta data.', 'error'); return;
        }
        try {
          await store.criar('escala', {
            medio_id: medioId, trabalho_id: trabalhoId, data: dataISO,
            horario_id: ref.id, presente: 0, observacao: '',
          });
          toast('Médium vinculado.');
        } catch (err) { toast(err.message, 'error'); return; }
        pintar();
      }

      raiz.querySelector('#c-add')?.addEventListener('click', async () => {
        const sel = raiz.querySelector('#c-medium');
        if (!sel.value) { toast('Nada a adicionar.', 'error'); return; }
        await vincular(Number(sel.value));
      });
      raiz.querySelector('#c-criar')?.addEventListener('click', async () => {
        const nome = raiz.querySelector('#c-novo').value.trim();
        if (!nome) { toast('Informe o nome.', 'error'); return; }
        try {
          let m = elegiveis.find((x) => x.nome.toLowerCase() === nome.toLowerCase());
          if (!m) {
            m = await store.criar('mediuns', { nome, telefone: '', email: '', observacao: '', funcao: restrito ? 'Ajanã' : '', ativo: 1 });
          }
          await vincular(m.id);
        } catch (err) { toast(err.message, 'error'); }
      });
    }
    pintar();
  }

  desenhar();
  return {
    setData(iso) {
      dataISO = iso; mes = iso.slice(0, 7); selecionado = -1;
      if (aba !== 'dia') {
        aba = 'dia';
        el.querySelectorAll('.tab').forEach((x) => {
          const on = x.dataset.aba === 'dia';
          x.classList.toggle('is-active', on);
          x.setAttribute('aria-selected', on ? 'true' : 'false');
        });
      }
      desenhar();
    },
  };
}

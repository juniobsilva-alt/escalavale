import {
  store, slotsDaData, celulaMensal, diasDeSessaoDoMes,
  haConflitoHorario, mediumDisponivelNaData,
  DIAS_SEMANA, DIAS_CURTO, MESES, SITUACAO, LEITO,
  MODELOS_GRADE, GRADE_CONFIG, FUNCAO_POR_CONTEXTO, GRADES_AJANAS,
} from '../store.js';
import { hojeISO, formatarData, diaSemanaDe, escapar, toast, pillSituacao, estadoVazio, limparTelefone } from '../utils.js';

const GRADES = GRADES_AJANAS;

function linkWhatsAppIndividual(m) {
  const tel = limparTelefone(m.telefone);
  if (!tel) return '';
  const fone = tel.startsWith('55') ? tel : `55${tel}`;
  const mesAtual = hojeISO().slice(0, 7);
  const escalas = store.db.escala.filter((e) =>
    e.medio_id === m.id && e.data.startsWith(mesAtual) && (e.contexto ?? 'dirigentes') === store.contextoAtual
  ).sort((a, b) => a.data.localeCompare(b.data));

  const [a, n] = mesAtual.split('-').map(Number);
  const nomeMes = MESES[n - 1];

  let msg = `Salve Deus, Irmão(ã) *${m.nome}*!\nSegue sua escala para *${nomeMes} de ${a}*:\n\n`;
  if (escalas.length === 0) {
    msg += `Nenhuma escala programada para este mês.\n`;
  } else {
    for (const esc of escalas) {
      const [, mesStr, dia] = esc.data.split('-');
      const dow = new Date(esc.data + 'T12:00:00').getDay();
      const trab = store.nomeTrabalho(esc.trabalho_id);
      const hor = store.db.horarios.find((h) => h.id === esc.horario_id);
      const horarioStr = hor ? ` (${hor.hora_inicio}–${hor.hora_fim})` : '';
      msg += `• *${DIAS_CURTO[dow]} ${dia}/${mesStr}*${horarioStr}: ${trab}\n`;
    }
  }
  msg += `\nCaso não possa comparecer, substitua antecipadamente!\nSalve Deus.`;
  return `https://wa.me/${fone}?text=${encodeURIComponent(msg)}`;
}

export function renderEscala(el, dataInicial, gradeKey = null) {
  const grade = gradeKey ? GRADES[gradeKey] : null;
  window.__orientacaoImpressao = gradeKey === 'aj-grade' ? 'portrait' : 'landscape';
  let aba = 'mensal';
  let dataISO = dataInicial || hojeISO();
  let mes = dataISO.slice(0, 7);
  let selecionado = -1;
  let mediumDestacadoId = 0;
  let modoVisualizacao = localStorage.getItem('escalavale_view_mode') || 'tabela';

  const ABREV_MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const ehBimestral = () => !!grade && store.contextoAtual === 'ajanas';
  function proximoMes(m) {
    let [a, n] = m.split('-').map(Number);
    n += 1;
    if (n > 12) { n = 1; a += 1; }
    return `${a}-${String(n).padStart(2, '0')}`;
  }
  function mesesDaGrade() {
    return ehBimestral() ? [mes, proximoMes(mes)] : [mes];
  }
  function rotuloPeriodo() {
    const mms = mesesDaGrade();
    const [a1, n1] = mms[0].split('-').map(Number);
    if (mms.length === 1) return `${MESES[n1 - 1]} de ${a1}`;
    const [a2, n2] = mms[1].split('-').map(Number);
    return a1 === a2 ? `${MESES[n1 - 1]} e ${MESES[n2 - 1]} de ${a1}` : `${MESES[n1 - 1]} de ${a1} e ${MESES[n2 - 1]} de ${a2}`;
  }

  function trabalhosDaGrade() {
    const todos = store.trabalhosAtivos();
    if (!grade) return todos;
    const ordem = grade.trabalhos.map((n) => n.toLowerCase());
    return todos
      .filter((t) => {
        const g = store.gradeDoTrabalho(t);
        return g === null || g === gradeKey;
      })
      .sort((a, b) => {
        const ia = ordem.indexOf(a.nome.toLowerCase());
        const ib = ordem.indexOf(b.nome.toLowerCase());
        return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || (a.ordem ?? 9999) - (b.ordem ?? 9999);
      });
  }

  el.innerHTML = `
    <div class="page-head no-print">
      <div><h1>${grade ? grade.titulo : store.nomeContexto()}</h1><p>Atribua médiuns aos horários do dia ou monte a grade mensal para impressão.${grade ? ` ${store.nomeContexto()}.` : ''}</p></div>
    </div>
    <div class="tabs" role="tablist" aria-label="Modo da escala">
      <button class="tab is-active" data-aba="mensal" role="tab" aria-selected="true">Grade mensal</button>
      <button class="tab" data-aba="dia" role="tab" aria-selected="false">Por dia</button>
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
        <button class="btn btn-sm" id="btn-wa-dia" title="Copiar texto formatado para o WhatsApp">📱 Copiar WhatsApp</button>
        <div class="spacer"></div>
        <button class="btn btn-sm" id="btn-imprimir">Imprimir</button>
      </div>
      <div id="dia-corpo"></div>`;
    const corpo = area.querySelector('#dia-corpo');
    area.querySelector('#f-data').onchange = (e) => { dataISO = e.target.value || hojeISO(); selecionado = -1; desenharDia(); };
    area.querySelector('#btn-hoje').onclick = () => { dataISO = hojeISO(); selecionado = -1; desenharDia(); };
    area.querySelector('#btn-imprimir').onclick = () => window.print();

    const idsGrade = grade ? trabalhosDaGrade().map((t) => t.id) : null;
    const slots = slotsDaData(dataISO).filter((sl) => !idsGrade || idsGrade.includes(sl.trabalho_id));
    const dia = DIAS_SEMANA[diaSemanaDe(dataISO)];
    const mediuns = store.mediunsParaMontagem();
    const restrito = store.contextoAtual === 'ajanas';

    area.querySelector('#btn-wa-dia').onclick = () => {
      const diaSem = DIAS_SEMANA[diaSemanaDe(dataISO)];
      const [a, m, d] = dataISO.split('-');
      let texto = `*ESCALA DE ${store.nomeContexto().toUpperCase()}*\n`;
      texto += `📅 *${d}/${m}/${a} (${diaSem})*\n\n`;
      for (const sl of slots) {
        const nomes = sl.todos_nomes.length ? sl.todos_nomes.join(', ') : 'Vaga em aberto';
        const leito = sl.tem_leito ? ' [LEITO]' : '';
        texto += `⏰ *${sl.hora_inicio}–${sl.hora_fim}* | *${sl.trabalho_nome}:* ${nomes}${leito}\n`;
      }
      texto += `\n_Salve Deus!_`;
      navigator.clipboard.writeText(texto);
      toast('Escala do dia copiada para colar no WhatsApp!');
    };

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
    const mFixo = s.medio_id ? store.db.mediuns.find((x) => x.id === s.medio_id) : null;
    const waIndividual = mFixo?.telefone ? linkWhatsAppIndividual(mFixo) : null;

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
        ${waIndividual ? `<a href="${waIndividual}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-sm" style="text-decoration:none">📱 WhatsApp</a>` : ''}
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
  // ============================ GRADE MENSAL ============================
  function desenharMensal() {
    const mms = mesesDaGrade();
    // Carrega meses sob demanda caso ainda não estejam em cache
    for (const mm of mms) {
      store.garantirMesCarregado(mm).catch(() => {});
    }

    const trabalhos = trabalhosDaGrade();
    const idsGrade = grade ? trabalhos.map((t) => t.id) : null;
    const dias = mms.flatMap((mm) => {
      const [a, n] = mm.split('-').map(Number);
      return diasDeSessaoDoMes(a, n, store.contextoAtual, idsGrade);
    });
    const totalCelulas = dias.length * trabalhos.length;
    const preenchidas = dias.reduce((acc, d) => acc + trabalhos.filter((t) => {
      const c = celulaMensal(d.iso, t.id);
      return c.nomes.length > 0 || c.temLeito;
    }).length, 0);

    const modelo = MODELOS_GRADE[store.contextoAtual] ?? MODELOS_GRADE.dirigentes;
    const cfg = GRADE_CONFIG[store.contextoAtual] ?? GRADE_CONFIG.dirigentes;
    const listaGrade = grade ? grade.trabalhos : modelo.trabalhos;
    const faltamTrabalhos = listaGrade.filter((n) =>
      !store.db.trabalhos.some((t) => t.ativo === 1 && (t.contexto ?? 'dirigentes') === store.contextoAtual && t.nome.toLowerCase() === n.toLowerCase()));
    const diasSessao = [...new Set(store.db.horarios.map((h) => h.dia_semana))].sort();

    // Contagem de escalas do médium destacado no período
    let totalDestaque = 0;
    if (mediumDestacadoId) {
      totalDestaque = store.db.escala.filter((e) =>
        e.medio_id === mediumDestacadoId &&
        mms.some((mm) => e.data.startsWith(mm)) &&
        (e.contexto ?? 'dirigentes') === store.contextoAtual &&
        (!idsGrade || idsGrade.includes(e.trabalho_id))
      ).length;
    }

    area.innerHTML = `
      <div class="toolbar no-print">
        <input type="month" id="f-mes" value="${mes}" aria-label="Mês da grade" />
        <span class="muted">${preenchidas}/${totalCelulas} células</span>
        <select id="sel-destaque" class="select-sm" aria-label="Destacar médium" style="max-width:170px">
          <option value="0">🔍 Destacar médium…</option>
          ${store.mediunsAtivos().map((m) => `<option value="${m.id}" ${m.id === mediumDestacadoId ? 'selected' : ''}>${escapar(m.nome)}</option>`).join('')}
        </select>
        <span id="badge-destaque" class="pill info" style="${mediumDestacadoId ? '' : 'display:none'}">${totalDestaque} escala(s)</span>
        <button class="btn btn-sm only-mobile" id="btn-modo-view">${modoVisualizacao === 'cards' ? '📋 Tabela' : '📱 Cards'}</button>
        <div class="spacer"></div>
        ${store.podeDesfazer() ? `<button class="btn btn-sm btn-ghost" id="btn-desfazer-grade" title="Desfazer última ação">↩ Desfazer</button>` : ''}
        <button class="btn btn-sm" id="btn-limpar-grade">Limpar grade</button>
        <button class="btn btn-sm" id="btn-distribuir">🎲 Distribuir Mediuns</button>
        <button class="btn btn-sm" id="btn-wa-resumo">📱 WhatsApp</button>
        <button class="btn btn-sm" id="btn-exportar-img">📸 Salvar Imagem</button>
        <button class="btn btn-sm" id="btn-modelo">Criar modelo</button>
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
        <p class="muted">O botão <strong>Criar modelo</strong> cadastra os trabalhos e os horários padrão sem duplicar o que já existe.</p>
        ${faltamTrabalhos.length ? `<button class="btn btn-primary btn-sm" id="btn-criar-grade">Criar trabalhos desta grade (${faltamTrabalhos.join(', ')})</button>` : ''}
      </div>` : ''}
      ${cfg.titulo ? `<h2 class="titulo-grade titulo-tarajo">${cfg.titulo}</h2><h3 class="titulo-grade-sub">ESCALA DOS AJANÃS${grade && gradeKey !== 'aj-grade' ? ' — ' + grade.titulo.toUpperCase() : ''} — ${rotuloPeriodo().toUpperCase()}</h3>` : ''}
      ${cfg.aviso ? `<p class="aviso-grade">${cfg.aviso}</p>` : ''}
      ${gradeKey === 'aj-grade' ? '' : `<h2 class="titulo-grade">${ehBimestral() ? 'Escala de trabalho' : 'Escala de trabalho do mês'} de ${rotuloPeriodo()}</h2>`}
      ${trabalhos.length === 0 || dias.length === 0 ? estadoVazio({
        icone: '📅', titulo: 'Grade vazia', descricao: 'Complete os itens acima para gerar a grade.',
        acaoHTML: faltamTrabalhos.length ? `<button class="btn btn-primary btn-sm" id="vazio-criar">Criar trabalhos desta grade</button>` : '',
      }) : (modoVisualizacao === 'cards' ? `
        <div class="grade-cards-wrap">
          ${dias.map((d) => `
            <div class="card grade-dia-card">
              <div class="grade-dia-head">
                <strong>${DIAS_SEMANA[d.dow]}, ${String(d.dia).padStart(2, '0')}/${ABREV_MES[Number(d.iso.slice(5, 7)) - 1]}</strong>
              </div>
              <div class="grade-dia-grid">
                ${trabalhos.map((t) => {
                  const semGrade = store.horariosDoTrabalhoNoDia(t.id, d.dow).length === 0;
                  if (semGrade) return '';
                  const c = celulaMensal(d.iso, t.id);
                  const mediunsItens = c.itens.filter((e) => e.medio_id > 0);
                  const vazia = !mediunsItens.length && !c.temLeito;
                  const temAlvo = mediumDestacadoId && c.itens.some((e) => e.medio_id === mediumDestacadoId);
                  return `
                    <div class="grade-card-item ${vazia ? 'vazia' : ''} ${temAlvo ? 'destaque-medium' : ''}" data-dia="${d.iso}" data-trab="${t.id}" role="button" tabindex="0">
                      <span class="card-item-trab">${escapar(t.nome)}</span>
                      <span class="card-item-nomes">
                        ${c.temLeito ? '<span class="pill danger">LEITO</span>' : (mediunsItens.length ? mediunsItens.map((item) => {
                          const mid = item.medio_id;
                          const n = store.nomeMedium(mid);
                          const ehAlvo = mediumDestacadoId && mid === mediumDestacadoId;
                          return `<span class="nome ${ehAlvo ? 'destaque-medium' : ''}" data-escala-id="${item.id}" data-medio-id="${mid}" title="Clique para trocar ${escapar(n)}">${escapar(n)}</span>`;
                        }).join(', ') : '<span class="muted">—</span>')}
                      </span>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="table-wrap grade-wrap"><table class="grade">
          <thead><tr><th class="col-dia">DIA</th>${trabalhos.map((t) => `<th>${escapar(t.nome)}</th>`).join('')}</tr></thead>
          <tbody>
            ${dias.map((d) => `<tr>
              <td class="col-dia"><strong>${DIAS_CURTO[d.dow]} ${String(d.dia).padStart(2, '0')}/${(() => { const m = ABREV_MES[Number(d.iso.slice(5, 7)) - 1]; return m[0].toUpperCase() + m.slice(1); })()}</strong></td>
              ${trabalhos.map((t) => {
                const semGrade = store.horariosDoTrabalhoNoDia(t.id, d.dow).length === 0;
                if (semGrade) return `<td class="fora-grade"><span class="muted">—</span></td>`;
                const c = celulaMensal(d.iso, t.id);
                const mediunsItens = c.itens.filter((e) => e.medio_id > 0);
                const corpoNomes = mediunsItens.map((item) => {
                  const mid = item.medio_id;
                  const n = store.nomeMedium(mid);
                  const ehAlvo = mediumDestacadoId && mid === mediumDestacadoId;
                  return `<div class="nome ${ehAlvo ? 'destaque-medium' : ''}" data-escala-id="${item.id}" data-medio-id="${mid}" role="button" tabindex="0" title="Clique para trocar ou substituir ${escapar(n)}">${escapar(n)}</div>`;
                }).join('');
                const leito = c.temLeito ? `<div class="nome leito">${escapar(c.itens.find((e) => e.medio_id === 0)?.observacao?.toUpperCase() || 'LEITO')}</div>` : '';
                const vazia = !mediunsItens.length && !c.temLeito;
                const celulaDestacada = mediumDestacadoId && c.itens.some((e) => e.medio_id === mediumDestacadoId);
                return `<td class="${vazia ? 'vazia' : ''} ${celulaDestacada ? 'celula-destaque' : ''}"><div class="celula" data-dia="${d.iso}" data-trab="${t.id}" role="button" tabindex="0" aria-label="${escapar(t.nome)} ${d.iso}">${corpoNomes}${leito}${vazia ? '<span class="muted">—</span>' : ''}</div></td>`;
              }).join('')}
            </tr>`).join('')}
          </tbody>
        </table></div>
      `)}
      <p class="rodape-grade" id="rodape-grade">${mms.map((mm) => escapar(store.notaDoMes(mm))).filter(Boolean).join(' | ')}</p>
      ${cfg.rodapeFixo ? `<p class="rodape-fixo">${escapar(cfg.rodapeFixo)}</p>` : ''}
      <div class="card no-print">
        <h3>Avisos do rodapé</h3>
        <p class="muted">Ex.: Aramê: 20 &nbsp;|&nbsp; Angical: 15 &nbsp;|&nbsp; Julgamento: NT &nbsp;|&nbsp; Sessão Branca: 22 &nbsp;|&nbsp; Turigano: 14, 21, 28 &nbsp;|&nbsp; Leito Magnético: 03, 24</p>
        ${mms.map((mm) => {
          const [a, n] = mm.split('-').map(Number);
          return `<div class="field"><label for="f-nota-${mm}">Texto do rodapé de ${MESES[n - 1]} de ${a}</label>
          <textarea id="f-nota-${mm}" rows="2">${escapar(store.notaDoMes(mm))}</textarea></div>`;
        }).join('')}
        <button class="btn btn-primary btn-sm" id="btn-nota">Salvar avisos</button>
      </div>`;

    async function criarTrabalhosDaGrade(btn) {
      const maxOrdem = Math.max(0, ...store.db.trabalhos.map((t) => t.ordem ?? 0));
      if (btn) btn.disabled = true;
      try {
        for (const [i, nome] of faltamTrabalhos.entries()) {
          const t = await store.criar('trabalhos', {
            nome, descricao: '', ativo: 1, ordem: maxOrdem + 10 + i * 10,
            qtd_mediuns: (grade?.qtd[nome]) ?? 1, grade: gradeKey,
          });
          await Promise.all(modelo.dias.map((dow) => store.criar('horarios', {
            trabalho_id: t.id, dia_semana: dow, hora_inicio: modelo.hora[0], hora_fim: modelo.hora[1],
          })));
        }
        toast('Trabalhos da grade criados.');
      } catch (err) {
        toast(err.message, 'error');
        if (btn) btn.disabled = false;
        return;
      }
      desenharMensal();
    }
    area.querySelector('#btn-criar-grade')?.addEventListener('click', (e) => criarTrabalhosDaGrade(e.currentTarget));
    area.querySelector('#vazio-criar')?.addEventListener('click', (e) => criarTrabalhosDaGrade(e.currentTarget));
    area.querySelector('#f-mes').onchange = (e) => { mes = e.target.value || mes; desenharMensal(); };
    area.querySelector('#btn-imprimir').onclick = () => window.print();

    // Destaque de médium
    area.querySelector('#sel-destaque')?.addEventListener('change', (e) => {
      mediumDestacadoId = Number(e.target.value);
      desenharMensal();
    });

    // Alternar modo de visualização mobile
    area.querySelector('#btn-modo-view')?.addEventListener('click', () => {
      modoVisualizacao = modoVisualizacao === 'cards' ? 'tabela' : 'cards';
      localStorage.setItem('escalavale_view_mode', modoVisualizacao);
      desenharMensal();
    });

    // Desfazer última alteração
    area.querySelector('#btn-desfazer-grade')?.addEventListener('click', async () => {
      const desc = await store.desfazer();
      desenharMensal();
      toast(`Desfeito: ${desc || 'Última ação'}`);
    });

    // WhatsApp Resumo
    area.querySelector('#btn-wa-resumo')?.addEventListener('click', () => abrirModalWhatsAppResumo());

    // Exportar Imagem PNG
    area.querySelector('#btn-exportar-img')?.addEventListener('click', () => exportarGradeComoPNG());

    area.querySelector('#btn-limpar-grade').onclick = async (e) => {
      const btn = e.currentTarget;
      const idsLimpar = grade ? trabalhosDaGrade().map((t) => t.id) : null;
      const mmsLimpar = mesesDaGrade();
      const total = store.db.escala.filter((em) =>
        mmsLimpar.some((mm) => em.data.startsWith(mm)) && (em.contexto ?? 'dirigentes') === store.contextoAtual && em.medio_id > 0 &&
        (!idsLimpar || idsLimpar.includes(em.trabalho_id))).length;
      if (!total) { toast('A grade deste período já está vazia.', 'info'); return; }
      if (!confirm(`Remover os ${total} vínculo(s) de ${rotuloPeriodo()}? (LEITO é mantido)`)) return;
      btn.disabled = true;
      try {
        let n = 0;
        for (const mm of mmsLimpar) n += await store.limparMes(mm, store.contextoAtual, idsLimpar);
        toast(`${n} vínculo(s) removido(s). Grade pronta para nova montagem.`, 'info', {
          aoAcao: async () => {
            await store.desfazer();
            desenharMensal();
            toast('Grade restaurada.');
          },
        });
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
        toast('Grade modelo criada.');
      } catch (err) { toast(err.message, 'error'); }
      btn.disabled = false;
      desenharMensal();
    };
    area.querySelector('#btn-nota')?.addEventListener('click', async () => {
      try {
        for (const mm of mesesDaGrade()) {
          await store.salvarNotaDoMes(mm, area.querySelector(`#f-nota-${mm}`).value.trim());
        }
        toast('Avisos salvos.');
      } catch (err) { toast(err.message, 'error'); return; }
      desenharMensal();
    });
    area.querySelectorAll('.celula, .grade-card-item').forEach((cell) => {
      cell.onclick = (e) => {
        const nomeEl = e.target.closest('.nome[data-escala-id]');
        if (nomeEl) {
          e.stopPropagation();
          abrirModalTrocar({
            escalaId: Number(nomeEl.dataset.escalaId),
            medioId: Number(nomeEl.dataset.medioId),
            dataISO: cell.dataset.dia,
            trabalhoId: Number(cell.dataset.trab),
          });
          return;
        }
        abrirCelula(cell.dataset.dia, Number(cell.dataset.trab));
      };
    });
  }

  // ---- Modal de Resumo WhatsApp ----
  function abrirModalWhatsAppResumo() {
    const raiz = document.getElementById('modal-root');
    const trabs = trabalhosDaGrade();
    const mms = mesesDaGrade();
    const periodo = rotuloPeriodo();
    const dias = mms.flatMap((mm) => {
      const [a, n] = mm.split('-').map(Number);
      return diasDeSessaoDoMes(a, n, store.contextoAtual, trabs.map((t) => t.id));
    });

    const hoje = new Date();
    const hojeIso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    const diaDefault = dias.find((d) => d.iso >= hojeIso)?.iso ?? dias[dias.length - 1]?.iso ?? dias[0]?.iso ?? '';

    raiz.innerHTML = `
      <div class="modal-backdrop" id="wa-resumo-backdrop">
        <div class="modal" role="dialog" aria-modal="true" aria-label="Compartilhar escala no WhatsApp">
          <h2>📱 Compartilhar no WhatsApp</h2>
          <p class="modal-sub">Gere o texto pronto para envio em grupos ou individuais para ${escapar(periodo)}.</p>
          <div class="field">
            <label for="wa-sel-tipo">Tipo de resumo</label>
            <select id="wa-sel-tipo">
              <option value="dia" selected>Escala por dia</option>
              <option value="completo">Escala Completa do Período</option>
              <option value="trabalho">Escala de um Trabalho Específico</option>
            </select>
          </div>
          <div class="field" id="field-wa-dia">
            <label for="wa-sel-dia">Selecione o Dia</label>
            <select id="wa-sel-dia">
              ${dias.map((d) => {
                const [, mNum, diaStr] = d.iso.split('-');
                const sel = d.iso === diaDefault ? 'selected' : '';
                return `<option value="${d.iso}" ${sel}>${DIAS_SEMANA[d.dow]}, ${diaStr}/${mNum}</option>`;
              }).join('')}
            </select>
          </div>
          <div class="field" id="field-wa-trab" style="display:none">
            <label for="wa-sel-trab">Selecione o Trabalho</label>
            <select id="wa-sel-trab">
              ${trabs.map((t) => `<option value="${t.id}">${escapar(t.nome)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="wa-preview">Pré-visualização do texto:</label>
            <textarea id="wa-preview" rows="8" readonly style="font-family:monospace;font-size:.85rem;width:100%"></textarea>
          </div>
          <div class="quick-actions">
            <button class="btn btn-primary" id="wa-btn-copiar">📋 Copiar Texto</button>
            <button class="btn btn-ghost" id="wa-btn-fechar">Fechar</button>
          </div>
        </div>
      </div>`;

    const fechar = () => { raiz.innerHTML = ''; };
    raiz.querySelector('#wa-btn-fechar').onclick = fechar;
    raiz.querySelector('#wa-resumo-backdrop').addEventListener('mousedown', (e) => {
      if (e.target.id === 'wa-resumo-backdrop') fechar();
    });

    const selTipo = raiz.querySelector('#wa-sel-tipo');
    const selDia = raiz.querySelector('#wa-sel-dia');
    const fDia = raiz.querySelector('#field-wa-dia');
    const selTrab = raiz.querySelector('#wa-sel-trab');
    const fTrab = raiz.querySelector('#field-wa-trab');
    const txtPreview = raiz.querySelector('#wa-preview');

    const tituloContexto = store.nomeContexto().toUpperCase().startsWith('ESCALA')
      ? store.nomeContexto().toUpperCase()
      : `ESCALA DE ${store.nomeContexto().toUpperCase()}`;

    function formatarEscalaDiaWhatsApp(dataIso) {
      if (!dataIso) return 'Nenhum dia disponível.';
      const d = dias.find((x) => x.iso === dataIso);
      const dow = d ? d.dow : diaSemanaDe(dataIso);
      const [a, mNum, diaStr] = dataIso.split('-');
      const diaSem = DIAS_SEMANA[dow];

      let texto = `*${tituloContexto}*\n`;
      texto += `📅 *${diaSem}, ${diaStr}/${mNum}/${a}*\n\n`;

      let temTrabalho = false;
      for (const t of trabs) {
        if (store.horariosDoTrabalhoNoDia(t.id, dow).length === 0) continue;
        temTrabalho = true;
        const c = celulaMensal(dataIso, t.id);
        let nomes = '—';
        if (c.nomes.length) {
          nomes = c.nomes.join(', ');
          if (c.temLeito) nomes += ' [LEITO]';
        } else if (c.temLeito) {
          const leitoItem = c.itens.find((e) => e.medio_id === 0);
          nomes = `[${leitoItem?.observacao?.toUpperCase() || 'LEITO'}]`;
        }
        texto += `• *${t.nome}:* ${nomes}\n`;
      }

      if (!temTrabalho) {
        texto += `_Nenhum trabalho cadastrado para este dia._\n`;
      }

      texto += `\n_Salve Deus!_`;
      return texto;
    }

    function formatarEscalaCompletaWhatsApp() {
      let texto = `*${tituloContexto}*\n`;
      texto += `*Período: ${periodo}*\n\n`;

      for (const d of dias) {
        const [, mNum, diaStr] = d.iso.split('-');
        texto += `📅 *${DIAS_CURTO[d.dow]} ${diaStr}/${mNum}:*\n`;
        for (const t of trabs) {
          if (store.horariosDoTrabalhoNoDia(t.id, d.dow).length === 0) continue;
          const c = celulaMensal(d.iso, t.id);
          const nomes = c.nomes.length ? c.nomes.join(', ') : (c.temLeito ? '[LEITO]' : '—');
          texto += `  • *${t.nome}:* ${nomes}\n`;
        }
        texto += `\n`;
      }
      texto += `_Salve Deus!_`;
      return texto;
    }

    function formatarEscalaTrabalhoWhatsApp(trabalhoId) {
      const t = store.db.trabalhos.find((x) => x.id === trabalhoId);
      const nomeTrabalho = t?.nome || 'Trabalho';
      let texto = `*${tituloContexto}*\n`;
      texto += `*Trabalho: ${nomeTrabalho.toUpperCase()}*\n`;
      texto += `*Período: ${periodo}*\n\n`;

      const diasDoTrab = mms.flatMap((mm) => {
        const [a, n] = mm.split('-').map(Number);
        return diasDeSessaoDoMes(a, n, store.contextoAtual, [trabalhoId]);
      });

      for (const d of diasDoTrab) {
        const [, mNum, diaStr] = d.iso.split('-');
        const c = celulaMensal(d.iso, trabalhoId);
        const nomes = c.nomes.length ? c.nomes.join(', ') : (c.temLeito ? '[LEITO]' : 'Vaga em aberto');
        texto += `• *${DIAS_CURTO[d.dow]} ${diaStr}/${mNum}:* ${nomes}\n`;
      }
      texto += `\n_Salve Deus!_`;
      return texto;
    }

    function atualizarTexto() {
      if (selTipo.value === 'dia') {
        fDia.style.display = '';
        fTrab.style.display = 'none';
        txtPreview.value = formatarEscalaDiaWhatsApp(selDia.value);
      } else if (selTipo.value === 'completo') {
        fDia.style.display = 'none';
        fTrab.style.display = 'none';
        txtPreview.value = formatarEscalaCompletaWhatsApp();
      } else {
        fDia.style.display = 'none';
        fTrab.style.display = '';
        txtPreview.value = formatarEscalaTrabalhoWhatsApp(Number(selTrab.value));
      }
    }

    selTipo.onchange = atualizarTexto;
    selDia.onchange = atualizarTexto;
    selTrab.onchange = atualizarTexto;
    atualizarTexto();

    raiz.querySelector('#wa-btn-copiar').onclick = () => {
      navigator.clipboard.writeText(txtPreview.value);
      toast('Texto formatado copiado para a área de transferência!');
      fechar();
    };
  }

  // ---- Exportação de Imagem PNG da Grade ----
  async function exportarGradeComoPNG() {
    const mms = mesesDaGrade();
    const trabs = trabalhosDaGrade();
    const idsGrade = grade ? trabs.map((t) => t.id) : null;
    const dias = mms.flatMap((mm) => {
      const [a, n] = mm.split('-').map(Number);
      return diasDeSessaoDoMes(a, n, store.contextoAtual, idsGrade);
    });
    const cfg = GRADE_CONFIG[store.contextoAtual] ?? GRADE_CONFIG.dirigentes;

    if (trabs.length === 0 || dias.length === 0) {
      toast('Grade vazia. Nada a exportar.', 'warn');
      return;
    }

    if (document.fonts) {
      try {
        await document.fonts.ready;
      } catch {}
    }

    function quebrarTexto(c, text, maxW) {
      const words = text.split(' ');
      const lines = [];
      let current = '';
      for (const w of words) {
        const candidate = current ? current + ' ' + w : w;
        if (c.measureText(candidate).width <= maxW) {
          current = candidate;
        } else {
          if (current) lines.push(current);
          current = w;
        }
      }
      if (current) lines.push(current);
      return lines.length ? lines : [text];
    }

    function formatarTextoLargura(c, texto, maxW) {
      if (c.measureText(texto).width <= maxW) return texto;
      let t = texto;
      while (t.length > 3 && c.measureText(t + '…').width > maxW) {
        t = t.slice(0, -1);
      }
      return t + '…';
    }

    // Configuração dos Títulos do Topo
    const headerLines = [];
    if (cfg.titulo) {
      headerLines.push({ text: cfg.titulo, font: 'bold 22px Inter, sans-serif', color: '#000000', gap: 6 });
      headerLines.push({
        text: `ESCALA DOS AJANÃS${grade && gradeKey !== 'aj-grade' ? ' — ' + grade.titulo.toUpperCase() : ''} — ${rotuloPeriodo().toUpperCase()}`,
        font: 'bold 16px Inter, sans-serif',
        color: '#000000',
        gap: 6,
      });
      if (cfg.aviso) {
        headerLines.push({ text: cfg.aviso, font: 'bold 12px Inter, sans-serif', color: '#000000', gap: 6 });
      }
      if (gradeKey !== 'aj-grade') {
        headerLines.push({
          text: `${ehBimestral() ? 'Escala de trabalho' : 'Escala de trabalho do mês'} de ${rotuloPeriodo()}`,
          font: 'bold 18px Inter, sans-serif',
          color: '#cc0000',
          gap: 12,
        });
      }
    } else {
      headerLines.push({
        text: `${ehBimestral() ? 'Escala de trabalho' : 'Escala de trabalho do mês'} de ${rotuloPeriodo()}`,
        font: 'bold 22px Inter, sans-serif',
        color: '#cc0000',
        gap: 14,
      });
    }

    const padding = 30;
    const colDiaWidth = 110;
    const colWidth = Math.min(220, Math.max(135, Math.floor((1920 - padding * 2 - colDiaWidth) / trabs.length)));
    const tableWidth = colDiaWidth + trabs.length * colWidth;
    const totalWidth = padding * 2 + tableWidth;

    const topPadding = 25;
    let headerHeight = topPadding;
    for (const hl of headerLines) {
      const fontSize = parseInt(hl.font.match(/(\d+)px/)[1], 10);
      headerHeight += fontSize + hl.gap;
    }

    const headerRowH = 34;
    const celulasData = [];
    const rowHeights = [];

    for (let r = 0; r < dias.length; r++) {
      const d = dias[r];
      const rowCells = [];
      let maxLines = 1;

      for (let c = 0; c < trabs.length; c++) {
        const t = trabs[c];
        const semGrade = store.horariosDoTrabalhoNoDia(t.id, d.dow).length === 0;

        if (semGrade) {
          rowCells.push({
            bg: '#e5e7eb',
            lines: [{ text: '—', color: '#64748b', font: '13px Inter, sans-serif', align: 'center' }]
          });
          continue;
        }

        const cel = celulaMensal(d.iso, t.id);
        const vazia = !cel.nomes.length && !cel.temLeito;

        if (vazia) {
          rowCells.push({
            bg: '#fafafa',
            lines: [{ text: '—', color: '#94a3b8', font: '13px Inter, sans-serif', align: 'center' }]
          });
          continue;
        }

        const lines = [];
        for (const n of cel.nomes) {
          lines.push({ text: n, color: '#000000', font: '12px Inter, sans-serif', align: 'left' });
        }
        if (cel.temLeito) {
          const leitoItem = cel.itens.find((e) => e.medio_id === 0);
          const leitoTexto = leitoItem?.observacao?.toUpperCase() || 'LEITO';
          lines.push({ text: leitoTexto, color: '#cc0000', font: 'bold 12px Inter, sans-serif', align: 'left' });
        }

        if (lines.length > maxLines) maxLines = lines.length;
        rowCells.push({ bg: '#ffffff', lines });
      }

      celulasData.push(rowCells);
      rowHeights.push(Math.max(28, maxLines * 15 + 10));
    }

    const tableRowsH = rowHeights.reduce((acc, h) => acc + h, 0);
    const tableHeight = headerRowH + tableRowsH;

    // Cálculo prévio do rodapé
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    const notas = mms.map((mm) => store.notaDoMes(mm)).filter(Boolean).join(' | ');

    let footerHeight = 25;
    let linhasNotas = [];
    let linhasFixo = [];

    if (notas) {
      tempCtx.font = '600 12px Inter, sans-serif';
      linhasNotas = quebrarTexto(tempCtx, notas, tableWidth);
      footerHeight += linhasNotas.length * 16 + 8;
    }
    if (cfg.rodapeFixo) {
      tempCtx.font = 'italic 11px Inter, sans-serif';
      linhasFixo = quebrarTexto(tempCtx, cfg.rodapeFixo, tableWidth);
      footerHeight += linhasFixo.length * 15 + 8;
    }

    const totalHeight = headerHeight + tableHeight + footerHeight;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = totalWidth;
    canvas.height = totalHeight;

    // Fundo branco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    // 1. Títulos
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let yTitle = topPadding;
    for (const hl of headerLines) {
      const fontSize = parseInt(hl.font.match(/(\d+)px/)[1], 10);
      ctx.font = hl.font;
      ctx.fillStyle = hl.color;
      ctx.fillText(hl.text, totalWidth / 2, yTitle + fontSize / 2);
      yTitle += fontSize + hl.gap;
    }

    const startY = headerHeight;

    // 2. Fundos das células
    // Cabeçalho
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(padding, startY, tableWidth, headerRowH);

    // Linhas de dados
    let curRowY = startY + headerRowH;
    for (let r = 0; r < dias.length; r++) {
      const rowH = rowHeights[r];

      // Fundo coluna DIA
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(padding, curRowY, colDiaWidth, rowH);

      // Fundo colunas de trabalho
      for (let c = 0; c < trabs.length; c++) {
        const colX = padding + colDiaWidth + c * colWidth;
        ctx.fillStyle = celulasData[r][c].bg;
        ctx.fillRect(colX, curRowY, colWidth, rowH);
      }
      curRowY += rowH;
    }

    // 3. Linhas da grade (borda vermelha #cc0000 de 2px, idêntica à impressão)
    ctx.strokeStyle = '#cc0000';
    ctx.lineWidth = 2;

    // Borda externa
    ctx.strokeRect(padding, startY, tableWidth, tableHeight);

    // Divisórias horizontais
    ctx.beginPath();
    let lineY = startY + headerRowH;
    ctx.moveTo(padding, lineY);
    ctx.lineTo(padding + tableWidth, lineY);

    for (let r = 0; r < dias.length - 1; r++) {
      lineY += rowHeights[r];
      ctx.moveTo(padding, lineY);
      ctx.lineTo(padding + tableWidth, lineY);
    }

    // Divisórias verticais
    const xDia = padding + colDiaWidth;
    ctx.moveTo(xDia, startY);
    ctx.lineTo(xDia, startY + tableHeight);

    for (let c = 0; c < trabs.length - 1; c++) {
      const colX = xDia + (c + 1) * colWidth;
      ctx.moveTo(colX, startY);
      ctx.lineTo(colX, startY + tableHeight);
    }
    ctx.stroke();

    // 4. Textos do cabeçalho
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DIA', padding + colDiaWidth / 2, startY + headerRowH / 2);

    for (let c = 0; c < trabs.length; c++) {
      const colX = padding + colDiaWidth + c * colWidth;
      const nomeTrab = formatarTextoLargura(ctx, trabs[c].nome, colWidth - 8);
      ctx.fillText(nomeTrab, colX + colWidth / 2, startY + headerRowH / 2);
    }

    // 5. Textos das linhas de dados
    curRowY = startY + headerRowH;
    for (let r = 0; r < dias.length; r++) {
      const d = dias[r];
      const rowH = rowHeights[r];

      // Texto da coluna DIA
      const nomeMesAbrev = ABREV_MES[Number(d.iso.slice(5, 7)) - 1];
      const mesCap = nomeMesAbrev[0].toUpperCase() + nomeMesAbrev.slice(1);
      const diaTexto = `${DIAS_CURTO[d.dow]} ${String(d.dia).padStart(2, '0')}/${mesCap}`;

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(diaTexto, padding + colDiaWidth / 2, curRowY + rowH / 2);

      // Texto das células
      for (let c = 0; c < trabs.length; c++) {
        const colX = padding + colDiaWidth + c * colWidth;
        const cell = celulasData[r][c];
        const lines = cell.lines;
        const lineH = 15;
        const totalTextH = lines.length * lineH;
        const startTextY = curRowY + (rowH - totalTextH) / 2 + lineH / 2;

        for (let i = 0; i < lines.length; i++) {
          const l = lines[i];
          ctx.fillStyle = l.color;
          ctx.font = l.font;
          ctx.textBaseline = 'middle';
          const textY = startTextY + i * lineH;

          if (l.align === 'center') {
            ctx.textAlign = 'center';
            ctx.fillText(l.text, colX + colWidth / 2, textY);
          } else {
            ctx.textAlign = 'left';
            const txt = formatarTextoLargura(ctx, l.text, colWidth - 14);
            ctx.fillText(txt, colX + 8, textY);
          }
        }
      }
      curRowY += rowH;
    }

    // 6. Rodapé
    let currentFooterY = startY + tableHeight + 12;
    if (linhasNotas.length) {
      ctx.fillStyle = '#000000';
      ctx.font = '600 12px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      for (const ln of linhasNotas) {
        ctx.fillText(ln, padding, currentFooterY);
        currentFooterY += 16;
      }
    }

    if (linhasFixo.length) {
      currentFooterY += 4;
      ctx.fillStyle = '#64748b';
      ctx.font = 'italic 11px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      for (const ln of linhasFixo) {
        ctx.fillText(ln, padding, currentFooterY);
        currentFooterY += 15;
      }
    }

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `escala-${store.contextoAtual}-${mes}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast('Imagem da grade baixada com sucesso!');
    }, 'image/png');
  }

  // ---- Distribuição automática do mês ----
  function abrirDistribuicao() {
    const raiz = document.getElementById('modal-root');
    raiz.innerHTML = `
      <div class="modal-backdrop" id="dist-backdrop">
        <div class="modal" role="dialog" aria-modal="true" aria-label="Distribuição automática">
          <h2>Distribuir Mediuns Automaticamente</h2>
          <p class="modal-sub">Sorteio com rodízio justo para ${rotuloPeriodo()}.</p>
          <div class="alert info">Somente médiuns com função <strong>${FUNCAO_POR_CONTEXTO[store.contextoAtual] ?? '—'}</strong>. Respeita <strong>disponibilidade</strong> e <strong>conflitos de horário</strong>. Pula células <strong>LEITO</strong> e trabalhos sem horário no dia.</div>
          <div class="alert info">Quantidade por célula conforme o campo <strong>Quantidade de Mediuns</strong> de cada trabalho (menu Trabalhos).</div>
          <div class="field">
            <label for="dist-max-med">Limite máximo de escalas por médium no período (opcional):</label>
            <input type="number" id="dist-max-med" min="1" max="30" placeholder="Sem limite (padrão)" />
            <p class="hint">Ex.: 2 ou 3 vezes no período para evitar sobrecarga.</p>
          </div>
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
        const idsDist = grade ? trabalhosDaGrade().map((t) => t.id) : null;
        const limiteMax = Number(raiz.querySelector('#dist-max-med')?.value) || 0;
        // Unifica a contagem no bimestre passando todos os meses da grade
        const r = await store.distribuirAutomaticamente(mesesDaGrade(), {
          modo,
          trabalhoIds: idsDist,
          limiteMaximoPorMedium: limiteMax,
        });
        let msg = `${r.preenchidas} célula(s) preenchida(s) no período.`;
        if (r.removidas) msg += ` ${r.removidas} vínculo(s) anterior(es) removido(s).`;
        if (r.semHorario) msg += ` ${r.semHorario} sem horário cadastrado.`;
        if (r.incompletas) msg += ` ${r.incompletas} parcial(is) (faltou elegível).`;
        if (r.semElegivel) msg += ` ${r.semElegivel} sem médium elegível (disponibilidade/conflito/função).`;
        toast(msg, r.preenchidas ? 'success' : 'info', {
          aoAcao: async () => {
            await store.desfazer();
            desenharMensal();
            toast('Distribuição desfeita.');
          },
        });
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
      if (!confirm(`Apagar todos os vínculos de ${rotuloPeriodo()} e redistribuir do zero? (LEITO é mantido)`)) return;
      executar('tudo', e.currentTarget);
    };
  }

  // ---- Modal para Trocar / Substituir Médium da Célula ----
  function abrirModalTrocar({ escalaId, medioId, dataISO, trabalhoId }) {
    const raiz = document.getElementById('modal-root');
    const trabalho = store.db.trabalhos.find((t) => t.id === trabalhoId);
    const dow = diaSemanaDe(dataISO);
    const horarios = store.horariosDoTrabalhoNoDia(trabalhoId, dow);
    const c = celulaMensal(dataISO, trabalhoId);
    const ocupadosNaCelula = new Set(c.itens.map((e) => e.medio_id));
    const restrito = store.contextoAtual === 'ajanas';
    const elegiveis = store.mediunsParaMontagem();
    const livres = elegiveis.filter((m) => !ocupadosNaCelula.has(m.id) && m.id !== medioId);
    const nomeAtual = store.nomeMedium(medioId);

    raiz.innerHTML = `
      <div class="modal-backdrop" id="troca-backdrop">
        <div class="modal" role="dialog" aria-modal="true" aria-label="Trocar médium">
          <h2>🔄 Trocar / Substituir Médium</h2>
          <p class="modal-sub">${escapar(trabalho?.nome || 'Trabalho')} · ${formatarData(dataISO)} (${DIAS_SEMANA[dow]})${horarios.length ? ` · ${horarios[0].hora_inicio}–${horarios[0].hora_fim}` : ''}</p>

          <div class="field">
            <label>Médium escalado atualmente</label>
            <div style="font-size:1.05rem;font-weight:700;color:var(--text);padding:4px 0 8px">
              ${escapar(nomeAtual)}
            </div>
          </div>

          <div class="field">
            <label for="troca-sel-novo">Substituir por</label>
            <select id="troca-sel-novo" style="font-size:.95rem;padding:8px 10px;width:100%">
              <option value="">— Selecione o substituto —</option>
              ${livres.map((m) => `<option value="${m.id}">${escapar(m.nome)}${m.funcao ? ` (${m.funcao})` : ''}</option>`).join('')}
            </select>
          </div>

          <div class="field">
            <label for="troca-nome-novo">Ou cadastrar e vincular novo médium</label>
            <div class="linha-add">
              <input id="troca-nome-novo" maxlength="100" placeholder="Nome do novo médium" />
              <button class="btn btn-sm" id="troca-btn-criar">Cadastrar e substituir</button>
            </div>
          </div>

          <div class="quick-actions" style="margin-top:16px">
            <button class="btn btn-primary" id="troca-btn-confirmar">Confirmar Substituição</button>
            <button class="btn btn-danger" id="troca-btn-remover">Remover da Escala</button>
            <button class="btn btn-ghost" id="troca-btn-cancelar">Cancelar</button>
          </div>
        </div>
      </div>`;

    const fechar = () => {
      raiz.innerHTML = '';
      document.removeEventListener('keydown', aoTecla);
    };
    function aoTecla(e) { if (e.key === 'Escape') fechar(); }
    document.addEventListener('keydown', aoTecla);

    raiz.querySelector('#troca-backdrop').addEventListener('mousedown', (e) => {
      if (e.target.id === 'troca-backdrop') fechar();
    });
    raiz.querySelector('#troca-btn-cancelar').onclick = fechar;

    // Confirmar substituição por médium existente
    raiz.querySelector('#troca-btn-confirmar').onclick = async () => {
      const sel = raiz.querySelector('#troca-sel-novo');
      const novoId = Number(sel.value);
      if (!novoId) {
        toast('Selecione um médium substituto.', 'warn');
        return;
      }
      const ref = horarios[0];
      if (ref && haConflitoHorario(novoId, dataISO, ref.hora_inicio, ref.hora_fim, escalaId)) {
        if (!confirm('Aviso: este médium já possui escala neste horário. Deseja substituir mesmo assim?')) {
          return;
        }
      }
      if (!mediumDisponivelNaData(novoId, dataISO)) {
        if (!confirm('Aviso: este médium tem restrição de disponibilidade nesta data. Deseja substituir mesmo assim?')) {
          return;
        }
      }

      try {
        const novoNome = store.nomeMedium(novoId);
        store.salvarSnapshotUndo(`Substituir ${nomeAtual} por ${novoNome}`);
        await store.atualizar('escala', escalaId, { medio_id: novoId });
        toast(`Substituído: ${nomeAtual} ➔ ${novoNome}`);
        fechar();
        desenharMensal();
      } catch (err) {
        toast(err.message, 'error');
      }
    };

    // Cadastrar novo médium e substituir
    raiz.querySelector('#troca-btn-criar').onclick = async () => {
      const input = raiz.querySelector('#troca-nome-novo');
      const nome = input.value.trim();
      if (!nome) {
        toast('Informe o nome do médium.', 'warn');
        return;
      }
      try {
        let m = elegiveis.find((x) => x.nome.toLowerCase() === nome.toLowerCase());
        if (!m) {
          m = await store.criar('mediuns', {
            nome, telefone: '', email: '', observacao: '',
            funcao: restrito ? 'Ajanã' : '', ativo: 1,
          });
        }
        store.salvarSnapshotUndo(`Substituir ${nomeAtual} por ${m.nome}`);
        await store.atualizar('escala', escalaId, { medio_id: m.id });
        toast(`Cadastrado e substituído: ${nomeAtual} ➔ ${m.nome}`);
        fechar();
        desenharMensal();
      } catch (err) {
        toast(err.message, 'error');
      }
    };

    // Remover da escala
    raiz.querySelector('#troca-btn-remover').onclick = async () => {
      try {
        store.salvarSnapshotUndo(`Remover ${nomeAtual} da escala`);
        await store.excluir('escala', escalaId);
        toast(`Removido: ${nomeAtual}`, 'info');
        fechar();
        desenharMensal();
      } catch (err) {
        toast(err.message, 'error');
      }
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

      const dataDt = new Date(dataISO + 'T12:00:00');
      const oco = ocorrenciaNoMes(dataDt, dow);
      const totalOco = totalOcorrenciasNoMes(dataDt, dow);
      const regrasFixas = store.db.disponibilidade.filter((r) =>
        r.ativo === 1 &&
        (r.contexto ?? 'dirigentes') === store.contextoAtual &&
        r.trabalho_id === trabalhoId &&
        r.dia_semana === dow &&
        (r.ocorrencia === oco || (r.ocorrencia === 6 && oco === totalOco))
      ).sort((a, b) => (a.posicao ?? 1) - (b.posicao ?? 1));

      raiz.innerHTML = `
        <div class="modal-backdrop" id="cel-backdrop">
          <div class="modal" role="dialog" aria-modal="true" aria-label="Célula ${escapar(trabalho.nome)}">
            <h2>${escapar(trabalho.nome)}</h2>
            <p class="modal-sub">${formatarData(dataISO)} (${DIAS_SEMANA[dow]})${horarios.length ? ` · ${horarios[0].hora_inicio}–${horarios[0].hora_fim}` : ' · sem horário neste dia'}</p>
            ${regrasFixas.length > 0 ? `
              <div style="margin:6px 0 12px;padding:8px 12px;background:#e0e7ff;border:1px solid #c7d2fe;border-radius:var(--radius-sm)">
                <div style="color:#3730a3;font-size:.85rem;font-weight:600;margin-bottom:6px">
                  📌 Trabalhos fixos deste dia:
                </div>
                <div style="display:flex;flex-direction:column;gap:6px">
                  ${regrasFixas.map((rf) => {
                    const nome = store.nomeMedium(rf.medio_id);
                    const jaEscalado = c.itens.some((e) => e.medio_id === rf.medio_id);
                    return `
                      <div style="display:flex;align-items:center;justify-content:space-between;font-size:.85rem">
                        <span style="color:#1e3a8a"><strong>Posição ${rf.posicao || 1}:</strong> ${escapar(nome)}</span>
                        ${!jaEscalado && horarios.length
                          ? `<button class="btn btn-sm btn-primary" data-escalar-fixo="${rf.medio_id}" style="padding:2px 8px;font-size:.78rem">+ Escalar fixo</button>`
                          : `<span class="pill ok" style="font-size:.65rem;padding:2px 6px">Escalado</span>`}
                      </div>`;
                  }).join('')}
                </div>
              </div>` : ''}
            ${horarios.length === 0 ? `<div class="alert danger">Cadastre um horário de <strong>${escapar(trabalho.nome)}</strong> para ${DIAS_SEMANA[dow]} antes de escalar (menu Horários).</div>` : ''}
            <h3>Escalados (${c.nomes.length}${c.temLeito ? ' + LEITO' : ''})</h3>
            ${c.itens.length === 0 ? '<p class="muted">Célula vazia.</p>' : `<ul class="list-clean">
              ${c.itens.map((e) => {
                const rf = regrasFixas.find((r) => r.medio_id === e.medio_id);
                const m = store.db.mediuns.find((x) => x.id === e.medio_id);
                const wa = m?.telefone ? linkWhatsAppIndividual(m) : null;
                return `<li>
                  <div style="display:flex;align-items:center;gap:8px">
                    ${e.observacao === LEITO ? '<strong class="leito">LEITO</strong>' : `<strong>${escapar(store.nomeMedium(e.medio_id))}</strong>${rf ? ` <small class="pill info" style="font-size:.65rem;padding:2px 6px">Fixo (Pos ${rf.posicao || 1})</small>` : ''}`}
                    ${wa ? `<a href="${wa}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-ghost btn-wa" style="padding:2px 6px;text-decoration:none" title="Notificar pelo WhatsApp">📱</a>` : ''}
                  </div>
                  <div style="display:flex;gap:4px">
                    ${e.medio_id > 0 ? `<button class="btn btn-sm" data-trocar-escala="${e.id}" data-medio="${e.medio_id}">Trocar</button>` : ''}
                    <button class="btn btn-sm" data-rm="${e.id}">Remover</button>
                  </div>
                </li>`;
              }).join('')}
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
      raiz.querySelectorAll('[data-escalar-fixo]').forEach((b) => {
        b.onclick = async () => {
          await vincular(Number(b.dataset.escalarFixo));
        };
      });
      raiz.querySelectorAll('[data-trocar-escala]').forEach((b) => {
        b.onclick = () => {
          fechar();
          abrirModalTrocar({
            escalaId: Number(b.dataset.trocarEscala),
            medioId: Number(b.dataset.medio),
            dataISO,
            trabalhoId,
          });
        };
      });
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
          toast('Célula limpa.', 'info', {
            aoAcao: async () => {
              await store.desfazer();
              pintar();
              desenharMensal();
              toast('Célula restaurada.');
            },
          });
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

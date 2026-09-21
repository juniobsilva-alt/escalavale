import { store, DIAS_SEMANA } from '../store.js';
import { hojeISO, formatarData, diaSemanaDe, escapar, toast, limparTelefone } from '../utils.js';

export function renderConsultaPublica(el, { medioIdInicial = null, aoVoltar = null } = {}) {
  let medioSelecionadoId = medioIdInicial ? Number(medioIdInicial) : 0;

  el.innerHTML = `
    <div class="consulta-publica-wrap" style="max-width:680px;margin:20px auto;padding:16px">
      <div style="text-align:center;margin-bottom:24px">
        <img src="icons/icone-64.png" alt="" width="56" height="56" style="border-radius:12px;margin-bottom:8px" />
        <h1 style="font-size:1.6rem;margin:0 0 4px">EscalaVale — Consulta do Médium</h1>
        <p class="muted" style="margin:0">Consulte suas próximas escalas e horários de trabalho.</p>
      </div>

      <div class="card" style="margin-bottom:20px">
        <div class="field">
          <label for="c-busca-medium" style="font-weight:600">Selecione seu nome:</label>
          <select id="c-busca-medium" style="font-size:1rem;padding:10px">
            <option value="0">-- Escolha seu nome na lista --</option>
            ${store.mediunsAtivos().map((m) => `
              <option value="${m.id}" ${m.id === medioSelecionadoId ? 'selected' : ''}>
                ${escapar(m.nome)}${m.funcao ? ` (${escapar(m.funcao)})` : ''}
              </option>
            `).join('')}
          </select>
        </div>
      </div>

      <div id="c-resultado"></div>

      <div style="text-align:center;margin-top:32px;display:flex;justify-content:center;gap:12px;flex-wrap:wrap">
        <button class="btn btn-ghost btn-sm" id="btn-voltar-login">🔐 Área do Dirigente (Login)</button>
      </div>
    </div>`;

  const sel = el.querySelector('#c-busca-medium');
  const resultado = el.querySelector('#c-resultado');
  const btnVoltar = el.querySelector('#btn-voltar-login');

  if (btnVoltar && aoVoltar) {
    btnVoltar.onclick = aoVoltar;
  }

  function renderizarResultado() {
    if (!medioSelecionadoId) {
      resultado.innerHTML = `
        <div class="card" style="text-align:center;padding:32px">
          <div style="font-size:2.5rem;margin-bottom:8px">🔍</div>
          <h3 style="margin:0 0 6px">Selecione seu nome acima</h3>
          <p class="muted" style="margin:0">Suas próximas escalas agendadas aparecerão aqui automaticamente.</p>
        </div>`;
      return;
    }

    const m = store.db.mediuns.find((x) => x.id === medioSelecionadoId);
    if (!m) {
      resultado.innerHTML = `<div class="alert warn">Médium não encontrado.</div>`;
      return;
    }

    const hoje = hojeISO();
    // Próximas escalas a partir de hoje
    const proximas = store.db.escala
      .filter((e) => e.medio_id === m.id && e.data >= hoje)
      .sort((a, b) => a.data.localeCompare(b.data));

    const linkDireto = `${window.location.origin}${window.location.pathname}?consulta=1&m=${m.id}`;

    let msgWhatsApp = `Salve Deus! Seguem minhas próximas escalas no Vale do Amanhecer:\n`;
    for (const esc of proximas) {
      const [, mes, dia] = esc.data.split('-');
      const dow = diaSemanaDe(esc.data);
      const trab = store.nomeTrabalho(esc.trabalho_id);
      const hor = store.db.horarios.find((h) => h.id === esc.horario_id);
      const horarioStr = hor ? ` às ${hor.hora_inicio}` : '';
      msgWhatsApp += `• *${dia}/${mes} (${DIAS_SEMANA[dow]})*${horarioStr} — *${trab}*\n`;
    }
    msgWhatsApp += `\nSalve Deus!`;

    resultado.innerHTML = `
      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
          <div>
            <h2 style="margin:0;font-size:1.3rem">${escapar(m.nome)}</h2>
            <div style="margin-top:4px">
              ${m.funcao ? `<span class="pill info">${escapar(m.funcao)}</span>` : ''}
              <span class="pill ok">Ativo</span>
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-sm btn-ghost" id="btn-copiar-link" title="Copiar link para consultar direto">
              🔗 Copiar link direto
            </button>
            ${proximas.length > 0 ? `
              <button class="btn btn-sm btn-primary" id="btn-wa-minha-escala" title="Compartilhar no WhatsApp">
                📱 Enviar no WhatsApp
              </button>
            ` : ''}
          </div>
        </div>
      </div>

      <h3 style="margin:16px 0 10px">Próximas Escalas (${proximas.length})</h3>

      ${proximas.length === 0 ? `
        <div class="card" style="text-align:center;padding:24px">
          <p class="muted" style="margin:0">Nenhuma escala agendada para você a partir de hoje.</p>
        </div>
      ` : `
        <div style="display:flex;flex-direction:column;gap:10px">
          ${proximas.map((esc) => {
            const dow = diaSemanaDe(esc.data);
            const trab = store.nomeTrabalho(esc.trabalho_id);
            const hor = store.db.horarios.find((h) => h.id === esc.horario_id);
            const ctxNome = store.nomeContexto(esc.contexto);
            return `
              <div class="card" style="padding:14px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px;border-left:4px solid var(--primary)">
                <div>
                  <div style="font-weight:700;font-size:1.05rem;color:var(--text)">
                    ${escapar(trab)}
                  </div>
                  <div class="muted" style="font-size:.88rem;margin-top:2px">
                    📅 <strong>${formatarData(esc.data)}</strong> (${DIAS_SEMANA[dow]})
                    ${hor ? ` · ⏰ ${hor.hora_inicio}–${hor.hora_fim}` : ''}
                  </div>
                  ${esc.observacao ? `<div class="muted" style="font-size:.8rem;margin-top:4px">Obs: ${escapar(esc.observacao)}</div>` : ''}
                </div>
                <div>
                  <span class="pill muted" style="font-size:.72rem">${escapar(ctxNome)}</span>
                </div>
              </div>`;
          }).join('')}
        </div>
      `}`;

    resultado.querySelector('#btn-copiar-link')?.addEventListener('click', () => {
      navigator.clipboard.writeText(linkDireto);
      toast('Link direto copiado para a área de transferência!');
    });

    resultado.querySelector('#btn-wa-minha-escala')?.addEventListener('click', () => {
      const waUrl = `https://wa.me/?text=${encodeURIComponent(msgWhatsApp)}`;
      window.open(waUrl, '_blank');
    });
  }

  sel.onchange = () => {
    medioSelecionadoId = Number(sel.value);
    // Atualiza a URL sem recarregar a página
    const url = new URL(window.location);
    if (medioSelecionadoId) {
      url.searchParams.set('consulta', '1');
      url.searchParams.set('m', String(medioSelecionadoId));
    } else {
      url.searchParams.delete('m');
    }
    window.history.replaceState({}, '', url);
    renderizarResultado();
  };

  renderizarResultado();
}

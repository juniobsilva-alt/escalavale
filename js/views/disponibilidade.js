import { store, DIAS_SEMANA, OCORRENCIAS } from '../store.js';
import { toast, escapar, estadoVazio } from '../utils.js';

export function renderDisponibilidade(el) {
  const mediuns = store.mediunsParaMontagem();
  let medioId = mediuns[0]?.id ?? 0;

  el.innerHTML = `
    <div class="page-head">
      <div><h1>Disponibilidade</h1><p>Regras do tipo “1ª Quarta”, “Último Sábado”. Sem regra = disponibilidade total. Regras válidas somente para a <strong>${store.nomeContexto()}</strong>.</p></div>
    </div>
    <div class="toolbar">
      <select id="f-medium" aria-label="Selecionar médium">
        ${mediuns.map((m) => `<option value="${m.id}">${escapar(m.nome)}</option>`).join('')}
      </select>
      <div class="spacer"></div>
      <span class="muted">Ex.: 1ª/3ª Quarta, Último Sábado</span>
    </div>
    <div class="grid two">
      <div class="card">
        <h2>Nova regra</h2>
        <div class="field"><label for="f-dia">Dia da semana</label>
          <select id="f-dia">${DIAS_SEMANA.map((d, i) => `<option value="${i}">${d}</option>`).join('')}</select></div>
        <div class="field"><label for="f-oco">Ocorrência no mês</label>
          <select id="f-oco">${Object.entries(OCORRENCIAS).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></div>
        <button class="btn btn-primary" id="btn-add">Adicionar regra</button>
        <p class="hint muted">A escala bloqueia o médium em datas fora dessas regras.</p>
      </div>
      <div class="card">
        <h2>Regras do médium</h2>
        <div id="regras"></div>
      </div>
    </div>`;

  const sel = el.querySelector('#f-medium');
  const area = el.querySelector('#regras');
  if (!mediuns.length) {
    el.innerHTML = estadoVazio({ icone: '🧘', titulo: 'Cadastre um médium primeiro', descricao: 'A disponibilidade é vinculada a um médium.' });
    return;
  }
  sel.value = String(medioId);

  function desenhar() {
    medioId = Number(sel.value);
    const regras = store.regrasDoMedium(medioId).sort((a, b) => a.dia_semana - b.dia_semana || a.ocorrencia - b.ocorrencia);
    area.innerHTML = regras.length === 0
      ? `<p class="muted">Disponibilidade total (sem restrições). Adicione regras ao lado se necessário.</p>`
      : regras.map((r) => `
        <span class="chip">${DIAS_SEMANA[r.dia_semana]} · ${OCORRENCIAS[r.ocorrencia]}
          <button data-remover="${r.id}" aria-label="Remover regra">×</button>
        </span>`).join('');
    area.querySelectorAll('[data-remover]').forEach((b) => (b.onclick = async () => {
      if (!confirm('Remover esta regra?')) return;
      try {
        await store.excluir('disponibilidade', Number(b.dataset.remover));
      } catch (err) { toast(err.message, 'error'); return; }
      desenhar(); toast('Regra removida.', 'info');
    }));
  }

  el.querySelector('#btn-add').onclick = async () => {
    const dia = Number(el.querySelector('#f-dia').value);
    const oco = Number(el.querySelector('#f-oco').value);
    const existe = store.db.disponibilidade.some((d) => d.medio_id === medioId && d.dia_semana === dia && d.ocorrencia === oco && d.ativo === 1);
    if (existe) { toast('Regra já existe.', 'error'); return; }
    try {
      await store.criar('disponibilidade', { medio_id: medioId, dia_semana: dia, ocorrencia: oco, ativo: 1 });
    } catch (err) { toast(err.message, 'error'); return; }
    desenhar(); toast('Regra adicionada.');
  };
  sel.onchange = desenhar;
  desenhar();
}

import { store, DIAS_SEMANA } from '../store.js';
import { abrirModal, confirmarExclusao, toast, escapar, estadoVazio, validarHora } from '../utils.js';

export function renderHorarios(el) {
  const trabalhos = store.trabalhosAtivos();
  el.innerHTML = `
    <div class="page-head">
      <div><h1>Horários</h1><p>Defina dia da semana e hora de cada trabalho.</p></div>
      <div class="spacer"></div>
      <button class="btn btn-primary" id="btn-novo">+ Novo horário</button>
    </div>
    <div class="toolbar">
      <select id="f-trabalho" aria-label="Filtrar por trabalho">
        <option value="">Todos os trabalhos</option>
        ${trabalhos.map((t) => `<option value="${t.id}">${escapar(t.nome)}</option>`).join('')}
      </select>
      <select id="f-dia" aria-label="Filtrar por dia">
        <option value="">Todos os dias</option>
        ${DIAS_SEMANA.map((d, i) => `<option value="${i}">${d}</option>`).join('')}
      </select>
      <div class="spacer"></div><span class="muted" id="contador"></span>
    </div>
    <div id="lista"></div>`;

  const lista = el.querySelector('#lista');
  const fTrab = el.querySelector('#f-trabalho');
  const fDia = el.querySelector('#f-dia');

  function desenhar() {
    let dados = [...store.db.horarios].sort((a, b) =>
      store.nomeTrabalho(a.trabalho_id).localeCompare(store.nomeTrabalho(b.trabalho_id)) ||
      a.dia_semana - b.dia_semana || a.hora_inicio.localeCompare(b.hora_inicio));
    if (fTrab.value) dados = dados.filter((h) => h.trabalho_id === Number(fTrab.value));
    if (fDia.value !== '') dados = dados.filter((h) => h.dia_semana === Number(fDia.value));
    el.querySelector('#contador').textContent = `${dados.length} horário(s)`;
    if (!dados.length) {
      lista.innerHTML = estadoVazio({ icone: '🕗', titulo: 'Sem horários', descricao: 'Cadastre dia + hora para um trabalho.' });
      return;
    }
    lista.innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th>Trabalho</th><th>Dia</th><th>Horário</th><th>Ações</th></tr></thead>
      <tbody>${dados.map((h) => `<tr>
        <td><strong>${escapar(store.nomeTrabalho(h.trabalho_id))}</strong></td>
        <td>${DIAS_SEMANA[h.dia_semana]}</td>
        <td>${h.hora_inicio} – ${h.hora_fim}</td>
        <td><div class="row-actions">
          <button class="btn btn-sm" data-editar="${h.id}">Editar</button>
          <button class="btn btn-sm" data-excluir="${h.id}">Excluir</button>
        </div></td></tr>`).join('')}</tbody></table></div>`;
    lista.querySelectorAll('[data-editar]').forEach((b) => (b.onclick = () => formulario(Number(b.dataset.editar))));
    lista.querySelectorAll('[data-excluir]').forEach((b) => (b.onclick = () => {
      confirmarExclusao('Excluir horário?', 'O horário sairá da grade da escala.', async () => {
        try {
          await store.excluir('horarios', Number(b.dataset.excluir));
        } catch (err) { toast(err.message, 'error'); return; }
        desenhar(); toast('Horário excluído.', 'info');
      });
    }));
  }

  function formulario(id) {
    const atual = id ? store.db.horarios.find((h) => h.id === id) : null;
    const trabOpts = store.trabalhosAtivos()
      .map((t) => `<option value="${t.id}" ${atual?.trabalho_id === t.id ? 'selected' : ''}>${escapar(t.nome)}</option>`).join('');
    if (!trabOpts) { toast('Cadastre um trabalho primeiro.', 'error'); return; }
    abrirModal({
      titulo: atual ? 'Editar horário' : 'Novo horário',
      corpoHTML: `
        <div class="field"><label for="f-t">Trabalho</label><select id="f-t" name="trabalho_id">${trabOpts}</select></div>
        <div class="field"><label for="f-d">Dia da semana</label>
          <select id="f-d" name="dia_semana">${DIAS_SEMANA.map((d, i) => `<option value="${i}" ${atual?.dia_semana === i ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
        <div class="field"><label for="f-i">Hora início (HH:MM)</label>
          <input id="f-i" name="hora_inicio" value="${atual?.hora_inicio ?? '19:00'}" placeholder="19:00" /><p class="error">Use o formato HH:MM.</p></div>
        <div class="field"><label for="f-f">Hora fim (HH:MM)</label>
          <input id="f-f" name="hora_fim" value="${atual?.hora_fim ?? '21:00'}" placeholder="21:00" /><p class="error">Use o formato HH:MM.</p></div>`,
      aoConfirmar: async (dados, form) => {
        let ok = true;
        [['hora_inicio', '#f-i'], ['hora_fim', '#f-f']].forEach(([campo, sel]) => {
          const valido = validarHora(dados[campo]);
          form.querySelector(sel).closest('.field').classList.toggle('invalid', !valido);
          if (!valido) ok = false;
        });
        if (!ok) return false;
        if (dados.hora_inicio >= dados.hora_fim) { toast('Hora início deve ser anterior à hora fim.', 'error'); return false; }
        const reg = { trabalho_id: Number(dados.trabalho_id), dia_semana: Number(dados.dia_semana), hora_inicio: dados.hora_inicio, hora_fim: dados.hora_fim };
        try {
          if (atual) await store.atualizar('horarios', atual.id, reg);
          else await store.criar('horarios', reg);
        } catch (err) { toast(err.message, 'error'); return false; }
        desenhar(); toast('Horário salvo.');
      },
    });
  }

  el.querySelector('#btn-novo').onclick = () => formulario();
  fTrab.onchange = desenhar; fDia.onchange = desenhar;
  desenhar();
}

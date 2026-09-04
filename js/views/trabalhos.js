import { store } from '../store.js';
import { abrirModal, confirmarExclusao, toast, escapar, estadoVazio } from '../utils.js';

export function renderTrabalhos(el) {
  el.innerHTML = `
    <div class="page-head">
      <div><h1>Trabalhos</h1><p>Ex.: Presidente, Mesa Evang., Cura… A ordem aqui define as colunas da grade mensal.</p></div>
      <div class="spacer"></div>
      <button class="btn btn-primary" id="btn-novo">+ Novo trabalho</button>
    </div>
    <div class="toolbar">
      <input type="search" id="filtro" placeholder="Buscar trabalho…" aria-label="Buscar trabalho" />
      <div class="spacer"></div><span class="muted" id="contador"></span>
    </div>
    <div id="lista"></div>`;

  const lista = el.querySelector('#lista');
  const filtro = el.querySelector('#filtro');

  function desenhar() {
    const termo = filtro.value.trim().toLowerCase();
    const todos = store.trabalhosAtivos();
    const dados = todos.filter((t) =>
      !termo || t.nome.toLowerCase().includes(termo) || (t.descricao || '').toLowerCase().includes(termo));
    el.querySelector('#contador').textContent = `${dados.length} encontrado(s)`;
    if (!dados.length) {
      lista.innerHTML = estadoVazio({ icone: '🕊️', titulo: 'Nenhum trabalho', descricao: 'Cadastre o primeiro trabalho da casa.' });
      return;
    }
    lista.innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th title="Ordem na grade mensal">Pos.</th><th>Nome</th><th class="wrap">Descrição</th><th>Horários</th><th>Ações</th></tr></thead>
      <tbody>${dados.map((t) => {
        const n = store.db.horarios.filter((h) => h.trabalho_id === t.id).length;
        const pos = todos.findIndex((x) => x.id === t.id);
        return `<tr><td><strong>#${pos + 1}</strong></td>
          <td><strong>${escapar(t.nome)}</strong></td>
          <td class="wrap">${escapar(t.descricao || '—')}</td>
          <td><span class="pill info">${n}</span></td>
          <td><div class="row-actions">
            <button class="btn btn-sm" data-sobe="${t.id}" title="Mover para esquerda na grade" ${pos === 0 ? 'disabled' : ''}>↑</button>
            <button class="btn btn-sm" data-desce="${t.id}" title="Mover para direita na grade" ${pos === todos.length - 1 ? 'disabled' : ''}>↓</button>
            <button class="btn btn-sm" data-editar="${t.id}">Editar</button>
            <button class="btn btn-sm" data-excluir="${t.id}">Excluir</button>
          </div></td></tr>`;
      }).join('')}</tbody></table></div>`;
    lista.querySelectorAll('[data-editar]').forEach((b) => (b.onclick = () => formulario(Number(b.dataset.editar))));
    lista.querySelectorAll('[data-sobe]').forEach((b) => (b.onclick = async () => {
      try { await store.moverTrabalho(Number(b.dataset.sobe), -1); }
      catch (err) { toast(err.message, 'error'); return; }
      desenhar();
    }));
    lista.querySelectorAll('[data-desce]').forEach((b) => (b.onclick = async () => {
      try { await store.moverTrabalho(Number(b.dataset.desce), 1); }
      catch (err) { toast(err.message, 'error'); return; }
      desenhar();
    }));
    lista.querySelectorAll('[data-excluir]').forEach((b) => (b.onclick = () => {
      confirmarExclusao('Excluir trabalho?', 'O trabalho será desativado.', async () => {
        try {
          await store.atualizar('trabalhos', Number(b.dataset.excluir), { ativo: 0 });
        } catch (err) { toast(err.message, 'error'); return; }
        desenhar(); toast('Trabalho excluído.', 'info');
      });
    }));
  }

  function formulario(id) {
    const atual = id ? store.db.trabalhos.find((t) => t.id === id) : null;
    abrirModal({
      titulo: atual ? 'Editar trabalho' : 'Novo trabalho',
      corpoHTML: `
        <div class="field"><label for="f-nome">Nome *</label>
          <input id="f-nome" name="nome" required maxlength="100" value="${escapar(atual?.nome ?? '')}" />
          <p class="error">Informe o nome.</p></div>
        <div class="field"><label for="f-desc">Descrição</label>
          <textarea id="f-desc" name="descricao" rows="3">${escapar(atual?.descricao ?? '')}</textarea></div>`,
      aoConfirmar: async (dados, form) => {
        const nome = dados.nome.trim();
        if (!nome) { form.querySelector('#f-nome').closest('.field').classList.add('invalid'); return false; }
        try {
          if (atual) await store.atualizar('trabalhos', atual.id, { ...dados, nome });
          else {
            const maxOrdem = Math.max(0, ...store.db.trabalhos.map((t) => t.ordem ?? 0));
            await store.criar('trabalhos', { ativo: 1, ordem: maxOrdem + 10, ...dados, nome });
          }
        } catch (err) { toast(err.message, 'error'); return false; }
        desenhar(); toast('Trabalho salvo.');
      },
    });
  }

  el.querySelector('#btn-novo').onclick = () => formulario();
  filtro.oninput = desenhar;
  desenhar();
}

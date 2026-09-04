import { store, FUNCOES_MEDIUM } from '../store.js';
import { abrirModal, confirmarExclusao, toast, escapar, estadoVazio } from '../utils.js';

export function renderMediuns(el) {
  el.innerHTML = `
    <div class="page-head">
      <div><h1>Médiuns</h1><p>Cadastre e gerencie os médiuns e suas disponibilidades.</p></div>
      <div class="spacer"></div>
      <button class="btn btn-primary" id="btn-novo">+ Novo médium</button>
    </div>
    <div class="toolbar">
      <input type="search" id="filtro" placeholder="Buscar por nome, e-mail…" aria-label="Buscar médium" />
      <select id="f-funcao" aria-label="Filtrar por função">
        <option value="">Todas as funções</option>
        ${FUNCOES_MEDIUM.map((f) => `<option value="${f}">${f}</option>`).join('')}
      </select>
      <div class="spacer"></div>
      <span class="muted" id="contador"></span>
    </div>
    <div id="lista"></div>`;

  const lista = el.querySelector('#lista');
  const filtro = el.querySelector('#filtro');
  const fFuncao = el.querySelector('#f-funcao');
  const contador = el.querySelector('#contador');

  function desenhar() {
    const termo = filtro.value.trim().toLowerCase();
    const funcao = fFuncao.value;
    const dados = store.mediunsAtivos().filter((m) =>
      (!termo || m.nome.toLowerCase().includes(termo) || (m.email || '').toLowerCase().includes(termo)) &&
      (!funcao || m.funcao === funcao));
    contador.textContent = `${dados.length} encontrado(s)`;
    if (dados.length === 0) {
      lista.innerHTML = estadoVazio({
        icone: '🧘', titulo: 'Nenhum médium encontrado',
        descricao: 'Ajuste os filtros ou cadastre um novo médium.',
        acaoHTML: `<button class="btn btn-primary btn-sm" id="vazio-novo">+ Novo médium</button>`,
      });
      lista.querySelector('#vazio-novo')?.addEventListener('click', abrirFormulario);
      return;
    }
    lista.innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th>Nome</th><th>Função</th><th>Telefone</th><th class="wrap">E-mail</th><th>Disponibilidade</th><th>Ações</th></tr></thead>
      <tbody>${dados.map((m) => {
        const nRegras = store.regrasDoMedium(m.id).length;
        return `<tr>
          <td><strong>${escapar(m.nome)}</strong>${m.observacao ? `<br/><small class="muted">${escapar(m.observacao)}</small>` : ''}</td>
          <td>${m.funcao ? `<span class="pill info">${escapar(m.funcao)}</span>` : '<span class="muted">—</span>'}</td>
          <td>${escapar(m.telefone || '—')}</td>
          <td class="wrap">${escapar(m.email || '—')}</td>
          <td>${nRegras === 0 ? '<span class="pill info">Total</span>' : `<span class="pill warn">${nRegras} regra(s)</span>`}</td>
          <td><div class="row-actions">
            <button class="btn btn-sm" data-editar="${m.id}">Editar</button>
            <button class="btn btn-sm" data-excluir="${m.id}">Excluir</button>
          </div></td>
        </tr>`;
      }).join('')}</tbody></table></div>`;
    lista.querySelectorAll('[data-editar]').forEach((b) => (b.onclick = () => abrirFormulario(Number(b.dataset.editar))));
    lista.querySelectorAll('[data-excluir]').forEach((b) => (b.onclick = () => excluir(Number(b.dataset.excluir), desenhar)));
  }

  function abrirFormulario(id) {
    const atual = id ? store.db.mediuns.find((m) => m.id === id) : null;
    abrirModal({
      titulo: atual ? 'Editar médium' : 'Novo médium',
      subtitulo: 'Nome é obrigatório.',
      corpoHTML: `
        <div class="field"><label for="f-nome">Nome *</label>
          <input id="f-nome" name="nome" required maxlength="100" value="${escapar(atual?.nome ?? '')}" />
          <p class="error">Informe o nome.</p></div>
        <div class="field"><label for="f-funcao-modal">Função</label>
          <select id="f-funcao-modal" name="funcao">
            <option value="">(Não informada)</option>
            ${FUNCOES_MEDIUM.map((f) => `<option value="${f}" ${atual?.funcao === f ? 'selected' : ''}>${f}</option>`).join('')}
          </select>
          <p class="hint">Doutrinador, Ajanã, Ninfa Lua ou Ninfa Sol.</p></div>
        <div class="field"><label for="f-tel">Telefone</label>
          <input id="f-tel" name="telefone" maxlength="20" value="${escapar(atual?.telefone ?? '')}" /></div>
        <div class="field"><label for="f-email">E-mail</label>
          <input id="f-email" name="email" type="email" maxlength="100" value="${escapar(atual?.email ?? '')}" />
          <p class="error">E-mail inválido.</p></div>
        <div class="field"><label for="f-obs">Observação</label>
          <textarea id="f-obs" name="observacao" rows="3">${escapar(atual?.observacao ?? '')}</textarea></div>`,
      aoConfirmar: async (dados, form) => {
        const nome = dados.nome.trim();
        if (!nome) { form.querySelector('#f-nome').closest('.field').classList.add('invalid'); return false; }
        if (dados.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(dados.email)) {
          form.querySelector('#f-email').closest('.field').classList.add('invalid'); return false;
        }
        try {
          if (atual) await store.atualizar('mediuns', atual.id, { ...dados, nome });
          else await store.criar('mediuns', { ativo: 1, funcao: '', ...dados, nome });
        } catch (err) { toast(err.message, 'error'); return false; }
        desenhar();
        toast(atual ? 'Médium atualizado.' : 'Médium cadastrado.');
      },
    });
  }

  function excluir(id, recarregar) {
    confirmarExclusao('Excluir médium?', 'O médium será desativado e sairá das listagens.', async () => {
      try {
        await store.atualizar('mediuns', id, { ativo: 0 });
      } catch (err) { toast(err.message, 'error'); return; }
      recarregar(); toast('Médium excluído.', 'info');
    });
  }

  el.querySelector('#btn-novo').onclick = () => abrirFormulario();
  filtro.oninput = desenhar;
  fFuncao.onchange = desenhar;
  desenhar();
}

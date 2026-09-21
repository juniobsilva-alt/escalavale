import { store, FUNCOES_MEDIUM } from '../store.js';
import { abrirModal, confirmarExclusao, toast, escapar, estadoVazio, hojeISO, mascararTelefone, limparTelefone } from '../utils.js';

function linkWhatsAppIndividual(m) {
  const tel = limparTelefone(m.telefone);
  if (!tel) return '';
  const fone = tel.startsWith('55') ? tel : `55${tel}`;
  const mesAtual = hojeISO().slice(0, 7);
  const escalas = store.db.escala.filter((e) =>
    e.medio_id === m.id && e.data.startsWith(mesAtual) && (e.contexto ?? 'dirigentes') === store.contextoAtual
  ).sort((a, b) => a.data.localeCompare(b.data));

  const [a, n] = mesAtual.split('-').map(Number);
  const nomeMes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][n - 1];

  let msg = `Salve Deus, Irmão(ã) *${m.nome}*!\nSegue sua escala para *${nomeMes} de ${a}*:\n\n`;
  if (escalas.length === 0) {
    msg += `Nenhuma escala programada para este mês.\n`;
  } else {
    for (const esc of escalas) {
      const [, mes, dia] = esc.data.split('-');
      const dow = new Date(esc.data + 'T12:00:00').getDay();
      const diasCurto = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const trab = store.nomeTrabalho(esc.trabalho_id);
      const hor = store.db.horarios.find((h) => h.id === esc.horario_id);
      const horarioStr = hor ? ` (${hor.hora_inicio}–${hor.hora_fim})` : '';
      msg += `• *${diasCurto[dow]} ${dia}/${mes}*${horarioStr}: ${trab}\n`;
    }
  }
  msg += `\nCaso não possa comparecer, substitua antecipadamente!\nSalve Deus.`;
  return `https://wa.me/${fone}?text=${encodeURIComponent(msg)}`;
}

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
      <select id="f-status" aria-label="Filtrar por status">
        <option value="1">Ativos</option>
        <option value="0">Inativos</option>
        <option value="">Todos</option>
      </select>
      <div class="spacer"></div>
      <span class="muted" id="contador"></span>
    </div>
    <div id="lista"></div>`;

  const lista = el.querySelector('#lista');
  const filtro = el.querySelector('#filtro');
  const fFuncao = el.querySelector('#f-funcao');
  const fStatus = el.querySelector('#f-status');
  const contador = el.querySelector('#contador');

  function desenhar() {
    const termo = filtro.value.trim().toLowerCase();
    const funcao = fFuncao.value;
    const status = fStatus.value;
    const dados = [...store.db.mediuns]
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .filter((m) =>
        (!termo || m.nome.toLowerCase().includes(termo) || (m.email || '').toLowerCase().includes(termo)) &&
        (!funcao || m.funcao === funcao) &&
        (status === '' || String(m.ativo ?? 1) === status));
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
      <thead><tr><th>Nome</th><th>Função</th><th>Status</th><th>Telefone</th><th class="wrap">E-mail</th><th>Disponibilidade</th><th>Ações</th></tr></thead>
      <tbody>${dados.map((m) => {
        const nRegras = store.regrasDoMedium(m.id).length;
        const waLink = linkWhatsAppIndividual(m);
        return `<tr>
          <td><strong>${escapar(m.nome)}</strong>${m.observacao ? `<br/><small class="muted">${escapar(m.observacao)}</small>` : ''}</td>
          <td>${m.funcao ? `<span class="pill info">${escapar(m.funcao)}</span>` : '<span class="muted">—</span>'}</td>
          <td>${m.ativo === 1 ? '<span class="pill ok">Ativo</span>' : '<span class="pill muted">Inativo</span>'}</td>
          <td>
            <div style="display:flex;align-items:center;gap:6px">
              <span>${escapar(m.telefone || '—')}</span>
              ${waLink ? `<a href="${waLink}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-ghost btn-wa" style="padding:2px 6px;text-decoration:none" title="Enviar escala do mês pelo WhatsApp">📱</a>` : ''}
            </div>
          </td>
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
        <div class="field"><label style="display:flex;gap:8px;align-items:center;cursor:pointer">
          <input type="checkbox" id="f-ativo" name="ativo" value="1" ${atual?.ativo !== 0 ? 'checked' : ''} style="width:auto" />
          Ativo (se desmarcado, não entra na escala)</label></div>
        <div class="field"><label for="f-tel">Telefone</label>
          <input id="f-tel" name="telefone" maxlength="20" placeholder="(99) 99999-9999" value="${escapar(atual?.telefone ? mascararTelefone(atual.telefone) : '')}" /></div>
        <div class="field"><label for="f-email">E-mail</label>
          <input id="f-email" name="email" type="email" maxlength="100" value="${escapar(atual?.email ?? '')}" />
          <p class="error">E-mail inválido.</p></div>
        <div class="field"><label for="f-obs">Observação</label>
          <textarea id="f-obs" name="observacao" rows="3">${escapar(atual?.observacao ?? '')}</textarea></div>`,
      aoConfirmar: async (dados, form) => {
        const nome = dados.nome.trim();
        let valido = true;
        if (!nome) { form.querySelector('#f-nome').closest('.field').classList.add('invalid'); valido = false; }
        if (dados.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(dados.email)) {
          form.querySelector('#f-email').closest('.field').classList.add('invalid'); valido = false;
        }
        if (!valido) return false;
        const ativo = form.querySelector('#f-ativo').checked ? 1 : 0;
        try {
          if (atual) await store.atualizar('mediuns', atual.id, { ...dados, nome, ativo });
          else await store.criar('mediuns', { funcao: '', ...dados, nome, ativo });
        } catch (err) { toast(err.message, 'error'); return false; }
        desenhar();
        toast(atual ? 'Médium atualizado.' : 'Médium cadastrado.');
      },
    });

    const modalForm = document.getElementById('modal-form');
    if (modalForm) {
      const inputTel = modalForm.querySelector('#f-tel');
      if (inputTel) {
        inputTel.addEventListener('input', (e) => {
          e.target.value = mascararTelefone(e.target.value);
        });
      }
      const nomeInput = modalForm.querySelector('#f-nome');
      nomeInput?.addEventListener('input', () => nomeInput.closest('.field')?.classList.remove('invalid'));
      const emailInput = modalForm.querySelector('#f-email');
      emailInput?.addEventListener('input', () => emailInput.closest('.field')?.classList.remove('invalid'));
    }
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
  fStatus.onchange = desenhar;
  desenhar();
}

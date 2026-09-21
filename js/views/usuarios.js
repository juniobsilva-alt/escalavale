import { store } from '../store.js';
import { abrirModal, confirmarExclusao, toast, escapar, estadoVazio } from '../utils.js';

export function renderUsuarios(el) {
  if (!store.ehAdmin()) {
    el.innerHTML = `
      <div class="page-head">
        <div>
          <h1>Acesso Restrito</h1>
          <p>Esta área é exclusiva para administradores do sistema.</p>
        </div>
      </div>
      <div class="card" style="max-width:500px">
        <p class="muted">Seu usuário atual não possui privilégios de administrador para acessar o cadastro de usuários.</p>
      </div>`;
    return;
  }

  el.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Usuários do Sistema</h1>
        <p>Cadastre e gerencie os usuários e permissões de acesso ao sistema.</p>
      </div>
      <div class="spacer"></div>
      <button class="btn btn-primary" id="btn-novo">+ Novo usuário</button>
    </div>
    <div class="toolbar">
      <input type="search" id="filtro" placeholder="Buscar por nome ou e-mail…" aria-label="Buscar usuário" />
      <select id="f-papel" aria-label="Filtrar por papel">
        <option value="">Todos os papéis</option>
        <option value="admin">Administrador</option>
        <option value="coordenador">Coordenador</option>
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
  const fPapel = el.querySelector('#f-papel');
  const fStatus = el.querySelector('#f-status');
  const contador = el.querySelector('#contador');

  function desenhar() {
    const termo = filtro.value.trim().toLowerCase();
    const papel = fPapel.value;
    const status = fStatus.value;

    const dados = [...(store.db.usuarios || [])]
      .sort((a, b) => {
        // juniobsilva@gmail.com sempre no topo
        const aPrincipal = (a.email || '').toLowerCase().trim() === 'juniobsilva@gmail.com';
        const bPrincipal = (b.email || '').toLowerCase().trim() === 'juniobsilva@gmail.com';
        if (aPrincipal && !bPrincipal) return -1;
        if (!aPrincipal && bPrincipal) return 1;
        return (a.nome || '').localeCompare(b.nome || '');
      })
      .filter((u) =>
        (!termo || (u.nome || '').toLowerCase().includes(termo) || (u.email || '').toLowerCase().includes(termo)) &&
        (!papel || u.papel === papel) &&
        (status === '' || String(u.ativo ?? 1) === status)
      );

    contador.textContent = `${dados.length} usuário(s) encontrado(s)`;

    if (dados.length === 0) {
      lista.innerHTML = estadoVazio({
        icone: '👥',
        titulo: 'Nenhum usuário encontrado',
        descricao: 'Ajuste os filtros ou cadastre um novo usuário.',
        acaoHTML: `<button class="btn btn-primary btn-sm" id="vazio-novo">+ Novo usuário</button>`,
      });
      lista.querySelector('#vazio-novo')?.addEventListener('click', () => abrirFormulario());
      return;
    }

    lista.innerHTML = `<div class="table-wrap"><table>
      <thead>
        <tr>
          <th>Nome</th>
          <th>E-mail</th>
          <th>Papel</th>
          <th>Status</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>${dados.map((u) => {
        const ehPrincipal = (u.email || '').toLowerCase().trim() === 'juniobsilva@gmail.com';
        const ehProprio = store.usuarioAtual && (u.email || '').toLowerCase().trim() === (store.usuarioAtual.email || '').toLowerCase().trim();
        const isAdmin = u.papel === 'admin';
        const isAtivo = u.ativo === 1;

        return `<tr>
          <td>
            <strong>${escapar(u.nome)}</strong>
            ${ehPrincipal ? ' <small class="pill info" style="font-size:.7rem">Admin Principal</small>' : ''}
            ${ehProprio && !ehPrincipal ? ' <small class="pill muted" style="font-size:.7rem">Você</small>' : ''}
          </td>
          <td class="wrap">${escapar(u.email)}</td>
          <td>
            <span class="pill ${isAdmin ? 'info' : 'muted'}">
              ${isAdmin ? 'Administrador' : 'Coordenador'}
            </span>
          </td>
          <td>
            <span class="pill ${isAtivo ? 'ok' : 'danger'}">
              ${isAtivo ? 'Ativo' : 'Inativo'}
            </span>
          </td>
          <td>
            <div class="row-actions">
              <button class="btn btn-sm" data-editar="${u.id}">Editar</button>
              ${store.modo === 'nuvem' ? `<button class="btn btn-sm" data-redefinir="${escapar(u.email)}" title="Enviar e-mail para redefinir senha">Redefinir senha</button>` : ''}
              ${!ehPrincipal && !ehProprio ? `
                <button class="btn btn-sm" data-status="${u.id}" data-novo-status="${isAtivo ? 0 : 1}">
                  ${isAtivo ? 'Desativar' : 'Ativar'}
                </button>
              ` : ''}
            </div>
          </td>
        </tr>`;
      }).join('')}</tbody></table></div>`;

    lista.querySelectorAll('[data-editar]').forEach((b) => {
      b.onclick = () => {
        const idVal = isNaN(Number(b.dataset.editar)) ? b.dataset.editar : Number(b.dataset.editar);
        abrirFormulario(idVal);
      };
    });

    lista.querySelectorAll('[data-redefinir]').forEach((b) => {
      b.onclick = () => redefinirSenha(b.dataset.redefinir);
    });

    lista.querySelectorAll('[data-status]').forEach((b) => {
      b.onclick = () => {
        const idVal = isNaN(Number(b.dataset.status)) ? b.dataset.status : Number(b.dataset.status);
        const novoStatus = Number(b.dataset.novoStatus);
        alternarStatus(idVal, novoStatus);
      };
    });
  }

  function abrirFormulario(id) {
    const atual = id ? store.db.usuarios.find((u) => u.id === id) : null;
    const ehPrincipal = atual && (atual.email || '').toLowerCase().trim() === 'juniobsilva@gmail.com';
    const ehProprio = atual && store.usuarioAtual && (atual.email || '').toLowerCase().trim() === (store.usuarioAtual.email || '').toLowerCase().trim();

    abrirModal({
      titulo: atual ? 'Editar usuário' : 'Novo usuário',
      subtitulo: atual ? 'Altere os dados do usuário.' : 'Cadastre um novo usuário com acesso ao sistema.',
      corpoHTML: `
        <div class="field">
          <label for="f-user-nome">Nome *</label>
          <input id="f-user-nome" name="nome" required maxlength="100" value="${escapar(atual?.nome ?? '')}" />
          <p class="error">Informe o nome completo.</p>
        </div>
        <div class="field">
          <label for="f-user-email">E-mail *</label>
          <input id="f-user-email" name="email" type="email" required maxlength="100"
            value="${escapar(atual?.email ?? '')}"
            ${atual ? 'readonly style="background:var(--surface-2);cursor:not-allowed"' : ''} />
          <p class="error">Informe um e-mail válido.</p>
          ${atual ? '<p class="hint">O e-mail é a chave de login e não pode ser alterado após o cadastro.</p>' : ''}
        </div>
        ${!atual ? `
        <div class="field">
          <label for="f-user-senha">Senha inicial *</label>
          <input id="f-user-senha" name="senha" type="password" required minlength="6" autocomplete="new-password" placeholder="Mínimo 6 caracteres" />
          <p class="error">A senha deve ter no mínimo 6 caracteres.</p>
        </div>` : ''}
        <div class="field">
          <label for="f-user-papel">Papel / Perfil *</label>
          <select id="f-user-papel" name="papel" ${ehPrincipal ? 'disabled style="background:var(--surface-2);cursor:not-allowed"' : ''}>
            <option value="coordenador" ${atual?.papel === 'coordenador' || !atual ? 'selected' : ''}>Coordenador</option>
            <option value="admin" ${atual?.papel === 'admin' ? 'selected' : ''}>Administrador</option>
          </select>
          <p class="hint">
            ${ehPrincipal
              ? 'O usuário principal é permanentemente Administrador.'
              : 'Coordenadores têm acesso às escalas e cadastros normais. Administradores gerenciam usuários.'}
          </p>
        </div>
        <div class="field">
          <label style="display:flex;gap:8px;align-items:center;cursor:pointer">
            <input type="checkbox" id="f-user-ativo" name="ativo" value="1"
              ${atual ? (atual.ativo !== 0 ? 'checked' : '') : 'checked'}
              ${ehPrincipal || ehProprio ? 'disabled' : ''} style="width:auto" />
            Usuário ativo (permite login no sistema)
          </label>
          ${(ehPrincipal || ehProprio) ? '<p class="hint">Você não pode desativar seu próprio usuário ou o administrador principal.</p>' : ''}
        </div>
      `,
      aoConfirmar: async (dados, form) => {
        const nome = dados.nome.trim();
        const email = (dados.email || atual?.email || '').trim().toLowerCase();
        const papel = ehPrincipal ? 'admin' : form.querySelector('#f-user-papel').value;
        const ativo = (ehPrincipal || ehProprio) ? 1 : (form.querySelector('#f-user-ativo').checked ? 1 : 0);

        if (!nome) {
          form.querySelector('#f-user-nome').closest('.field').classList.add('invalid');
          return false;
        }

        if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
          form.querySelector('#f-user-email').closest('.field').classList.add('invalid');
          return false;
        }

        if (!atual) {
          const senha = (form.querySelector('#f-user-senha')?.value || '').trim();
          if (!senha || senha.length < 6) {
            form.querySelector('#f-user-senha').closest('.field').classList.add('invalid');
            return false;
          }

          // Verifica duplicidade no store local
          const jaExiste = store.db.usuarios.some((u) => (u.email || '').toLowerCase().trim() === email);
          if (jaExiste) {
            toast('Já existe um usuário cadastrado com este e-mail.', 'error');
            return false;
          }

          try {
            if (store.modo === 'nuvem') {
              const { cadastrarUsuarioAuth } = await import('../nuvem.js');
              await cadastrarUsuarioAuth(email, senha, nome, papel);
            }
            await store.criar('usuarios', { nome, email, papel, ativo });
            desenhar();
            toast('Usuário cadastrado com sucesso!');
            return true;
          } catch (err) {
            const msg = /could not find the table|relation.*does not exist/i.test(err.message)
              ? 'A tabela "usuarios" ainda não foi criada no Supabase. Execute o script supabase/migracao-usuarios.sql no SQL Editor do Supabase.'
              : `Erro ao cadastrar usuário: ${err.message}`;
            toast(msg, 'error');
            return false;
          }
        } else {
          try {
            await store.atualizar('usuarios', atual.id, { nome, papel, ativo });
            desenhar();
            toast('Usuário atualizado com sucesso!');
            return true;
          } catch (err) {
            const msg = /could not find the table|relation.*does not exist/i.test(err.message)
              ? 'A tabela "usuarios" ainda não foi criada no Supabase. Execute o script supabase/migracao-usuarios.sql no SQL Editor do Supabase.'
              : `Erro ao atualizar usuário: ${err.message}`;
            toast(msg, 'error');
            return false;
          }
        }
      },
    });
  }

  function alternarStatus(id, novoStatus) {
    const acao = novoStatus === 1 ? 'ativar' : 'desativar';
    const msg = novoStatus === 1
      ? 'O usuário voltará a ter acesso ao sistema.'
      : 'O usuário não conseguirá mais efetuar login no sistema.';

    confirmarExclusao(`Deseja ${acao} este usuário?`, msg, async () => {
      try {
        await store.atualizar('usuarios', id, { ativo: novoStatus });
        desenhar();
        toast(`Usuário ${novoStatus === 1 ? 'ativado' : 'desativado'} com sucesso.`);
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  }

  function redefinirSenha(email) {
    confirmarExclusao(
      'Redefinir senha do usuário?',
      `Será enviado um e-mail para ${email} com o link oficial para redefinição de senha.`,
      async () => {
        try {
          const { solicitarRedefinicaoSenha } = await import('../nuvem.js');
          await solicitarRedefinicaoSenha(email);
          toast(`E-mail de redefinição enviado para ${email}.`, 'info');
        } catch (err) {
          toast(`Falha ao solicitar redefinição: ${err.message}`, 'error');
        }
      }
    );
  }

  el.querySelector('#btn-novo').onclick = () => abrirFormulario();
  filtro.oninput = desenhar;
  fPapel.onchange = desenhar;
  fStatus.onchange = desenhar;

  desenhar();
}

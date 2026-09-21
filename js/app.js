import { store } from './store.js';
import { hojeISO, toast } from './utils.js';
import { renderDashboard } from './views/dashboard.js';
import { renderMediuns } from './views/mediuns.js';
import { renderTrabalhos } from './views/trabalhos.js';
import { renderHorarios } from './views/horarios.js';
import { renderEscala } from './views/escala.js';
import { renderDisponibilidade } from './views/disponibilidade.js';
import { renderUsuarios } from './views/usuarios.js';
import { renderLogin } from './views/auth.js';
import { renderConsultaPublica } from './views/consulta.js';

const conteudo = document.getElementById('conteudo');
let rotaAtual = 'dashboard';
let apiEscala = null;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('SW falhou:', err));
  });
}

const CONTEXTO_POR_ROTA = {
  escala: 'dirigentes',
  'dir-trabalhos': 'dirigentes',
  'dir-horarios': 'dirigentes',
  'dir-disponibilidade': 'dirigentes',
  'aj-grade': 'ajanas',
  'aj-oraculo': 'ajanas',
  'aj-libertacao': 'ajanas',
  'aj-sanday': 'ajanas',
  'aj-sublimacao': 'ajanas',
  'aj-trabalhos': 'ajanas',
  'aj-horarios': 'ajanas',
  'aj-disponibilidade': 'ajanas',
};

const GRUPO_POR_ROTA = {
  escala: 'dirigentes',
  'dir-trabalhos': 'dirigentes',
  'dir-horarios': 'dirigentes',
  'dir-disponibilidade': 'dirigentes',
  'aj-grade': 'ajanas',
  'aj-oraculo': 'ajanas',
  'aj-libertacao': 'ajanas',
  'aj-sanday': 'ajanas',
  'aj-sublimacao': 'ajanas',
  'aj-trabalhos': 'ajanas',
  'aj-horarios': 'ajanas',
  'aj-disponibilidade': 'ajanas',
};

const ROTAS = {
  dashboard: (el) => renderDashboard(el, navegar),
  mediuns: renderMediuns,
  usuarios: renderUsuarios,
  escala: (el) => { apiEscala = renderEscala(el, document.getElementById('atalho-data').value || hojeISO()); },
  'dir-trabalhos': renderTrabalhos,
  'dir-horarios': renderHorarios,
  'dir-disponibilidade': renderDisponibilidade,
  trabalhos: renderTrabalhos,
  horarios: renderHorarios,
  disponibilidade: renderDisponibilidade,
  'aj-grade': (el) => { apiEscala = renderEscala(el, document.getElementById('atalho-data').value || hojeISO(), 'aj-grade'); },
  'aj-oraculo': (el) => { apiEscala = renderEscala(el, document.getElementById('atalho-data').value || hojeISO(), 'aj-oraculo'); },
  'aj-libertacao': (el) => { apiEscala = renderEscala(el, document.getElementById('atalho-data').value || hojeISO(), 'aj-libertacao'); },
  'aj-sanday': (el) => { apiEscala = renderEscala(el, document.getElementById('atalho-data').value || hojeISO(), 'aj-sanday'); },
  'aj-sublimacao': (el) => { apiEscala = renderEscala(el, document.getElementById('atalho-data').value || hojeISO(), 'aj-sublimacao'); },
  'aj-trabalhos': renderTrabalhos,
  'aj-horarios': renderHorarios,
  'aj-disponibilidade': renderDisponibilidade,
};

const ESCOPO_POR_ROTA = {
  escala: 'dirigentes',
  'dir-trabalhos': 'dirigentes',
  'dir-horarios': 'dirigentes',
  'dir-disponibilidade': 'dirigentes',
  trabalhos: 'dirigentes',
  horarios: 'dirigentes',
  disponibilidade: 'dirigentes',

  'aj-grade': 'ajanas',
  'aj-oraculo': 'ajanas',
  'aj-libertacao': 'ajanas',
  'aj-sanday': 'ajanas',
  'aj-sublimacao': 'ajanas',
  'aj-trabalhos': 'ajanas',
  'aj-horarios': 'ajanas',
  'aj-disponibilidade': 'ajanas',
};

function navegar(rota) {
  if (rota === 'usuarios' && !store.ehAdmin()) {
    toast('Acesso restrito a administradores.', 'error');
    rota = 'dashboard';
  }
  const escopoNecessario = ESCOPO_POR_ROTA[rota];
  if (escopoNecessario && !store.temEscopo(escopoNecessario)) {
    toast('Acesso restrito: você não possui permissão para este módulo.', 'error');
    rota = 'dashboard';
  }
  rotaAtual = rota;
  if (CONTEXTO_POR_ROTA[rota]) store.contextoAtual = CONTEXTO_POR_ROTA[rota];
  document.querySelectorAll('.nav-item[data-route]').forEach((b) => {
    const ativa = b.dataset.route === rota;
    b.classList.toggle('is-active', ativa);
    if (ativa) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  const grupo = GRUPO_POR_ROTA[rota];
  const toggle = grupo && document.querySelector(`[data-group="${grupo}"]`);
  if (toggle) {
    toggle.setAttribute('aria-expanded', 'true');
    document.getElementById(`sub-${grupo}`).style.display = '';
  }
  document.body.classList.remove('menu-open');
  (ROTAS[rota] || ROTAS.dashboard)(conteudo);
  conteudo.focus({ preventScroll: true });
  window.scrollTo({ top: 0 });
}

export function atualizarPermissoesMenu() {
  const navUsuarios = document.getElementById('nav-usuarios');
  if (navUsuarios) navUsuarios.style.display = store.ehAdmin() ? '' : 'none';

  const groupDir = document.getElementById('nav-group-dirigentes');
  if (groupDir) groupDir.style.display = store.temEscopo('dirigentes') ? '' : 'none';

  const groupAj = document.getElementById('nav-group-ajanas');
  if (groupAj) groupAj.style.display = store.temEscopo('ajanas') ? '' : 'none';
}

async function boot() {
  const urlParams = new URLSearchParams(window.location.search);
  const querConsulta = urlParams.has('consulta');

  conteudo.innerHTML = `<p class="muted">Carregando…</p>`;
  try {
    const { sessaoAtual, carregarTudo } = await import('./nuvem.js');
    const sessaoPromise = sessaoAtual();
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 4000));
    const sessao = await Promise.race([sessaoPromise, timeoutPromise]);
    if (sessao) {
      store.usarNuvem(await carregarTudo());
      if (querConsulta) {
        document.getElementById('sidebar')?.style.setProperty('display', 'none');
        document.querySelector('.topbar')?.style.setProperty('display', 'none');
        renderConsultaPublica(conteudo, {
          medioIdInicial: urlParams.get('m'),
          aoVoltar: () => { window.location.search = ''; },
        });
        return;
      }
      montarApp(sessao.user?.email ?? null);
      return;
    } else if (querConsulta) {
      try {
        store.usarNuvem(await carregarTudo());
      } catch {
        store.carregarLocal();
      }
      document.getElementById('sidebar')?.style.setProperty('display', 'none');
      document.querySelector('.topbar')?.style.setProperty('display', 'none');
      renderConsultaPublica(conteudo, {
        medioIdInicial: urlParams.get('m'),
        aoVoltar: () => { window.location.search = ''; },
      });
      return;
    }
  } catch (err) {
    console.warn('Nuvem indisponível no boot:', err);
  }

  if (querConsulta) {
    store.carregarLocal();
    document.getElementById('sidebar')?.style.setProperty('display', 'none');
    document.querySelector('.topbar')?.style.setProperty('display', 'none');
    renderConsultaPublica(conteudo, {
      medioIdInicial: urlParams.get('m'),
      aoVoltar: () => { window.location.search = ''; },
    });
    return;
  }

  function abrirLogin() {
    document.getElementById('sidebar')?.style.setProperty('display', 'none');
    document.querySelector('.topbar')?.style.setProperty('display', 'none');
    renderLogin(conteudo, {
      aoEntrar: async (email, senha) => {
        const { entrar, carregarTudo } = await import('./nuvem.js');
        const sessao = await entrar(email, senha);
        store.usarNuvem(await carregarTudo());
        montarApp(sessao.user?.email ?? email);
      },
      aoUsarLocal: () => {
        store.carregarLocal();
        montarApp(null);
      },
      aoConsultar: async () => {
        conteudo.innerHTML = `<p class="muted">Carregando…</p>`;
        try {
          const { carregarTudo } = await import('./nuvem.js');
          store.usarNuvem(await carregarTudo());
        } catch {
          store.carregarLocal();
        }
        document.getElementById('sidebar')?.style.setProperty('display', 'none');
        document.querySelector('.topbar')?.style.setProperty('display', 'none');
        renderConsultaPublica(conteudo, {
          aoVoltar: () => {
            abrirLogin();
          },
        });
      },
    });
  }

  abrirLogin();
}

function montarApp(email) {
  document.getElementById('sidebar')?.style.removeProperty('display');
  document.querySelector('.topbar')?.style.removeProperty('display');
  const usuario = store.definirUsuarioAtual(email);

  // Inicia sincronização em tempo real (Supabase Realtime) no modo nuvem
  if (store.modo === 'nuvem') {
    import('./nuvem.js').then(({ assinarRealtimeEscala }) => {
      assinarRealtimeEscala((payload) => {
        if (payload.eventType === 'INSERT') {
          const novo = { ...payload.new, medio_id: payload.new.medio_id ?? 0, horario_id: payload.new.horario_id ?? 0 };
          if (!store.db.escala.some((e) => e.id === novo.id)) {
            store.db.escala.push(novo);
            if (['escala', 'aj-grade', 'aj-oraculo', 'aj-libertacao', 'aj-sanday', 'aj-sublimacao'].includes(rotaAtual)) {
              navegar(rotaAtual);
              toast('Escala atualizada em tempo real por outro dirigente.', 'info');
            }
          }
        } else if (payload.eventType === 'UPDATE') {
          const idx = store.db.escala.findIndex((e) => e.id === payload.new.id);
          if (idx >= 0) {
            store.db.escala[idx] = { ...payload.new, medio_id: payload.new.medio_id ?? 0, horario_id: payload.new.horario_id ?? 0 };
            if (['escala', 'aj-grade', 'aj-oraculo', 'aj-libertacao', 'aj-sanday', 'aj-sublimacao'].includes(rotaAtual)) {
              navegar(rotaAtual);
              toast('Escala atualizada em tempo real por outro dirigente.', 'info');
            }
          }
        } else if (payload.eventType === 'DELETE') {
          const idExcluido = payload.old.id;
          const idx = store.db.escala.findIndex((e) => e.id === idExcluido);
          if (idx >= 0) {
            store.db.escala.splice(idx, 1);
            if (['escala', 'aj-grade', 'aj-oraculo', 'aj-libertacao', 'aj-sanday', 'aj-sublimacao'].includes(rotaAtual)) {
              navegar(rotaAtual);
              toast('Escala atualizada em tempo real por outro dirigente.', 'info');
            }
          }
        }
      });
    }).catch(console.warn);
  }

  // Se o usuário estiver desativado, bloqueia acesso e exibe aviso
  if (usuario && usuario.ativo === 0) {
    conteudo.innerHTML = `
      <div class="page-head"><div><h1>Conta Desativada</h1><p>Seu acesso ao sistema foi suspenso.</p></div></div>
      <div class="card" style="max-width:460px">
        <p class="muted">Este usuário está inativo no sistema. Entre em contato com o administrador para reativar seu acesso.</p>
        <div class="mt"><button class="btn btn-primary" id="btn-sair-bloqueado" style="width:100%">Voltar para o login</button></div>
      </div>`;
    conteudo.querySelector('#btn-sair-bloqueado').onclick = async () => {
      const { sair } = await import('./nuvem.js');
      await sair();
      location.reload();
    };
    return;
  }

  // Exibe menus e grupos da barra lateral conforme permissões
  atualizarPermissoesMenu();

  document.querySelectorAll('.nav-item').forEach((b) => (b.onclick = () => navegar(b.dataset.route)));

  document.querySelectorAll('[data-group]').forEach((btn) => {
    btn.onclick = () => {
      const aberta = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', aberta ? 'false' : 'true');
      document.getElementById(`sub-${btn.dataset.group}`).style.display = aberta ? 'none' : '';
    };
  });

  document.getElementById('btn-menu').onclick = () => document.body.classList.toggle('menu-open');
  document.getElementById('sidebar-backdrop').onclick = () => document.body.classList.remove('menu-open');

  document.getElementById('btn-nova-escala').onclick = () => {
    document.getElementById('atalho-data').value = hojeISO();
    const rotaDestino = (!store.temEscopo('dirigentes') && store.temEscopo('ajanas')) ? 'aj-grade' : 'escala';
    navegar(rotaDestino);
  };

  document.getElementById('atalho-data').onchange = (e) => {
    const rotaDestino = (!store.temEscopo('dirigentes') && store.temEscopo('ajanas')) ? 'aj-grade' : 'escala';
    navegar(rotaDestino);
    apiEscala?.setData(e.target.value || hojeISO());
  };

  // Busca global: encontra médium/trabalho e leva à tela correspondente
  document.getElementById('busca-global').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const termo = e.target.value.trim().toLowerCase();
    if (!termo) return;
    const achouMedium = store.mediunsAtivos().some((m) => m.nome.toLowerCase().includes(termo));
    navegar(achouMedium ? 'mediuns' : 'dir-trabalhos');
    toast(achouMedium ? 'Médium encontrado — use o filtro da página.' : 'Buscando em Trabalhos — use o filtro da página.', 'info');
  });

  // Atalho "/" foca a busca
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      document.getElementById('busca-global').focus();
    }
  });

  // Exportar / Importar (portabilidade e backup)
  document.getElementById('btn-exportar').onclick = () => {
    const blob = new Blob([store.exportar()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'escalavale-backup.json';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Backup exportado.');
  };

  const btnImportar = document.getElementById('btn-importar');
  if (store.modo === 'nuvem') {
    // No modo nuvem a restauração é feita pelo SQL no painel do Supabase
    btnImportar.style.display = 'none';
  } else {
    btnImportar.onclick = () => document.getElementById('input-importar').click();
    document.getElementById('input-importar').onchange = (e) => {
      const arquivo = e.target.files[0];
      if (!arquivo) return;
      const leitor = new FileReader();
      leitor.onload = () => {
        try { store.importar(leitor.result); navegar(rotaAtual); toast('Dados importados.'); }
        catch { toast('Arquivo inválido.', 'error'); }
      };
      leitor.readAsText(arquivo);
      e.target.value = '';
    };
  }

  // Identificação da sessão + saída (modo nuvem)
  if (email) {
    const rodape = document.querySelector('.sidebar-footer');
    const sess = document.createElement('div');
    sess.style.cssText = 'flex-basis:100%;font-size:.78rem;color:#93a3c0;display:flex;gap:8px;align-items:center;justify-content:space-between;';
    const papelTag = usuario.papel === 'admin' ? 'Admin' : 'Coordenador';
    sess.innerHTML = `<span style="overflow:hidden;text-overflow:ellipsis" title="${email} (${papelTag})">👤 ${email} <small class="pill ${usuario.papel === 'admin' ? 'info' : 'muted'}" style="font-size:.65rem;padding:2px 6px">${papelTag}</small></span>`;
    const btnSair = document.createElement('button');
    btnSair.className = 'btn btn-ghost btn-sm';
    btnSair.textContent = 'Sair';
    btnSair.onclick = async () => {
      const { sair } = await import('./nuvem.js');
      await sair();
      location.reload();
    };
    sess.appendChild(btnSair);
    rodape.style.flexWrap = 'wrap';
    rodape.prepend(sess);
  }

  window.addEventListener('beforeprint', () => {
    const tag = document.getElementById('print-orientacao');
    if (tag) tag.textContent = `@page { size: ${window.__orientacaoImpressao || 'landscape'}; margin: 0; }`;
  });

  navegar('dashboard');
}

boot();

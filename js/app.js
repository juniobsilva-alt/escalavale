import { store } from './store.js';
import { hojeISO, toast } from './utils.js';
import { renderDashboard } from './views/dashboard.js';
import { renderMediuns } from './views/mediuns.js';
import { renderTrabalhos } from './views/trabalhos.js';
import { renderHorarios } from './views/horarios.js';
import { renderEscala } from './views/escala.js';
import { renderDisponibilidade } from './views/disponibilidade.js';
import { renderLogin } from './views/auth.js';

const conteudo = document.getElementById('conteudo');
let rotaAtual = 'dashboard';
let apiEscala = null;

const CONTEXTO_POR_ROTA = {
  escala: 'dirigentes',
  'dir-trabalhos': 'dirigentes',
  'dir-horarios': 'dirigentes',
  'dir-disponibilidade': 'dirigentes',
  'aj-grade': 'ajanas',
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
  'aj-trabalhos': 'ajanas',
  'aj-horarios': 'ajanas',
  'aj-disponibilidade': 'ajanas',
};

const ROTAS = {
  dashboard: (el) => renderDashboard(el, navegar),
  mediuns: renderMediuns,
  escala: (el) => { apiEscala = renderEscala(el, document.getElementById('atalho-data').value || hojeISO()); },
  'dir-trabalhos': renderTrabalhos,
  'dir-horarios': renderHorarios,
  'dir-disponibilidade': renderDisponibilidade,
  'aj-grade': (el) => { apiEscala = renderEscala(el, document.getElementById('atalho-data').value || hojeISO()); },
  'aj-trabalhos': renderTrabalhos,
  'aj-horarios': renderHorarios,
  'aj-disponibilidade': renderDisponibilidade,
};

function navegar(rota) {
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

async function boot() {
  conteudo.innerHTML = `<p class="muted">Carregando…</p>`;
  try {
    const { sessaoAtual, carregarTudo } = await import('./nuvem.js');
    const sessao = await sessaoAtual();
    if (sessao) {
      store.usarNuvem(await carregarTudo());
      montarApp(sessao.user?.email ?? null);
      return;
    }
  } catch (err) {
    console.warn('Nuvem indisponível no boot:', err);
  }
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
  });
}

function montarApp(email) {
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
    navegar('escala');
  };

  document.getElementById('atalho-data').onchange = (e) => {
    navegar('escala');
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
    sess.innerHTML = `<span style="overflow:hidden;text-overflow:ellipsis">👤 ${email}</span>`;
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

  navegar('dashboard');
}

boot();

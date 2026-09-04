import { DIAS_SEMANA, SITUACAO, OCORRENCIAS } from './store.js';

export function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

export function formatarData(iso) {
  if (!iso) return '—';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

export function diaSemanaDe(iso) {
  return new Date(iso + 'T12:00:00').getDay();
}

export function escapar(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function validarHora(valor) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(valor);
}

// ---- Toast (feedback imediato — padrão UX) ----
export function toast(mensagem, tipo = 'success') {
  const raiz = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = `toast ${tipo}`;
  el.setAttribute('role', 'status');
  el.textContent = mensagem;
  raiz.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

// ---- Modal acessível ----
export function abrirModal({ titulo, subtitulo = '', corpoHTML, textoOk = 'Salvar', aoConfirmar }) {
  const raiz = document.getElementById('modal-root');
  raiz.innerHTML = `
    <div class="modal-backdrop" data-fechar>
      <div class="modal" role="dialog" aria-modal="true" aria-label="${escapar(titulo)}">
        <h2>${escapar(titulo)}</h2>
        ${subtitulo ? `<p class="modal-sub">${escapar(subtitulo)}</p>` : ''}
        <form id="modal-form" novalidate>${corpoHTML}</form>
        <div class="modal-footer">
          <button class="btn" data-fechar type="button">Cancelar</button>
          <button class="btn btn-primary" form="modal-form" type="submit">${escapar(textoOk)}</button>
        </div>
      </div>
    </div>`;
  const backdrop = raiz.firstElementChild;
  const fechar = () => { raiz.innerHTML = ''; document.removeEventListener('keydown', aoTecla); };
  function aoTecla(e) { if (e.key === 'Escape') fechar(); }
  document.addEventListener('keydown', aoTecla);
  backdrop.addEventListener('mousedown', (e) => { if (e.target.hasAttribute('data-fechar')) fechar(); });
  backdrop.querySelectorAll('[data-fechar]').forEach((b) => {
    if (b.tagName !== 'FORM') b.addEventListener('click', fechar);
  });
  const form = backdrop.querySelector('#modal-form');
  const primeiro = form.querySelector('input, select, textarea');
  if (primeiro) setTimeout(() => primeiro.focus(), 30);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const dados = Object.fromEntries(new FormData(form).entries());
    if (await aoConfirmar(dados, form) !== false) fechar();
  });
  return fechar;
}

export function confirmarExclusao(titulo, mensagem, aoConfirmar) {
  abrirModal({
    titulo,
    subtitulo: mensagem,
    corpoHTML: `<p class="muted">Esta ação desativa o registro (exclusão lógica), como no sistema original.</p>`,
    textoOk: 'Excluir',
    aoConfirmar: () => { aoConfirmar(); },
  });
}

export function estadoVazio({ icone = '📋', titulo, descricao, acaoHTML = '' }) {
  return `
    <div class="empty">
      <div class="emoji" aria-hidden="true">${icone}</div>
      <h3>${escapar(titulo)}</h3>
      <p>${escapar(descricao)}</p>
      <div class="quick-actions" style="justify-content:center">${acaoHTML}</div>
    </div>`;
}

export function pillSituacao(valor) {
  const classe = valor === 1 ? 'ok' : valor === 2 ? 'danger' : 'muted';
  return `<span class="pill ${classe}">${SITUACAO[valor] ?? '—'}</span>`;
}

export { DIAS_SEMANA, SITUACAO, OCORRENCIAS };

import { toast } from '../utils.js';

export function renderLogin(el, { aoEntrar, aoUsarLocal }) {
  el.innerHTML = `
    <div class="page-head"><div><h1>Entrar</h1><p>Acesse com seu usuário de dirigente.</p></div></div>
    <div class="card" style="max-width:420px">
      <form id="form-login" novalidate>
        <div class="field"><label for="l-email">E-mail</label>
          <input id="l-email" name="email" type="email" autocomplete="username" required /></div>
        <div class="field"><label for="l-senha">Senha</label>
          <input id="l-senha" name="senha" type="password" autocomplete="current-password" required /></div>
        <div id="l-erro"></div>
        <button class="btn btn-primary" type="submit" id="l-btn" style="width:100%">Entrar</button>
      </form>
      <div class="mt"><button class="btn btn-sm" id="l-local" style="width:100%">Usar modo local (demonstração offline)</button></div>
    </div>`;

  const form = el.querySelector('#form-login');
  const erro = el.querySelector('#l-erro');
  const btn = el.querySelector('#l-btn');

  form.onsubmit = async (e) => {
    e.preventDefault();
    erro.innerHTML = '';
    btn.disabled = true;
    btn.textContent = 'Entrando…';
    try {
      const email = form.email.value.trim();
      const senha = form.senha.value;
      if (!email || !senha) throw new Error('Informe e-mail e senha.');
      await aoEntrar(email, senha);
    } catch (err) {
      const msg = /invalid login|invalid credentials/i.test(err.message)
        ? 'E-mail ou senha inválidos.'
        : `Falha ao entrar: ${err.message}`;
      erro.innerHTML = `<div class="alert danger" role="alert">${msg}</div>`;
      btn.disabled = false;
      btn.textContent = 'Entrar';
    }
  };
  el.querySelector('#l-local').onclick = () => {
    toast('Modo local: dados só neste navegador.', 'info');
    aoUsarLocal();
  };
  setTimeout(() => el.querySelector('#l-email')?.focus(), 50);
}

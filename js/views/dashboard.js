import { store, slotsDaData } from '../store.js';
import { hojeISO, formatarData, escapar, pillSituacao } from '../utils.js';

export function renderDashboard(el, irPara) {
  const totalMediuns = store.mediunsAtivos().length;
  const totalTrabalhos = store.trabalhosAtivos().length;
  const hoje = hojeISO();
  const slots = slotsDaData(hoje);
  const preenchidos = slots.filter((s) => s.medio_id > 0).length;
  const proximas = proximasEscalas(5);

  el.innerHTML = `
    <div class="hero-logo"><img src="img/salvedeus.jpeg" alt="Salve Deus" width="223" height="223" /></div>
    <div class="page-head">
      <div>
        <h1>Olá, bem-vindo 👋</h1>
        <p>Escala de hoje (${formatarData(hoje)}): ${preenchidos}/${slots.length} vagas preenchidas.</p>
      </div>
      <div class="spacer"></div>
      <button class="btn btn-primary" data-acao="ir-escala">Ver escala de hoje</button>
    </div>

    <div class="grid kpi">
      <div class="card"><p class="kpi-num">${totalMediuns}</p><p class="kpi-label">Médiuns ativos</p></div>
      <div class="card"><p class="kpi-num">${totalTrabalhos}</p><p class="kpi-label">Trabalhos ativos</p></div>
      <div class="card"><p class="kpi-num">${store.db.horarios.length}</p><p class="kpi-label">Horários cadastrados</p></div>
      <div class="card"><p class="kpi-num">${store.db.escala.length}</p><p class="kpi-label">Lançamentos na escala</p></div>
    </div>

    <div class="grid two mt">
      <div class="card">
        <h2>Hoje — ${formatarData(hoje)}</h2>
        ${slots.length === 0
          ? `<p class="muted">Nenhum horário programado para hoje. Cadastre em <strong>Horários</strong>.</p>`
          : `<ul class="list-clean">${slots.map((s) => `
            <li>
              <span><strong>${escapar(s.trabalho_nome)}</strong> <span class="muted">${s.hora_inicio}–${s.hora_fim}</span><br/>
              <small class="muted">${escapar(s.medio_nome || 'Vaga em aberto')}</small></span>
              ${pillSituacao(s.presente)}
            </li>`).join('')}</ul>`}
      </div>
      <div class="card">
        <h2>Próximas escalas</h2>
        ${proximas.length === 0
          ? `<p class="muted">Nenhum lançamento futuro ainda.</p>`
          : `<ul class="list-clean">${proximas.map((e) => `
            <li><span><strong>${formatarData(e.data)}</strong> — ${escapar(store.nomeTrabalho(e.trabalho_id))}<br/>
            <small class="muted">${escapar(store.nomeMedium(e.medio_id))}</small></span>${pillSituacao(e.presente)}</li>`).join('')}</ul>`}
        <div class="quick-actions">
          <button class="btn btn-sm" data-acao="novo-medium">+ Médium</button>
          <button class="btn btn-sm" data-acao="novo-trabalho">+ Trabalho</button>
          <button class="btn btn-sm" data-acao="novo-horario">+ Horário</button>
        </div>
      </div>
    </div>`;

  el.querySelector('[data-acao="ir-escala"]').onclick = () => irPara('escala');
  el.querySelector('[data-acao="novo-medium"]').onclick = () => irPara('mediuns');
  el.querySelector('[data-acao="novo-trabalho"]').onclick = () => irPara('dir-trabalhos');
  el.querySelector('[data-acao="novo-horario"]').onclick = () => irPara('dir-horarios');
}

function proximasEscalas(limite) {
  const hoje = hojeISO();
  return store.db.escala
    .filter((e) => e.data >= hoje)
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(0, limite);
}

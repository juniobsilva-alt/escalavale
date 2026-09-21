import { store, DIAS_SEMANA, OCORRENCIAS } from '../store.js';
import { toast, escapar, estadoVazio } from '../utils.js';

export function renderDisponibilidade(el) {
  const mediuns = store.mediunsDisponibilidade();
  let medioId = mediuns[0]?.id ?? 0;
  const ctx = store.contextoAtual;
  const ehDirigentes = ctx === 'dirigentes';

  if (!mediuns.length) {
    el.innerHTML = estadoVazio({
      icone: '🧘',
      titulo: ehDirigentes ? 'Nenhum médium Doutrinador encontrado' : 'Nenhum médium Ajanã encontrado',
      descricao: ehDirigentes
        ? 'A escala de dirigentes requer médiuns com a função Doutrinador. Cadastre ou edite um médium na tela Médiuns.'
        : 'A escala de ajanãs requer médiuns com a função Ajanã. Cadastre ou edite um médium na tela Médiuns.',
    });
    return;
  }

  const trabalhos = store.trabalhosAtivos();

  el.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Disponibilidade</h1>
        <p>Defina trabalhos fixos obrigatórios e restrições de dias da semana para a <strong>${store.nomeContexto()}</strong>.</p>
      </div>
    </div>
    <div class="toolbar">
      <label for="f-medium" style="font-weight:600;display:flex;align-items:center;gap:8px">
        Médium ${ehDirigentes ? '(Doutrinador)' : '(Ajanã)'}:
      </label>
      <select id="f-medium" aria-label="Selecionar médium" style="min-width:260px">
        ${mediuns.map((m) => `<option value="${m.id}">${escapar(m.nome)}</option>`).join('')}
      </select>
      <div class="spacer"></div>
      <span class="muted">Ex.: Presidente no 1º Domingo · 1ª/3ª Quarta</span>
    </div>

    <div class="grid two">
      <div style="display:flex;flex-direction:column;gap:16px">

        <!-- Card: Regra de disponibilidade por dia da semana -->
        <div class="card">
          <h2>Regra de disponibilidade por dia da semana</h2>
          <p class="hint muted" style="margin-top:-6px;margin-bottom:14px">
            Define em quais dias o médium pode ser escalado para trabalhos gerais. Fora dessas datas, a escala bloqueia o médium.
          </p>
          <div class="field">
            <label for="f-dia">Dia da semana</label>
            <select id="f-dia">
              ${DIAS_SEMANA.map((d, i) => `<option value="${i}">${d}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="f-oco">Ocorrência no mês</label>
            <select id="f-oco">
              ${Object.entries(OCORRENCIAS).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}
            </select>
          </div>
          <button class="btn btn-primary" id="btn-add" style="width:100%">Adicionar regra de dia</button>
        </div>

        <!-- Card: Regra por dia e trabalho fixo -->
        <div class="card">
          <h2>Regra por dia e trabalho fixo</h2>
          <p class="hint muted" style="margin-top:-6px;margin-bottom:14px">
            O médium será <strong>obrigatoriamente escalado</strong> neste trabalho, posição e dia específico. Apenas um médium pode ocupar a mesma posição na mesma data.
          </p>
          <div class="field">
            <label for="f-fixo-trabalho">Trabalho fixo *</label>
            <select id="f-fixo-trabalho">
              ${trabalhos.map((t) => `<option value="${t.id}">${escapar(t.nome)}${t.qtd_mediuns > 1 ? ` (${t.qtd_mediuns} vagas)` : ''}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="f-fixo-posicao">Posição na escala *</label>
            <select id="f-fixo-posicao"></select>
            <p class="hint" id="f-fixo-posicao-hint">Posição do médium na vaga do trabalho (ex.: 1º nome, 2º nome).</p>
          </div>
          <div class="field">
            <label for="f-fixo-dia">Dia da semana *</label>
            <select id="f-fixo-dia">
              ${DIAS_SEMANA.map((d, i) => `<option value="${i}">${d}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="f-fixo-oco">Ocorrência no mês *</label>
            <select id="f-fixo-oco">
              ${Object.entries(OCORRENCIAS).map(([v, l]) => `<option value="${v}">${l} ${DIAS_SEMANA[0]}</option>`).join('')}
            </select>
          </div>
          <button class="btn btn-primary" id="btn-add-fixo" style="width:100%">+ Adicionar trabalho fixo</button>
        </div>

      </div>

      <!-- Card: Regras do médium -->
      <div class="card" style="align-self:flex-start;position:sticky;top:80px">
        <h2>Regras do médium</h2>
        <p class="hint muted" style="margin-top:-6px;margin-bottom:14px">
          Resumo das regras ativas para o médium selecionado.
        </p>
        <div id="regras"></div>
      </div>
    </div>`;

  const selMedium = el.querySelector('#f-medium');
  const areaRegras = el.querySelector('#regras');

  // Elementos do card de trabalho fixo
  const selFixoTrab = el.querySelector('#f-fixo-trabalho');
  const selFixoPosicao = el.querySelector('#f-fixo-posicao');
  const selFixoDia = el.querySelector('#f-fixo-dia');
  const selFixoOco = el.querySelector('#f-fixo-oco');
  const btnAddFixo = el.querySelector('#btn-add-fixo');

  // Elementos do card de disponibilidade por dia
  const selDia = el.querySelector('#f-dia');
  const selOco = el.querySelector('#f-oco');
  const btnAddDia = el.querySelector('#btn-add');

  selMedium.value = String(medioId);

  function atualizarOpcoesTrabalhoFixo() {
    const trabId = Number(selFixoTrab.value);
    const trab = store.db.trabalhos.find((t) => t.id === trabId);
    const qtd = Math.max(1, trab?.qtd_mediuns ?? 1);

    // Atualiza opções de posição
    selFixoPosicao.innerHTML = '';
    for (let i = 1; i <= qtd; i++) {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = qtd > 1 ? `Posição ${i} (${i}º nome)` : `Posição 1 (Única vaga)`;
      selFixoPosicao.appendChild(opt);
    }

    // Atualiza label das opções de ocorrência para refletir o dia da semana
    const dia = Number(selFixoDia.value);
    const diaNome = DIAS_SEMANA[dia];
    selFixoOco.querySelectorAll('option').forEach((opt) => {
      const ocoNum = opt.value;
      opt.textContent = `${OCORRENCIAS[ocoNum]} ${diaNome}`;
    });
  }

  function desenhar() {
    medioId = Number(selMedium.value);
    const regras = store.regrasDoMedium(medioId).sort((a, b) => a.dia_semana - b.dia_semana || a.ocorrencia - b.ocorrencia);

    const fixas = regras.filter((r) => r.trabalho_id > 0);
    const gerais = regras.filter((r) => !r.trabalho_id);

    if (regras.length === 0) {
      areaRegras.innerHTML = `
        <div style="padding:16px;background:var(--surface-2);border-radius:var(--radius-sm);text-align:center">
          <p style="margin:0;font-weight:500">Disponibilidade total (sem restrições)</p>
          <p class="muted" style="margin:4px 0 0;font-size:.85rem">O médium pode ser escalado em qualquer dia. Adicione trabalhos fixos ou regras de dias se necessário.</p>
        </div>`;
      return;
    }

    let html = '';

    if (fixas.length > 0) {
      html += `
        <div style="margin-bottom:16px">
          <h3 style="font-size:.9rem;color:var(--primary-dark);margin:0 0 8px;display:flex;align-items:center;gap:6px">
            📌 Trabalhos fixos obrigatórios (${fixas.length})
          </h3>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            ${fixas.map((r) => `
              <span class="chip" style="background:#e0e7ff;border:1px solid #c7d2fe;color:#3730a3;font-weight:500;padding:6px 10px;display:inline-flex;align-items:center;gap:6px">
                <span>📌 <strong>${escapar(r.trabalho_nome)}</strong> <small class="pill info" style="font-size:.7rem;padding:2px 6px">Posição ${r.posicao || 1}</small> · ${DIAS_SEMANA[r.dia_semana]} (${OCORRENCIAS[r.ocorrencia]})</span>
                <button data-remover="${r.id}" aria-label="Remover regra fixa" title="Remover regra fixa" style="color:#4338ca;font-size:1.1rem;cursor:pointer;border:0;background:transparent;padding:0">×</button>
              </span>
            `).join('')}
          </div>
        </div>`;
    }

    if (gerais.length > 0) {
      html += `
        <div>
          <h3 style="font-size:.9rem;color:var(--muted);margin:0 0 8px">
            Disponibilidade por dia da semana (${gerais.length})
          </h3>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            ${gerais.map((r) => `
              <span class="chip" style="padding:6px 10px;display:inline-flex;align-items:center;gap:6px">
                <span>${DIAS_SEMANA[r.dia_semana]} · ${OCORRENCIAS[r.ocorrencia]}</span>
                <button data-remover="${r.id}" aria-label="Remover regra" title="Remover regra" style="font-size:1.1rem;cursor:pointer;border:0;background:transparent;padding:0">×</button>
              </span>
            `).join('')}
          </div>
        </div>`;
    }

    areaRegras.innerHTML = html;

    areaRegras.querySelectorAll('[data-remover]').forEach((b) => {
      b.onclick = async () => {
        if (!confirm('Deseja remover esta regra?')) return;
        try {
          await store.excluir('disponibilidade', Number(b.dataset.remover));
          desenhar();
          toast('Regra removida com sucesso.', 'info');
        } catch (err) {
          toast(err.message, 'error');
        }
      };
    });
  }

  // Handler: Adicionar trabalho fixo
  btnAddFixo.onclick = async () => {
    const trabalhoId = Number(selFixoTrab.value);
    const posicao = Number(selFixoPosicao.value) || 1;
    const diaSemana = Number(selFixoDia.value);
    const ocorrencia = Number(selFixoOco.value);

    // Validação de conflito
    const validacao = store.verificarConflitoTrabalhoFixo({
      medioId,
      trabalhoId,
      diaSemana,
      ocorrencia,
      posicao,
      ctx,
    });

    if (validacao.conflito) {
      toast(validacao.mensagem, 'error');
      return;
    }

    try {
      await store.criar('disponibilidade', {
        medio_id: medioId,
        dia_semana: diaSemana,
        ocorrencia,
        trabalho_id: trabalhoId,
        horario_id: null,
        posicao,
        ativo: 1,
      });
      desenhar();
      toast('Trabalho fixo adicionado com sucesso!');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  // Handler: Adicionar regra geral de dia
  btnAddDia.onclick = async () => {
    const dia = Number(selDia.value);
    const oco = Number(selOco.value);

    const existe = store.db.disponibilidade.some((d) =>
      d.medio_id === medioId &&
      d.dia_semana === dia &&
      d.ocorrencia === oco &&
      !d.trabalho_id &&
      d.ativo === 1 &&
      (d.contexto ?? 'dirigentes') === ctx
    );

    if (existe) {
      toast('Esta regra de dia já existe para o médium.', 'error');
      return;
    }

    try {
      await store.criar('disponibilidade', {
        medio_id: medioId,
        dia_semana: dia,
        ocorrencia: oco,
        trabalho_id: null,
        horario_id: null,
        ativo: 1,
      });
      desenhar();
      toast('Regra de disponibilidade adicionada.');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  selFixoTrab.onchange = atualizarOpcoesTrabalhoFixo;
  selFixoDia.onchange = atualizarOpcoesTrabalhoFixo;
  selMedium.onchange = desenhar;

  atualizarOpcoesTrabalhoFixo();
  desenhar();
}

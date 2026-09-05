export const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const DIAS_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const OCORRENCIAS = { 1: '1ª', 2: '2ª', 3: '3ª', 4: '4ª', 5: '5ª', 6: 'Última' };
export const SITUACAO = { 0: 'Não definido', 1: 'Presente', 2: 'Ausente' };
export const LEITO = 'LEITO';
// Contextos de escala: cada um tem trabalhos, horários, escala e disponibilidade próprios
export const CONTEXTOS = { dirigentes: 'Escala de dirigentes', ajanas: 'Escala de Ajanãs' };
// Funções/categorias do médium (Vale do Amanhecer)
export const FUNCOES_MEDIUM = ['Doutrinador', 'Ajanã', 'Ninfa Lua', 'Ninfa Sol'];
// Função exigida na distribuição automática de cada contexto
export const FUNCAO_POR_CONTEXTO = { dirigentes: 'Doutrinador', ajanas: 'Ajanã' };



// Marcador de leito: 'LEITO', 'Leito Externo', etc.
export function ehLeito(obs) {
  return /leito/i.test(obs ?? '');
}

// Trabalhos da grade mensal oficial (ordem das colunas na impressão)
export const TRABALHOS_MODELO = [
  'Presidente', 'Mesa Evang.', 'Tronos Verm.', 'Tronos Amar.', 'Cura',
  'Passe / Defum.', 'Junção', 'Indução', 'Randy', 'Orixá Recep.',
];
// Dias de sessão padrão do modelo (0=Dom, 3=Qua, 6=Sáb)
export const DIAS_SESSAO_MODELO = [0, 3, 6];

// Modelo de grade (trabalhos, dias de sessão e horários padrão) por contexto
export const MODELOS_GRADE = {
  dirigentes: { trabalhos: TRABALHOS_MODELO, dias: DIAS_SESSAO_MODELO, hora: ['19:00', '21:00'], qtd: {} },
  ajanas: {
    trabalhos: ['Imunização', 'Cura', 'Defumação', 'Randy'],
    dias: DIAS_SESSAO_MODELO, hora: ['19:00', '21:00'], qtd: { Randy: 2 },
  },
};

// Cabeçalho/rodapé de impressão por contexto (modelo dos documentos oficiais)
export const GRADE_CONFIG = {
  dirigentes: { titulo: null, aviso: '', rodapeFixo: '' },
  ajanas: {
    titulo: 'TARAJO DO AMANHECER — ESCALA DOS AJANÃS',
    aviso: 'APRESENTE-SE AO SEU COMANDANTE, NO DIA ESCALADO E CASO NÃO POSSA COMPARECER, SUBSTITUA ANTECIPADAMENTE!',
    rodapeFixo: 'A tua consciência pura, tão somente, não te livrará da maldade dos olhos físicos. É caridade, também, dará satisfação do teu comportamento ao teu vizinho, que não conhece a tua consciência.! Tia Neiva / Humarran — ADJ. APARÃ K.108 MESTRE SIDNEY · ADJ TARAJO K 108 MESTRE JURANDIR',
  },
};

const CHAVE = 'escalavale_db_v1';

function uid() {
  return Math.max(0, Date.now() % 2147483647) + Math.floor(Math.random() * 1000);
}

function semente() {
  return {
    mediuns: [
      { id: 1, nome: 'Maria Silva', telefone: '(35) 99911-2233', email: 'maria@example.com', observacao: 'Passista', ativo: 1 },
      { id: 2, nome: 'João Souza', telefone: '(35) 98811-4455', email: 'joao@example.com', observacao: '', ativo: 1 },
      { id: 3, nome: 'Ana Paula', telefone: '', email: '', observacao: 'Somente quartas', ativo: 1 },
    ],
    trabalhos: [
      { id: 1, nome: 'Passe', descricao: 'Trabalho de passe magnético', ativo: 1, ordem: 0, qtd_mediuns: 1 },
      { id: 2, nome: 'Palestra', descricao: 'Exposição evangélica', ativo: 1, ordem: 10, qtd_mediuns: 1 },
    ],
    horarios: [
      { id: 1, trabalho_id: 1, dia_semana: 3, hora_inicio: '19:00', hora_fim: '21:00' },
      { id: 2, trabalho_id: 2, dia_semana: 3, hora_inicio: '19:30', hora_fim: '20:30' },
      { id: 3, trabalho_id: 1, dia_semana: 6, hora_inicio: '08:00', hora_fim: '10:00' },
    ],
    escala: [],
    disponibilidade: [
      { id: 1, medio_id: 3, dia_semana: 3, ocorrencia: 1, ativo: 1 },
      { id: 2, medio_id: 3, dia_semana: 3, ocorrencia: 3, ativo: 1 },
    ],
    notas_mensais: {},
    seq: 100,
  };
}

function migrar(db) {
  db.mediuns ??= [];
  db.trabalhos ??= [];
  db.horarios ??= [];
  db.escala ??= [];
  db.disponibilidade ??= [];
  db.notas_mensais ??= {};
  for (const t of db.trabalhos) if (t.contexto == null) t.contexto = 'dirigentes';
  for (const e of db.escala) if (e.contexto == null) e.contexto = 'dirigentes';
  for (const d of db.disponibilidade) if (d.contexto == null) d.contexto = 'dirigentes';
  for (const chave of Object.keys(db.notas_mensais)) {
    if (!chave.includes(':')) {
      db.notas_mensais['dirigentes:' + chave] = db.notas_mensais[chave];
      delete db.notas_mensais[chave];
    }
  }
  db.mediuns.forEach((m) => {
    if (m.funcao == null) m.funcao = '';
    if (m.ativo == null) m.ativo = 1;
  });
  db.trabalhos.forEach((t, i) => {
    if (t.ordem == null) t.ordem = i * 10;
    if (t.qtd_mediuns == null) t.qtd_mediuns = 1;
  });
  if (db.seq == null) {
    const max = Math.max(0, ...db.mediuns.map((m) => m.id), ...db.trabalhos.map((t) => t.id),
      ...db.horarios.map((h) => h.id), ...db.escala.map((e) => e.id), 100);
    db.seq = max;
  }
  return db;
}

async function nuvem() {
  return import('./nuvem.js');
}

export const store = {
  db: null,
  modo: 'local',
  contextoAtual: 'dirigentes',

  nomeContexto(ctx = this.contextoAtual) {
    return CONTEXTOS[ctx] ?? ctx;
  },

  carregarLocal() {
    try {
      const bruto = localStorage.getItem(CHAVE);
      this.db = migrar(bruto ? JSON.parse(bruto) : semente());
      this.salvarLocal();
    } catch {
      this.db = semente();
    }
    this.modo = 'local';
    return this.db;
  },

  usarNuvem(dados) {
    this.db = migrar(dados);
    this.modo = 'nuvem';
    return this.db;
  },

  salvarLocal() {
    localStorage.setItem(CHAVE, JSON.stringify(this.db));
  },

  exportar() {
    return JSON.stringify(this.db, null, 2);
  },

  importar(json) {
    const dados = JSON.parse(json);
    if (!dados.mediuns || !dados.trabalhos) throw new Error('Arquivo inválido');
    this.db = migrar(dados);
    this.salvarLocal();
  },

  resetar() {
    this.db = semente();
    this.salvarLocal();
  },

  proximoId() {
    this.db.seq += 1;
    return this.db.seq;
  },

  async criar(tabela, obj) {
    if (obj.contexto == null && ['trabalhos', 'escala', 'disponibilidade'].includes(tabela)) {
      obj = { ...obj, contexto: this.contextoAtual };
    }
    if (this.modo === 'nuvem') {
      const { inserir } = await nuvem();
      const linha = await inserir(tabela, obj);
      const norm = tabela === 'escala'
        ? { ...linha, medio_id: linha.medio_id ?? 0, horario_id: linha.horario_id ?? 0 }
        : linha;
      this.db[tabela].push(norm);
      return norm;
    }
    const linha = { id: this.proximoId(), ...obj };
    this.db[tabela].push(linha);
    this.salvarLocal();
    return linha;
  },

  async atualizar(tabela, id, patch) {
    if (this.modo === 'nuvem') {
      const { atualizar } = await nuvem();
      await atualizar(tabela, id, patch);
    }
    Object.assign(this.db[tabela].find((r) => r.id === id), patch);
    if (this.modo === 'local') this.salvarLocal();
  },

  async excluir(tabela, id) {
    if (this.modo === 'nuvem') {
      const { excluir } = await nuvem();
      await excluir(tabela, id);
    }
    this.db[tabela] = this.db[tabela].filter((r) => r.id !== id);
    if (this.modo === 'local') this.salvarLocal();
  },

  async excluirCelula(dataISO, trabalhoId) {
    if (this.modo === 'nuvem') {
      const { excluirCelula } = await nuvem();
      await excluirCelula(dataISO, trabalhoId, this.contextoAtual);
    }
    this.db.escala = this.db.escala.filter((e) => !(e.data === dataISO && e.trabalho_id === trabalhoId));
    if (this.modo === 'local') this.salvarLocal();
  },

  // ---- Consultas base (espelham o schema SQLite original) ----
  mediunsAtivos() {
    return this.db.mediuns.filter((m) => m.ativo === 1).sort((a, b) => a.nome.localeCompare(b.nome));
  },
  // Montagem manual da escala: no contexto Ajanãs, só função Ajanã
  mediunsParaMontagem(ctx = this.contextoAtual) {
    const ativos = this.mediunsAtivos();
    if (ctx === 'ajanas') return ativos.filter((m) => m.funcao === 'Ajanã');
    return ativos;
  },
  trabalhosAtivos(ctx = this.contextoAtual) {
    return this.db.trabalhos
      .filter((t) => t.ativo === 1 && (t.contexto ?? 'dirigentes') === ctx)
      .sort((a, b) => (a.ordem ?? 9999) - (b.ordem ?? 9999) || a.nome.localeCompare(b.nome));
  },
  trabalhoContexto(trabalhoId) {
    return this.db.trabalhos.find((t) => t.id === trabalhoId)?.contexto ?? 'dirigentes';
  },
  nomeMedium(id) {
    return this.db.mediuns.find((m) => m.id === id)?.nome ?? '—';
  },
  nomeTrabalho(id) {
    return this.db.trabalhos.find((t) => t.id === id)?.nome ?? '—';
  },
  horariosDoDia(diaSemana, ctx = this.contextoAtual) {
    return this.db.horarios
      .filter((h) => h.dia_semana === diaSemana && this.trabalhoContexto(h.trabalho_id) === ctx)
      .map((h) => ({ ...h, trabalho_nome: this.nomeTrabalho(h.trabalho_id) }))
      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
  },
  horariosDoTrabalhoNoDia(trabalhoId, diaSemana, ctx = this.contextoAtual) {
    return this.db.horarios
      .filter((h) => h.trabalho_id === trabalhoId && h.dia_semana === diaSemana && this.trabalhoContexto(trabalhoId) === ctx)
      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
  },
  escalaDoDia(dataISO, ctx = this.contextoAtual) {
    return this.db.escala.filter((e) => e.data === dataISO && (e.contexto ?? 'dirigentes') === ctx);
  },
  regrasDoMedium(medioId, ctx = this.contextoAtual) {
    return this.db.disponibilidade.filter((d) => d.medio_id === medioId && d.ativo === 1 && (d.contexto ?? 'dirigentes') === ctx);
  },
  chaveNota(mesChave, ctx = this.contextoAtual) {
    return `${ctx}:${mesChave}`;
  },
  notaDoMes(mesChave, ctx = this.contextoAtual) {
    return this.db.notas_mensais[this.chaveNota(mesChave, ctx)] ?? '';
  },
  async salvarNotaDoMes(mesChave, texto, ctx = this.contextoAtual) {
    if (this.modo === 'nuvem') {
      const { salvarNota } = await nuvem();
      await salvarNota(this.chaveNota(mesChave, ctx), texto);
    }
    this.db.notas_mensais[this.chaveNota(mesChave, ctx)] = texto;
    if (this.modo === 'local') this.salvarLocal();
  },
  async moverTrabalho(id, direcao) {
    const lista = this.trabalhosAtivos();
    const i = lista.findIndex((t) => t.id === id);
    const j = i + direcao;
    if (i < 0 || j < 0 || j >= lista.length) return;
    const a = lista[i];
    const b = lista[j];
    await this.atualizar('trabalhos', a.id, { ordem: b.ordem });
    await this.atualizar('trabalhos', b.id, { ordem: a.ordem });
  },

  // Cria os 10 trabalhos do modelo + horários nos dias de sessão (sem duplicar)
  async criarGradeModelo() {
    const modelo = MODELOS_GRADE[this.contextoAtual] ?? MODELOS_GRADE.dirigentes;
    const horariosNovos = [];
    for (const [idx, nome] of modelo.trabalhos.entries()) {
      let trab = this.db.trabalhos.find((t) => t.nome.toLowerCase() === nome.toLowerCase() && t.ativo === 1);
      if (!trab) {
        trab = await this.criar('trabalhos', { nome, descricao: '', ativo: 1, ordem: idx * 10, qtd_mediuns: modelo.qtd[nome] ?? 1, contexto: this.contextoAtual });
      }
      for (const dow of modelo.dias) {
        const existe = this.db.horarios.some((h) => h.trabalho_id === trab.id && h.dia_semana === dow);
        if (!existe) {
          horariosNovos.push({ trabalho_id: trab.id, dia_semana: dow, hora_inicio: '19:00', hora_fim: '21:00' });
        }
      }
    }
    await Promise.all(horariosNovos.map((h) => this.criar('horarios', h)));
    const renumerar = this.trabalhosAtivos().map((t) => {
      const idxModelo = modelo.trabalhos.findIndex((n) => n.toLowerCase() === t.nome.toLowerCase());
      const ordem = idxModelo >= 0 ? idxModelo * 10 : 1000 + (t.ordem ?? 0);
      return this.atualizar('trabalhos', t.id, { ordem });
    });
    await Promise.all(renumerar);
  },

  // Distribui médiuns aleatoriamente nas células do mês, respeitando
  // disponibilidade, conflitos de horário e pulando células LEITO / sem horário.
  // modo: 'vazias' (só preenche células vazias) | 'tudo' (limpa e redistribui)
  async distribuirAutomaticamente(mesChave, { modo = 'vazias', porCelula = null } = {}) {
    const [ano, mesNum] = mesChave.split('-').map(Number);
    const dias = diasDeSessaoDoMes(ano, mesNum);
    const trabalhos = this.trabalhosAtivos();
    const mediuns = this.mediunsAtivos();
    const resumo = { preenchidas: 0, incompletas: 0, semHorario: 0, semElegivel: 0, removidas: 0, celulas: 0 };
    const idsRemover = [];

    if (modo === 'tudo') {
      for (const d of dias) {
        for (const t of trabalhos) {
          const cel = celulaMensal(d.iso, t.id);
          if (cel.temLeito) continue;
          for (const e of cel.itens) {
            if (e.medio_id > 0) idsRemover.push(e.id);
          }
        }
      }
      this.db.escala = this.db.escala.filter((e) => !idsRemover.includes(e.id));
    }

    const ctx = this.contextoAtual;
    const vinculosNoMes = (medioId) => this.db.escala.filter((e) =>
      e.medio_id === medioId && e.data.startsWith(mesChave) && (e.contexto ?? 'dirigentes') === ctx).length;

    const planejados = [];
    for (const d of dias) {
      for (const t of trabalhos) {
        const cel = celulaMensal(d.iso, t.id);
        if (cel.temLeito) continue;
        const horarios = this.horariosDoTrabalhoNoDia(t.id, d.dow);
        if (horarios.length === 0) { resumo.semHorario++; continue; }
        const ref = horarios[0];
        resumo.celulas++;
        const existentes = modo === 'tudo' ? [] : cel.itens.filter((e) => e.medio_id > 0);
        const meta = porCelula ?? t.qtd_mediuns ?? 1;
        const faltam = meta - existentes.length;
        if (faltam <= 0) continue;
        const ocupados = new Set(existentes.map((e) => e.medio_id));
        const candidatos = mediuns
          .filter((m) => !ocupados.has(m.id) && m.funcao === (FUNCAO_POR_CONTEXTO[ctx] ?? ''))
          .map((m) => ({ m, sorte: Math.random() }))
          .sort((a, b) => (vinculosNoMes(a.m.id) - vinculosNoMes(b.m.id)) || (a.sorte - b.sorte));
        let adicionados = 0;
        for (const { m } of candidatos) {
          if (adicionados >= faltam) break;
          if (!mediumDisponivelNaData(m.id, d.iso)) continue;
          if (haConflitoHorario(m.id, d.iso, ref.hora_inicio, ref.hora_fim, 0)) continue;
          const novo = {
            id: -(planejados.length + 1),
            medio_id: m.id, trabalho_id: t.id, data: d.iso,
            horario_id: ref.id, presente: 0, observacao: '',
            contexto: ctx,
          };
          planejados.push(novo);
          this.db.escala.push(novo);
          ocupados.add(m.id);
          adicionados++;
        }
        if (adicionados >= faltam) resumo.preenchidas++;
        else if (adicionados > 0) { resumo.preenchidas++; resumo.incompletas++; }
        else resumo.semElegivel++;
      }
    }

    if (this.modo === 'nuvem') {
      const { inserir, excluir } = await nuvem();
      if (idsRemover.length) await Promise.all(idsRemover.map((id) => excluir('escala', id)));
      this.db.escala = this.db.escala.filter((e) => e.id > 0);
      const gravados = await Promise.all(planejados.map((pl) => {
        const { id, ...resto } = pl;
        return inserir('escala', resto);
      }));
      for (const g of gravados) {
        this.db.escala.push({ ...g, medio_id: g.medio_id ?? 0, horario_id: g.horario_id ?? 0 });
      }
    } else {
      for (const pl of planejados) pl.id = this.proximoId();
      this.salvarLocal();
    }
    resumo.removidas = idsRemover.length;
    return resumo;
  },
};

// ---- Visão diária (1 slot = 1 horário; pode ter N vínculos) ----
export function slotsDaData(dataISO, ctx = store.contextoAtual) {
  const data = new Date(dataISO + 'T12:00:00');
  const diaSemana = data.getDay();
  const horarios = store.horariosDoDia(diaSemana, ctx);
  const lancamentos = store.escalaDoDia(dataISO, ctx);
  return horarios.map((h) => {
    const vinculos = lancamentos.filter((e) => e.horario_id === h.id && e.medio_id > 0);
    const esc = vinculos[0];
    const temLeito = lancamentos.some((e) => e.horario_id === h.id && ehLeito(e.observacao));
    return {
      ...h,
      dia_semana: diaSemana,
      escala_id: esc?.id ?? 0,
      medio_id: esc?.medio_id ?? 0,
      medio_nome: esc ? store.nomeMedium(esc.medio_id) : '',
      presente: esc?.presente ?? 0,
      observacao: esc?.observacao ?? '',
      vinculos,
      todos_nomes: vinculos.map((v) => store.nomeMedium(v.medio_id)),
      tem_leito: temLeito,
    };
  });
}

// ---- Grade mensal: célula = (data, trabalho) -> N nomes + flag LEITO ----
export function celulaMensal(dataISO, trabalhoId, ctx = store.contextoAtual) {
  const itens = store.db.escala.filter((e) => e.data === dataISO && e.trabalho_id === trabalhoId && (e.contexto ?? 'dirigentes') === ctx);
  return {
    itens,
    nomes: itens.filter((e) => e.medio_id > 0).map((e) => store.nomeMedium(e.medio_id)),
    temLeito: itens.some((e) => ehLeito(e.observacao)),
  };
}

// Datas de sessão do mês: dias que têm ao menos 1 horário cadastrado
export function diasDeSessaoDoMes(ano, mes1a12, ctx = store.contextoAtual) {
  const diasComHorario = new Set(store.db.horarios
    .filter((h) => store.trabalhoContexto(h.trabalho_id) === ctx)
    .map((h) => h.dia_semana));
  const ultimo = new Date(ano, mes1a12, 0).getDate();
  const dias = [];
  for (let d = 1; d <= ultimo; d++) {
    const dt = new Date(ano, mes1a12 - 1, d);
    if (diasComHorario.has(dt.getDay())) {
      dias.push({ iso: `${ano}-${String(mes1a12).padStart(2, '0')}-${String(d).padStart(2, '0')}`, dow: dt.getDay(), dia: d });
    }
  }
  return dias;
}

export function haConflitoHorario(medioId, dataISO, horaInicio, horaFim, ignorarEscalaId = 0, ctx = store.contextoAtual) {
  return store.db.escala.some((e) => {
    if (e.medio_id !== medioId || e.data !== dataISO || e.id === ignorarEscalaId) return false;
    if ((e.contexto ?? 'dirigentes') !== ctx) return false;
    const h = store.db.horarios.find((x) => x.id === e.horario_id);
    if (!h) return false;
    return h.hora_inicio < horaFim && horaInicio < h.hora_fim;
  });
}

function ocorrenciaNoMes(data, diaSemana) {
  const ano = data.getFullYear();
  const mes = data.getMonth();
  let cont = 0;
  for (let d = 1; d <= data.getDate(); d++) {
    if (new Date(ano, mes, d).getDay() === diaSemana) cont++;
  }
  return cont;
}

function totalOcorrenciasNoMes(data, diaSemana) {
  const ano = data.getFullYear();
  const mes = data.getMonth();
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();
  let total = 0;
  for (let d = 1; d <= ultimoDia; d++) {
    if (new Date(ano, mes, d).getDay() === diaSemana) total++;
  }
  return total;
}

export function mediumDisponivelNaData(medioId, dataISO, ctx = store.contextoAtual) {
  const regras = store.regrasDoMedium(medioId, ctx);
  if (regras.length === 0) return true;
  const data = new Date(dataISO + 'T12:00:00');
  const dow = data.getDay();
  for (const r of regras) {
    if (r.dia_semana !== dow) continue;
    const ocorrenciaAtual = ocorrenciaNoMes(data, dow);
    if (r.ocorrencia <= 5 && ocorrenciaAtual === r.ocorrencia) return true;
    if (r.ocorrencia === 6 && ocorrenciaAtual === totalOcorrenciasNoMes(data, dow)) return true;
  }
  return false;
}

export { uid };

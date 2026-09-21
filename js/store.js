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

// Grades da Escala de Ajanãs: cada trabalho pertence a uma delas (campo grade)
export const GRADES_AJANAS = {
  'aj-grade': { titulo: 'Grade Templo', trabalhos: ['Imunização', 'Cura', 'Defumação', 'Randy 1', 'Randy 2'], qtd: {} },
  'aj-oraculo': { titulo: 'Grade Oráculo', trabalhos: ['Oráculo'], qtd: { Oráculo: 2 } },
  'aj-libertacao': { titulo: 'Grade Libertação', trabalhos: ['Libertação'], qtd: {} },
  'aj-sanday': { titulo: 'Grade Sanday Tronos', trabalhos: ['Sanday de Tronos'], qtd: { 'Sanday de Tronos': 3 } },
  'aj-sublimacao': { titulo: 'Grade Sublimação e Turigano', trabalhos: ['Estrela Sublimação', 'Turigano'], qtd: {} },
};

// Modelo de grade (trabalhos, dias de sessão e horários padrão) por contexto
export const MODELOS_GRADE = {
  dirigentes: { trabalhos: TRABALHOS_MODELO, dias: DIAS_SESSAO_MODELO, hora: ['19:00', '21:00'], qtd: {} },
  ajanas: {
    trabalhos: ['Imunização', 'Cura', 'Defumação', 'Randy 1', 'Randy 2'],
    dias: DIAS_SESSAO_MODELO, hora: ['19:00', '21:00'], qtd: {},
  },
};

// Cabeçalho/rodapé de impressão por contexto (modelo dos documentos oficiais)
export const GRADE_CONFIG = {
  dirigentes: { titulo: null, aviso: '', rodapeFixo: '' },
  ajanas: {
    titulo: 'TARAJO DO AMANHECER',
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
    usuarios: [
      { id: 1, nome: 'Junio Silva', email: 'juniobsilva@gmail.com', papel: 'admin', ativo: 1, escopos: ['dirigentes', 'ajanas'] },
    ],
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
  db.usuarios ??= [];
  const adminPrincipal = db.usuarios.find((u) => (u.email || '').toLowerCase().trim() === 'juniobsilva@gmail.com');
  if (!adminPrincipal) {
    db.usuarios.unshift({ id: 1, nome: 'Junio Silva', email: 'juniobsilva@gmail.com', papel: 'admin', ativo: 1, escopos: ['dirigentes', 'ajanas'] });
  } else {
    adminPrincipal.papel = 'admin';
    adminPrincipal.ativo = 1;
    adminPrincipal.escopos = ['dirigentes', 'ajanas'];
  }
  db.usuarios.forEach((u) => {
    if (u.papel == null) u.papel = 'coordenador';
    if (u.ativo == null) u.ativo = 1;
    if (u.escopos == null || !Array.isArray(u.escopos)) u.escopos = ['dirigentes', 'ajanas'];
  });
  for (const t of db.trabalhos) {
    if (t.contexto == null) t.contexto = 'dirigentes';
    if ((t.contexto ?? 'dirigentes') === 'ajanas' && (t.nome ?? '').toLowerCase() === 'randy') {
      t.nome = 'Randy 1';
      t.qtd_mediuns = 1;
      t.grade = 'aj-grade';
    }
    if (t.grade == null && (t.contexto ?? 'dirigentes') === 'ajanas') {
      const nome = (t.nome ?? '').toLowerCase();
      for (const [gk, gd] of Object.entries(GRADES_AJANAS)) {
        if (gd.trabalhos.some((n) => n.toLowerCase() === nome)) { t.grade = gk; break; }
      }
    }
  }
  for (const e of db.escala) if (e.contexto == null) e.contexto = 'dirigentes';
  for (const d of db.disponibilidade) {
    if (d.contexto == null) d.contexto = 'dirigentes';
    if (d.trabalho_id === undefined) d.trabalho_id = null;
    if (d.horario_id === undefined) d.horario_id = null;
  }
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
      ...db.horarios.map((h) => h.id), ...db.escala.map((e) => e.id),
      ...db.usuarios.map((u) => typeof u.id === 'number' ? u.id : 0), 100);
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
  usuarioAtual: null,

  nomeContexto(ctx = this.contextoAtual) {
    return CONTEXTOS[ctx] ?? ctx;
  },

  definirUsuarioAtual(email) {
    if (!email) {
      this.usuarioAtual = { email: 'local@escalavale', nome: 'Administrador Local', papel: 'admin', ativo: 1, escopos: ['dirigentes', 'ajanas'] };
      return this.usuarioAtual;
    }
    const emailNorm = email.toLowerCase().trim();
    let u = this.db.usuarios.find((x) => (x.email || '').toLowerCase().trim() === emailNorm);
    if (emailNorm === 'juniobsilva@gmail.com') {
      if (!u) {
        u = { id: 1, nome: 'Junio Silva', email: 'juniobsilva@gmail.com', papel: 'admin', ativo: 1, escopos: ['dirigentes', 'ajanas'] };
        this.db.usuarios.unshift(u);
      } else {
        u.papel = 'admin';
        u.ativo = 1;
        u.escopos = ['dirigentes', 'ajanas'];
      }
    }
    if (!u) {
      // Usuário autenticado pelo Supabase Auth mas ainda sem linha em public.usuarios
      u = { id: uid(), nome: email.split('@')[0], email, papel: 'coordenador', ativo: 1, escopos: ['dirigentes', 'ajanas'] };
      this.db.usuarios.push(u);
    }
    if (!u.escopos || !Array.isArray(u.escopos)) {
      u.escopos = ['dirigentes', 'ajanas'];
    }
    this.usuarioAtual = u;
    return this.usuarioAtual;
  },

  ehAdmin() {
    return this.usuarioAtual?.papel === 'admin';
  },

  temEscopo(escopo) {
    if (this.ehAdmin()) return true;
    const escopos = this.usuarioAtual?.escopos;
    if (!escopos || !Array.isArray(escopos)) return false;
    return escopos.includes(escopo);
  },

  usuarios() {
    return this.db.usuarios ?? [];
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

  undoStack: [],
  mesesCarregados: new Set(),

  salvarSnapshotUndo(descricao, snapshot = null) {
    this.undoStack.push({
      descricao,
      timestamp: Date.now(),
      escala: JSON.parse(JSON.stringify(snapshot ?? this.db.escala)),
    });
    if (this.undoStack.length > 10) this.undoStack.shift();
  },

  podeDesfazer() {
    return this.undoStack.length > 0;
  },

  async desfazer() {
    if (!this.undoStack.length) return null;
    const ultimo = this.undoStack.pop();
    const anterior = ultimo.escala;
    if (this.modo === 'nuvem') {
      const { excluir, inserir } = await nuvem();
      const idsAtuais = this.db.escala.map((e) => e.id);
      await Promise.all(idsAtuais.map((id) => excluir('escala', id).catch(() => {})));
      const restaurados = await Promise.all(anterior.map((e) => {
        const { id, ...resto } = e;
        return inserir('escala', resto).catch(() => null);
      }));
      this.db.escala = restaurados.filter(Boolean).map((g) => ({
        ...g,
        medio_id: g.medio_id ?? 0,
        horario_id: g.horario_id ?? 0,
      }));
    } else {
      this.db.escala = anterior;
      this.salvarLocal();
    }
    return ultimo.descricao;
  },

  async garantirMesCarregado(mesChave) {
    if (this.modo !== 'nuvem') return;
    if (this.mesesCarregados.has(mesChave)) return;
    try {
      const { carregarEscalaMes } = await nuvem();
      if (carregarEscalaMes) {
        const itens = await carregarEscalaMes(mesChave);
        const idsExistentes = new Set(this.db.escala.map((e) => e.id));
        for (const item of itens) {
          if (!idsExistentes.has(item.id)) {
            this.db.escala.push(item);
          }
        }
      }
      this.mesesCarregados.add(mesChave);
    } catch (err) {
      console.warn(`Aviso ao carregar escala do mês ${mesChave}:`, err);
    }
  },

  exportar() {
    return JSON.stringify(this.db, null, 2);
  },

  importar(json) {
    let dados;
    try {
      dados = JSON.parse(json);
    } catch {
      throw new Error('Arquivo inválido: JSON corrompido.');
    }
    if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
      throw new Error('Arquivo inválido: o conteúdo raiz deve ser um objeto JSON.');
    }
    if (!Array.isArray(dados.mediuns)) {
      throw new Error('Arquivo inválido: a lista "mediuns" é obrigatória.');
    }
    for (const m of dados.mediuns) {
      if (!m || typeof m !== 'object' || m.id == null || typeof m.nome !== 'string') {
        throw new Error('Arquivo inválido: formato incorreto em um dos médiuns.');
      }
    }
    if (!Array.isArray(dados.trabalhos)) {
      throw new Error('Arquivo inválido: a lista "trabalhos" é obrigatória.');
    }
    for (const t of dados.trabalhos) {
      if (!t || typeof t !== 'object' || t.id == null || typeof t.nome !== 'string') {
        throw new Error('Arquivo inválido: formato incorreto em um dos trabalhos.');
      }
    }
    if (dados.horarios != null && !Array.isArray(dados.horarios)) {
      throw new Error('Arquivo inválido: o campo "horarios" deve ser uma lista.');
    }
    if (dados.escala != null && !Array.isArray(dados.escala)) {
      throw new Error('Arquivo inválido: o campo "escala" deve ser uma lista.');
    }
    if (dados.disponibilidade != null && !Array.isArray(dados.disponibilidade)) {
      throw new Error('Arquivo inválido: o campo "disponibilidade" deve ser uma lista.');
    }
    if (dados.usuarios != null && !Array.isArray(dados.usuarios)) {
      throw new Error('Arquivo inválido: o campo "usuarios" deve ser uma lista.');
    }
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
    if (tabela === 'usuarios') {
      const u = this.db.usuarios.find((r) => r.id === id);
      if (u && (u.email || '').toLowerCase().trim() === 'juniobsilva@gmail.com') {
        if (patch.papel && patch.papel !== 'admin') throw new Error('O usuário juniobsilva@gmail.com deve ser sempre admin.');
        if (patch.ativo === 0) throw new Error('O usuário principal juniobsilva@gmail.com não pode ser desativado.');
      }
      if (u && this.usuarioAtual && u.email === this.usuarioAtual.email && patch.ativo === 0) {
        throw new Error('Você não pode desativar seu próprio usuário.');
      }
    }
    if (this.modo === 'nuvem') {
      const { atualizar } = await nuvem();
      await atualizar(tabela, id, patch);
    }
    Object.assign(this.db[tabela].find((r) => r.id === id), patch);
    if (this.modo === 'local') this.salvarLocal();
  },

  async excluir(tabela, id) {
    if (tabela === 'usuarios') {
      const u = this.db.usuarios.find((r) => r.id === id);
      if (u && (u.email || '').toLowerCase().trim() === 'juniobsilva@gmail.com') {
        throw new Error('O usuário principal juniobsilva@gmail.com não pode ser excluído.');
      }
      if (u && this.usuarioAtual && u.email === this.usuarioAtual.email) {
        throw new Error('Você não pode excluir seu próprio usuário.');
      }
    }
    if (this.modo === 'nuvem') {
      const { excluir } = await nuvem();
      await excluir(tabela, id);
    }
    this.db[tabela] = this.db[tabela].filter((r) => r.id !== id);
    if (this.modo === 'local') this.salvarLocal();
  },

  // Remove todos os médiuns escalados no mês (mantém marcadores LEITO)
  async limparMes(mesChave, ctx = this.contextoAtual, trabalhoIds = null) {
    const alvos = this.db.escala.filter((e) =>
      e.data.startsWith(mesChave) && (e.contexto ?? 'dirigentes') === ctx && e.medio_id > 0 &&
      (!trabalhoIds || trabalhoIds.includes(e.trabalho_id)));
    if (!alvos.length) return 0;
    this.salvarSnapshotUndo(`Limpar mês ${mesChave}`);
    if (this.modo === 'nuvem') {
      const { excluir } = await nuvem();
      const excluidosComSucesso = [];
      const erros = [];
      for (const e of alvos) {
        try {
          await excluir('escala', e.id);
          excluidosComSucesso.push(e.id);
        } catch (err) {
          erros.push(err);
        }
      }
      const ids = new Set(excluidosComSucesso);
      this.db.escala = this.db.escala.filter((e) => !ids.has(e.id));
      if (erros.length > 0) {
        throw new Error(`Aviso: ${erros.length} vínculo(s) não puderam ser excluídos na nuvem.`);
      }
      return excluidosComSucesso.length;
    }
    const ids = new Set(alvos.map((e) => e.id));
    this.db.escala = this.db.escala.filter((e) => !ids.has(e.id));
    this.salvarLocal();
    return alvos.length;
  },

  async excluirCelula(dataISO, trabalhoId) {
    this.salvarSnapshotUndo(`Limpar célula ${dataISO}`);
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
  // Cadastro de disponibilidade: somente a função exigida no contexto (Doutrinador para dirigentes, Ajanã para ajanãs)
  mediunsDisponibilidade(ctx = this.contextoAtual) {
    const funcao = FUNCAO_POR_CONTEXTO[ctx] ?? '';
    return this.mediunsAtivos().filter((m) => !funcao || m.funcao === funcao);
  },
  trabalhosAtivos(ctx = this.contextoAtual) {
    return this.db.trabalhos
      .filter((t) => t.ativo === 1 && (t.contexto ?? 'dirigentes') === ctx)
      .sort((a, b) => (a.ordem ?? 9999) - (b.ordem ?? 9999) || a.nome.localeCompare(b.nome));
  },
  trabalhoContexto(trabalhoId) {
    return this.db.trabalhos.find((t) => t.id === trabalhoId)?.contexto ?? 'dirigentes';
  },
  // Grade do trabalho (só Ajanãs): campo grade ou dedução pelo nome; null = todas
  gradeDoTrabalho(t) {
    if (t.grade) return t.grade;
    const nome = (t.nome ?? '').toLowerCase();
    for (const [gk, gd] of Object.entries(GRADES_AJANAS)) {
      if (gd.trabalhos.some((n) => n.toLowerCase() === nome)) return gk;
    }
    return null;
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
    return this.db.disponibilidade
      .filter((d) => d.medio_id === medioId && d.ativo === 1 && (d.contexto ?? 'dirigentes') === ctx)
      .map((d) => {
        const horario = d.horario_id ? this.db.horarios.find((h) => h.id === d.horario_id) : null;
        return {
          ...d,
          posicao: d.posicao ?? 1,
          trabalho_nome: d.trabalho_id ? this.nomeTrabalho(d.trabalho_id) : null,
          hora_inicio: horario?.hora_inicio ?? null,
          hora_fim: horario?.hora_fim ?? null,
        };
      });
  },
  verificarConflitoTrabalhoFixo({ medioId, trabalhoId, diaSemana, ocorrencia, posicao = 1, ctx = this.contextoAtual }) {
    // 1. Verifica se outro médium já ocupa essa posição fixa neste trabalho/data
    const outro = this.db.disponibilidade.find((d) =>
      d.ativo === 1 &&
      (d.contexto ?? 'dirigentes') === ctx &&
      d.trabalho_id === trabalhoId &&
      d.dia_semana === diaSemana &&
      d.ocorrencia === ocorrencia &&
      (d.posicao ?? 1) === posicao &&
      d.medio_id !== medioId
    );
    if (outro) {
      return {
        conflito: true,
        tipo: 'outro_medium',
        outroMedioNome: this.nomeMedium(outro.medio_id),
        mensagem: `O médium "${this.nomeMedium(outro.medio_id)}" já está cadastrado na posição ${posicao} de "${this.nomeTrabalho(trabalhoId)}" no(a) ${OCORRENCIAS[ocorrencia]} ${DIAS_SEMANA[diaSemana]}.`,
      };
    }

    // 2. Verifica se o próprio médium já tem exatamente essa regra
    const proprio = this.db.disponibilidade.find((d) =>
      d.ativo === 1 &&
      (d.contexto ?? 'dirigentes') === ctx &&
      d.trabalho_id === trabalhoId &&
      d.dia_semana === diaSemana &&
      d.ocorrencia === ocorrencia &&
      (d.posicao ?? 1) === posicao &&
      d.medio_id === medioId
    );
    if (proprio) {
      return {
        conflito: true,
        tipo: 'duplicado',
        mensagem: 'Este médium já possui esta regra de trabalho fixo cadastrada.',
      };
    }

    // 3. Verifica se o próprio médium já tem outro trabalho fixo no mesmo dia e horário
    const horarios = this.horariosDoTrabalhoNoDia(trabalhoId, diaSemana);
    const hNovo = horarios[0];
    if (hNovo) {
      const conflitoHorario = this.db.disponibilidade.find((d) => {
        if (d.ativo !== 1 || (d.contexto ?? 'dirigentes') !== ctx || d.medio_id !== medioId) return false;
        if (d.dia_semana !== diaSemana || d.ocorrencia !== ocorrencia || !d.trabalho_id || d.trabalho_id === trabalhoId) return false;
        const hExistente = this.horariosDoTrabalhoNoDia(d.trabalho_id, diaSemana)[0];
        if (!hExistente) return false;
        return !(hNovo.hora_fim <= hExistente.hora_inicio || hNovo.hora_inicio >= hExistente.hora_fim);
      });
      if (conflitoHorario) {
        return {
          conflito: true,
          tipo: 'horario',
          mensagem: `Este médium já possui o trabalho fixo "${this.nomeTrabalho(conflitoHorario.trabalho_id)}" no mesmo dia e horário.`,
        };
      }
    }

    return { conflito: false };
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
        trab = await this.criar('trabalhos', { nome, descricao: '', ativo: 1, ordem: idx * 10, qtd_mediuns: modelo.qtd[nome] ?? 1, contexto: this.contextoAtual, grade: this.contextoAtual === 'ajanas' ? 'aj-grade' : null });
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

  // Distribui médiuns aleatoriamente nas células do mês (ou meses para bimestral),
  // respeitando disponibilidade, limite máximo por médium, conflitos de horário
  // e pulando células LEITO / sem horário.
  // modo: 'vazias' (só preenche células vazias) | 'tudo' (limpa e redistribui)
  async distribuirAutomaticamente(mesChaves, { modo = 'vazias', porCelula = null, trabalhoIds = null, limiteMaximoPorMedium = 0 } = {}) {
    const meses = Array.isArray(mesChaves) ? mesChaves : [mesChaves];
    this.salvarSnapshotUndo(`Distribuição automática (${meses.join(', ')})`);
    const snapshotOriginal = JSON.parse(JSON.stringify(this.db.escala));

    const trabalhos = this.trabalhosAtivos().filter((t) => !trabalhoIds || trabalhoIds.includes(t.id));
    const dias = meses.flatMap((mm) => {
      const [ano, mesNum] = mm.split('-').map(Number);
      return diasDeSessaoDoMes(ano, mesNum, this.contextoAtual, trabalhos.map((t) => t.id));
    });
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
    // Unifica a contagem de vínculos entre todos os meses informados (essencial para o bimestre)
    const vinculosNoPeriodo = (medioId) => this.db.escala.filter((e) =>
      e.medio_id === medioId && meses.some((mm) => e.data.startsWith(mm)) && (e.contexto ?? 'dirigentes') === ctx).length;

    const planejados = [];

    // FASE 1: Alocação obrigatória de trabalhos fixos
    const regrasFixas = this.db.disponibilidade.filter((r) =>
      r.ativo === 1 && (r.contexto ?? 'dirigentes') === ctx && r.trabalho_id > 0
    );

    for (const d of dias) {
      const dt = new Date(d.iso + 'T12:00:00');
      const oco = ocorrenciaNoMes(dt, d.dow);
      const totalOco = totalOcorrenciasNoMes(dt, d.dow);

      for (const t of trabalhos) {
        const cel = celulaMensal(d.iso, t.id);
        if (cel.temLeito) continue;
        const horarios = this.horariosDoTrabalhoNoDia(t.id, d.dow);
        if (horarios.length === 0) continue;

        const regrasFixasDaCelula = regrasFixas
          .filter((r) =>
            r.trabalho_id === t.id &&
            r.dia_semana === d.dow &&
            (r.ocorrencia === oco || (r.ocorrencia === 6 && oco === totalOco))
          )
          .sort((a, b) => (a.posicao ?? 1) - (b.posicao ?? 1));

        for (const regraFixa of regrasFixasDaCelula) {
          const medioFixo = mediuns.find((m) => m.id === regraFixa.medio_id);
          if (medioFixo) {
            const jaEsta = cel.itens.some((e) => e.medio_id === medioFixo.id);
            if (!jaEsta) {
              const horarioAlvo = (regraFixa.horario_id && horarios.find((h) => h.id === regraFixa.horario_id)) || horarios[0];
              if (!haConflitoHorario(medioFixo.id, d.iso, horarioAlvo.hora_inicio, horarioAlvo.hora_fim, 0)) {
                const novo = {
                  id: -(planejados.length + 1),
                  medio_id: medioFixo.id,
                  trabalho_id: t.id,
                  data: d.iso,
                  horario_id: horarioAlvo.id,
                  presente: 0,
                  observacao: '',
                  contexto: ctx,
                };
                planejados.push(novo);
                this.db.escala.push(novo);
              }
            }
          }
        }
      }
    }

    // FASE 2: Preenchimento das vagas restantes
    for (const d of dias) {
      for (const t of trabalhos) {
        const cel = celulaMensal(d.iso, t.id);
        if (cel.temLeito) continue;
        const horarios = this.horariosDoTrabalhoNoDia(t.id, d.dow);
        if (horarios.length === 0) { resumo.semHorario++; continue; }
        const ref = horarios[0];
        resumo.celulas++;
        const existentes = cel.itens.filter((e) => e.medio_id > 0);
        const meta = porCelula ?? t.qtd_mediuns ?? 1;
        const faltam = meta - existentes.length;
        if (faltam <= 0) {
          resumo.preenchidas++;
          continue;
        }
        const ocupados = new Set(existentes.map((e) => e.medio_id));
        const candidatos = mediuns
          .filter((m) => !ocupados.has(m.id) && m.funcao === (FUNCAO_POR_CONTEXTO[ctx] ?? ''))
          .map((m) => ({ m, sorte: Math.random() }))
          .sort((a, b) => (vinculosNoPeriodo(a.m.id) - vinculosNoPeriodo(b.m.id)) || (a.sorte - b.sorte));

        let adicionados = 0;
        for (const { m } of candidatos) {
          if (adicionados >= faltam) break;
          // Limite máximo de escalas por médium no período
          if (limiteMaximoPorMedium > 0 && vinculosNoPeriodo(m.id) >= limiteMaximoPorMedium) continue;
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
      try {
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
      } catch (err) {
        // Rollback do estado em memória para evitar inconsistências
        this.db.escala = snapshotOriginal;
        throw new Error(`Falha na distribuição na nuvem: ${err.message}. A grade foi revertida.`);
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

  const dt = new Date(dataISO + 'T12:00:00');
  const dow = dt.getDay();
  const oco = ocorrenciaNoMes(dt, dow);
  const totalOco = totalOcorrenciasNoMes(dt, dow);

  const regrasFixas = store.db.disponibilidade.filter((r) =>
    r.ativo === 1 &&
    (r.contexto ?? 'dirigentes') === ctx &&
    r.trabalho_id === trabalhoId &&
    r.dia_semana === dow &&
    (r.ocorrencia === oco || (r.ocorrencia === 6 && oco === totalOco))
  );

  const posMap = new Map();
  for (const r of regrasFixas) {
    if (r.medio_id) {
      posMap.set(r.medio_id, r.posicao ?? 1);
    }
  }

  itens.sort((a, b) => {
    const posA = posMap.has(a.medio_id) ? posMap.get(a.medio_id) : 999;
    const posB = posMap.has(b.medio_id) ? posMap.get(b.medio_id) : 999;
    if (posA !== posB) return posA - posB;
    return (a.id || 0) - (b.id || 0);
  });

  return {
    itens,
    nomes: itens.filter((e) => e.medio_id > 0).map((e) => store.nomeMedium(e.medio_id)),
    temLeito: itens.some((e) => ehLeito(e.observacao)),
  };
}

// Datas de sessão do mês: dias que têm ao menos 1 horário cadastrado
export function diasDeSessaoDoMes(ano, mes1a12, ctx = store.contextoAtual, trabalhoIds = null) {
  const diasComHorario = new Set(store.db.horarios
    .filter((h) => store.trabalhoContexto(h.trabalho_id) === ctx && (!trabalhoIds || trabalhoIds.includes(h.trabalho_id)))
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

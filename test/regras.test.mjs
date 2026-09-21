import test from 'node:test';
import assert from 'node:assert/strict';

// Mock simples de localStorage para execução isolada em Node.js
if (!globalThis.localStorage) {
  const storeMap = new Map();
  globalThis.localStorage = {
    getItem: (k) => storeMap.get(k) ?? null,
    setItem: (k, v) => storeMap.set(k, String(v)),
    removeItem: (k) => storeMap.delete(k),
    clear: () => storeMap.clear(),
  };
}

import {
  store,
  mediumDisponivelNaData,
  haConflitoHorario,
  diasDeSessaoDoMes,
  LEITO,
} from '../js/store.js';

test('1. mediumDisponivelNaData — regras de ocorrência', async (t) => {
  store.resetar();
  store.modo = 'local';
  store.contextoAtual = 'dirigentes';

  // Médio sem regras tem disponibilidade total
  const semRegras = store.db.mediuns[0]; // Maria Silva
  store.db.disponibilidade = [];
  assert.equal(mediumDisponivelNaData(semRegras.id, '2026-09-02'), true, 'Sem regras deve estar disponível');

  // Médio com regra específica de 1ª quarta-feira (dia_semana: 3)
  // Em setembro/2026:
  // 02/09/2026 = 1ª quarta
  // 09/09/2026 = 2ª quarta
  // 16/09/2026 = 3ª quarta
  // 23/09/2026 = 4ª quarta
  // 30/09/2026 = 5ª quarta (e também última quarta de set/2026)
  const medioTeste = { id: 99, nome: 'Médium Teste', ativo: 1, funcao: 'Doutrinador' };
  store.db.mediuns.push(medioTeste);

  // Regra: 1ª quarta
  store.db.disponibilidade = [
    { id: 101, medio_id: 99, dia_semana: 3, ocorrencia: 1, ativo: 1, contexto: 'dirigentes' }
  ];
  assert.equal(mediumDisponivelNaData(99, '2026-09-02'), true, 'Deve estar disponível na 1ª quarta');
  assert.equal(mediumDisponivelNaData(99, '2026-09-09'), false, 'Não deve estar disponível na 2ª quarta');
  assert.equal(mediumDisponivelNaData(99, '2026-09-16'), false, 'Não deve estar disponível na 3ª quarta');

  // Regra: 3ª quarta
  store.db.disponibilidade = [
    { id: 102, medio_id: 99, dia_semana: 3, ocorrencia: 3, ativo: 1, contexto: 'dirigentes' }
  ];
  assert.equal(mediumDisponivelNaData(99, '2026-09-16'), true, 'Deve estar disponível na 3ª quarta');
  assert.equal(mediumDisponivelNaData(99, '2026-09-02'), false, 'Não deve estar disponível na 1ª quarta');

  // Regra: 5ª ocorrência (30/09/2026)
  store.db.disponibilidade = [
    { id: 103, medio_id: 99, dia_semana: 3, ocorrencia: 5, ativo: 1, contexto: 'dirigentes' }
  ];
  assert.equal(mediumDisponivelNaData(99, '2026-09-30'), true, 'Deve estar disponível na 5ª quarta');

  // Regra: 6ª ("Última" ocorrência do mês)
  store.db.disponibilidade = [
    { id: 104, medio_id: 99, dia_semana: 3, ocorrencia: 6, ativo: 1, contexto: 'dirigentes' }
  ];
  // 30/09/2026 é a última quarta de setembro
  assert.equal(mediumDisponivelNaData(99, '2026-09-30'), true, '30/09 é a última quarta-feira do mês');
  assert.equal(mediumDisponivelNaData(99, '2026-09-23'), false, '23/09 não é a última quarta-feira do mês');
});

test('2. haConflitoHorario — detecção de sobreposição de horários', async (t) => {
  store.resetar();
  store.modo = 'local';
  store.contextoAtual = 'dirigentes';

  // Horários existentes:
  // Horário 1: 19:00 - 21:00
  // Horário 2: 19:30 - 20:30
  // Horário 3: 08:00 - 10:00
  store.db.escala = [
    { id: 1, medio_id: 1, data: '2026-09-02', horario_id: 1, contexto: 'dirigentes' }
  ];

  // Conflito com horário 19:30 - 20:30 no mesmo dia e mesmo contexto
  assert.equal(haConflitoHorario(1, '2026-09-02', '19:30', '20:30', 0), true, 'Deve detectar sobreposição');
  // Sem conflito em outro dia
  assert.equal(haConflitoHorario(1, '2026-09-03', '19:00', '21:00', 0), false, 'Não deve conflitar em data diferente');
  // Sem conflito em horário disjunto (ex.: 08:00 - 10:00)
  assert.equal(haConflitoHorario(1, '2026-09-02', '08:00', '10:00', 0), false, 'Não deve conflitar com horário disjunto');
  // Sem conflito ao ignorar o próprio ID da escala
  assert.equal(haConflitoHorario(1, '2026-09-02', '19:00', '21:00', 1), false, 'Deve ignorar o próprio ID da escala');
  // Outro médium não conflita
  assert.equal(haConflitoHorario(2, '2026-09-02', '19:00', '21:00', 0), false, 'Outro médium não tem conflito');
});

test('3. diasDeSessaoDoMes — cálculo de dias de sessão', async (t) => {
  store.resetar();
  store.modo = 'local';
  store.contextoAtual = 'dirigentes';

  // Horários do modelo padrão: Qua (3), Sáb (6)
  const dias = diasDeSessaoDoMes(2026, 9, 'dirigentes');
  assert.ok(dias.length > 0, 'Deve retornar dias de sessão');
  for (const d of dias) {
    assert.ok(d.dow === 3 || d.dow === 6, `Dia ${d.iso} deve ser quarta (3) ou sábado (6)`);
    assert.equal(d.iso.startsWith('2026-09'), true);
  }
});

test('4. distribuirAutomaticamente — respeito a LEITO e limites', async (t) => {
  store.resetar();
  store.modo = 'local';
  store.contextoAtual = 'dirigentes';

  // Cadastra grade modelo para ter trabalhos e horários
  await store.criarGradeModelo();

  // Garante médiuns com função Doutrinador
  for (const m of store.db.mediuns) {
    m.funcao = 'Doutrinador';
    m.ativo = 1;
  }

  // Insere um LEITO pré-existente
  const primeiroDia = diasDeSessaoDoMes(2026, 9, 'dirigentes')[0].iso;
  const primeiroTrabalho = store.trabalhosAtivos()[0].id;

  store.db.escala = [
    { id: 501, medio_id: 0, trabalho_id: primeiroTrabalho, data: primeiroDia, horario_id: 1, presente: 0, observacao: LEITO, contexto: 'dirigentes' }
  ];

  await store.distribuirAutomaticamente('2026-09', { modo: 'vazias' });

  // A célula com LEITO não deve ter recebido médium
  const itensNaCelula = store.db.escala.filter((e) => e.data === primeiroDia && e.trabalho_id === primeiroTrabalho);
  assert.equal(itensNaCelula.some((e) => e.medio_id > 0), false, 'Célula LEITO não pode ter médium alocado');
  assert.equal(itensNaCelula.some((e) => e.observacao === LEITO), true, 'LEITO deve ser preservado');
});

test('5. distribuirAutomaticamente — limite máximo por médium e unificação bimestral', async (t) => {
  store.resetar();
  store.modo = 'local';
  store.contextoAtual = 'dirigentes';
  await store.criarGradeModelo();

  for (const m of store.db.mediuns) {
    m.funcao = 'Doutrinador';
    m.ativo = 1;
  }

  // Define limite de no máximo 2 escalas por médium no mês
  await store.distribuirAutomaticamente('2026-09', { modo: 'tudo', limiteMaximoPorMedium: 2 });

  for (const m of store.db.mediuns) {
    const qtd = store.db.escala.filter((e) => e.medio_id === m.id && e.data.startsWith('2026-09')).length;
    assert.ok(qtd <= 2, `Médium ${m.nome} não deve ultrapassar 2 escalas (teve ${qtd})`);
  }
});

test('6. store.importar — validação de schema', async (t) => {
  store.resetar();

  // JSON corrompido
  assert.throws(() => store.importar('nao-e-json'), /JSON corrompido/);

  // Não é objeto
  assert.throws(() => store.importar('["array"]'), /conteúdo raiz deve ser um objeto JSON/);

  // Sem lista de mediuns
  assert.throws(() => store.importar(JSON.stringify({ trabalhos: [] })), /lista "mediuns" é obrigatória/);

  // Médium sem id ou nome
  assert.throws(() => store.importar(JSON.stringify({
    mediuns: [{ semId: true }],
    trabalhos: [{ id: 1, nome: 'Passe' }]
  })), /formato incorreto em um dos médiuns/);

  // Sem lista de trabalhos
  assert.throws(() => store.importar(JSON.stringify({ mediuns: [] })), /lista "trabalhos" é obrigatória/);

  // Backup válido
  const valido = JSON.stringify({
    mediuns: [{ id: 1, nome: 'Teste', ativo: 1 }],
    trabalhos: [{ id: 1, nome: 'Passe', ativo: 1 }],
    horarios: [],
    escala: [],
    disponibilidade: [],
  });
  assert.doesNotThrow(() => store.importar(valido));
  assert.equal(store.db.mediuns[0].nome, 'Teste');
});

test('7. store.desfazer — restauração de estado anterior', async (t) => {
  store.resetar();
  store.modo = 'local';
  store.contextoAtual = 'dirigentes';
  await store.criarGradeModelo();

  for (const m of store.db.mediuns) {
    m.funcao = 'Doutrinador';
  }

  await store.distribuirAutomaticamente('2026-09', { modo: 'tudo' });
  const totalDistribuido = store.db.escala.length;
  assert.ok(totalDistribuido > 0, 'Deve ter distribuído escalas');

  // Limpa o mês
  await store.limparMes('2026-09');
  assert.equal(store.db.escala.length, 0, 'Escala deve estar vazia após limpar');

  // Desfaz a limpeza
  assert.ok(store.podeDesfazer());
  const opDesfeita = await store.desfazer();
  assert.ok(opDesfeita.includes('Limpar mês 2026-09'));
  assert.equal(store.db.escala.length, totalDistribuido, 'Deve ter restaurado todas as escalas');
});

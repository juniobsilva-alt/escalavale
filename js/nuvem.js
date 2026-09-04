import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const URL = 'https://edyjpusrdpotmskgobws.supabase.co';
const CHAVE = 'sb_publishable_3OKeFVTkqUa7uy-U1M4AZQ_bKHp2SVu';

export const supabase = createClient(URL, CHAVE);

export async function sessaoAtual() {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function entrar(email, senha) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) throw error;
  return data.session;
}

export async function sair() {
  await supabase.auth.signOut();
}

const TABELAS = ['mediuns', 'trabalhos', 'horarios', 'escala', 'disponibilidade', 'notas_mensais'];

export async function carregarTudo() {
  const resultados = await Promise.all(TABELAS.map((t) => supabase.from(t).select('*')));
  const [mediuns, trabalhos, horarios, escala, disponibilidade, notas] = resultados.map((res, i) => {
    if (res.error) throw new Error(`Falha ao ler ${TABELAS[i]}: ${res.error.message}`);
    return res.data;
  });
  const notas_mensais = {};
  for (const n of notas) notas_mensais[n.mes] = n.texto ?? '';
  return {
    mediuns, trabalhos, horarios,
    escala: escala.map((e) => ({ ...e, medio_id: e.medio_id ?? 0, horario_id: e.horario_id ?? 0 })),
    disponibilidade,
    notas_mensais,
    seq: 0,
  };
}

function paraBanco(tabela, obj) {
  const copia = { ...obj };
  delete copia.id;
  if (tabela === 'escala') {
    if (copia.medio_id === 0 || copia.medio_id === undefined) copia.medio_id = null;
    if (copia.horario_id === 0 || copia.horario_id === undefined) copia.horario_id = null;
  }
  return copia;
}

export async function inserir(tabela, obj) {
  const { data, error } = await supabase.from(tabela).insert(paraBanco(tabela, obj)).select().single();
  if (error) throw new Error(`Falha ao salvar: ${error.message}`);
  return data;
}

export async function atualizar(tabela, id, patch) {
  const { error } = await supabase.from(tabela).update(paraBanco(tabela, patch)).eq('id', id);
  if (error) throw new Error(`Falha ao atualizar: ${error.message}`);
}

export async function excluir(tabela, id) {
  const { error } = await supabase.from(tabela).delete().eq('id', id);
  if (error) throw new Error(`Falha ao excluir: ${error.message}`);
}

export async function excluirCelula(dataISO, trabalhoId) {
  const { error } = await supabase.from('escala').delete().match({ data: dataISO, trabalho_id: trabalhoId });
  if (error) throw new Error(`Falha ao limpar: ${error.message}`);
}

export async function salvarNota(mes, texto) {
  const { error } = await supabase.from('notas_mensais').upsert({ mes, texto }, { onConflict: 'mes' });
  if (error) throw new Error(`Falha ao salvar avisos: ${error.message}`);
}

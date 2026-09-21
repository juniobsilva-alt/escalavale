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

const TABELAS = ['mediuns', 'trabalhos', 'horarios', 'escala', 'disponibilidade', 'notas_mensais', 'usuarios'];

export async function carregarTudo() {
  const agora = new Date();
  const anoAtual = agora.getFullYear();
  const dataInicio = `${anoAtual}-01-01`;
  const dataFim = `${anoAtual}-12-31`;

  const resultados = await Promise.all(TABELAS.map((t) => {
    if (t === 'escala') {
      return supabase.from('escala').select('*').gte('data', dataInicio).lte('data', dataFim);
    }
    return supabase.from(t).select('*');
  }));
  const [mediuns, trabalhos, horarios, escala, disponibilidade, notas, usuarios] = resultados.map((res, i) => {
    if (res.error) {
      // Se a tabela usuarios ainda não foi criada no Supabase, não trava o login do sistema
      if (TABELAS[i] === 'usuarios' && /could not find the table|relation.*does not exist/i.test(res.error.message)) {
        console.warn("Tabela 'usuarios' ainda não encontrada no Supabase. Execute supabase/migracao-usuarios.sql no SQL Editor.");
        return [];
      }
      throw new Error(`Falha ao ler ${TABELAS[i]}: ${res.error.message}`);
    }
    return res.data;
  });
  const notas_mensais = {};
  for (const n of notas) notas_mensais[n.mes] = n.texto ?? '';
  return {
    mediuns, trabalhos, horarios,
    escala: escala.map((e) => ({ ...e, medio_id: e.medio_id ?? 0, horario_id: e.horario_id ?? 0 })),
    disponibilidade,
    notas_mensais,
    usuarios: usuarios ?? [],
    seq: 0,
  };
}

export async function carregarEscalaMes(mesChave) {
  const [a, m] = mesChave.split('-').map(Number);
  const ultimoDia = new Date(a, m, 0).getDate();
  const inicio = `${mesChave}-01`;
  const fim = `${mesChave}-${String(ultimoDia).padStart(2, '0')}`;
  const { data, error } = await supabase.from('escala').select('*').gte('data', inicio).lte('data', fim);
  if (error) throw new Error(`Falha ao ler escala do mês ${mesChave}: ${error.message}`);
  return (data || []).map((e) => ({ ...e, medio_id: e.medio_id ?? 0, horario_id: e.horario_id ?? 0 }));
}

export function assinarRealtimeEscala(aoAlterar) {
  return supabase
    .channel('realtime:escala')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'escala' }, (payload) => {
      aoAlterar(payload);
    })
    .subscribe();
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

export async function excluirCelula(dataISO, trabalhoId, ctx = 'dirigentes') {
  const { error } = await supabase.from('escala').delete().match({ data: dataISO, trabalho_id: trabalhoId, contexto: ctx });
  if (error) throw new Error(`Falha ao limpar: ${error.message}`);
}

export async function salvarNota(mes, texto) {
  const { error } = await supabase.from('notas_mensais').upsert({ mes, texto }, { onConflict: 'mes' });
  if (error) throw new Error(`Falha ao salvar avisos: ${error.message}`);
}

export async function cadastrarUsuarioAuth(email, senha, nome, papel) {
  // Cliente auxiliar sem persistência de sessão para não deslogar o administrador conectado
  const authAux = createClient(URL, CHAVE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await authAux.auth.signUp({
    email,
    password: senha,
    options: {
      data: { nome, papel },
    },
  });
  if (error) throw error;
  return data.user;
}

export async function solicitarRedefinicaoSenha(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw new Error(`Falha ao enviar e-mail de redefinição: ${error.message}`);
}


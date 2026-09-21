-- Migração: Adiciona suporte a escopos (permissões) de usuários
-- Execute no SQL Editor do Supabase se a tabela public.usuarios já tiver sido criada.

alter table public.usuarios
add column if not exists escopos text[] not null default array['dirigentes','ajanas']::text[];

-- Atualiza usuários existentes que estejam com escopos nulo
update public.usuarios
set escopos = array['dirigentes','ajanas']::text[]
where escopos is null;

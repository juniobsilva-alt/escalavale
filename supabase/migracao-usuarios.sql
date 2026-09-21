-- Cadastro e Controle de Acesso de Usuários (RBAC)
-- Execute no SQL Editor do Supabase para criar a tabela de usuários e configurar as permissões.

-- 1. Criação da tabela de usuários
create table if not exists public.usuarios (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid references auth.users(id) on delete set null,
  email text unique not null,
  nome text not null,
  papel text not null default 'coordenador' check (papel in ('admin', 'coordenador')),
  ativo integer not null default 1,
  criado_em timestamptz default now()
);

-- 2. Habilitação de RLS (Row Level Security)
alter table public.usuarios enable row level security;

-- 3. Políticas de segurança (RLS)
-- Todos os usuários autenticados podem consultar a lista de usuários (para verificação de perfil e identificação)
create policy "Usuarios autenticados podem ler usuarios"
  on public.usuarios for select
  using (auth.role() = 'authenticated');

-- Apenas administradores podem cadastrar novos usuários
create policy "Admins podem inserir usuarios"
  on public.usuarios for insert
  with check (
    auth.jwt() ->> 'email' = 'juniobsilva@gmail.com' or
    exists (
      select 1 from public.usuarios u
      where u.email = auth.jwt() ->> 'email' and u.papel = 'admin' and u.ativo = 1
    )
  );

-- Apenas administradores podem atualizar usuários
create policy "Admins podem atualizar usuarios"
  on public.usuarios for update
  using (
    auth.jwt() ->> 'email' = 'juniobsilva@gmail.com' or
    exists (
      select 1 from public.usuarios u
      where u.email = auth.jwt() ->> 'email' and u.papel = 'admin' and u.ativo = 1
    )
  );

-- Apenas administradores podem remover usuários
create policy "Admins podem excluir usuarios"
  on public.usuarios for delete
  using (
    auth.jwt() ->> 'email' = 'juniobsilva@gmail.com' or
    exists (
      select 1 from public.usuarios u
      where u.email = auth.jwt() ->> 'email' and u.papel = 'admin' and u.ativo = 1
    )
  );

-- 4. Inserção / Garantia do usuário administrador principal
insert into public.usuarios (email, nome, papel, ativo)
values ('juniobsilva@gmail.com', 'Junio Silva', 'admin', 1)
on conflict (email) do update set papel = 'admin', ativo = 1;

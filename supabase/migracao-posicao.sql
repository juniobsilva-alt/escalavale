-- Adiciona coluna posicao na tabela disponibilidade para trabalhos fixos com múltiplas vagas
alter table public.disponibilidade
  add column if not exists posicao integer default 1;

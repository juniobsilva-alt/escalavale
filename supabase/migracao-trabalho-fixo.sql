-- Adiciona colunas de trabalho fixo e horário à tabela de disponibilidade
-- Permite vincular um médium a um trabalho e horário específicos em determinada ocorrência do mês.

alter table public.disponibilidade
  add column if not exists trabalho_id bigint references public.trabalhos(id) on delete cascade,
  add column if not exists horario_id bigint references public.horarios(id) on delete set null;

-- Reorganização: contextos de escala (dirigentes / ajanãs)
-- Rode no SQL Editor do Supabase ANTES de usar a nova versão.
alter table trabalhos add column if not exists contexto text default 'dirigentes';
alter table escala add column if not exists contexto text default 'dirigentes';
alter table disponibilidade add column if not exists contexto text default 'dirigentes';

-- notas mensais passam a usar chave 'contexto:AAAA-MM'
alter table notas_mensais alter column mes type text;
update notas_mensais set mes = 'dirigentes:' || mes where mes not like '%:%';

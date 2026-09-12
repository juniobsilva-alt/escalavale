-- Vínculo trabalho -> grade (Escala de Ajanãs). Rode no SQL Editor.
-- Nulo = participa de todas as grades; o app deduz as grades conhecidas pelo nome.
alter table trabalhos add column if not exists grade text;

-- Grade Templo: Randy desdobrado em Randy 1 e Randy 2 (Randy 2 nasce pelo botão da grade)
update trabalhos set nome = 'Randy 1', qtd_mediuns = 1, grade = 'aj-grade'
where contexto = 'ajanas' and lower(nome) = 'randy';

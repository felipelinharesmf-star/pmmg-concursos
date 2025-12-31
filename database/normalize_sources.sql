-- SCRIPT PARA PADRONIZAR NOMES DAS FONTES/LEGISLAÇÃO
-- Use este modelo para corrigir nomes escritos de formas diferentes.
-- Execute no SQL Editor do Supabase.

-- Exemplo 1: Mudar "CF/88", "Const. Fed." ou "CF" para "Constituição Federal"
UPDATE public."questões crs"
SET "Fonte_documento" = 'Constituição Federal'
WHERE "Fonte_documento" ILIKE 'CF%' OR "Fonte_documento" ILIKE 'Const%';

-- Exemplo 2: Mudar "Cod. Penal" para "Código Penal"
UPDATE public."questões crs"
SET "Fonte_documento" = 'Código Penal'
WHERE "Fonte_documento" ILIKE 'Cod. Penal%';

-- Exemplo 3: Padronizar Código Penal Militar (1.001)
-- Encontra tudo que tem "1.001" no nome e padroniza
UPDATE public."questões crs"
SET "Fonte_documento" = 'Decreto-Lei n° 1.001/1969 (Código Penal Militar)'
WHERE "Fonte_documento" ILIKE '%1.001%';

-- Exemplo 4: Se quiser listar todos os nomes diferentes para ver o que precisa corrigir:
-- Execute apenas esta linha abaixo para ver a lista:
-- SELECT DISTINCT "Fonte_documento" FROM public."questões crs" ORDER BY "Fonte_documento";

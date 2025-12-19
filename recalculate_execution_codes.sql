-- Script para recalcular todos os códigos de execução
-- Execute este SQL se os códigos estiverem incorretos

-- Primeiro, limpar todos os códigos existentes
UPDATE demands SET execution_code = NULL;

-- Agora, para cada dia que tem demandas, reordenar baseado no timestamp
-- Isso deve ser feito via API, mas este SQL pode ajudar a limpar

-- Verificar quantas demandas existem por dia
SELECT 
  DATE(to_timestamp(timestamp / 1000)) as dia,
  COUNT(*) as total_demandas,
  MIN(timestamp) as primeiro_timestamp,
  MAX(timestamp) as ultimo_timestamp
FROM demands
GROUP BY DATE(to_timestamp(timestamp / 1000))
ORDER BY dia DESC;





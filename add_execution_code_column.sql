-- Adicionar coluna execution_code na tabela demands
-- Esta coluna armazena o código de execução automático gerado para cada demanda
-- Formato: {CODIGO_DO_DIA}{ORDEM_DA_DEMANDA}
-- Exemplos: S1, T2, QA1, QI2, SX1, SB1, D1

-- Adicionar coluna (permite NULL durante transição)
ALTER TABLE demands 
ADD COLUMN IF NOT EXISTS execution_code VARCHAR(10) NULL;

-- Criar índice para melhorar performance em consultas por código
CREATE INDEX IF NOT EXISTS idx_demands_execution_code ON demands(execution_code);

-- Comentário na coluna
COMMENT ON COLUMN demands.execution_code IS 'Código de execução automático baseado no dia da semana e ordem da demanda no dia. Formato: {DIA}{ORDEM} (ex: QA1, SX2)';




